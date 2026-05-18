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
