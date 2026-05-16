import { useCallback, useState } from "react";
import { CubeScene } from "./components/CubeScene";
import { GameHud } from "./components/GameHud";
import {
  applyTurnRotation,
  createGameState,
  placeMark,
  startNewGame,
  undoTurnRotation,
} from "./game/board";
import type { CellId, LayerRotation } from "./game/types";

export default function App() {
  const [game, setGame] = useState(() => createGameState());
  const [rotateModeArmed, setRotateModeArmed] = useState(false);
  const [undoRequestId, setUndoRequestId] = useState(0);
  const [undoAnimating, setUndoAnimating] = useState(false);

  function handlePlaceMark(cell: CellId) {
    if (undoAnimating) {
      return;
    }

    setGame((current) => placeMark(current, cell));
    setRotateModeArmed(false);
  }

  function handleLayerRotation(rotation: LayerRotation | null) {
    if (undoAnimating) {
      return;
    }

    if (!rotation) {
      return;
    }

    setGame((current) => applyTurnRotation(current, rotation));
    setRotateModeArmed(false);
  }

  function handleNewGame() {
    if (undoAnimating) {
      return;
    }

    setGame((current) => startNewGame(current));
    setRotateModeArmed(false);
  }

  function handleUndoRotation() {
    if (undoAnimating) {
      return;
    }

    if (!game.pendingRotation) {
      setGame((current) => undoTurnRotation(current));
      return;
    }

    setUndoAnimating(true);
    setRotateModeArmed(false);
    setUndoRequestId((current) => current + 1);
  }

  const handleUndoRotationComplete = useCallback(() => {
    setGame((current) => undoTurnRotation(current));
    setUndoAnimating(false);
  }, []);

  return (
    <main className="app">
      <div className="game-shell">
        <GameHud
          game={game}
          rotateModeArmed={rotateModeArmed}
          interactionLocked={undoAnimating}
          onArmRotateMode={() => setRotateModeArmed(true)}
          onUndoRotation={handleUndoRotation}
          onNewGame={handleNewGame}
        />

        <section className="scene-panel" aria-label="Game board">
          <CubeScene
            game={game}
            rotateModeArmed={rotateModeArmed}
            interactionLocked={undoAnimating}
            pendingRotation={game.pendingRotation}
            undoRequestId={undoRequestId}
            onPlaceMark={handlePlaceMark}
            onLayerRotation={handleLayerRotation}
            onUndoRotationComplete={handleUndoRotationComplete}
          />
        </section>
      </div>
    </main>
  );
}
