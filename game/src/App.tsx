import { useCallback, useRef, useState } from "react";
import { CubeScene } from "./components/CubeScene";
import { GameHud } from "./components/GameHud";
import songUrl from "./assets/app-recording-20260518-1229.mp3";
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
  const [rulesOpen, setRulesOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  function handleToggleMusic() {
    const audio = audioRef.current;

    if (!audio) {
      setMusicEnabled((current) => !current);
      return;
    }

    if (musicEnabled) {
      audio.pause();
      setMusicEnabled(false);
      return;
    }

    audio.volume = 0.55;
    void audio
      .play()
      .then(() => {
        setMusicEnabled(true);
      })
      .catch(() => {
        setMusicEnabled(false);
      });
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
          onOpenRules={() => setRulesOpen(true)}
          musicEnabled={musicEnabled}
          onToggleMusic={handleToggleMusic}
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

        <audio ref={audioRef} src={songUrl} loop preload="auto" />

        <div
          className="rules-backdrop"
          hidden={!rulesOpen}
          onClick={() => setRulesOpen(false)}
        >
          <aside
            className="rules-sidebar"
            aria-labelledby="rules-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rules-sidebar-header">
              <h2 id="rules-title">Правила игры</h2>
              <button type="button" aria-label="Close rules" onClick={() => setRulesOpen(false)}>
                Close
              </button>
            </div>

            <p>
              Игра основана на классических крестиках-ноликах, но проходит на
              поверхности кубика Рубика.
            </p>

            <h3>Цель</h3>
            <p>
              Победить, собрав <strong>3 свои метки в ряд</strong> на{" "}
              <strong>фронтальной грани куба</strong> — той, которая находится
              перед игроком.
            </p>
            <p>Линия может быть горизонтальной, вертикальной или диагональной.</p>
            <p>Победа засчитывается только на фронтальной грани.</p>

            <h3>Ход игры</h3>
            <p>Игроки ходят по очереди.</p>
            <p>За один ход игрок может выполнить:</p>
            <ol>
              <li>
                <strong>поворот одной грани</strong> — опционально;
              </li>
              <li>
                <strong>установку одной своей метки</strong> на свободную клетку.
              </li>
            </ol>
            <p>Поворот можно пропустить и сразу поставить метку.</p>
            <p>После установки метки ход переходит к следующему игроку.</p>

            <h3>Повороты</h3>
            <p>
              Игровое поле можно менять, вращая грани куба по горизонтали и
              вертикали.
            </p>
            <p>
              Нельзя сразу повернуть грань в обратную сторону, если это просто
              отменяет поворот предыдущего игрока.
            </p>

            <h3>Управление</h3>
            <ul>
              <li>
                <strong>ЛКМ вне куба + движение мыши</strong> — повернуть весь куб.
              </li>
              <li>
                <strong>Свайп по фронтальной клетке</strong> — повернуть выбранный слой.
              </li>
              <li>
                <strong>ПКМ на грани + движение мыши</strong> — повернуть выбранный слой.
              </li>
              <li>
                <strong>Undo</strong> — отменить последнее действие.
              </li>
              <li>
                <strong>New Game</strong> — начать новую игру.
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
