import { Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { canPlaceMark, type GameState } from "../game/board";
import { cellToSticker } from "../game/geometry";
import { resolveRotationGesture, type Point } from "../game/gesture";
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
  onPlaceMark: (cell: CellId) => void;
  onLayerRotation: (rotation: LayerRotation | null) => void;
};

type DragState = {
  start: Point;
  latest: Point;
  moved: boolean;
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
}: {
  cell: CellId;
  owner: "X" | "O" | null;
  highlighted: boolean;
}) {
  const fill = cell.face === "front" ? "#ffffff" : "#e8edf6";
  const color = highlighted ? "#ffe36e" : fill;

  return (
    <group position={stickerPosition(cell)} rotation={faceRotation(cell.face)}>
      <mesh>
        <planeGeometry args={[0.58, 0.58]} />
        <meshStandardMaterial color={color} roughness={0.82} metalness={0.02} />
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

function CubeModel({ game }: { game: GameState }) {
  const highlighted = useMemo(() => new Set<CellKey>(game.winningLine), [game.winningLine]);

  return (
    <group>
      <mesh>
        <boxGeometry args={[2.05, 2.05, 2.05]} />
        <meshStandardMaterial color="#d5dde9" roughness={0.9} metalness={0.02} />
      </mesh>
      {allCells().map((cell) => {
        const key = cellKey(cell);

        return (
          <Sticker key={key} cell={cell} owner={game.board[key]} highlighted={highlighted.has(key)} />
        );
      })}
      <mesh position={[0, 0, 1.075]}>
        <planeGeometry args={[2.28, 2.28]} />
        <meshBasicMaterial color="#2f5cff" wireframe transparent opacity={0.45} />
      </mesh>
    </group>
  );
}

export function CubeScene({ game, rotateModeArmed, onPlaceMark, onLayerRotation }: CubeSceneProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [viewRotation, setViewRotation] = useState<[number, number]>([0, 0]);

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

  function pointFromEvent(event: PointerEvent): Point {
    return { x: event.clientX, y: event.clientY };
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    setDrag({ start: point, latest: point, moved: false });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag) {
      return;
    }

    const latest = pointFromEvent(event);
    const dx = latest.x - drag.start.x;
    const dy = latest.y - drag.start.y;
    const moved = drag.moved || Math.hypot(dx, dy) > 10;
    setDrag({ start: drag.start, latest, moved });

    if (!rotateModeArmed) {
      setViewRotation([dy / 180, dx / 180]);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!drag) {
      return;
    }

    const latest = pointFromEvent(event);
    const rect = overlayRef.current?.getBoundingClientRect();
    setDrag(null);

    if (rotateModeArmed && rect) {
      onLayerRotation(
        resolveRotationGesture(
          { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          drag.start,
          latest,
        ),
      );
    }
  }

  function handleCellClick(cell: CellId) {
    if (drag?.moved || rotateModeArmed || !canPlaceMark(game, cell)) {
      return;
    }

    onPlaceMark(cell);
  }

  return (
    <div className={`cube-scene ${rotateModeArmed ? "rotation-armed" : ""}`}>
      <Canvas camera={{ position: [0, 0, 5.8], fov: 40 }} gl={{ preserveDrawingBuffer: true }} data-testid="cube-canvas">
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} />
        <group rotation={[viewRotation[0], viewRotation[1], 0]}>
          <CubeModel game={game} />
        </group>
      </Canvas>

      <div
        ref={overlayRef}
        className="cube-interaction-layer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDrag(null)}
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
                  disabled={!canPlaceMark(game, cell) || rotateModeArmed}
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
