import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the game shell smoke element", () => {
    const app = App();

    expect(app.props.className).toBe("app");
  });
});
