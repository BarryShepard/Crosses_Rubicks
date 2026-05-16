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
  pendingRotation: LayerRotation | null;
  blockedRotation: LayerRotation | null;
};

function nextPlayer(player: Player): Player {
  return player === "X" ? "O" : "X";
}

function inverseRotation(rotation: LayerRotation): LayerRotation {
  return {
    ...rotation,
    direction: rotation.direction === 1 ? -1 : 1,
  };
}

function isSameRotation(left: LayerRotation, right: LayerRotation): boolean {
  return (
    left.axis === right.axis &&
    left.layerIndex === right.layerIndex &&
    left.direction === right.direction
  );
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
    board: cloneBoard(board),
    activeFace: ACTIVE_FACE,
    currentPlayer: "X",
    status: "playing",
    winner: null,
    winningLine: [],
    rotationUsed: false,
    pendingUndoBoard: null,
    pendingRotation: null,
    blockedRotation: null,
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
    pendingRotation: null,
    blockedRotation: state.pendingRotation ? inverseRotation(state.pendingRotation) : null,
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
  if (
    state.status !== "playing" ||
    state.rotationUsed ||
    (state.blockedRotation && isSameRotation(rotation, state.blockedRotation))
  ) {
    return state;
  }

  return {
    ...state,
    board: applyLayerRotation(state.board, rotation),
    rotationUsed: true,
    pendingUndoBoard: cloneBoard(state.board),
    pendingRotation: rotation,
  };
}

export function undoTurnRotation(state: GameState): GameState {
  if (state.status !== "playing" || !state.rotationUsed || !state.pendingUndoBoard) {
    return state;
  }

  return {
    ...state,
    board: cloneBoard(state.pendingUndoBoard),
    rotationUsed: false,
    pendingUndoBoard: null,
    pendingRotation: null,
  };
}

export function startNewGame(_state?: GameState): GameState {
  return createGameState();
}
