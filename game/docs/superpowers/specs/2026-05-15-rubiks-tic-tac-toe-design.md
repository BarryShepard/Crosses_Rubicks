# Rubik's Tic-Tac-Toe Design

## Goal

Build a browser mini game for two local players on one device: tic-tac-toe played on a Rubik's-cube-like field. Players place X/O only on one fixed active face, while optional Rubik-style layer rotations move existing marks around the full cube and change which marks appear on the active face.

## Scope

Included in the first prototype:

- Full cube model with 6 faces and 54 playable cells.
- One fixed active face, shown front-facing by default.
- Local two-player turn order on one device.
- Optional layer rotation before placing a mark.
- Rotation of any cube layer: 3 axes, 3 layers per axis, 2 directions.
- Temporary drag inspection of the cube, with automatic return to front view after release.
- Dedicated "rotate layer" mode for interpreting the next drag as a layer rotation.
- Mark placement only on empty cells of the active face.
- Win detection only on the active face.
- New game, undo current-turn rotation, current player indicator, and winning-line highlight.

Out of scope for the first prototype:

- Online multiplayer.
- AI opponent.
- Score history across games.
- Timer.
- Sound.
- Persistence.
- Polished production animation beyond clear basic feedback.

## Game Rules

X moves first. On each turn, the current player may make zero or one layer rotation before placing their mark.

The active face is fixed for the whole game. It is the face shown front-facing in the default orientation. Players can place marks only on this face. The other faces can be inspected, and their marks can move due to layer rotations, but players cannot place directly on them.

A layer rotation selects one of three axes, one of three layers on that axis, and one of two 90-degree directions. A successful rotation moves all existing X/O marks with the affected cells. After the player places a mark, the turn passes to the other player.

Victory is checked only on the active face. A player wins by having three of their marks in a row, column, or diagonal on that face. When a win is found, the winning line is highlighted and the game is locked until a new game starts.

A draw occurs when no legal move can produce an empty active-face cell for placement. For the first prototype, this is implemented as all 54 cube cells being occupied and no active-face victory existing.

## Interaction Design

The main screen is the game itself. There is no landing page.

The cube is centered and shown front-facing by default. The active face has a clear visual treatment such as a frame or soft highlight. X and O appear attached to cells so that layer rotations visibly carry them to new faces.

The HUD shows:

- Current player.
- Short status text, such as "X to move", "Rotate layer or place X", "Place O", or "X wins".
- `Rotate layer` button.
- `Undo rotation` button.
- `New game` button.

Normal drag on the cube inspects the cube. During inspection, the cube may rotate freely enough to see non-active faces. Releasing the pointer starts a smooth return to the front-facing default orientation. This inspection never counts as a move.

Pressing `Rotate layer` arms layer-rotation mode. The next valid drag over the cube is interpreted as a layer-rotation attempt. If the drag is too short or ambiguous, no rotation is applied and the mode remains armed. If the drag is valid, the game applies one layer rotation, disables further rotations for this turn, and enables `Undo rotation`.

Clicking or tapping a free cell on the active face places the current player's mark if the game is not over and no animation is blocking input.

`Undo rotation` is available only after a successful current-turn rotation and before mark placement. It restores the board to the pre-rotation state and re-enables the rotation option for that turn.

## Architecture

Use a small Vite + React + TypeScript application with Three.js rendered through `@react-three/fiber`.

Keep game logic independent from Three.js. The 3D scene reads state and emits actions, but it is not the source of truth.

Recommended modules:

- `src/game/board.ts`: game state, active face, current player, turn status, placement rules, undo state.
- `src/game/rotations.ts`: pure functions for applying and reversing layer rotations.
- `src/game/win.ts`: active-face win and draw detection.
- `src/components/CubeScene.tsx`: 3D cube rendering, marks, highlights, pointer interaction, and animation hooks.
- `src/components/GameHud.tsx`: current player, status text, and controls.
- `src/App.tsx`: app-level state wiring between game model, HUD, and scene.

## Data Model

Represent the board as 54 cells:

```ts
type Player = "X" | "O";
type Owner = Player | null;
type Face = "front" | "back" | "left" | "right" | "top" | "bottom";

type CellId = {
  face: Face;
  row: 0 | 1 | 2;
  col: 0 | 1 | 2;
};

type Board = Record<string, Owner>;
```

The active face is fixed as `front` in the game model. Display orientation may temporarily change during inspection, but this does not change the active face.

Layer rotation functions accept:

```ts
type Axis = "x" | "y" | "z";
type LayerIndex = 0 | 1 | 2;
type Direction = 1 | -1;
```

They return a new board with owners moved to their new cell ids. They should not mutate existing state.

## Error Handling And Edge Cases

Invalid interactions are ignored with clear UI state rather than treated as errors:

- Clicking a non-active face does not place a mark.
- Clicking an occupied active-face cell does not place a mark.
- Trying to rotate after a successful current-turn rotation does nothing unless the previous rotation is undone.
- Trying to undo after mark placement is not allowed.
- A drag below the threshold in rotation mode applies no rotation and keeps the mode active.
- Inputs are blocked during layer-rotation and return-to-front animations if accepting them would create inconsistent state.

## Testing Strategy

Unit tests should cover the pure game model:

- Initial board state.
- Legal and illegal mark placement.
- Player switching after placement.
- Optional rotation before placement.
- Blocking a second rotation in the same turn.
- Undoing the current-turn rotation before placement.
- Preventing undo after placement.
- Active-face row, column, and diagonal wins.
- Ignoring wins on non-active faces.
- Draw detection when all 54 cells are occupied and there is no active-face winner.
- Rotation functions preserving the number and ownership of marks.

Browser smoke tests should cover:

- The app loads.
- The cube scene renders non-empty content.
- A mark can be placed on the active face.
- `New game` clears the board.

## Acceptance Criteria

- Two players can complete a local game on one device.
- The cube starts and returns to a stable front-facing view.
- Players can inspect all faces without consuming a move.
- Players can optionally rotate one valid layer before placing a mark.
- Marks move with layer rotations.
- Marks can be placed only on the fixed active face.
- Wins are detected only on the fixed active face.
- The winner is clearly shown and the winning line is highlighted.
- The game can be restarted without refreshing the page.
