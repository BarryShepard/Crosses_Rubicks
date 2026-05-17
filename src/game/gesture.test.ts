import { describe, expect, it } from "vitest";
import { resolveLayerDrag, resolveLayerDragPreview } from "./gesture";

const bounds = {
  left: 0,
  top: 0,
  width: 300,
  height: 300,
};

describe("resolveLayerDrag", () => {
  it("maps horizontal drags anywhere in the cube square to y-axis layer rotations", () => {
    expect(resolveLayerDrag(bounds, { x: 150, y: 150 }, { x: 230, y: 152 })).toEqual({
      axis: "y",
      layerIndex: 1,
      direction: 1,
    });
  });

  it("uses the drag start y position to select the y-axis layer", () => {
    expect(resolveLayerDrag(bounds, { x: 150, y: 48 }, { x: 220, y: 49 })).toEqual({
      axis: "y",
      layerIndex: 2,
      direction: 1,
    });

    expect(resolveLayerDrag(bounds, { x: 150, y: 252 }, { x: 80, y: 250 })).toEqual({
      axis: "y",
      layerIndex: 0,
      direction: -1,
    });
  });

  it("maps vertical drags anywhere in the cube square to x-axis layer rotations", () => {
    expect(resolveLayerDrag(bounds, { x: 150, y: 150 }, { x: 149, y: 225 })).toEqual({
      axis: "x",
      layerIndex: 1,
      direction: 1,
    });
  });

  it("uses the drag start x position to select the x-axis layer", () => {
    expect(resolveLayerDrag(bounds, { x: 48, y: 150 }, { x: 49, y: 230 })).toEqual({
      axis: "x",
      layerIndex: 0,
      direction: 1,
    });

    expect(resolveLayerDrag(bounds, { x: 252, y: 150 }, { x: 251, y: 80 })).toEqual({
      axis: "x",
      layerIndex: 2,
      direction: -1,
    });
  });

  it("returns null for short drags", () => {
    expect(resolveLayerDrag(bounds, { x: 150, y: 150 }, { x: 158, y: 154 })).toBeNull();
  });

  it("returns null when the drag starts outside the cube square", () => {
    expect(resolveLayerDrag(bounds, { x: 4, y: 4 }, { x: 90, y: 4 })).toBeNull();
  });

  it("returns a live preview before the final commit distance", () => {
    expect(resolveLayerDragPreview(bounds, { x: 150, y: 150 }, { x: 170, y: 150 })).toEqual({
      rotation: {
        axis: "y",
        layerIndex: 1,
        direction: 1,
      },
      progress: 0.625,
      commitReady: false,
    });
  });

  it("marks preview gestures as commit-ready at the final threshold", () => {
    expect(resolveLayerDragPreview(bounds, { x: 150, y: 150 }, { x: 214, y: 150 })).toEqual({
      rotation: {
        axis: "y",
        layerIndex: 1,
        direction: 1,
      },
      progress: 1,
      commitReady: true,
    });
  });
});
