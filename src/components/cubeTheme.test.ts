import { describe, expect, it } from "vitest";
import { cubeTheme } from "./cubeTheme";

function decodedAssetUrl(assetUrl: string) {
  return decodeURIComponent(assetUrl);
}

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
    const xMarkUrl = decodedAssetUrl(cubeTheme.markUrls.X);
    const oMarkUrl = decodedAssetUrl(cubeTheme.markUrls.O);

    expect(cubeTheme.markUrls.X).not.toBe(cubeTheme.markUrls.O);
    expect(xMarkUrl.includes("cross.svg") || /width=['"]90['"]/.test(xMarkUrl)).toBe(true);
    expect(oMarkUrl.includes("null.svg") || /width=['"]100['"]/.test(oMarkUrl)).toBe(true);
  });

  it("uses tighter sticker geometry and a transparent support cube", () => {
    expect(cubeTheme.stickerSize).toBeGreaterThan(0.62);
    expect(cubeTheme.stickerSize).toBeLessThan(0.7);
    expect(cubeTheme.supportCubeOpacity).toBeLessThan(0.2);
  });
});
