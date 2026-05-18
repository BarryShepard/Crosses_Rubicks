import { useTexture } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { DoubleSide, type Texture } from "three";
import { canPlaceMark, type GameState } from "../game/board";
import { cellToSticker } from "../game/geometry";
import {
  resolveLayerDrag,
  resolveLayerDragPreview,
  type Point,
  type RotationGesturePreview,
} from "../game/gesture";
import {
  cellsInRotationLayer,
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
import {
  stickerFacesAfterHistory,
  type StickerFaceMap,
} from "../game/stickerFaces";
import "./CubeScene.css";
import { cubeTheme } from "./cubeTheme";

type CubeSceneProps = {
  game: GameState;
  interactionLocked?: boolean;
  pendingRotation: LayerRotation | null;
  undoRequestId: number;
  onPlaceMark: (cell: CellId) => void;
  onLayerRotation: (rotation: LayerRotation | null) => void;
  onUndoRotationComplete: () => void;
  canRotateLayer?: (rotation: LayerRotation) => boolean;
  onAnimationLockChange?: (locked: boolean) => void;
};

type DragMode = "inspect" | "rotate";

type DragState = {
  start: Point;
  latest: Point;
  moved: boolean;
  mode: DragMode;
};

type RotationAnimationPhase = "dragging" | "committing" | "cancelling" | "undoing";

type RotationPreviewState = {
  rotation: LayerRotation;
  angle: number;
  progress: number;
  commitReady: boolean;
  phase: RotationAnimationPhase;
};

export function createUndoRotationAnimation(undoRotation: LayerRotation) {
  const preview: RotationPreviewState = {
    rotation: undoRotation,
    angle: 0,
    progress: 0,
    commitReady: true,
    phase: "undoing",
  };

  return {
    preview,
    targetAngle: previewAngleForProgress(undoRotation, 1),
  };
}

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
    sticker.position.x * cubeTheme.stickerPositionScale +
      sticker.normal.x * cubeTheme.stickerNormalOffset,
    sticker.position.y * cubeTheme.stickerPositionScale +
      sticker.normal.y * cubeTheme.stickerNormalOffset,
    sticker.position.z * cubeTheme.stickerPositionScale +
      sticker.normal.z * cubeTheme.stickerNormalOffset,
  ];
}

function MarkDecal({ texture }: { texture: Texture }) {
  return (
    <mesh position={[0, 0, cubeTheme.markOffset]}>
      <planeGeometry args={[cubeTheme.markSize, cubeTheme.markSize]} />
      <meshBasicMaterial
        map={texture}
        color={cubeTheme.markColor}
        transparent
        opacity={cubeTheme.markOpacity}
        alphaTest={0.1}
        depthWrite={false}
        toneMapped={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

function StickerInnerBorder() {
  const size = cubeTheme.stickerSize;
  const width = cubeTheme.stickerInnerBorderWidth;
  const innerLength = size - width * 2;
  const edgeOffset = size / 2 - width / 2;
  const zOffset = cubeTheme.stickerInnerBorderOffset;
  const strips: Array<{
    key: string;
    position: [number, number, number];
    args: [number, number];
  }> = [
    {
      key: "top",
      position: [0, edgeOffset, zOffset],
      args: [size, width],
    },
    {
      key: "bottom",
      position: [0, -edgeOffset, zOffset],
      args: [size, width],
    },
    {
      key: "left",
      position: [-edgeOffset, 0, zOffset],
      args: [width, innerLength],
    },
    {
      key: "right",
      position: [edgeOffset, 0, zOffset],
      args: [width, innerLength],
    },
  ];

  return (
    <group name="sticker-inner-border">
      {strips.map((strip) => (
        <mesh key={strip.key} position={strip.position}>
          <planeGeometry args={strip.args} />
          <meshBasicMaterial
            color={cubeTheme.stickerInnerBorderColor}
            depthWrite={false}
            toneMapped={false}
            side={DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

function FaceEdgeMask({ face }: { face: Face }) {
  const sticker = cellToSticker({ face, row: 1, col: 1 });

  return (
    <mesh
      name="face-edge-mask"
      position={[
        sticker.position.x * cubeTheme.stickerPositionScale +
          sticker.normal.x * cubeTheme.faceEdgeMaskOffset,
        sticker.position.y * cubeTheme.stickerPositionScale +
          sticker.normal.y * cubeTheme.faceEdgeMaskOffset,
        sticker.position.z * cubeTheme.stickerPositionScale +
          sticker.normal.z * cubeTheme.faceEdgeMaskOffset,
      ]}
      rotation={faceRotation(face)}
    >
      <planeGeometry args={[cubeTheme.faceEdgeMaskSize, cubeTheme.faceEdgeMaskSize]} />
      <meshBasicMaterial
        color={cubeTheme.faceEdgeMaskColor}
        depthWrite={false}
        toneMapped={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

function Sticker({
  cell,
  sourceFace,
  owner,
  highlighted,
  previewed = false,
  markTextures,
}: {
  cell: CellId;
  sourceFace: Face;
  owner: "X" | "O" | null;
  highlighted: boolean;
  previewed?: boolean;
  markTextures: Record<"X" | "O", Texture>;
}) {
  const color = highlighted ? "#FFE36E" : cubeTheme.faceColors[sourceFace];

  return (
    <group position={stickerPosition(cell)} rotation={faceRotation(cell.face)}>
      <mesh>
        <planeGeometry args={[cubeTheme.stickerSize, cubeTheme.stickerSize]} />
        <meshStandardMaterial
          color={color}
          emissive="#000000"
          emissiveIntensity={previewed ? 0.04 : 0}
          roughness={0.82}
          metalness={0.02}
          side={DoubleSide}
        />
      </mesh>
      <StickerInnerBorder />
      {owner ? <MarkDecal texture={markTextures[owner]} /> : null}
    </group>
  );
}

function CubeModel({ game, preview }: { game: GameState; preview: RotationPreviewState | null }) {
  const [crossTexture, nullTexture] = useTexture([
    cubeTheme.markUrls.X,
    cubeTheme.markUrls.O,
  ]) as Texture[];
  const markTextures = useMemo(
    () => ({ X: crossTexture, O: nullTexture }),
    [crossTexture, nullTexture],
  );
  const highlighted = useMemo(() => new Set<CellKey>(game.winningLine), [game.winningLine]);
  const cells = useMemo(() => allCells(), []);
  const previewKeys = useMemo(
    () => new Set<CellKey>(preview ? cellsInRotationLayer(preview.rotation).map(cellKey) : []),
    [preview],
  );
  const staticCells = preview ? cells.filter((cell) => !previewKeys.has(cellKey(cell))) : cells;
  const previewCells = preview ? cells.filter((cell) => previewKeys.has(cellKey(cell))) : [];
  const stickerFaces = useMemo(() => stickerFacesAfterHistory(game.history), [game.history]);

  function sourceFaceFor(cell: CellId, stickerFaceMap: StickerFaceMap): Face {
    return stickerFaceMap[cellKey(cell)];
  }

  return (
    <group>
      {(["front", "back", "right", "left", "top", "bottom"] as Face[]).map((face) => (
        <FaceEdgeMask key={face} face={face} />
      ))}
      {staticCells.map((cell) => {
        const key = cellKey(cell);

        return (
          <Sticker
            key={key}
            cell={cell}
            sourceFace={sourceFaceFor(cell, stickerFaces)}
            owner={game.board[key]}
            highlighted={highlighted.has(key)}
            markTextures={markTextures}
          />
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
                sourceFace={sourceFaceFor(cell, stickerFaces)}
                owner={game.board[key]}
                highlighted={highlighted.has(key)}
                previewed
                markTextures={markTextures}
              />
            );
          })}
        </group>
      ) : null}
    </group>
  );
}

export function CubeScene({
  game,
  interactionLocked: externalInteractionLocked = false,
  pendingRotation,
  undoRequestId,
  onPlaceMark,
  onLayerRotation,
  onUndoRotationComplete,
  canRotateLayer = () => true,
  onAnimationLockChange = () => undefined,
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
      onAnimationLockChange(true);
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
        onAnimationLockChange(false);
      };

      animationFrameRef.current = requestAnimationFrame(step);
    },
    [onAnimationLockChange, stopRotationAnimation, updateRotationPreview],
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

    const { preview: undoPreview, targetAngle } = createUndoRotationAnimation(pendingRotation);

    setDrag(null);
    updateRotationPreview(undoPreview);
    animatePreviewTo("undoing", 0, targetAngle, onUndoRotationComplete);
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

  function isRightButton(event: PointerEvent<HTMLDivElement>): boolean {
    return event.button === 2 || (event.buttons & 2) === 2;
  }

  function isLeftButton(event: PointerEvent<HTMLDivElement>): boolean {
    return event.button === 0 || (event.buttons & 1) === 1;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (interactionLocked) {
      return;
    }

    const mode: DragMode = isRightButton(event) ? "rotate" : "inspect";

    if (mode === "inspect") {
      if (!isLeftButton(event)) {
        return;
      }

      if (event.target instanceof HTMLElement && event.target.closest(".active-face-cell")) {
        return;
      }
    }

    if (mode === "rotate") {
      event.preventDefault();
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    setDrag({ start: point, latest: point, moved: false, mode });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag || interactionLocked) {
      return;
    }

    const latest = pointFromEvent(event);
    const dx = latest.x - drag.start.x;
    const dy = latest.y - drag.start.y;
    const moved = drag.moved || Math.hypot(dx, dy) > 10;
    setDrag({ start: drag.start, latest, moved, mode: drag.mode });

    if (drag.mode === "rotate") {
      event.preventDefault();
      const bounds = boundsFromOverlay();
      const preview = bounds ? resolveLayerDragPreview(bounds, drag.start, latest) : null;

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

    if (drag.mode !== "rotate") {
      return;
    }

    event.preventDefault();
    const preview = rotationPreviewRef.current;
    const resolved = bounds ? resolveLayerDrag(bounds, drag.start, latest) : null;

    if (resolved) {
      if (!canRotateLayer(resolved)) {
        if (preview) {
          animatePreviewTo("cancelling", preview.angle, 0, () => onLayerRotation(null));
          return;
        }

        onLayerRotation(null);
        return;
      }

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
    if (interactionLocked || drag?.moved || !canPlaceMark(game, cell)) {
      return;
    }

    onPlaceMark(cell);
  }

  return (
    <div
      className={`cube-scene ${interactionLocked ? "rotation-animating" : ""}`}
      data-animation-state={rotationPreview?.phase ?? "idle"}
    >
      <Canvas camera={{ position: [0, 0, 5.8], fov: 40 }} gl={{ preserveDrawingBuffer: true }} data-testid="cube-canvas">
        <color attach="background" args={[cubeTheme.sceneBackground]} />
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
        onContextMenu={(event) => event.preventDefault()}
        onPointerCancel={() => {
          setDrag(null);

          const preview = rotationPreviewRef.current;

          if (preview?.phase === "dragging") {
            animatePreviewTo("cancelling", preview.angle, 0, () => onLayerRotation(null));
          }
        }}
      >
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
                  disabled={!canPlaceMark(game, cell) || interactionLocked}
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
