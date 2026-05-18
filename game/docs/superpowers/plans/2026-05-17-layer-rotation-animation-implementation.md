# Layer Rotation Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live 3D layer-turn previews, snap-to-90 completion, reverse cancellation, and inverse undo animation for rotate-mode cube interactions.

**Architecture:** Keep `GameState.board` as the only source of truth and never mutate it during drag preview. Add pure preview helpers under `src/game`, then make `CubeScene` render the currently previewed layer in a temporary rotated group while static stickers stay in the normal cube group. The parent applies `applyTurnRotation` or `undoTurnRotation` only after the visual animation finishes.

**Tech Stack:** React 18, TypeScript, Three.js through `@react-three/fiber`, Vitest, Playwright.

---

## Current Context

The implementation worktree is `.worktrees/rubiks-tic-tac-toe`. At the time this plan was written, these existing user changes were present and must be preserved:

- `src/game/gesture.ts`: vertical inside-cube drags map `dy > 0` to direction `1`.
- `src/game/gesture.test.ts`: the matching x-axis gesture expectation is direction `1`.
- `src/game/board.ts`: `pendingRotation` and `blockedRotation` exist on `GameState`.
- `src/game/board.test.ts`: coverage exists for blocking only the next immediate inverse rotation.

Do not revert those changes while implementing animation.

## File Structure

- Create `src/game/rotationPreview.ts`: pure helpers for selecting a physical layer and converting preview progress to Three.js Euler angles.
- Create `src/game/rotationPreview.test.ts`: unit tests for layer membership, inverse rotations, and angle mapping.
- Modify `src/game/gesture.ts`: expose a preview resolver that returns candidate rotation, progress, and commit readiness during drag.
- Modify `src/game/gesture.test.ts`: add live-preview resolver coverage.
- Modify `src/components/CubeScene.tsx`: add scene-local preview state, split static/rotating sticker rendering, commit/cancel/undo animation, and input locking.
- Modify `src/components/CubeScene.test.tsx`: add server-render coverage for armed/animating scene attributes.
- Modify `src/App.tsx`: route undo through `CubeScene` when `pendingRotation` exists, then mutate state after inverse animation.
- Modify `src/components/CubeScene.css`: add cursor/visual affordances for animating and previewing layers.
- Modify `e2e/game.spec.ts`: add browser smoke coverage for cancelled rotate-mode drag keeping rotate mode armed.

## Task 1: Add Pure Rotation Preview Helpers

**Files:**
- Create: `src/game/rotationPreview.ts`
- Create: `src/game/rotationPreview.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `src/game/rotationPreview.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  cellsInRotationLayer,
  inverseLayerRotation,
  isCellInRotationLayer,
  previewAngleForProgress,
  rotationToEuler,
} from "./rotationPreview";

describe("rotation preview helpers", () => {
  it("selects the physical top y-layer including side rows and top face", () => {
    const rotation = { axis: "y", layerIndex: 2, direction: 1 } as const;
    const keys = cellsInRotationLayer(rotation).map(
      (cell) => `${cell.face}:${cell.row}:${cell.col}`,
    );

    expect(keys).toHaveLength(21);
    expect(keys).toContain("front:0:0");
    expect(keys).toContain("front:0:2");
    expect(keys).toContain("back:0:1");
    expect(keys).toContain("left:0:1");
    expect(keys).toContain("right:0:1");
    expect(keys).toContain("top:0:0");
    expect(keys).toContain("top:2:2");
    expect(keys).not.toContain("bottom:1:1");
    expect(keys).not.toContain("front:2:1");
  });

  it("checks individual cell membership for x and z layers", () => {
    expect(
      isCellInRotationLayer(
        { face: "right", row: 1, col: 1 },
        { axis: "x", layerIndex: 2, direction: 1 },
      ),
    ).toBe(true);
    expect(
      isCellInRotationLayer(
        { face: "front", row: 1, col: 1 },
        { axis: "x", layerIndex: 2, direction: 1 },
      ),
    ).toBe(false);
    expect(
      isCellInRotationLayer(
        { face: "front", row: 1, col: 1 },
        { axis: "z", layerIndex: 2, direction: -1 },
      ),
    ).toBe(true);
    expect(
      isCellInRotationLayer(
        { face: "back", row: 1, col: 1 },
        { axis: "z", layerIndex: 2, direction: -1 },
      ),
    ).toBe(false);
  });

  it("maps preview progress and direction to quarter-turn radians", () => {
    expect(previewAngleForProgress({ axis: "x", layerIndex: 1, direction: 1 }, 0)).toBe(0);
    expect(previewAngleForProgress({ axis: "x", layerIndex: 1, direction: 1 }, 0.5)).toBeCloseTo(
      Math.PI / 4,
    );
    expect(previewAngleForProgress({ axis: "z", layerIndex: 1, direction: -1 }, 1)).toBeCloseTo(
      -Math.PI / 2,
    );
    expect(previewAngleForProgress({ axis: "z", layerIndex: 1, direction: 1 }, 2)).toBeCloseTo(
      Math.PI / 2,
    );
  });

  it("converts a rotation angle into a Three.js Euler tuple", () => {
    expect(rotationToEuler({ axis: "x", layerIndex: 1, direction: 1 }, 0.25)).toEqual([
      0.25,
      0,
      0,
    ]);
    expect(rotationToEuler({ axis: "y", layerIndex: 1, direction: 1 }, 0.25)).toEqual([
      0,
      0.25,
      0,
    ]);
    expect(rotationToEuler({ axis: "z", layerIndex: 1, direction: 1 }, 0.25)).toEqual([
      0,
      0,
      0.25,
    ]);
  });

  it("creates inverse rotations without changing axis or layer", () => {
    expect(inverseLayerRotation({ axis: "y", layerIndex: 0, direction: 1 })).toEqual({
      axis: "y",
      layerIndex: 0,
      direction: -1,
    });
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
npm run test:run -- src/game/rotationPreview.test.ts
```

Expected: FAIL because `src/game/rotationPreview.ts` does not exist.

- [ ] **Step 3: Implement the pure helper module**

Create `src/game/rotationPreview.ts`:

```ts
import { axisValue, cellToSticker, layerToCoord } from "./geometry";
import { allCells, type CellId, type LayerRotation } from "./types";

export const quarterTurnRadians = Math.PI / 2;

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

export function isCellInRotationLayer(cell: CellId, rotation: LayerRotation): boolean {
  return axisValue(cellToSticker(cell).position, rotation.axis) === layerToCoord(rotation.layerIndex);
}

export function cellsInRotationLayer(rotation: LayerRotation): CellId[] {
  return allCells().filter((cell) => isCellInRotationLayer(cell, rotation));
}

export function previewAngleForProgress(rotation: LayerRotation, progress: number): number {
  return rotation.direction * clampProgress(progress) * quarterTurnRadians;
}

export function rotationToEuler(
  rotation: Pick<LayerRotation, "axis">,
  angle: number,
): [number, number, number] {
  if (rotation.axis === "x") {
    return [angle, 0, 0];
  }

  if (rotation.axis === "y") {
    return [0, angle, 0];
  }

  return [0, 0, angle];
}

export function inverseLayerRotation(rotation: LayerRotation): LayerRotation {
  return {
    ...rotation,
    direction: rotation.direction === 1 ? -1 : 1,
  };
}
```

- [ ] **Step 4: Run the helper tests**

Run:

```bash
npm run test:run -- src/game/rotationPreview.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add src/game/rotationPreview.ts src/game/rotationPreview.test.ts
git commit -m "test: add rotation preview helpers"
```

Expected: commit succeeds with only the new helper files staged.

## Task 2: Add Live Gesture Preview Resolution

**Files:**
- Modify: `src/game/gesture.ts`
- Modify: `src/game/gesture.test.ts`

- [ ] **Step 1: Add failing tests for preview gestures**

Append these tests inside the existing `describe("resolveRotationGesture", ...)` block in `src/game/gesture.test.ts`:

```ts
  it("returns a live preview before the final commit distance", () => {
    expect(resolveRotationGesturePreview(bounds, { x: 50, y: 80 }, { x: 70, y: 81 })).toEqual({
      rotation: {
        axis: "y",
        layerIndex: 2,
        direction: 1,
      },
      progress: 0.625,
      commitReady: false,
    });
  });

  it("marks preview gestures as commit-ready at the final threshold", () => {
    expect(resolveRotationGesturePreview(bounds, { x: 50, y: 80 }, { x: 114, y: 82 })).toEqual({
      rotation: {
        axis: "y",
        layerIndex: 2,
        direction: 1,
      },
      progress: 1,
      commitReady: true,
    });
  });

  it("returns null for preview movement below the intent threshold", () => {
    expect(resolveRotationGesturePreview(bounds, { x: 150, y: 150 }, { x: 158, y: 154 })).toBeNull();
  });
```

Update the import at the top of `src/game/gesture.test.ts`:

```ts
import { resolveRotationGesture, resolveRotationGesturePreview } from "./gesture";
```

- [ ] **Step 2: Run the gesture tests to verify they fail**

Run:

```bash
npm run test:run -- src/game/gesture.test.ts
```

Expected: FAIL because `resolveRotationGesturePreview` is not exported.

- [ ] **Step 3: Refactor `gesture.ts` to share final and preview resolution**

Replace the top constants and add the preview type near `Rect` in `src/game/gesture.ts`:

```ts
export type RotationGesturePreview = {
  rotation: LayerRotation;
  progress: number;
  commitReady: boolean;
};

const minDragDistance = 32;
const minPreviewDistance = 12;
```

Replace the current `resolveRotationGesture` body with this shared resolver and exports:

```ts
function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

function resolveRotationGestureWithThreshold(
  bounds: Rect,
  start: Point,
  end: Point,
  threshold: number,
): LayerRotation | null {
  if (distance(start, end) < threshold) {
    return null;
  }

  const square = normalizedSquare(bounds);
  const center = {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };

  if (isInsideSquare(start, square)) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      const rowRatio = (start.y - square.top) / square.size;
      const visualRow = layerFromRatio(rowRatio);
      const yLayer = (2 - visualRow) as LayerIndex;

      return {
        axis: "y",
        layerIndex: yLayer,
        direction: dx > 0 ? 1 : -1,
      };
    }

    const colRatio = (start.x - square.left) / square.size;

    return {
      axis: "x",
      layerIndex: layerFromRatio(colRatio),
      direction: dy > 0 ? 1 : -1,
    };
  }

  const startAngle = angle(start, center);
  const endAngle = angle(end, center);
  let delta = endAngle - startAngle;

  if (delta > Math.PI) {
    delta -= Math.PI * 2;
  }

  if (delta < -Math.PI) {
    delta += Math.PI * 2;
  }

  if (Math.abs(delta) < 0.3) {
    return null;
  }

  const startRadius = Math.hypot(start.x - center.x, start.y - center.y);
  const innerRadius = square.size / 2;
  const outerRadius = Math.max(bounds.width, bounds.height) / 2;
  const bandRatio = (startRadius - innerRadius) / Math.max(1, outerRadius - innerRadius);

  return {
    axis: "z",
    layerIndex: layerFromRatio(bandRatio),
    direction: delta > 0 ? 1 : -1,
  };
}

export function resolveRotationGesture(bounds: Rect, start: Point, end: Point): LayerRotation | null {
  return resolveRotationGestureWithThreshold(bounds, start, end, minDragDistance);
}

export function resolveRotationGesturePreview(
  bounds: Rect,
  start: Point,
  end: Point,
): RotationGesturePreview | null {
  const rotation = resolveRotationGestureWithThreshold(bounds, start, end, minPreviewDistance);

  if (!rotation) {
    return null;
  }

  const commitRotation = resolveRotationGesture(bounds, start, end);

  return {
    rotation,
    progress: clampProgress(distance(start, end) / minDragDistance),
    commitReady: Boolean(commitRotation),
  };
}
```

- [ ] **Step 4: Run gesture tests**

Run:

```bash
npm run test:run -- src/game/gesture.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 2**

Run:

```bash
git add src/game/gesture.ts src/game/gesture.test.ts
git commit -m "feat: resolve live rotation previews"
```

Expected: commit includes gesture preview changes and preserves the existing x-axis direction fix.

## Task 3: Render A Real 3D Rotating Layer During Drag

**Files:**
- Modify: `src/components/CubeScene.tsx`
- Modify: `src/components/CubeScene.test.tsx`
- Modify: `src/components/CubeScene.css`

- [ ] **Step 1: Add failing component coverage for animation attributes**

In `src/components/CubeScene.test.tsx`, add this test inside `describe("CubeScene", ...)`:

```tsx
  it("exposes idle animation state for testable interaction transitions", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        rotateModeArmed={false}
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
      />,
    );

    expect(html).toContain('data-animation-state="idle"');
  });
```

- [ ] **Step 2: Run component tests to verify failure**

Run:

```bash
npm run test:run -- src/components/CubeScene.test.tsx
```

Expected: FAIL because `data-animation-state` is not rendered.

- [ ] **Step 3: Import preview helpers and add scene-local types**

Update imports in `src/components/CubeScene.tsx`:

```ts
import {
  resolveRotationGesture,
  resolveRotationGesturePreview,
  type Point,
  type RotationGesturePreview,
} from "../game/gesture";
import {
  cellsInRotationLayer,
  previewAngleForProgress,
  rotationToEuler,
  quarterTurnRadians,
} from "../game/rotationPreview";
```

Replace the existing gesture import line:

```ts
import { resolveRotationGesture, type Point } from "../game/gesture";
```

Add these types after `DragState`:

```ts
type RotationAnimationPhase = "dragging" | "committing" | "cancelling" | "undoing";

type RotationPreviewState = {
  rotation: LayerRotation;
  angle: number;
  progress: number;
  commitReady: boolean;
  phase: RotationAnimationPhase;
};
```

- [ ] **Step 4: Split `CubeModel` into static and rotating layer groups**

Replace the current `CubeModel` implementation with:

```tsx
function CubeModel({
  game,
  preview,
}: {
  game: GameState;
  preview: RotationPreviewState | null;
}) {
  const highlighted = useMemo(() => new Set<CellKey>(game.winningLine), [game.winningLine]);
  const rotatingKeys = useMemo(() => {
    if (!preview) {
      return new Set<CellKey>();
    }

    return new Set(cellsInRotationLayer(preview.rotation).map(cellKey));
  }, [preview]);

  const staticCells = useMemo(
    () => allCells().filter((cell) => !rotatingKeys.has(cellKey(cell))),
    [rotatingKeys],
  );
  const previewCells = useMemo(
    () => allCells().filter((cell) => rotatingKeys.has(cellKey(cell))),
    [rotatingKeys],
  );

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
```

Update the `Sticker` props and material:

```tsx
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
  const color = highlighted ? "#ffe36e" : fill;

  return (
    <group position={stickerPosition(cell)} rotation={faceRotation(cell.face)}>
      <mesh>
        <planeGeometry args={[0.58, 0.58]} />
        <meshStandardMaterial
          color={previewed ? "#dbeafe" : color}
          emissive={previewed ? "#1d4ed8" : "#000000"}
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
```

- [ ] **Step 5: Add preview state and animation helpers in `CubeScene`**

Inside `CubeScene`, add state and refs after `viewRotation`:

```tsx
  const [rotationPreview, setRotationPreview] = useState<RotationPreviewState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const interactionLocked =
    rotationPreview?.phase === "committing" ||
    rotationPreview?.phase === "cancelling" ||
    rotationPreview?.phase === "undoing";
```

Add this cleanup effect after the existing return-to-front effect:

```tsx
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
```

Add these helper functions inside `CubeScene` before `pointFromEvent`:

```tsx
  function stopRotationAnimation() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }

  function animatePreviewTo(
    phase: Exclude<RotationAnimationPhase, "dragging">,
    targetAngle: number,
    onComplete: () => void,
  ) {
    stopRotationAnimation();
    setRotationPreview((current) => (current ? { ...current, phase } : current));

    const durationMs = 180;
    const startedAt = performance.now();
    const startAngle = rotationPreview?.angle ?? 0;

    function tick(now: number) {
      const elapsed = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      const angle = startAngle + (targetAngle - startAngle) * eased;

      setRotationPreview((current) => (current ? { ...current, angle } : current));

      if (elapsed < 1) {
        animationFrameRef.current = requestAnimationFrame(tick);
        return;
      }

      animationFrameRef.current = null;
      setRotationPreview(null);
      onComplete();
    }

    animationFrameRef.current = requestAnimationFrame(tick);
  }

  function shouldReplacePreview(current: RotationPreviewState | null, next: RotationGesturePreview) {
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
```

- [ ] **Step 6: Wire drag preview, commit, and cancellation**

At the start of `handlePointerDown`, add:

```tsx
    if (interactionLocked) {
      return;
    }
```

In `handlePointerMove`, replace the rotate-mode branch with:

```tsx
    if (rotateModeArmed) {
      const rect = overlayRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const preview = resolveRotationGesturePreview(
        { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        drag.start,
        latest,
      );

      if (!preview) {
        return;
      }

      setRotationPreview((current) => {
        if (!shouldReplacePreview(current, preview)) {
          return current;
        }

        return {
          rotation: preview.rotation,
          progress: preview.progress,
          commitReady: preview.commitReady,
          angle: previewAngleForProgress(preview.rotation, preview.progress),
          phase: "dragging",
        };
      });

      return;
    }

    setViewRotation([dy / 180, dx / 180]);
```

In `handlePointerUp`, replace the rotate-mode block with:

```tsx
    if (rotateModeArmed && rect) {
      const resolved = resolveRotationGesture(
        { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        drag.start,
        latest,
      );

      if (resolved && rotationPreview?.commitReady) {
        const finalAngle = previewAngleForProgress(rotationPreview.rotation, 1);
        animatePreviewTo("committing", finalAngle, () => onLayerRotation(rotationPreview.rotation));
        return;
      }

      if (rotationPreview) {
        animatePreviewTo("cancelling", 0, () => onLayerRotation(null));
        return;
      }

      onLayerRotation(null);
    }
```

In `onPointerCancel`, replace the inline setter with:

```tsx
        onPointerCancel={() => {
          setDrag(null);
          if (rotationPreview) {
            animatePreviewTo("cancelling", 0, () => onLayerRotation(null));
          }
        }}
```

Update `handleCellClick` guard:

```tsx
    if (drag?.moved || rotateModeArmed || interactionLocked || !canPlaceMark(game, cell)) {
      return;
    }
```

Update the `CubeModel` usage:

```tsx
          <CubeModel game={game} preview={rotationPreview} />
```

Update the wrapper class and attributes:

```tsx
    <div
      className={`cube-scene ${rotateModeArmed ? "rotation-armed" : ""} ${
        interactionLocked ? "rotation-animating" : ""
      }`}
      data-animation-state={rotationPreview?.phase ?? "idle"}
    >
```

- [ ] **Step 7: Add CSS feedback for animation lock**

Append to `src/components/CubeScene.css`:

```css
.rotation-animating .cube-interaction-layer {
  cursor: wait;
}

.rotation-animating .active-face-cell {
  pointer-events: none;
}
```

- [ ] **Step 8: Run component tests**

Run:

```bash
npm run test:run -- src/components/CubeScene.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Run focused game tests**

Run:

```bash
npm run test:run -- src/game/rotationPreview.test.ts src/game/gesture.test.ts src/components/CubeScene.test.tsx
```

Expected: PASS.

- [ ] **Step 10: Commit Task 3**

Run:

```bash
git add src/components/CubeScene.tsx src/components/CubeScene.css src/components/CubeScene.test.tsx
git commit -m "feat: preview layer rotations in 3d"
```

Expected: commit succeeds with only scene preview changes staged.

## Task 4: Animate Undo Before Restoring The Board

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/CubeScene.tsx`
- Modify: `src/components/CubeScene.test.tsx`

- [ ] **Step 1: Add a render test for undo props compatibility**

In `src/components/CubeScene.test.tsx`, update both existing `CubeScene` renders to pass:

```tsx
        pendingRotation={null}
        undoRequestId={0}
        onUndoRotationComplete={vi.fn()}
```

Add this test:

```tsx
  it("accepts pending undo animation props", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        rotateModeArmed={false}
        pendingRotation={{ axis: "x", layerIndex: 1, direction: 1 }}
        undoRequestId={1}
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
        onUndoRotationComplete={vi.fn()}
      />,
    );

    expect(html).toContain('data-animation-state="idle"');
  });
```

- [ ] **Step 2: Run component tests to verify prop failure**

Run:

```bash
npm run test:run -- src/components/CubeScene.test.tsx
```

Expected: FAIL because `CubeSceneProps` does not include undo props yet.

- [ ] **Step 3: Extend `CubeSceneProps`**

In `src/components/CubeScene.tsx`, import inverse helper:

```ts
  inverseLayerRotation,
```

from `../game/rotationPreview`.

Replace `CubeSceneProps` with:

```ts
type CubeSceneProps = {
  game: GameState;
  rotateModeArmed: boolean;
  pendingRotation: LayerRotation | null;
  undoRequestId: number;
  onPlaceMark: (cell: CellId) => void;
  onLayerRotation: (rotation: LayerRotation | null) => void;
  onUndoRotationComplete: () => void;
};
```

Update the component signature:

```tsx
export function CubeScene({
  game,
  rotateModeArmed,
  pendingRotation,
  undoRequestId,
  onPlaceMark,
  onLayerRotation,
  onUndoRotationComplete,
}: CubeSceneProps) {
```

- [ ] **Step 4: Add undo animation effect**

Add this ref near `animationFrameRef`:

```tsx
  const handledUndoRequestRef = useRef(undoRequestId);
```

Add this effect after the cleanup effect:

```tsx
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
    setDrag(null);
    setRotationPreview({
      rotation: inverse,
      angle: 0,
      progress: 0,
      commitReady: true,
      phase: "undoing",
    });

    const targetAngle = previewAngleForProgress(inverse, 1);
    animatePreviewTo("undoing", targetAngle, onUndoRotationComplete);
  }, [undoRequestId, pendingRotation, onUndoRotationComplete]);
```

Keep the dependencies above. The current Vite/Vitest setup does not run ESLint, so TypeScript compilation and runtime behavior are the verification gates for this effect.

- [ ] **Step 5: Route undo through `App`**

Add undo request state after `rotateModeArmed`:

```tsx
  const [undoRequestId, setUndoRequestId] = useState(0);
```

Add these handlers before `handleNewGame`:

```tsx
  function handleUndoRotation() {
    if (!game.pendingRotation) {
      setGame((current) => undoTurnRotation(current));
      return;
    }

    setRotateModeArmed(false);
    setUndoRequestId((current) => current + 1);
  }

  function handleUndoRotationComplete() {
    setGame((current) => undoTurnRotation(current));
  }
```

Update `GameHud`:

```tsx
          onUndoRotation={handleUndoRotation}
```

Update `CubeScene` props:

```tsx
            pendingRotation={game.pendingRotation}
            undoRequestId={undoRequestId}
            onUndoRotationComplete={handleUndoRotationComplete}
```

- [ ] **Step 6: Run tests for component and app wiring**

Run:

```bash
npm run test:run -- src/components/CubeScene.test.tsx src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

Run:

```bash
git add src/App.tsx src/components/CubeScene.tsx src/components/CubeScene.test.tsx
git commit -m "feat: animate rotation undo"
```

Expected: commit succeeds with app and scene undo wiring staged.

## Task 5: Add Browser Smoke Coverage And Final Verification

**Files:**
- Modify: `e2e/game.spec.ts`

- [ ] **Step 1: Add a cancelled-rotation smoke test**

Append this test to `e2e/game.spec.ts`:

```ts
test("cancelled rotate-mode drag keeps rotate mode armed", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /rotate layer/i }).click();
  await expect(page.locator(".cube-scene")).toHaveClass(/rotation-armed/);

  const box = await page.locator(".cube-interaction-layer").boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    return;
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 4);
  await page.mouse.up();

  await expect(page.locator(".cube-scene")).toHaveClass(/rotation-armed/);
});
```

- [ ] **Step 2: Run unit and component tests**

Run:

```bash
npm run test:run
```

Expected: PASS.

- [ ] **Step 3: Run a production build**

Run:

```bash
npm run build
```

Expected: PASS and Vite writes `dist/`.

- [ ] **Step 4: Run browser smoke tests**

Run:

```bash
npm run e2e
```

Expected: PASS. If Playwright browsers are missing, run `npx playwright install` and rerun `npm run e2e`.

- [ ] **Step 5: Manual browser verification**

Run:

```bash
npm run dev
```

Open the printed localhost URL. Verify:

- Press `Rotate layer`.
- Drag a front row horizontally; the selected physical layer rotates around the cube and wraps over cube edges.
- Release after a clear drag; the layer snaps to `90deg`, the board changes after the snap, and rotate mode disarms.
- Press `Rotate layer` again, make a short ambiguous drag, and release; the layer returns to its starting position and rotate mode remains armed.
- Rotate a layer, then press `Undo rotation`; the inverse layer turn plays before the board returns.

- [ ] **Step 6: Commit Task 5**

Run:

```bash
git add e2e/game.spec.ts
git commit -m "test: cover cancelled rotation gestures"
```

Expected: commit includes only browser smoke coverage.

## Plan Self-Review

- Spec coverage: live 3D preview is covered by Tasks 1-3; snap-to-90 and reverse cancellation are covered by Task 3; undo reverse animation is covered by Task 4; validation is covered by Task 5.
- Placeholder scan: no placeholder steps are present; every code-changing step includes concrete code or an exact command.
- Type consistency: `RotationPreviewState`, `RotationGesturePreview`, `LayerRotation`, `pendingRotation`, and `undoRequestId` names are consistent across tasks.
