import type { GameHistoryEntry } from "./board";
import { axisValue, cellToSticker, layerToCoord, rotateVector, stickerToCell } from "./geometry";
import { allCells, cellKey, type CellKey, type Face, type LayerRotation } from "./types";

export type StickerFaceMap = Record<CellKey, Face>;

export function createSolvedStickerFaces(): StickerFaceMap {
  const stickerFaces = {} as StickerFaceMap;

  for (const cell of allCells()) {
    stickerFaces[cellKey(cell)] = cell.face;
  }

  return stickerFaces;
}

export function applyStickerFaceRotation(
  stickerFaces: StickerFaceMap,
  rotation: LayerRotation,
): StickerFaceMap {
  const next = { ...stickerFaces };
  const targetCoord = layerToCoord(rotation.layerIndex);

  for (const sourceCell of allCells()) {
    const sourceSticker = cellToSticker(sourceCell);

    if (axisValue(sourceSticker.position, rotation.axis) !== targetCoord) {
      continue;
    }

    const targetSticker = {
      position: rotateVector(sourceSticker.position, rotation.axis, rotation.direction),
      normal: rotateVector(sourceSticker.normal, rotation.axis, rotation.direction),
    };
    const targetCell = stickerToCell(targetSticker);

    next[cellKey(targetCell)] = stickerFaces[cellKey(sourceCell)];
  }

  return next;
}

export function stickerFacesAfterHistory(history: GameHistoryEntry[]): StickerFaceMap {
  return history.reduce((stickerFaces, entry) => {
    if (entry.kind !== "rotation") {
      return stickerFaces;
    }

    return applyStickerFaceRotation(stickerFaces, entry.rotation);
  }, createSolvedStickerFaces());
}
