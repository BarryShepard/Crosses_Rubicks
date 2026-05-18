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

type GameSnapshot = {
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

export type GameHistoryEntry =
  | {
      kind: "rotation";
      rotation: LayerRotation;
      previous: GameSnapshot;
    }
  | {
      kind: "placement";
      previous: GameSnapshot;
    };

export type GameState = GameSnapshot & {
  history: GameHistoryEntry[];
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

function cloneRotation(rotation: LayerRotation | null): LayerRotation | null {
  return rotation ? { ...rotation } : null;
}

function isSameRotation(left: LayerRotation, right: LayerRotation): boolean {
  return (
    left.axis === right.axis &&
    left.layerIndex === right.layerIndex &&
    left.direction === right.direction
  );
}

function snapshotState(state: GameState): GameSnapshot {
  return {
    board: cloneBoard(state.board),
    activeFace: state.activeFace,
    currentPlayer: state.currentPlayer,
    status: state.status,
    winner: state.winner,
    winningLine: [...state.winningLine],
    rotationUsed: state.rotationUsed,
    pendingUndoBoard: state.pendingUndoBoard ? cloneBoard(state.pendingUndoBoard) : null,
    pendingRotation: cloneRotation(state.pendingRotation),
    blockedRotation: cloneRotation(state.blockedRotation),
  };
}

function restoreSnapshot(snapshot: GameSnapshot, history: GameHistoryEntry[]): GameState {
  return {
    ...snapshot,
    board: cloneBoard(snapshot.board),
    winningLine: [...snapshot.winningLine],
    pendingUndoBoard: snapshot.pendingUndoBoard ? cloneBoard(snapshot.pendingUndoBoard) : null,
    pendingRotation: cloneRotation(snapshot.pendingRotation),
    blockedRotation: cloneRotation(snapshot.blockedRotation),
    history,
  };
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
    history: [],
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

  const previous = snapshotState(state);
  const board = cloneBoard(state.board);
  board[cellKey(cell)] = state.currentPlayer;

  const placedState = finalizeState({
    ...state,
    board,
    rotationUsed: false,
    pendingUndoBoard: null,
    pendingRotation: null,
    blockedRotation: cloneRotation(state.pendingRotation ? inverseRotation(state.pendingRotation) : null),
    history: [...state.history, { kind: "placement", previous }],
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
  if (!canApplyTurnRotation(state, rotation)) {
    return state;
  }

  return {
    ...state,
    board: applyLayerRotation(state.board, rotation),
    rotationUsed: true,
    pendingUndoBoard: cloneBoard(state.board),
    pendingRotation: cloneRotation(rotation),
    history: [
      ...state.history,
      { kind: "rotation", rotation: cloneRotation(rotation)!, previous: snapshotState(state) },
    ],
  };
}

export function canApplyTurnRotation(state: GameState, rotation: LayerRotation): boolean {
  return !(
    state.status !== "playing" ||
    state.rotationUsed ||
    (state.blockedRotation && isSameRotation(rotation, state.blockedRotation))
  );
}

export function canUndoLastAction(state: GameState): boolean {
  return state.history.length > 0;
}

export function getUndoRotation(state: GameState): LayerRotation | null {
  const entry = state.history[state.history.length - 1];

  if (!entry || entry.kind !== "rotation") {
    return null;
  }

  return inverseRotation(entry.rotation);
}

export function undoLastAction(state: GameState): GameState {
  const entry = state.history[state.history.length - 1];

  if (!entry) {
    return state;
  }

  return restoreSnapshot(entry.previous, state.history.slice(0, -1));
}

export function undoTurnRotation(state: GameState): GameState {
  const entry = state.history[state.history.length - 1];

  if (!entry || entry.kind !== "rotation") {
    return state;
  }

  return undoLastAction(state);
}

export function startNewGame(_state?: GameState): GameState {
  return createGameState();
}
