import crossMarkUrl from "../assets/cross.svg";
import nullMarkUrl from "../assets/null.svg";
import type { Face, Player } from "../game/types";

export const cubeTheme = {
  seamColor: "#121212",
  sceneBackground: "#817D7E",
  faceColors: {
    front: "#F1F1F1",
    back: "#5E93B7",
    right: "#D3A6AD",
    left: "#D2C829",
    top: "#EB2B26",
    bottom: "#81421F",
  } satisfies Record<Face, string>,
  markUrls: {
    X: crossMarkUrl,
    O: nullMarkUrl,
  } satisfies Record<Player, string>,
  stickerPositionScale: 0.72,
  stickerNormalOffset: 0.34,
  stickerSize: 0.66,
  markSize: 0.46,
  markOffset: 0.026,
  seamBackingSize: 2.18,
  seamBackingOffset: 1.044,
  supportCubeSize: 2.04,
  supportCubeOpacity: 0.08,
  activeFaceFrameSize: 2.2,
} as const;
