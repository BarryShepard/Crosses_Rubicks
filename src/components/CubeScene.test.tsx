import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createGameState } from "../game/board";
import { CubeScene } from "./CubeScene";

vi.mock("@react-three/fiber", () => ({
  Canvas: (props: { "data-testid"?: string }) => <div data-testid={props["data-testid"]} />,
}));

vi.mock("@react-three/drei", () => ({
  Text: () => null,
}));

describe("CubeScene", () => {
  it("renders canvas and active-face placement controls", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        rotateModeArmed={false}
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
      />,
    );

    expect(html).toContain("cube-canvas");
    expect(html).toContain("Active face cells");
    expect(html).toContain("Place on row 1, column 1");
    expect(html).toContain("Place on row 3, column 3");
  });

  it("marks the scene as rotation-armed and disables placement controls", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        rotateModeArmed
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
      />,
    );

    expect(html).toContain("rotation-armed");
    expect(html).toContain("disabled");
  });

  it("exposes idle animation state for testable interaction transitions", () => {
    const html = renderToStaticMarkup(
      <CubeScene
        game={createGameState()}
        rotateModeArmed={false}
        onPlaceMark={vi.fn()}
        onLayerRotation={vi.fn()}
      />,
    );

    expect(html).toContain('data-animation-state="idle"');
  });
});
