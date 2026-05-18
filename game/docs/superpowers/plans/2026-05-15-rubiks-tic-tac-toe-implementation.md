# Rubik's Tic-Tac-Toe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved browser MVP: local two-player tic-tac-toe on a full Rubik-style cube, with one fixed active face, optional layer rotation, active-face-only wins, and restart/undo controls.

**Architecture:** Use a Vite + React + TypeScript app with pure game logic in `src/game` and Three.js rendering through `@react-three/fiber`. The board model is the source of truth; the 3D scene renders board state and emits user actions.

**Tech Stack:** Vite, React, TypeScript, Three.js, `@react-three/fiber`, `@react-three/drei`, Vitest, Playwright.

---

## File Structure

- Create `package.json`: npm scripts and runtime/test dependencies.
- Create `index.html`: Vite root document.
- Create `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`: TypeScript and Vite config.
- Create `playwright.config.ts`: browser smoke-test config.
- Create `src/main.tsx`: React entry point.
- Create `src/App.tsx`: top-level game state wiring.
- Create `src/styles.css`: app shell styling.
- Create `src/vite-env.d.ts`, `src/setupTests.ts`: local type/test setup.
- Create `src/game/types.ts`: shared game types and cell helpers.
- Create `src/game/geometry.ts`: mapping between face cells and cube-space sticker coordinates.
- Create `src/game/rotations.ts`: pure layer rotation functions.
- Create `src/game/win.ts`: active-face win and draw checks.
- Create `src/game/board.ts`: game state transitions.
- Create `src/game/gesture.ts`: pointer-drag to layer-rotation resolver.
- Create `src/game/*.test.ts`: pure model tests.
- Create `src/components/GameHud.tsx`, `src/components/GameHud.css`: turn/status/buttons.
- Create `src/components/CubeScene.tsx`, `src/components/CubeScene.css`: Three.js cube, marks, highlight, overlay gestures.
- Create `e2e/game.spec.ts`: Playwright smoke tests.

## Task 1: Scaffold The Vite App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`
- Create: `src/setupTests.ts`
- Create: `src/styles.css`
- Create: `src/App.tsx`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "rubiks-tic-tac-toe",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@react-three/drei": "^9.122.0",
    "@react-three/fiber": "^8.17.10",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.171.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: `node_modules/` is created and `package-lock.json` is written.

- [ ] **Step 3: Create base config files**

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rubik's Tic-Tac-Toe</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src", "e2e", "playwright.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Write `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Write `vite.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: "./src/setupTests.ts",
  },
});
```

- [ ] **Step 4: Create minimal React entry**

Write `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

Write `src/setupTests.ts`:

```ts
export {};
```

Write `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Write `src/styles.css`:

```css
* {
  box-sizing: border-box;
}

html,
body,
#root {
  width: 100%;
  min-width: 320px;
  min-height: 100%;
  margin: 0;
}

body {
  background: #eef2f7;
  color: #172033;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
}

button {
  font: inherit;
}

.app {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto minmax(420px, 1fr);
}

.game-shell {
  width: min(100vw, 1120px);
  margin: 0 auto;
  padding: 20px;
  display: grid;
  gap: 16px;
}

.scene-panel {
  min-height: 520px;
  border: 1px solid #cfd7e6;
  border-radius: 8px;
  background: #f9fbff;
  overflow: hidden;
}

@media (max-width: 720px) {
  .game-shell {
    padding: 12px;
  }

  .scene-panel {
    min-height: 430px;
  }
}
```

Write `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app">
      <div className="game-shell">
        <section className="scene-panel" aria-label="Game board">
          <p>Rubik's Tic-Tac-Toe</p>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Verify scaffold**

Run: `npm run build`

Expected: TypeScript and Vite build complete without errors.

- [ ] **Step 6: Commit scaffold**

```bash
git add package.json package-lock.json index.html tsconfig.json tsconfig.node.json vite.config.ts src/main.tsx src/vite-env.d.ts src/setupTests.ts src/styles.css src/App.tsx
git commit -m "chore: scaffold React Three app"
```

## Task 2: Implement Cube Geometry, Rotations, And Win Checks

**Files:**
- Create: `src/game/types.ts`
- Create: `src/game/geometry.ts`
- Create: `src/game/rotations.ts`
- Create: `src/game/win.ts`
- Create: `src/game/rotations.test.ts`
- Create: `src/game/win.test.ts`

- [ ] **Step 1: Write failing rotation and win tests**

Write `src/game/rotations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyBoard, cellKey } from "./types";
import { applyLayerRotation } from "./rotations";

describe("applyLayerRotation", () => {
  it("moves marks on the selected layer", () => {
    const board = createEmptyBoard();
    board[cellKey({ face: "front", row: 1, col: 1 })] = "X";

    const rotated = applyLayerRotation(board, {
      axis: "z",
      layerIndex: 2,
      direction: 1,
    });

    expect(rotated[cellKey({ face: "front", row: 1, col: 1 })]).toBe("X");
    expect(rotated).not.toBe(board);
  });

  it("returns to the original board after four equal quarter turns", () => {
    const board = createEmptyBoard();
    board[cellKey({ face: "front", row: 0, col: 1 })] = "X";
    board[cellKey({ face: "top", row: 2, col: 1 })] = "O";

    const rotation = { axis: "x", layerIndex: 1, direction: 1 } as const;
    const once = applyLayerRotation(board, rotation);
    const twice = applyLayerRotation(once, rotation);
    const three = applyLayerRotation(twice, rotation);
    const four = applyLayerRotation(three, rotation);

    expect(four).toEqual(board);
  });

  it("preserves the number of marks by owner", () => {
    const board = createEmptyBoard();
    board[cellKey({ face: "front", row: 0, col: 0 })] = "X";
    board[cellKey({ face: "right", row: 1, col: 1 })] = "O";
    board[cellKey({ face: "bottom", row: 2, col: 2 })] = "X";

    const rotated = applyLayerRotation(board, {
      axis: "y",
      layerIndex: 0,
      direction: -1,
    });

    expect(Object.values(rotated).filter((owner) => owner === "X")).toHaveLength(2);
    expect(Object.values(rotated).filter((owner) => owner === "O")).toHaveLength(1);
  });
});
```

Write `src/game/win.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cellKey, createEmptyBoard } from "./types";
import { getActiveFaceWinner, isFullBoardDraw } from "./win";

describe("getActiveFaceWinner", () => {
  it("detects a row win on the active face", () => {
    const board = createEmptyBoard();
    board[cellKey({ face: "front", row: 1, col: 0 })] = "X";
    board[cellKey({ face: "front", row: 1, col: 1 })] = "X";
    board[cellKey({ face: "front", row: 1, col: 2 })] = "X";

    expect(getActiveFaceWinner(board)).toEqual({
      winner: "X",
      line: [
        cellKey({ face: "front", row: 1, col: 0 }),
        cellKey({ face: "front", row: 1, col: 1 }),
        cellKey({ face: "front", row: 1, col: 2 }),
      ],
    });
  });

  it("detects a diagonal win on the active face", () => {
    const board = createEmptyBoard();
    board[cellKey({ face: "front", row: 0, col: 0 })] = "O";
    board[cellKey({ face: "front", row: 1, col: 1 })] = "O";
    board[cellKey({ face: "front", row: 2, col: 2 })] = "O";

    expect(getActiveFaceWinner(board)?.winner).toBe("O");
  });

  it("ignores a completed line on a non-active face", () => {
    const board = createEmptyBoard();
    board[cellKey({ face: "top", row: 0, col: 0 })] = "X";
    board[cellKey({ face: "top", row: 0, col: 1 })] = "X";
    board[cellKey({ face: "top", row: 0, col: 2 })] = "X";

    expect(getActiveFaceWinner(board)).toBeNull();
  });

  it("detects full-board draw only when all 54 cells are occupied", () => {
    const board = createEmptyBoard();
    for (const key of Object.keys(board)) {
      board[key] = "X";
    }
    board[cellKey({ face: "front", row: 0, col: 0 })] = "X";
    board[cellKey({ face: "front", row: 0, col: 1 })] = "O";
    board[cellKey({ face: "front", row: 0, col: 2 })] = "X";
    board[cellKey({ face: "front", row: 1, col: 0 })] = "O";
    board[cellKey({ face: "front", row: 1, col: 1 })] = "X";
    board[cellKey({ face: "front", row: 1, col: 2 })] = "O";
    board[cellKey({ face: "front", row: 2, col: 0 })] = "O";
    board[cellKey({ face: "front", row: 2, col: 1 })] = "X";
    board[cellKey({ face: "front", row: 2, col: 2 })] = "O";

    expect(isFullBoardDraw(board)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/game/rotations.test.ts src/game/win.test.ts`

Expected: FAIL because `src/game/types.ts`, `src/game/rotations.ts`, and `src/game/win.ts` do not exist.

- [ ] **Step 3: Implement shared types and geometry**

Write `src/game/types.ts`:

```ts
export type Player = "X" | "O";
export type Owner = Player | null;
export type Face = "front" | "back" | "left" | "right" | "top" | "bottom";
export type RowCol = 0 | 1 | 2;
export type Axis = "x" | "y" | "z";
export type LayerIndex = 0 | 1 | 2;
export type Direction = 1 | -1;

export type CellId = {
  face: Face;
  row: RowCol;
  col: RowCol;
};

export type CellKey = `${Face}:${RowCol}:${RowCol}`;
export type Board = Record<CellKey, Owner>;

export type LayerRotation = {
  axis: Axis;
  layerIndex: LayerIndex;
  direction: Direction;
};

export const ACTIVE_FACE: Face = "front";
export const faces: Face[] = ["front", "back", "left", "right", "top", "bottom"];
export const rows: RowCol[] = [0, 1, 2];
export const cols: RowCol[] = [0, 1, 2];

export function cellKey(cell: CellId): CellKey {
  return `${cell.face}:${cell.row}:${cell.col}`;
}

export function createEmptyBoard(): Board {
  const board = {} as Board;

  for (const face of faces) {
    for (const row of rows) {
      for (const col of cols) {
        board[cellKey({ face, row, col })] = null;
      }
    }
  }

  return board;
}

export function allCells(): CellId[] {
  return faces.flatMap((face) =>
    rows.flatMap((row) => cols.map((col) => ({ face, row, col }))),
  );
}

export function cloneBoard(board: Board): Board {
  return { ...board };
}
```

Write `src/game/geometry.ts`:

```ts
import type { Axis, CellId, Face, LayerIndex, RowCol } from "./types";

export type Coord = -1 | 0 | 1;

export type Vector3Int = {
  x: Coord;
  y: Coord;
  z: Coord;
};

export type Sticker = {
  position: Vector3Int;
  normal: Vector3Int;
};

const coordByLayer: Record<LayerIndex, Coord> = {
  0: -1,
  1: 0,
  2: 1,
};

function toRowCol(value: number): RowCol {
  if (value === 0 || value === 1 || value === 2) {
    return value;
  }
  throw new Error(`Invalid row or column: ${value}`);
}

function toCoord(value: number): Coord {
  if (value === -1 || value === 0 || value === 1) {
    return value;
  }
  throw new Error(`Invalid cube coordinate: ${value}`);
}

export function layerToCoord(layerIndex: LayerIndex): Coord {
  return coordByLayer[layerIndex];
}

export function cellToSticker(cell: CellId): Sticker {
  const col = cell.col;
  const row = cell.row;

  switch (cell.face) {
    case "front":
      return {
        position: { x: toCoord(col - 1), y: toCoord(1 - row), z: 1 },
        normal: { x: 0, y: 0, z: 1 },
      };
    case "back":
      return {
        position: { x: toCoord(1 - col), y: toCoord(1 - row), z: -1 },
        normal: { x: 0, y: 0, z: -1 },
      };
    case "right":
      return {
        position: { x: 1, y: toCoord(1 - row), z: toCoord(1 - col) },
        normal: { x: 1, y: 0, z: 0 },
      };
    case "left":
      return {
        position: { x: -1, y: toCoord(1 - row), z: toCoord(col - 1) },
        normal: { x: -1, y: 0, z: 0 },
      };
    case "top":
      return {
        position: { x: toCoord(col - 1), y: 1, z: toCoord(row - 1) },
        normal: { x: 0, y: 1, z: 0 },
      };
    case "bottom":
      return {
        position: { x: toCoord(col - 1), y: -1, z: toCoord(1 - row) },
        normal: { x: 0, y: -1, z: 0 },
      };
  }
}

export function stickerToCell(sticker: Sticker): CellId {
  const { position, normal } = sticker;

  if (normal.z === 1) {
    return {
      face: "front",
      row: toRowCol(1 - position.y),
      col: toRowCol(position.x + 1),
    };
  }

  if (normal.z === -1) {
    return {
      face: "back",
      row: toRowCol(1 - position.y),
      col: toRowCol(1 - position.x),
    };
  }

  if (normal.x === 1) {
    return {
      face: "right",
      row: toRowCol(1 - position.y),
      col: toRowCol(1 - position.z),
    };
  }

  if (normal.x === -1) {
    return {
      face: "left",
      row: toRowCol(1 - position.y),
      col: toRowCol(position.z + 1),
    };
  }

  if (normal.y === 1) {
    return {
      face: "top",
      row: toRowCol(position.z + 1),
      col: toRowCol(position.x + 1),
    };
  }

  if (normal.y === -1) {
    return {
      face: "bottom",
      row: toRowCol(1 - position.z),
      col: toRowCol(position.x + 1),
    };
  }

  throw new Error(`Invalid sticker normal for face mapping: ${JSON.stringify(normal)}`);
}

export function rotateVector(vector: Vector3Int, axis: Axis, direction: 1 | -1): Vector3Int {
  const { x, y, z } = vector;

  if (axis === "x") {
    return direction === 1
      ? { x, y: toCoord(-z), z: y }
      : { x, y: z, z: toCoord(-y) };
  }

  if (axis === "y") {
    return direction === 1
      ? { x: z, y, z: toCoord(-x) }
      : { x: toCoord(-z), y, z: x };
  }

  return direction === 1
    ? { x: toCoord(-y), y: x, z }
    : { x: y, y: toCoord(-x), z };
}

export function axisValue(position: Vector3Int, axis: Axis): Coord {
  return position[axis];
}

export function faceNormal(face: Face): Vector3Int {
  return cellToSticker({ face, row: 1, col: 1 }).normal;
}
```

- [ ] **Step 4: Implement rotations and active-face win checks**

Write `src/game/rotations.ts`:

```ts
import { axisValue, cellToSticker, layerToCoord, rotateVector, stickerToCell } from "./geometry";
import { allCells, cellKey, cloneBoard, type Board, type LayerRotation } from "./types";

export function applyLayerRotation(board: Board, rotation: LayerRotation): Board {
  const next = cloneBoard(board);
  const targetCoord = layerToCoord(rotation.layerIndex);

  for (const sourceCell of allCells()) {
    const sourceSticker = cellToSticker(sourceCell);

    if (axisValue(sourceSticker.position, rotation.axis) !== targetCoord) {
      continue;
    }

    const targetSticker = {
      position: rotateVector(sourceSticker.position, rotation.axis, rotation.direction),
      normal: rotateVector(sourceSticker.normal, rotation.axis, rotation.direction),
    };
    const targetCell = stickerToCell(targetSticker);

    next[cellKey(targetCell)] = board[cellKey(sourceCell)];
  }

  return next;
}
```

Write `src/game/win.ts`:

```ts
import { ACTIVE_FACE, cellKey, cols, rows, type Board, type CellKey, type Player } from "./types";

export type WinResult = {
  winner: Player;
  line: CellKey[];
};

export const activeFaceLines: CellKey[][] = [
  ...rows.map((row) => cols.map((col) => cellKey({ face: ACTIVE_FACE, row, col }))),
  ...cols.map((col) => rows.map((row) => cellKey({ face: ACTIVE_FACE, row, col }))),
  [
    cellKey({ face: ACTIVE_FACE, row: 0, col: 0 }),
    cellKey({ face: ACTIVE_FACE, row: 1, col: 1 }),
    cellKey({ face: ACTIVE_FACE, row: 2, col: 2 }),
  ],
  [
    cellKey({ face: ACTIVE_FACE, row: 0, col: 2 }),
    cellKey({ face: ACTIVE_FACE, row: 1, col: 1 }),
    cellKey({ face: ACTIVE_FACE, row: 2, col: 0 }),
  ],
];

export function getActiveFaceWinner(board: Board): WinResult | null {
  for (const line of activeFaceLines) {
    const [first, second, third] = line;
    const owner = board[first];

    if (owner && owner === board[second] && owner === board[third]) {
      return { winner: owner, line };
    }
  }

  return null;
}

export function isFullBoardDraw(board: Board): boolean {
  return Object.values(board).every(Boolean) && getActiveFaceWinner(board) === null;
}
```

- [ ] **Step 5: Run model tests**

Run: `npm test -- --run src/game/rotations.test.ts src/game/win.test.ts`

Expected: PASS for all tests in both files.

- [ ] **Step 6: Commit geometry and rotation model**

```bash
git add src/game/types.ts src/game/geometry.ts src/game/rotations.ts src/game/win.ts src/game/rotations.test.ts src/game/win.test.ts
git commit -m "feat: add cube board rotation model"
```

## Task 3: Implement Turn State And Game Rules

**Files:**
- Create: `src/game/board.ts`
- Create: `src/game/board.test.ts`

- [ ] **Step 1: Write failing game-state tests**

Write `src/game/board.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyTurnRotation, createGameState, placeMark, startNewGame, undoTurnRotation } from "./board";
import { cellKey, createEmptyBoard } from "./types";

describe("game state", () => {
  it("starts with X, an empty board, and the active front face", () => {
    const state = createGameState();

    expect(state.currentPlayer).toBe("X");
    expect(state.activeFace).toBe("front");
    expect(Object.values(state.board).every((owner) => owner === null)).toBe(true);
  });

  it("places a mark on a free active-face cell and switches player", () => {
    const state = createGameState();
    const next = placeMark(state, { face: "front", row: 0, col: 0 });

    expect(next.board[cellKey({ face: "front", row: 0, col: 0 })]).toBe("X");
    expect(next.currentPlayer).toBe("O");
  });

  it("ignores placement on non-active faces", () => {
    const state = createGameState();
    const next = placeMark(state, { face: "top", row: 0, col: 0 });

    expect(next).toBe(state);
  });

  it("ignores placement on occupied active-face cells", () => {
    const state = placeMark(createGameState(), { face: "front", row: 0, col: 0 });
    const next = placeMark(state, { face: "front", row: 0, col: 0 });

    expect(next).toBe(state);
  });

  it("allows one optional rotation before placement", () => {
    const state = createGameState();
    const rotated = applyTurnRotation(state, { axis: "x", layerIndex: 1, direction: 1 });

    expect(rotated.rotationUsed).toBe(true);
    expect(rotated.pendingUndoBoard).toBe(state.board);
  });

  it("blocks a second rotation in the same turn", () => {
    const state = createGameState();
    const rotated = applyTurnRotation(state, { axis: "x", layerIndex: 1, direction: 1 });
    const blocked = applyTurnRotation(rotated, { axis: "y", layerIndex: 1, direction: -1 });

    expect(blocked).toBe(rotated);
  });

  it("undoes the current-turn rotation before placement", () => {
    const state = createGameState();
    const rotated = applyTurnRotation(state, { axis: "x", layerIndex: 1, direction: 1 });
    const undone = undoTurnRotation(rotated);

    expect(undone.board).toEqual(state.board);
    expect(undone.rotationUsed).toBe(false);
    expect(undone.pendingUndoBoard).toBeNull();
  });

  it("clears undo after placement", () => {
    const state = createGameState();
    const rotated = applyTurnRotation(state, { axis: "x", layerIndex: 1, direction: 1 });
    const placed = placeMark(rotated, { face: "front", row: 0, col: 0 });

    expect(placed.pendingUndoBoard).toBeNull();
    expect(placed.rotationUsed).toBe(false);
  });

  it("detects an active-face win and locks the game", () => {
    let state = createGameState();
    state = placeMark(state, { face: "front", row: 0, col: 0 });
    state = placeMark(state, { face: "front", row: 1, col: 0 });
    state = placeMark(state, { face: "front", row: 0, col: 1 });
    state = placeMark(state, { face: "front", row: 1, col: 1 });
    state = placeMark(state, { face: "front", row: 0, col: 2 });

    expect(state.status).toBe("won");
    expect(state.winner).toBe("X");
    expect(state.winningLine).toHaveLength(3);
  });

  it("detects a full-board draw with no active-face winner", () => {
    const board = createEmptyBoard();
    for (const key of Object.keys(board)) {
      board[key] = "X";
    }
    board[cellKey({ face: "front", row: 0, col: 0 })] = "X";
    board[cellKey({ face: "front", row: 0, col: 1 })] = "O";
    board[cellKey({ face: "front", row: 0, col: 2 })] = "X";
    board[cellKey({ face: "front", row: 1, col: 0 })] = "O";
    board[cellKey({ face: "front", row: 1, col: 1 })] = "X";
    board[cellKey({ face: "front", row: 1, col: 2 })] = "O";
    board[cellKey({ face: "front", row: 2, col: 0 })] = "O";
    board[cellKey({ face: "front", row: 2, col: 1 })] = "X";
    board[cellKey({ face: "front", row: 2, col: 2 })] = "O";

    const state = createGameState(board);

    expect(state.status).toBe("draw");
  });

  it("starts a new empty game", () => {
    const state = placeMark(createGameState(), { face: "front", row: 0, col: 0 });
    const fresh = startNewGame(state);

    expect(fresh.currentPlayer).toBe("X");
    expect(Object.values(fresh.board).every((owner) => owner === null)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --run src/game/board.test.ts`

Expected: FAIL because `src/game/board.ts` does not exist.

- [ ] **Step 3: Implement game state transitions**

Write `src/game/board.ts`:

```ts
import { applyLayerRotation } from "./rotations";
import { getActiveFaceWinner, isFullBoardDraw } from "./win";
import {
  ACTIVE_FACE,
  cellKey,
  cloneBoard,
  createEmptyBoard,
  type Board,
  type CellId,
  type CellKey,
  type Face,
  type LayerRotation,
  type Player,
} from "./types";

export type GameStatus = "playing" | "won" | "draw";

export type GameState = {
  board: Board;
  activeFace: Face;
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  winningLine: CellKey[];
  rotationUsed: boolean;
  pendingUndoBoard: Board | null;
};

function nextPlayer(player: Player): Player {
  return player === "X" ? "O" : "X";
}

function finalizeState(state: GameState): GameState {
  const win = getActiveFaceWinner(state.board);

  if (win) {
    return {
      ...state,
      status: "won",
      winner: win.winner,
      winningLine: win.line,
    };
  }

  if (isFullBoardDraw(state.board)) {
    return {
      ...state,
      status: "draw",
      winner: null,
      winningLine: [],
    };
  }

  return {
    ...state,
    status: "playing",
    winner: null,
    winningLine: [],
  };
}

export function createGameState(board = createEmptyBoard()): GameState {
  return finalizeState({
    board,
    activeFace: ACTIVE_FACE,
    currentPlayer: "X",
    status: "playing",
    winner: null,
    winningLine: [],
    rotationUsed: false,
    pendingUndoBoard: null,
  });
}

export function canPlaceMark(state: GameState, cell: CellId): boolean {
  return (
    state.status === "playing" &&
    cell.face === state.activeFace &&
    state.board[cellKey(cell)] === null
  );
}

export function placeMark(state: GameState, cell: CellId): GameState {
  if (!canPlaceMark(state, cell)) {
    return state;
  }

  const board = cloneBoard(state.board);
  board[cellKey(cell)] = state.currentPlayer;

  const placedState = finalizeState({
    ...state,
    board,
    rotationUsed: false,
    pendingUndoBoard: null,
  });

  if (placedState.status !== "playing") {
    return placedState;
  }

  return {
    ...placedState,
    currentPlayer: nextPlayer(state.currentPlayer),
  };
}

export function applyTurnRotation(state: GameState, rotation: LayerRotation): GameState {
  if (state.status !== "playing" || state.rotationUsed) {
    return state;
  }

  return {
    ...state,
    board: applyLayerRotation(state.board, rotation),
    rotationUsed: true,
    pendingUndoBoard: state.board,
  };
}

export function undoTurnRotation(state: GameState): GameState {
  if (state.status !== "playing" || !state.rotationUsed || !state.pendingUndoBoard) {
    return state;
  }

  return {
    ...state,
    board: state.pendingUndoBoard,
    rotationUsed: false,
    pendingUndoBoard: null,
  };
}

export function startNewGame(_state?: GameState): GameState {
  return createGameState();
}
```

- [ ] **Step 4: Run game-state tests**

Run: `npm test -- --run src/game/board.test.ts`

Expected: PASS for all game-state tests.

- [ ] **Step 5: Run all unit tests**

Run: `npm test -- --run`

Expected: PASS for all tests.

- [ ] **Step 6: Commit game-state model**

```bash
git add src/game/board.ts src/game/board.test.ts
git commit -m "feat: add turn state rules"
```

## Task 4: Implement Rotation Gesture Resolution

**Files:**
- Create: `src/game/gesture.ts`
- Create: `src/game/gesture.test.ts`

- [ ] **Step 1: Write failing gesture tests**

Write `src/game/gesture.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveRotationGesture } from "./gesture";

const bounds = {
  left: 0,
  top: 0,
  width: 300,
  height: 300,
};

describe("resolveRotationGesture", () => {
  it("maps horizontal swipes inside the cube to y-axis layer rotations", () => {
    expect(
      resolveRotationGesture(bounds, { x: 50, y: 80 }, { x: 190, y: 82 }),
    ).toEqual({
      axis: "y",
      layerIndex: 2,
      direction: 1,
    });
  });

  it("maps vertical swipes inside the cube to x-axis layer rotations", () => {
    expect(
      resolveRotationGesture(bounds, { x: 225, y: 70 }, { x: 224, y: 210 }),
    ).toEqual({
      axis: "x",
      layerIndex: 2,
      direction: -1,
    });
  });

  it("maps circular ring drags to z-axis layer rotations", () => {
    expect(
      resolveRotationGesture(bounds, { x: 150, y: 2 }, { x: 292, y: 150 }),
    ).toEqual({
      axis: "z",
      layerIndex: 2,
      direction: 1,
    });
  });

  it("returns null for short gestures", () => {
    expect(resolveRotationGesture(bounds, { x: 150, y: 150 }, { x: 158, y: 154 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run gesture tests to verify they fail**

Run: `npm test -- --run src/game/gesture.test.ts`

Expected: FAIL because `src/game/gesture.ts` does not exist.

- [ ] **Step 3: Implement gesture resolver**

Write `src/game/gesture.ts`:

```ts
import type { LayerRotation, LayerIndex } from "./types";

export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const minDragDistance = 32;

function clampLayer(layer: number): LayerIndex {
  if (layer <= 0) {
    return 0;
  }
  if (layer >= 2) {
    return 2;
  }
  return 1;
}

function layerFromRatio(ratio: number): LayerIndex {
  return clampLayer(Math.floor(Math.min(0.999, Math.max(0, ratio)) * 3));
}

function distance(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function angle(point: Point, center: Point): number {
  return Math.atan2(point.y - center.y, point.x - center.x);
}

function normalizedSquare(bounds: Rect) {
  const size = Math.min(bounds.width, bounds.height) * 0.72;
  const left = bounds.left + (bounds.width - size) / 2;
  const top = bounds.top + (bounds.height - size) / 2;

  return {
    left,
    top,
    size,
    right: left + size,
    bottom: top + size,
  };
}

function isInsideSquare(point: Point, square: ReturnType<typeof normalizedSquare>): boolean {
  return point.x >= square.left && point.x <= square.right && point.y >= square.top && point.y <= square.bottom;
}

export function resolveRotationGesture(bounds: Rect, start: Point, end: Point): LayerRotation | null {
  if (distance(start, end) < minDragDistance) {
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
      direction: dy > 0 ? -1 : 1,
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
```

- [ ] **Step 4: Run gesture tests**

Run: `npm test -- --run src/game/gesture.test.ts`

Expected: PASS for all gesture tests.

- [ ] **Step 5: Commit gesture resolver**

```bash
git add src/game/gesture.ts src/game/gesture.test.ts
git commit -m "feat: resolve layer rotation gestures"
```

## Task 5: Build Game HUD And App State Wiring

**Files:**
- Create: `src/components/GameHud.tsx`
- Create: `src/components/GameHud.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement HUD component**

Write `src/components/GameHud.tsx`:

```tsx
import type { GameState } from "../game/board";
import "./GameHud.css";

type GameHudProps = {
  game: GameState;
  rotateModeArmed: boolean;
  onArmRotateMode: () => void;
  onUndoRotation: () => void;
  onNewGame: () => void;
};

function statusText(game: GameState, rotateModeArmed: boolean): string {
  if (game.status === "won" && game.winner) {
    return `${game.winner} wins`;
  }

  if (game.status === "draw") {
    return "Draw";
  }

  if (rotateModeArmed) {
    return "Drag a layer to rotate";
  }

  if (game.rotationUsed) {
    return `Place ${game.currentPlayer}`;
  }

  return `Rotate a layer or place ${game.currentPlayer}`;
}

export function GameHud({
  game,
  rotateModeArmed,
  onArmRotateMode,
  onUndoRotation,
  onNewGame,
}: GameHudProps) {
  const rotationDisabled = game.status !== "playing" || game.rotationUsed || rotateModeArmed;
  const undoDisabled = game.status !== "playing" || !game.rotationUsed;

  return (
    <header className="game-hud">
      <div className="turn-block">
        <span className="eyebrow">Current player</span>
        <strong className={`player-mark player-${game.currentPlayer.toLowerCase()}`}>
          {game.currentPlayer}
        </strong>
      </div>

      <p className="status-text" role="status">
        {statusText(game, rotateModeArmed)}
      </p>

      <div className="hud-actions">
        <button type="button" onClick={onArmRotateMode} disabled={rotationDisabled}>
          Rotate layer
        </button>
        <button type="button" onClick={onUndoRotation} disabled={undoDisabled}>
          Undo rotation
        </button>
        <button type="button" onClick={onNewGame}>
          New game
        </button>
      </div>
    </header>
  );
}
```

Write `src/components/GameHud.css`:

```css
.game-hud {
  display: grid;
  grid-template-columns: auto minmax(180px, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid #cfd7e6;
  border-radius: 8px;
  background: #ffffff;
}

.turn-block {
  display: grid;
  gap: 4px;
}

.eyebrow {
  color: #607089;
  font-size: 12px;
  text-transform: uppercase;
}

.player-mark {
  font-size: 28px;
  line-height: 1;
}

.player-x {
  color: #172033;
}

.player-o {
  color: #d23b4b;
}

.status-text {
  margin: 0;
  color: #283449;
  font-weight: 700;
  text-align: center;
}

.hud-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.hud-actions button {
  min-height: 38px;
  border: 1px solid #b8c4d8;
  border-radius: 7px;
  background: #ffffff;
  color: #172033;
  cursor: pointer;
  padding: 0 12px;
}

.hud-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

@media (max-width: 760px) {
  .game-hud {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .status-text {
    text-align: left;
  }

  .hud-actions {
    justify-content: stretch;
  }

  .hud-actions button {
    flex: 1 1 140px;
  }
}
```

- [ ] **Step 2: Wire game state in `App.tsx`**

Write `src/App.tsx`:

```tsx
import { useState } from "react";
import { GameHud } from "./components/GameHud";
import { applyTurnRotation, createGameState, placeMark, startNewGame, undoTurnRotation } from "./game/board";
import type { CellId, LayerRotation } from "./game/types";

export default function App() {
  const [game, setGame] = useState(() => createGameState());
  const [rotateModeArmed, setRotateModeArmed] = useState(false);

  function handlePlaceMark(cell: CellId) {
    setGame((current) => placeMark(current, cell));
    setRotateModeArmed(false);
  }

  function handleLayerRotation(rotation: LayerRotation | null) {
    if (!rotation) {
      return;
    }

    setGame((current) => applyTurnRotation(current, rotation));
    setRotateModeArmed(false);
  }

  function handleNewGame() {
    setGame((current) => startNewGame(current));
    setRotateModeArmed(false);
  }

  return (
    <main className="app">
      <div className="game-shell">
        <GameHud
          game={game}
          rotateModeArmed={rotateModeArmed}
          onArmRotateMode={() => setRotateModeArmed(true)}
          onUndoRotation={() => setGame((current) => undoTurnRotation(current))}
          onNewGame={handleNewGame}
        />

        <section className="scene-panel" aria-label="Game board">
          <p>
            Cube scene will render here. Active player: {game.currentPlayer}. Rotation armed:{" "}
            {rotateModeArmed ? "yes" : "no"}.
          </p>
          <button type="button" onClick={() => handlePlaceMark({ face: "front", row: 0, col: 0 })}>
            Temporary place mark
          </button>
          <button type="button" onClick={() => handleLayerRotation(null)}>
            Temporary no-op rotation
          </button>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Commit HUD and app wiring**

```bash
git add src/components/GameHud.tsx src/components/GameHud.css src/App.tsx
git commit -m "feat: add game HUD state wiring"
```

## Task 6: Render The 3D Cube And Handle Player Interaction

**Files:**
- Create: `src/components/CubeScene.tsx`
- Create: `src/components/CubeScene.css`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement cube scene component**

Write `src/components/CubeScene.tsx`:

```tsx
import { Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { cellToSticker } from "../game/geometry";
import { resolveRotationGesture, type Point } from "../game/gesture";
import { canPlaceMark, type GameState } from "../game/board";
import { allCells, cellKey, cols, rows, type CellId, type CellKey, type Face, type LayerRotation } from "../game/types";
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
        return <Sticker key={key} cell={cell} owner={game.board[key]} highlighted={highlighted.has(key)} />;
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

    const frame = requestAnimationFrame(() => {
      setViewRotation(([x, y]) => [x * 0.82, y * 0.82]);
    });

    return () => cancelAnimationFrame(frame);
  }, [drag, viewRotation]);

  function pointFromEvent(event: React.PointerEvent): Point {
    return { x: event.clientX, y: event.clientY };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    setDrag({ start: point, latest: point, moved: false });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
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

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
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
```

Write `src/components/CubeScene.css`:

```css
.cube-scene {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 520px;
  background: radial-gradient(circle at 50% 36%, #ffffff 0%, #edf3fb 72%);
}

.cube-scene canvas {
  display: block;
}

.cube-interaction-layer {
  position: absolute;
  inset: 0;
  touch-action: none;
  cursor: grab;
}

.cube-interaction-layer:active {
  cursor: grabbing;
}

.active-face-grid {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  width: min(42vw, 248px);
  max-width: 248px;
  aspect-ratio: 1;
  grid-template-columns: repeat(3, 1fr);
  transform: translate(-50%, -50%);
}

.active-face-cell {
  border: 0;
  background: transparent;
  cursor: pointer;
}

.active-face-cell:disabled {
  cursor: default;
}

.z-gesture-rings {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(58vw, 340px);
  max-width: 340px;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
}

.z-gesture-rings span {
  position: absolute;
  border: 1px dashed #4267ff;
  border-radius: 50%;
}

.z-gesture-rings span:nth-child(1) {
  inset: 6%;
}

.z-gesture-rings span:nth-child(2) {
  inset: 15%;
}

.z-gesture-rings span:nth-child(3) {
  inset: 24%;
}

.rotation-armed .z-gesture-rings {
  opacity: 0.72;
}

@media (max-width: 720px) {
  .cube-scene {
    min-height: 430px;
  }

  .active-face-grid {
    width: min(56vw, 224px);
  }
}
```

- [ ] **Step 2: Replace temporary `App.tsx` scene markup**

Write `src/App.tsx`:

```tsx
import { useState } from "react";
import { CubeScene } from "./components/CubeScene";
import { GameHud } from "./components/GameHud";
import { applyTurnRotation, createGameState, placeMark, startNewGame, undoTurnRotation } from "./game/board";
import type { CellId, LayerRotation } from "./game/types";

export default function App() {
  const [game, setGame] = useState(() => createGameState());
  const [rotateModeArmed, setRotateModeArmed] = useState(false);

  function handlePlaceMark(cell: CellId) {
    setGame((current) => placeMark(current, cell));
    setRotateModeArmed(false);
  }

  function handleLayerRotation(rotation: LayerRotation | null) {
    if (!rotation) {
      return;
    }

    setGame((current) => applyTurnRotation(current, rotation));
    setRotateModeArmed(false);
  }

  function handleNewGame() {
    setGame((current) => startNewGame(current));
    setRotateModeArmed(false);
  }

  return (
    <main className="app">
      <div className="game-shell">
        <GameHud
          game={game}
          rotateModeArmed={rotateModeArmed}
          onArmRotateMode={() => setRotateModeArmed(true)}
          onUndoRotation={() => setGame((current) => undoTurnRotation(current))}
          onNewGame={handleNewGame}
        />

        <section className="scene-panel" aria-label="Game board">
          <CubeScene
            game={game}
            rotateModeArmed={rotateModeArmed}
            onPlaceMark={handlePlaceMark}
            onLayerRotation={handleLayerRotation}
          />
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify app build and unit tests**

Run: `npm test -- --run`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Commit 3D scene and interactions**

```bash
git add src/components/CubeScene.tsx src/components/CubeScene.css src/App.tsx
git commit -m "feat: render interactive cube scene"
```

## Task 7: Add Browser Smoke Tests And Final Verification

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/game.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Create Playwright config**

Write `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

- [ ] **Step 2: Write smoke tests**

Write `e2e/game.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("renders a non-empty cube canvas", async ({ page }) => {
  await page.goto("/");

  const canvas = page.getByTestId("cube-canvas");
  await expect(canvas).toBeVisible();

  const nonEmptyPixels = await canvas.evaluate((element) => {
    const canvasElement =
      element instanceof HTMLCanvasElement ? element : element.querySelector("canvas");

    if (!canvasElement) {
      return 0;
    }

    const target = document.createElement("canvas");
    target.width = canvasElement.width;
    target.height = canvasElement.height;
    const context = target.getContext("2d");

    if (!context) {
      return 0;
    }

    context.drawImage(canvasElement, 0, 0);
    const data = context.getImageData(0, 0, target.width, target.height).data;
    let count = 0;

    for (let index = 0; index < data.length; index += 16) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const alpha = data[index + 3];

      if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
        count += 1;
      }
    }

    return count;
  });

  expect(nonEmptyPixels).toBeGreaterThan(1000);
});

test("allows placing a mark and starting a new game", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("status")).toContainText("Rotate a layer or place X");
  await page.getByLabel("Place on row 1, column 1").click();
  await expect(page.getByRole("status")).toContainText("Rotate a layer or place O");

  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.getByRole("status")).toContainText("Rotate a layer or place X");
});

test("arms rotate mode and keeps it armed after an ambiguous drag", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Rotate layer" }).click();
  await expect(page.getByRole("status")).toContainText("Drag a layer to rotate");

  const box = await page.locator(".cube-interaction-layer").boundingBox();
  if (!box) {
    throw new Error("Missing interaction layer");
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 4, box.y + box.height / 2 + 4);
  await page.mouse.up();

  await expect(page.getByRole("status")).toContainText("Drag a layer to rotate");
});
```

- [ ] **Step 3: Run full verification**

Run: `npm test -- --run`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

Run: `npx playwright install chromium`

Expected: Chromium browser is installed or already present.

Run: `npm run e2e`

Expected: PASS for all Chromium smoke tests.

- [ ] **Step 4: Start local dev server for manual review**

Run: `npm run dev -- --host 127.0.0.1`

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`. Keep the session running and provide the URL to the user.

- [ ] **Step 5: Commit browser tests and final verification setup**

```bash
git add playwright.config.ts e2e/game.spec.ts package.json package-lock.json
git commit -m "test: add browser smoke coverage"
```

## Self-Review Checklist

- Spec coverage: Tasks cover scaffold, full 54-cell model, fixed active face, optional one-layer rotation, active-face placement, active-face win checks, undo current-turn rotation, new game, HUD, Three.js rendering, drag inspection, rotate mode, unit tests, and Playwright smoke tests.
- Scope check: Online multiplayer, AI, score history, timer, sound, persistence, and heavy animation polish are omitted as specified.
- Type consistency: `Player`, `Owner`, `Face`, `CellId`, `Board`, `LayerRotation`, and `GameState` are defined before use and reused across tasks.
- Execution risk: gesture access to all three axes is handled by row/column swipes inside the active face for `x`/`y` layers and circular ring drags around the cube for `z` layers.
