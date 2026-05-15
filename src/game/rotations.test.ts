import { describe, expect, it } from "vitest";
import {
  allCells,
  cellKey,
  createEmptyBoard,
  type Axis,
  type Direction,
  type LayerIndex,
  type LayerRotation,
} from "./types";
import { applyLayerRotation } from "./rotations";
import {
  axisValue,
  cellToSticker,
  layerToCoord,
  rotateVector,
  stickerToCell,
} from "./geometry";

const axes: Axis[] = ["x", "y", "z"];
const layers: LayerIndex[] = [0, 1, 2];
const directions: Direction[] = [1, -1];

function targetKeyForRotation(cell: ReturnType<typeof allCells>[number], rotation: LayerRotation) {
  const sourceSticker = cellToSticker(cell);
  const targetSticker = {
    position: rotateVector(sourceSticker.position, rotation.axis, rotation.direction),
    normal: rotateVector(sourceSticker.normal, rotation.axis, rotation.direction),
  };

  return cellKey(stickerToCell(targetSticker));
}

describe("cube geometry", () => {
  it("maps every cell to a sticker and back", () => {
    for (const cell of allCells()) {
      expect(stickerToCell(cellToSticker(cell))).toEqual(cell);
    }
  });
});

describe("applyLayerRotation", () => {
  it("maps selected-layer cells to unique target cells for every quarter turn", () => {
    for (const axis of axes) {
      for (const layerIndex of layers) {
        for (const direction of directions) {
          const rotation = { axis, layerIndex, direction };
          const selectedCells = allCells().filter(
            (cell) => axisValue(cellToSticker(cell).position, axis) === layerToCoord(layerIndex),
          );
          const targetKeys = selectedCells.map((cell) => targetKeyForRotation(cell, rotation));

          expect(new Set(targetKeys).size).toBe(selectedCells.length);
        }
      }
    }
  });

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

  it("returns to the original board after a rotation and its inverse", () => {
    const board = createEmptyBoard();
    board[cellKey({ face: "front", row: 0, col: 0 })] = "X";
    board[cellKey({ face: "front", row: 2, col: 2 })] = "O";
    board[cellKey({ face: "top", row: 0, col: 1 })] = "X";
    board[cellKey({ face: "right", row: 1, col: 2 })] = "O";

    for (const axis of axes) {
      for (const layerIndex of layers) {
        for (const direction of directions) {
          const rotation = { axis, layerIndex, direction };
          const inverse = { axis, layerIndex, direction: -direction as Direction };
          const restored = applyLayerRotation(applyLayerRotation(board, rotation), inverse);

          expect(restored).toEqual(board);
        }
      }
    }
  });

  it("moves a representative non-center mark to a different cell", () => {
    const board = createEmptyBoard();
    const source = cellKey({ face: "front", row: 0, col: 1 });
    const target = cellKey({ face: "front", row: 1, col: 0 });
    board[source] = "X";

    const rotated = applyLayerRotation(board, {
      axis: "z",
      layerIndex: 2,
      direction: 1,
    });

    expect(rotated[source]).toBeNull();
    expect(rotated[target]).toBe("X");
  });
});
