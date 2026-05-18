import crossMarkUrl from "../assets/cross.svg";
import nullMarkUrl from "../assets/null.svg";
import type { Face, Player } from "../game/types";

const stickerSize = 0.72;
const stickerInnerBorderWidthPx = 7;
const stickerReferenceSizePx = 96;
const sceneBackground = "#000000";

export const cubeTheme = {
  sceneBackground,
  faceColors: {
    front: "#CC979F",
    back: "#0D7122",
    right: "#5719B4",
    left: "#6C89EF",
    top: "#D2C829",
    bottom: "#D42A26",
  } satisfies Record<Face, string>,
  markUrls: {
    X: crossMarkUrl,
    O: nullMarkUrl,
  } satisfies Record<Player, string>,
  stickerPositionScale: 0.72,
  stickerNormalOffset: 0.34,
  stickerSize,
  stickerInnerBorderColor: "#000000",
  stickerInnerBorderWidthPx,
  stickerInnerBorderWidth: (stickerSize * stickerInnerBorderWidthPx) / stickerReferenceSizePx,
  stickerInnerBorderOffset: 0.014,
  faceEdgeMaskColor: sceneBackground,
  faceEdgeMaskSize: 2.34,
  faceEdgeMaskOffset: 0.32,
  markSize: 0.46,
  markOffset: 0.026,
  markColor: "#000000",
  markOpacity: 1,
} as const;
