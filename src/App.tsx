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

  return (
    <main className="app">
      <div className="game-shell">
        <GameHud
          game={game}
          rotateModeArmed={rotateModeArmed}
          onArmRotateMode={() => setRotateModeArmed(true)}
          onUndoRotation={() => setGame((current) => undoTurnRotation(current))}
          onNewGame={handleNewGame}
        />

        <section className="scene-panel" aria-label="Game board">
          <CubeScene
            game={game}
            rotateModeArmed={rotateModeArmed}
            onPlaceMark={handlePlaceMark}
            onLayerRotation={handleLayerRotation}
          />
        </section>
      </div>
    </main>
  );
}
