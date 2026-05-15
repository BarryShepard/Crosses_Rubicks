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
