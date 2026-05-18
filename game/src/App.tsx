import { useCallback, useState } from "react";
import { CubeScene } from "./components/CubeScene";
import { GameHud } from "./components/GameHud";
import {
  applyTurnRotation,
  canApplyTurnRotation,
  createGameState,
  getUndoRotation,
  placeMark,
  startNewGame,
  undoLastAction,
} from "./game/board";
import type { CellId, LayerRotation } from "./game/types";

export default function App() {
  const [game, setGame] = useState(() => createGameState());
  const [undoRequestId, setUndoRequestId] = useState(0);
  const [undoAnimating, setUndoAnimating] = useState(false);
  const [sceneAnimating, setSceneAnimating] = useState(false);
  const interactionLocked = undoAnimating || sceneAnimating;

  function handlePlaceMark(cell: CellId) {
    if (interactionLocked) {
      return;
    }

    setGame((current) => placeMark(current, cell));
  }

  function handleLayerRotation(rotation: LayerRotation | null) {
    if (undoAnimating) {
      return;
    }

    if (!rotation) {
      return;
    }

    setGame((current) => applyTurnRotation(current, rotation));
  }

  function handleNewGame() {
    if (interactionLocked) {
      return;
    }

    setGame((current) => startNewGame(current));
  }

  function handleUndo() {
    if (interactionLocked) {
      return;
    }

    const undoRotation = getUndoRotation(game);

    if (!undoRotation) {
      setGame((current) => undoLastAction(current));
      return;
    }

    setUndoAnimating(true);
    setUndoRequestId((current) => current + 1);
  }

  const handleUndoRotationComplete = useCallback(() => {
    setGame((current) => undoLastAction(current));
    setUndoAnimating(false);
  }, []);

  const handleCanRotateLayer = useCallback(
    (rotation: LayerRotation) => canApplyTurnRotation(game, rotation),
    [game],
  );

  return (
    <main className="app">
      <div className="game-shell">
        <GameHud
          game={game}
          interactionLocked={interactionLocked}
          onUndo={handleUndo}
          onNewGame={handleNewGame}
        />

        <section className="scene-panel" aria-label="Game board">
          <CubeScene
            game={game}
            interactionLocked={interactionLocked}
            pendingRotation={getUndoRotation(game)}
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
