import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GameHud } from "./GameHud";
import { applyTurnRotation, createGameState } from "../game/board";

describe("GameHud", () => {
  it("renders current player, status, and primary controls", () => {
    const html = renderToStaticMarkup(
      <GameHud
        game={createGameState()}
        rotateModeArmed={false}
        interactionLocked={false}
        onArmRotateMode={vi.fn()}
        onUndoRotation={vi.fn()}
        onNewGame={vi.fn()}
      />,
    );

    expect(html).toContain("Current player");
    expect(html).toContain("Rotate a layer or place X");
    expect(html).toContain("Rotate layer");
    expect(html).toContain("Undo rotation");
    expect(html).toContain("New game");
  });

  it("shows placement status after a rotation has been used", () => {
    const game = applyTurnRotation(createGameState(), {
      axis: "x",
      layerIndex: 1,
      direction: 1,
    });

    const html = renderToStaticMarkup(
      <GameHud
        game={game}
        rotateModeArmed={false}
        interactionLocked={false}
        onArmRotateMode={vi.fn()}
        onUndoRotation={vi.fn()}
        onNewGame={vi.fn()}
      />,
    );

    expect(html).toContain("Place X");
    expect(html).toContain("disabled");
  });

  it("disables all controls when interactions are locked", () => {
    const html = renderToStaticMarkup(
      <GameHud
        game={createGameState()}
        rotateModeArmed={false}
        interactionLocked
        onArmRotateMode={vi.fn()}
        onUndoRotation={vi.fn()}
        onNewGame={vi.fn()}
      />,
    );

    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
});
