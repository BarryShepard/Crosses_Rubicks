import type { LayerIndex, LayerRotation } from "./types";

export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type RotationGesturePreview = {
  rotation: LayerRotation;
  progress: number;
  commitReady: boolean;
};

const minDragDistance = 32;
const minPreviewDistance = 12;

function clampLayer(layer: number): LayerIndex {
  if (layer <= 0) {
    return 0;
  }

  if (layer >= 2) {
    return 2;
  }

  return 1;
}

function layerFromRatio(ratio: number): LayerIndex {
  return clampLayer(Math.floor(Math.min(0.999, Math.max(0, ratio)) * 3));
}

function distance(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

function normalizedSquare(bounds: Rect) {
  const size = Math.min(bounds.width, bounds.height) * 0.72;
  const left = bounds.left + (bounds.width - size) / 2;
  const top = bounds.top + (bounds.height - size) / 2;

  return {
    left,
    top,
    size,
    right: left + size,
    bottom: top + size,
  };
}

function isInsideSquare(point: Point, square: ReturnType<typeof normalizedSquare>): boolean {
  return (
    point.x >= square.left &&
    point.x <= square.right &&
    point.y >= square.top &&
    point.y <= square.bottom
  );
}

function resolveLayerDragWithThreshold(
  bounds: Rect,
  start: Point,
  end: Point,
  threshold: number,
): LayerRotation | null {
  const square = normalizedSquare(bounds);

  if (!isInsideSquare(start, square) || distance(start, end) < threshold) {
    return null;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const rowRatio = (start.y - square.top) / square.size;
    const visualRow = layerFromRatio(rowRatio);
    const yLayer = (2 - visualRow) as LayerIndex;

    return {
      axis: "y",
      layerIndex: yLayer,
      direction: dx > 0 ? 1 : -1,
    };
  }

  const colRatio = (start.x - square.left) / square.size;

  return {
    axis: "x",
    layerIndex: layerFromRatio(colRatio),
    direction: dy > 0 ? 1 : -1,
  };
}

export function resolveLayerDrag(bounds: Rect, start: Point, end: Point): LayerRotation | null {
  return resolveLayerDragWithThreshold(bounds, start, end, minDragDistance);
}

export function resolveRotationGesture(bounds: Rect, start: Point, end: Point): LayerRotation | null {
  return resolveLayerDrag(bounds, start, end);
}

export function resolveLayerDragPreview(
  bounds: Rect,
  start: Point,
  end: Point,
): RotationGesturePreview | null {
  const rotation = resolveLayerDragWithThreshold(bounds, start, end, minPreviewDistance);

  if (!rotation) {
    return null;
  }

  return {
    rotation,
    progress: clampProgress(distance(start, end) / minDragDistance),
    commitReady: Boolean(resolveLayerDrag(bounds, start, end)),
  };
}

export function resolveRotationGesturePreview(
  bounds: Rect,
  start: Point,
  end: Point,
): RotationGesturePreview | null {
  return resolveLayerDragPreview(bounds, start, end);
}
