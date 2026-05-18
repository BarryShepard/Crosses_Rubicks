import { describe, expect, it } from "vitest";
import { cubeTheme } from "./cubeTheme";

function decodedAssetUrl(assetUrl: string) {
  return decodeURIComponent(assetUrl);
}

describe("cubeTheme", () => {
  it("uses the requested palette for the dark scene and cube faces", () => {
    expect(cubeTheme.sceneBackground).toBe("#000000");
    expect(cubeTheme.faceColors).toEqual({
      front: "#CC979F",
      back: "#0D7122",
      right: "#5719B4",
      left: "#6C89EF",
      top: "#D2C829",
      bottom: "#D42A26",
    });
  });

  it("maps players to the supplied SVG mark assets", () => {
    const xMarkUrl = decodedAssetUrl(cubeTheme.markUrls.X);
    const oMarkUrl = decodedAssetUrl(cubeTheme.markUrls.O);

    expect(cubeTheme.markUrls.X).not.toBe(cubeTheme.markUrls.O);
    expect(xMarkUrl.includes("cross.svg") || /width=['"]90['"]/.test(xMarkUrl)).toBe(true);
    expect(oMarkUrl.includes("null.svg") || /width=['"]100['"]/.test(oMarkUrl)).toBe(true);
  });

  it("renders marks as opaque black labels", () => {
    expect(cubeTheme.markColor).toBe("#000000");
    expect(cubeTheme.markOpacity).toBe(1);
  });

  it("uses zero-gap sticker geometry with a 7px inner border", () => {
    expect(cubeTheme.stickerSize).toBe(cubeTheme.stickerPositionScale);
    expect(cubeTheme.stickerInnerBorderColor).toBe("#000000");
    expect(cubeTheme.stickerInnerBorderWidthPx).toBe(7);
    expect(cubeTheme.stickerInnerBorderWidth).toBeGreaterThan(0);
  });

  it("uses a scene-colored face edge mask to hide edge leaks", () => {
    expect(cubeTheme.faceEdgeMaskColor).toBe(cubeTheme.sceneBackground);
    expect(cubeTheme.faceEdgeMaskSize).toBeGreaterThan(cubeTheme.stickerSize * 3);
    expect(cubeTheme.faceEdgeMaskOffset).toBeLessThan(cubeTheme.stickerNormalOffset);
  });
});
