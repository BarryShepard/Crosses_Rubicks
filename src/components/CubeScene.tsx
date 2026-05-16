import { Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { canPlaceMark, type GameState } from "../game/board";
import { cellToSticker } from "../game/geometry";
import {
  resolveRotationGesture,
  resolveRotationGesturePreview,
  type Point,
  type RotationGesturePreview,
} from "../game/gesture";
import {
  cellsInRotationLayer,
  inverseLayerRotation,
  previewAngleForProgress,
  quarterTurnRadians,
  rotationToEuler,
} from "../game/rotationPreview";
import {
  allCells,
  cellKey,
  cols,
  rows,
  type CellId,
  type CellKey,
  type Face,
  type LayerRotation,
} from "../game/types";
import "./CubeScene.css";

type CubeSceneProps = {
  game: GameState;
  rotateModeArmed: boolean;
  interactionLocked?: boolean;
  pendingRotation: LayerRotation | null;
  undoRequestId: number;
  onPlaceMark: (cell: CellId) => void;
  onLayerRotation: (rotation: LayerRotation | null) => void;
  onUndoRotationComplete: () => void;
};

type DragState = {
  start: Point;
  latest: Point;
  moved: boolean;
};

type RotationAnimationPhase = "dragging" | "committing" | "cancelling" | "undoing";

type RotationPreviewState = {
  rotation: LayerRotation;
  angle: number;
  progress: number;
  commitReady: boolean;
  phase: RotationAnimationPhase;
};

function faceRotation(face: Face): [number, number, number] {
  switch (face) {
    case "front":
      return [0, 0, 0];
    case "back":
      return [0, Math.PI, 0];
    case "right":
      return [0, Math.PI / 2, 0];
    case "left":
      return [0, -Math.PI / 2, 0];
    case "top":
      return [-Math.PI / 2, 0, 0];
    case "bottom":
      return [Math.PI / 2, 0, 0];
  }
}

function stickerPosition(cell: CellId): [number, number, number] {
  const sticker = cellToSticker(cell);

  return [
    sticker.position.x * 0.72 + sticker.normal.x * 0.34,
    sticker.position.y * 0.72 + sticker.normal.y * 0.34,
    sticker.position.z * 0.72 + sticker.normal.z * 0.34,
  ];
}

function Sticker({
  cell,
  owner,
  highlighted,
  previewed = false,
}: {
  cell: CellId;
  owner: "X" | "O" | null;
  highlighted: boolean;
  previewed?: boolean;
}) {
  const fill = cell.face === "front" ? "#ffffff" : "#e8edf6";
  const color = highlighted ? "#ffe36e" : previewed ? "#d9e8ff" : fill;

  return (
    <group position={stickerPosition(cell)} rotation={faceRotation(cell.face)}>
      <mesh>
        <planeGeometry args={[0.58, 0.58]} />
        <meshStandardMaterial
          color={color}
          emissive={previewed ? "#2f5cff" : "#000000"}
          emissiveIntensity={previewed ? 0.08 : 0}
          roughness={0.82}
          metalness={0.02}
        />
      </mesh>
      {owner ? (
        <Text
          position={[0, 0, 0.018]}
          fontSize={0.32}
          color={owner === "X" ? "#111827" : "#d23b4b"}
          anchorX="center"
          anchorY="middle"
        >
          {owner}
        </Text>
      ) : null}
    </group>
  );
}

function CubeModel({ game, preview }: { game: GameState; preview: RotationPreviewState | null }) {
  const highlighted = useMemo(() => new Set<CellKey>(game.winningLine), [game.winningLine]);
  const cells = useMemo(() => allCells(), []);
  const previewKeys = useMemo(
    () => new Set<CellKey>(preview ? cellsInRotationLayer(preview.rotation).map(cellKey) : []),
    [preview],
  );
  const staticCells = preview ? cells.filter((cell) => !previewKeys.has(cellKey(cell))) : cells;
  const previewCells = preview ? cells.filter((cell) => previewKeys.has(cellKey(cell))) : [];

  return (
    <group>
      <mesh>
        <boxGeometry args={[2.05, 2.05, 2.05]} />
        <meshStandardMaterial color="#d5dde9" roughness={0.9} metalness={0.02} />
      </mesh>
      {staticCells.map((cell) => {
        const key = cellKey(cell);

        return (
          <Sticker key={key} cell={cell} owner={game.board[key]} highlighted={highlighted.has(key)} />
        );
      })}
      {preview ? (
        <group rotation={rotationToEuler(preview.rotation, preview.angle)}>
          {previewCells.map((cell) => {
            const key = cellKey(cell);

            return (
              <Sticker
                key={key}
                cell={cell}
                owner={game.board[key]}
                highlighted={highlighted.has(key)}
                previewed
              />
            );
          })}
        </group>
      ) : null}
      <mesh position={[0, 0, 1.075]}>
        <planeGeometry args={[2.28, 2.28]} />
        <meshBasicMaterial color="#2f5cff" wireframe transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

export function CubeScene({
  game,
  rotateModeArmed,
  interactionLocked: externalInteractionLocked = false,
  pendingRotation,
  undoRequestId,
  onPlaceMark,
  onLayerRotation,
  onUndoRotationComplete,
}: CubeSceneProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const rotationPreviewRef = useRef<RotationPreviewState | null>(null);
  const handledUndoRequestRef = useRef(undoRequestId);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [viewRotation, setViewRotation] = useState<[number, number]>([0, 0]);
  const [rotationPreview, setRotationPreviewState] = useState<RotationPreviewState | null>(null);
  const localAnimationLocked =
    rotationPreview?.phase === "committing" ||
    rotationPreview?.phase === "cancelling" ||
    rotationPreview?.phase === "undoing";
  const interactionLocked = externalInteractionLocked || localAnimationLocked;

  const updateRotationPreview = useCallback(
    (
      next:
        | RotationPreviewState
        | null
        | ((current: RotationPreviewState | null) => RotationPreviewState | null),
    ) => {
      const resolved = typeof next === "function" ? next(rotationPreviewRef.current) : next;

      rotationPreviewRef.current = resolved;
      setRotationPreviewState(resolved);
    },
    [],
  );

  const stopRotationAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const animatePreviewTo = useCallback(
    (
      phase: RotationAnimationPhase,
      startAngle: number,
      targetAngle: number,
      onComplete: () => void,
    ) => {
      const preview = rotationPreviewRef.current;

      if (!preview) {
        onComplete();
        return;
      }

      stopRotationAnimation();
      updateRotationPreview({ ...preview, phase });

      const duration = 180;
      const startTime = performance.now();
      const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

      const step = (time: number) => {
        const elapsed = Math.min(1, (time - startTime) / duration);
        const angle = startAngle + (targetAngle - startAngle) * easeOut(elapsed);

        updateRotationPreview((current) => (current ? { ...current, angle, phase } : null));

        if (elapsed < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
          return;
        }

        animationFrameRef.current = null;
        updateRotationPreview(null);
        onComplete();
      };

      animationFrameRef.current = requestAnimationFrame(step);
    },
    [stopRotationAnimation, updateRotationPreview],
  );

  function shouldReplacePreview(
    current: RotationPreviewState | null,
    next: RotationGesturePreview,
  ) {
    if (!current || current.phase !== "dragging") {
      return true;
    }

    if (
      current.rotation.axis === next.rotation.axis &&
      current.rotation.layerIndex === next.rotation.layerIndex
    ) {
      return true;
    }

    return Math.abs(current.angle) < quarterTurnRadians * 0.2;
  }

  function matchesRotation(first: LayerRotation, second: LayerRotation) {
    return (
      first.axis === second.axis &&
      first.layerIndex === second.layerIndex &&
      first.direction === second.direction
    );
  }

  useEffect(() => {
    if (drag) {
      return;
    }

    if (viewRotation[0] === 0 && viewRotation[1] === 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setViewRotation(([x, y]) => [
        Math.abs(x) < 0.001 ? 0 : x * 0.82,
        Math.abs(y) < 0.001 ? 0 : y * 0.82,
      ]);
    });

    return () => cancelAnimationFrame(frame);
  }, [drag, viewRotation]);

  useEffect(() => () => stopRotationAnimation(), [stopRotationAnimation]);

  useEffect(() => {
    if (undoRequestId === handledUndoRequestRef.current) {
      return;
    }

    handledUndoRequestRef.current = undoRequestId;

    if (!pendingRotation) {
      onUndoRotationComplete();
      return;
    }

    const inverse = inverseLayerRotation(pendingRotation);
    const undoPreview: RotationPreviewState = {
      rotation: inverse,
      angle: 0,
      progress: 0,
      commitReady: true,
      phase: "undoing",
    };

    setDrag(null);
    updateRotationPreview(undoPreview);
    animatePreviewTo("undoing", 0, previewAngleForProgress(inverse, 1), onUndoRotationComplete);
  }, [
    animatePreviewTo,
    onUndoRotationComplete,
    pendingRotation,
    undoRequestId,
    updateRotationPreview,
  ]);

  function pointFromEvent(event: PointerEvent): Point {
    return { x: event.clientX, y: event.clientY };
  }

  function boundsFromOverlay() {
    const rect = overlayRef.current?.getBoundingClientRect();

    if (!rect) {
      return null;
    }

    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (interactionLocked) {
      return;
    }

    if (event.target instanceof HTMLElement && event.target.closest(".active-face-cell")) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    setDrag({ start: point, latest: point, moved: false });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag || interactionLocked) {
      return;
    }

    const latest = pointFromEvent(event);
    const dx = latest.x - drag.start.x;
    const dy = latest.y - drag.start.y;
    const moved = drag.moved || Math.hypot(dx, dy) > 10;
    setDrag({ start: drag.start, latest, moved });

    if (rotateModeArmed) {
      const bounds = boundsFromOverlay();
      const preview = bounds ? resolveRotationGesturePreview(bounds, drag.start, latest) : null;

      if (preview) {
        updateRotationPreview((current) => {
          if (!shouldReplacePreview(current, preview) && current) {
            return {
              ...current,
              angle: previewAngleForProgress(current.rotation, preview.progress),
              progress: preview.progress,
              commitReady: preview.commitReady,
            };
          }

          return {
            rotation: preview.rotation,
            angle: previewAngleForProgress(preview.rotation, preview.progress),
            progress: preview.progress,
            commitReady: preview.commitReady,
            phase: "dragging",
          };
        });
      }

      return;
    }

    setViewRotation([dy / 180, dx / 180]);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag) {
      return;
    }

    if (interactionLocked) {
      setDrag(null);
      return;
    }

    const latest = pointFromEvent(event);
    const bounds = boundsFromOverlay();
    setDrag(null);

    if (!rotateModeArmed) {
      return;
    }

    const preview = rotationPreviewRef.current;
    const resolved = bounds ? resolveRotationGesture(bounds, drag.start, latest) : null;

    if (resolved) {
      const commitPreview =
        preview && matchesRotation(preview.rotation, resolved)
          ? { ...preview, rotation: resolved, commitReady: true }
          : {
              rotation: resolved,
              angle: 0,
              progress: 0,
              commitReady: true,
              phase: "dragging" as const,
            };

      updateRotationPreview(commitPreview);
      animatePreviewTo(
        "committing",
        commitPreview.angle,
        previewAngleForProgress(resolved, 1),
        () => onLayerRotation(resolved),
      );
      return;
    }

    if (preview) {
      animatePreviewTo("cancelling", preview.angle, 0, () => onLayerRotation(null));
      return;
    }

    onLayerRotation(null);
  }

  function handleCellClick(cell: CellId) {
    if (interactionLocked || drag?.moved || rotateModeArmed || !canPlaceMark(game, cell)) {
      return;
    }

    onPlaceMark(cell);
  }

  return (
    <div
      className={`cube-scene ${rotateModeArmed ? "rotation-armed" : ""} ${
        interactionLocked ? "rotation-animating" : ""
      }`}
      data-animation-state={rotationPreview?.phase ?? "idle"}
    >
      <Canvas camera={{ position: [0, 0, 5.8], fov: 40 }} gl={{ preserveDrawingBuffer: true }} data-testid="cube-canvas">
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} />
        <group rotation={[viewRotation[0], viewRotation[1], 0]}>
          <CubeModel game={game} preview={rotationPreview} />
        </group>
      </Canvas>

      <div
        ref={overlayRef}
        className="cube-interaction-layer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setDrag(null);

          const preview = rotationPreviewRef.current;

          if (preview?.phase === "dragging") {
            animatePreviewTo("cancelling", preview.angle, 0, () => onLayerRotation(null));
          }
        }}
      >
        <div className="z-gesture-rings" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="active-face-grid" aria-label="Active face cells">
          {rows.map((row) =>
            cols.map((col) => {
              const cell: CellId = { face: "front", row, col };
              const key = cellKey(cell);

              return (
                <button
                  key={key}
                  type="button"
                  className="active-face-cell"
                  aria-label={`Place on row ${row + 1}, column ${col + 1}`}
                  disabled={!canPlaceMark(game, cell) || rotateModeArmed || interactionLocked}
                  onClick={() => handleCellClick(cell)}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
