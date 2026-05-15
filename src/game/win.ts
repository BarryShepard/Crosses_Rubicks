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
