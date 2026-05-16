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

function angle(point: Point, center: Point): number {
  return Math.atan2(point.y - center.y, point.x - center.x);
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

function resolveRotationGestureWithThreshold(
  bounds: Rect,
  start: Point,
  end: Point,
  threshold: number,
): LayerRotation | null {
  if (distance(start, end) < threshold) {
    return null;
  }

  const square = normalizedSquare(bounds);
  const center = {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  };

  if (isInsideSquare(start, square)) {
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

  const startAngle = angle(start, center);
  const endAngle = angle(end, center);
  let delta = endAngle - startAngle;

  if (delta > Math.PI) {
    delta -= Math.PI * 2;
  }

  if (delta < -Math.PI) {
    delta += Math.PI * 2;
  }

  if (Math.abs(delta) < 0.3) {
    return null;
  }

  const startRadius = Math.hypot(start.x - center.x, start.y - center.y);
  const innerRadius = square.size / 2;
  const outerRadius = Math.max(bounds.width, bounds.height) / 2;
  const bandRatio = (startRadius - innerRadius) / Math.max(1, outerRadius - innerRadius);

  return {
    axis: "z",
    layerIndex: layerFromRatio(bandRatio),
    direction: delta > 0 ? 1 : -1,
  };
}

export function resolveRotationGesture(bounds: Rect, start: Point, end: Point): LayerRotation | null {
  return resolveRotationGestureWithThreshold(bounds, start, end, minDragDistance);
}

export function resolveRotationGesturePreview(
  bounds: Rect,
  start: Point,
  end: Point,
): RotationGesturePreview | null {
  const rotation = resolveRotationGestureWithThreshold(bounds, start, end, minPreviewDistance);

  if (!rotation) {
    return null;
  }

  return {
    rotation,
    progress: clampProgress(distance(start, end) / minDragDistance),
    commitReady: Boolean(resolveRotationGesture(bounds, start, end)),
  };
}
