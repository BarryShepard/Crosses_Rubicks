import { axisValue, cellToSticker, layerToCoord, rotateVector, stickerToCell } from "./geometry";
import { allCells, cellKey, cloneBoard, type Board, type LayerRotation } from "./types";

export function applyLayerRotation(board: Board, rotation: LayerRotation): Board {
  const next = cloneBoard(board);
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

    next[cellKey(targetCell)] = board[cellKey(sourceCell)];
  }

  return next;
}
