import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { GameHud } from "./GameHud";
import { applyTurnRotation, createGameState, placeMark } from "../game/board";

function undoButtonMarkup(html: string): string {
  const match = html.match(/<button[^>]*>Undo<\/button>/);

  expect(match).not.toBeNull();

  return match![0];
}

describe("GameHud", () => {
  it("renders current player, status, and primary controls", () => {
    const html = renderToStaticMarkup(
      <GameHud
        game={createGameState()}
        interactionLocked={false}
        onUndo={vi.fn()}
        onNewGame={vi.fn()}
      />,
    );

    expect(html).toContain("Current player");
    expect(html).toContain("Right-drag to rotate or place X");
    expect(html).not.toContain("Rotate layer");
    expect(html).toContain("Undo");
    expect(html).not.toContain("Undo rotation");
    expect(undoButtonMarkup(html)).toContain("disabled");
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
        interactionLocked={false}
        onUndo={vi.fn()}
        onNewGame={vi.fn()}
      />,
    );

    expect(html).toContain("Place X");
    expect(html).toContain("Undo");
    expect(html).not.toContain("Undo rotation");
  });

  it("disables all controls when interactions are locked", () => {
    const html = renderToStaticMarkup(
      <GameHud
        game={createGameState()}
        interactionLocked
        onUndo={vi.fn()}
        onNewGame={vi.fn()}
      />,
    );

    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it("enables Undo after a placement", () => {
    const game = placeMark(createGameState(), { face: "front", row: 0, col: 0 });
    const html = renderToStaticMarkup(
      <GameHud game={game} interactionLocked={false} onUndo={vi.fn()} onNewGame={vi.fn()} />,
    );

    expect(html).toContain("Undo");
    expect(html).not.toContain("Undo rotation");
    expect(undoButtonMarkup(html)).not.toContain("disabled");
  });
});
