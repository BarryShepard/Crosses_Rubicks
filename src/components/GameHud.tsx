import type { GameState } from "../game/board";
import "./GameHud.css";

type GameHudProps = {
  game: GameState;
  rotateModeArmed: boolean;
  interactionLocked: boolean;
  onArmRotateMode: () => void;
  onUndoRotation: () => void;
  onNewGame: () => void;
};

function statusText(game: GameState, rotateModeArmed: boolean): string {
  if (game.status === "won" && game.winner) {
    return `${game.winner} wins`;
  }

  if (game.status === "draw") {
    return "Draw";
  }

  if (rotateModeArmed) {
    return "Drag a layer to rotate";
  }

  if (game.rotationUsed) {
    return `Place ${game.currentPlayer}`;
  }

  return `Rotate a layer or place ${game.currentPlayer}`;
}

export function GameHud({
  game,
  rotateModeArmed,
  interactionLocked,
  onArmRotateMode,
  onUndoRotation,
  onNewGame,
}: GameHudProps) {
  const rotationDisabled =
    interactionLocked || game.status !== "playing" || game.rotationUsed || rotateModeArmed;
  const undoDisabled = interactionLocked || game.status !== "playing" || !game.rotationUsed;
  const newGameDisabled = interactionLocked;

  return (
    <header className="game-hud">
      <div className="turn-block">
        <span className="eyebrow">Current player</span>
        <strong className={`player-mark player-${game.currentPlayer.toLowerCase()}`}>
          {game.currentPlayer}
        </strong>
      </div>

      <p className="status-text" role="status">
        {statusText(game, rotateModeArmed)}
      </p>

      <div className="hud-actions">
        <button type="button" onClick={onArmRotateMode} disabled={rotationDisabled}>
          Rotate layer
        </button>
        <button type="button" onClick={onUndoRotation} disabled={undoDisabled}>
          Undo rotation
        </button>
        <button type="button" onClick={onNewGame} disabled={newGameDisabled}>
          New game
        </button>
      </div>
    </header>
  );
}
