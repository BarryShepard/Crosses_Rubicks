import { canUndoLastAction, type GameState } from "../game/board";
import "./GameHud.css";

type GameHudProps = {
  game: GameState;
  interactionLocked: boolean;
  onUndo: () => void;
  onNewGame: () => void;
  onOpenRules: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
};

function statusText(game: GameState): string {
  if (game.status === "won" && game.winner) {
    return `${game.winner} wins`;
  }

  if (game.status === "draw") {
    return "Draw";
  }

  if (game.rotationUsed) {
    return `Place ${game.currentPlayer}`;
  }

  return `Right-drag to rotate or place ${game.currentPlayer}`;
}

export function GameHud({
  game,
  interactionLocked,
  onUndo,
  onNewGame,
  onOpenRules,
  musicEnabled,
  onToggleMusic,
}: GameHudProps) {
  const undoDisabled = interactionLocked || !canUndoLastAction(game);
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
        {statusText(game)}
      </p>

      <div className="hud-actions">
        <button type="button" onClick={onOpenRules}>
          Rules
        </button>
        <button
          type="button"
          className={musicEnabled ? "is-active" : undefined}
          aria-pressed={musicEnabled}
          onClick={onToggleMusic}
        >
          Music
        </button>
        <button type="button" onClick={onUndo} disabled={undoDisabled}>
          Undo
        </button>
        <button type="button" onClick={onNewGame} disabled={newGameDisabled}>
          New game
        </button>
      </div>
    </header>
  );
}
