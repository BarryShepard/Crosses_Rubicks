import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the game shell and HUD smoke elements", () => {
    const html = renderToStaticMarkup(<App />);

    expect(html).toContain("game-shell");
    expect(html).toContain("Rotate a layer or place X");
    expect(html).toContain("Cube scene will render here");
  });
});
