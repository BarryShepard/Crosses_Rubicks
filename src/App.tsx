import { useCallback, useState } from "react";
import { CubeScene } from "./components/CubeScene";
import { GameHud } from "./components/GameHud";
import {
  applyTurnRotation,
  canApplyTurnRotation,
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
  const [sceneAnimating, setSceneAnimating] = useState(false);
  const interactionLocked = undoAnimating || sceneAnimating;

  function handlePlaceMark(cell: CellId) {
    if (interactionLocked) {
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
    if (interactionLocked) {
      return;
    }

    setGame((current) => startNewGame(current));
    setRotateModeArmed(false);
  }

  function handleUndoRotation() {
    if (interactionLocked) {
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

  const handleArmRotateMode = useCallback(() => {
    if (interactionLocked) {
      return;
    }

    setRotateModeArmed(true);
  }, [interactionLocked]);

  const handleCanRotateLayer = useCallback(
    (rotation: LayerRotation) => canApplyTurnRotation(game, rotation),
    [game],
  );

  return (
    <main className="app">
      <div className="game-shell">
        <GameHud
          game={game}
          rotateModeArmed={rotateModeArmed}
          interactionLocked={interactionLocked}
          onArmRotateMode={handleArmRotateMode}
          onUndoRotation={handleUndoRotation}
          onNewGame={handleNewGame}
        />

        <section className="scene-panel" aria-label="Game board">
          <CubeScene
            game={game}
            rotateModeArmed={rotateModeArmed}
            interactionLocked={interactionLocked}
            pendingRotation={game.pendingRotation}
            undoRequestId={undoRequestId}
            onPlaceMark={handlePlaceMark}
            onLayerRotation={handleLayerRotation}
            onUndoRotationComplete={handleUndoRotationComplete}
            canRotateLayer={handleCanRotateLayer}
            onAnimationLockChange={setSceneAnimating}
          />
        </section>
      </div>
    </main>
  );
}
