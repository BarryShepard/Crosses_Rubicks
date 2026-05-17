import { describe, expect, it } from "vitest";
import { cubeTheme } from "./cubeTheme";

describe("cubeTheme", () => {
  it("uses the approved palette for seams, background, and cube faces", () => {
    expect(cubeTheme.seamColor).toBe("#121212");
    expect(cubeTheme.sceneBackground).toBe("#817D7E");
    expect(cubeTheme.faceColors).toEqual({
      front: "#F1F1F1",
      back: "#5E93B7",
      right: "#D3A6AD",
      left: "#D2C829",
      top: "#EB2B26",
      bottom: "#81421F",
    });
  });

  it("maps players to the supplied SVG mark assets", () => {
    expect(cubeTheme.markUrls.X).toContain("cross.svg");
    expect(cubeTheme.markUrls.O).toContain("null.svg");
  });

  it("uses tighter sticker geometry and a transparent support cube", () => {
    expect(cubeTheme.stickerSize).toBeGreaterThan(0.62);
    expect(cubeTheme.stickerSize).toBeLessThan(0.7);
    expect(cubeTheme.supportCubeOpacity).toBeLessThan(0.2);
  });
});
