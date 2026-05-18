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
