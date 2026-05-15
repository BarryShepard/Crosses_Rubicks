import { describe, expect, it } from "vitest";
import { cellKey, createEmptyBoard, type Board, type CellKey } from "./types";
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
      board[key as CellKey] = "X";
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

  it("does not detect a full-board draw when any cell is empty", () => {
    const board = createEmptyBoard();
    for (const key of Object.keys(board)) {
      board[key as CellKey] = "X";
    }
    board[cellKey({ face: "front", row: 0, col: 0 })] = null;

    expect(isFullBoardDraw(board)).toBe(false);
  });

  it("does not detect a full-board draw when an expected cell key is missing", () => {
    const board = createEmptyBoard() as Partial<Board>;
    for (const key of Object.keys(board)) {
      board[key as CellKey] = "X";
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

    delete board[cellKey({ face: "back", row: 2, col: 2 })];

    expect(isFullBoardDraw(board as Board)).toBe(false);
  });
});
