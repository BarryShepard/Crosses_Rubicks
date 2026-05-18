import { axisValue, cellToSticker, layerToCoord } from "./geometry";
import { allCells, type CellId, type LayerRotation } from "./types";

export const quarterTurnRadians = Math.PI / 2;

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

export function isCellInRotationLayer(cell: CellId, rotation: LayerRotation): boolean {
  return axisValue(cellToSticker(cell).position, rotation.axis) === layerToCoord(rotation.layerIndex);
}

export function cellsInRotationLayer(rotation: LayerRotation): CellId[] {
  return allCells().filter((cell) => isCellInRotationLayer(cell, rotation));
}

export function previewAngleForProgress(rotation: LayerRotation, progress: number): number {
  return rotation.direction * clampProgress(progress) * quarterTurnRadians;
}

export function rotationToEuler(
  rotation: Pick<LayerRotation, "axis">,
  angle: number,
): [number, number, number] {
  if (rotation.axis === "x") {
    return [angle, 0, 0];
  }

  if (rotation.axis === "y") {
    return [0, angle, 0];
  }

  return [0, 0, angle];
}

export function inverseLayerRotation(rotation: LayerRotation): LayerRotation {
  return {
    ...rotation,
    direction: rotation.direction === 1 ? -1 : 1,
  };
}
