import { describe, expect, it } from "vitest";
import {
  applyTurnRotation,
  createGameState,
  placeMark,
  startNewGame,
  undoTurnRotation,
} from "./board";
import { cellKey, createEmptyBoard, type CellKey } from "./types";

describe("game state", () => {
  it("starts with X, an empty board, and the active front face", () => {
    const state = createGameState();

    expect(state.currentPlayer).toBe("X");
    expect(state.activeFace).toBe("front");
    expect(Object.values(state.board).every((owner) => owner === null)).toBe(true);
  });

  it("clones an incoming board when creating game state", () => {
    const board = createEmptyBoard();
    const state = createGameState(board);

    board[cellKey({ face: "front", row: 0, col: 0 })] = "X";

    expect(state.board[cellKey({ face: "front", row: 0, col: 0 })]).toBeNull();
    expect(state.board).not.toBe(board);
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

  it("places a mark without mutating the original board", () => {
    const state = createGameState();
    const next = placeMark(state, { face: "front", row: 0, col: 0 });

    expect(next.board).not.toBe(state.board);
    expect(state.board[cellKey({ face: "front", row: 0, col: 0 })]).toBeNull();
  });

  it("allows one optional rotation before placement", () => {
    const state = createGameState();
    const rotated = applyTurnRotation(state, { axis: "x", layerIndex: 1, direction: 1 });

    expect(rotated.rotationUsed).toBe(true);
    expect(rotated.pendingUndoBoard).toEqual(state.board);
    expect(rotated.pendingUndoBoard).not.toBe(state.board);
  });

  it("rotates without mutating the original board", () => {
    const state = placeMark(createGameState(), { face: "front", row: 0, col: 0 });
    const rotated = applyTurnRotation(state, { axis: "z", layerIndex: 2, direction: 1 });

    expect(rotated.board).not.toBe(state.board);
    expect(state.board[cellKey({ face: "front", row: 0, col: 0 })]).toBe("X");
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
    expect(undone.board).not.toBe(state.board);
    expect(undone.board).not.toBe(rotated.pendingUndoBoard);
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

  it("ignores placement after the game is won", () => {
    let state = createGameState();
    state = placeMark(state, { face: "front", row: 0, col: 0 });
    state = placeMark(state, { face: "front", row: 1, col: 0 });
    state = placeMark(state, { face: "front", row: 0, col: 1 });
    state = placeMark(state, { face: "front", row: 1, col: 1 });
    state = placeMark(state, { face: "front", row: 0, col: 2 });

    const next = placeMark(state, { face: "front", row: 2, col: 2 });

    expect(next).toBe(state);
  });

  it("ignores rotation after the game is won", () => {
    let state = createGameState();
    state = placeMark(state, { face: "front", row: 0, col: 0 });
    state = placeMark(state, { face: "front", row: 1, col: 0 });
    state = placeMark(state, { face: "front", row: 0, col: 1 });
    state = placeMark(state, { face: "front", row: 1, col: 1 });
    state = placeMark(state, { face: "front", row: 0, col: 2 });

    const next = applyTurnRotation(state, { axis: "x", layerIndex: 1, direction: 1 });

    expect(next).toBe(state);
  });

  it("ignores undo after the game is won", () => {
    let state = createGameState();
    state = placeMark(state, { face: "front", row: 0, col: 0 });
    state = placeMark(state, { face: "front", row: 1, col: 0 });
    state = placeMark(state, { face: "front", row: 0, col: 1 });
    state = placeMark(state, { face: "front", row: 1, col: 1 });
    state = placeMark(state, { face: "front", row: 0, col: 2 });

    const next = undoTurnRotation(state);

    expect(next).toBe(state);
  });

  it("detects a full-board draw with no active-face winner", () => {
    const board = createEmptyBoard();
    for (const key of Object.keys(board) as CellKey[]) {
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

  it("ignores rotation after the game is drawn", () => {
    const board = createDrawBoard();
    const state = createGameState(board);
    const next = applyTurnRotation(state, { axis: "x", layerIndex: 1, direction: 1 });

    expect(next).toBe(state);
  });

  it("ignores undo after the game is drawn", () => {
    const board = createDrawBoard();
    const state = createGameState(board);
    const next = undoTurnRotation(state);

    expect(next).toBe(state);
  });

  it("starts a new empty game", () => {
    const state = placeMark(createGameState(), { face: "front", row: 0, col: 0 });
    const fresh = startNewGame(state);

    expect(fresh.currentPlayer).toBe("X");
    expect(Object.values(fresh.board).every((owner) => owner === null)).toBe(true);
  });
});

function createDrawBoard() {
  const board = createEmptyBoard();
  for (const key of Object.keys(board) as CellKey[]) {
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

  return board;
}
