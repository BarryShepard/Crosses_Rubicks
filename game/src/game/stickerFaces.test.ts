import { describe, expect, it } from "vitest";
import type { GameHistoryEntry } from "./board";
import { allCells, cellKey } from "./types";
import {
  applyStickerFaceRotation,
  createSolvedStickerFaces,
  stickerFacesAfterHistory,
} from "./stickerFaces";

describe("stickerFaces", () => {
  it("starts with each visible cell colored by its solved face", () => {
    const stickerFaces = createSolvedStickerFaces();

    for (const cell of allCells()) {
      expect(stickerFaces[cellKey(cell)]).toBe(cell.face);
    }
  });

  it("moves sticker face colors through the same layer rotation as marks", () => {
    const stickerFaces = applyStickerFaceRotation(createSolvedStickerFaces(), {
      axis: "y",
      layerIndex: 1,
      direction: 1,
    });

    expect(stickerFaces[cellKey({ face: "right", row: 1, col: 1 })]).toBe("front");
    expect(stickerFaces[cellKey({ face: "front", row: 1, col: 1 })]).toBe("left");
    expect(stickerFaces[cellKey({ face: "left", row: 1, col: 1 })]).toBe("back");
    expect(stickerFaces[cellKey({ face: "back", row: 1, col: 1 })]).toBe("right");
  });

  it("derives current sticker face colors from rotation entries in game history", () => {
    const history = [
      {
        kind: "placement",
        previous: {} as GameHistoryEntry["previous"],
      },
      {
        kind: "rotation",
        rotation: { axis: "y", layerIndex: 1, direction: 1 },
        previous: {} as GameHistoryEntry["previous"],
      },
    ] satisfies GameHistoryEntry[];

    const stickerFaces = stickerFacesAfterHistory(history);

    expect(stickerFaces[cellKey({ face: "right", row: 1, col: 1 })]).toBe("front");
  });
});
