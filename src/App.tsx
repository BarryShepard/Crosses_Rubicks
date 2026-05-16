import { useState } from "react";
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

  function handlePlaceMark(cell: CellId) {
    setGame((current) => placeMark(current, cell));
    setRotateModeArmed(false);
  }

  function handleLayerRotation(rotation: LayerRotation | null) {
    if (!rotation) {
      return;
    }

    setGame((current) => applyTurnRotation(current, rotation));
    setRotateModeArmed(false);
  }

  function handleNewGame() {
    setGame((current) => startNewGame(current));
    setRotateModeArmed(false);
  }

  function handleUndoRotation() {
    if (!game.pendingRotation) {
      setGame((current) => undoTurnRotation(current));
      return;
    }

    setRotateModeArmed(false);
    setUndoRequestId((current) => current + 1);
  }

  function handleUndoRotationComplete() {
    setGame((current) => undoTurnRotation(current));
  }

  return (
    <main className="app">
      <div className="game-shell">
        <GameHud
          game={game}
          rotateModeArmed={rotateModeArmed}
          onArmRotateMode={() => setRotateModeArmed(true)}
          onUndoRotation={handleUndoRotation}
          onNewGame={handleNewGame}
        />

        <section className="scene-panel" aria-label="Game board">
          <CubeScene
            game={game}
            rotateModeArmed={rotateModeArmed}
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
