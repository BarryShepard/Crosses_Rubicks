import { describe, expect, it } from "vitest";
import { resolveRotationGesture, resolveRotationGesturePreview } from "./gesture";

const bounds = {
  left: 0,
  top: 0,
  width: 300,
  height: 300,
};

describe("resolveRotationGesture", () => {
  it("maps horizontal swipes inside the cube to y-axis layer rotations", () => {
    expect(resolveRotationGesture(bounds, { x: 50, y: 80 }, { x: 190, y: 82 })).toEqual({
      axis: "y",
      layerIndex: 2,
      direction: 1,
    });
  });

  it("maps vertical swipes inside the cube to x-axis layer rotations", () => {
    expect(resolveRotationGesture(bounds, { x: 225, y: 70 }, { x: 224, y: 210 })).toEqual({
      axis: "x",
      layerIndex: 2,
      direction: 1,
    });
  });

  it("maps circular ring drags to z-axis layer rotations", () => {
    expect(resolveRotationGesture(bounds, { x: 150, y: 2 }, { x: 292, y: 150 })).toEqual({
      axis: "z",
      layerIndex: 2,
      direction: 1,
    });
  });

  it("returns null for short gestures", () => {
    expect(resolveRotationGesture(bounds, { x: 150, y: 150 }, { x: 158, y: 154 })).toBeNull();
  });

  it("returns a live preview before the final commit distance", () => {
    expect(resolveRotationGesturePreview(bounds, { x: 50, y: 80 }, { x: 70, y: 80 })).toEqual({
      rotation: {
        axis: "y",
        layerIndex: 2,
        direction: 1,
      },
      progress: 0.625,
      commitReady: false,
    });
  });

  it("marks preview gestures as commit-ready at the final threshold", () => {
    expect(resolveRotationGesturePreview(bounds, { x: 50, y: 80 }, { x: 114, y: 80 })).toEqual({
      rotation: {
        axis: "y",
        layerIndex: 2,
        direction: 1,
      },
      progress: 1,
      commitReady: true,
    });
  });

  it("returns null for preview movement below the intent threshold", () => {
    expect(resolveRotationGesturePreview(bounds, { x: 150, y: 150 }, { x: 158, y: 154 })).toBeNull();
  });

  it("returns null for unresolved preview movement above the intent threshold", () => {
    expect(resolveRotationGesturePreview(bounds, { x: 150, y: 20 }, { x: 170, y: 20 })).toBeNull();
  });
});
