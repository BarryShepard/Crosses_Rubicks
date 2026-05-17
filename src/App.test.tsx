import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("@react-three/fiber", () => ({
  Canvas: (props: { "data-testid"?: string }) => <div data-testid={props["data-testid"]} />,
}));

vi.mock("@react-three/drei", () => ({
  Text: () => null,
}));

describe("App", () => {
  it("renders the game shell and HUD smoke elements", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("game-shell");
    expect(html).toContain("Right-drag to rotate or place X");
    expect(html).toContain("Undo");
    expect(html).not.toContain("Rotate layer");
    expect(html).not.toContain("Undo rotation");
    expect(html).toContain("Active face cells");
  });
});
