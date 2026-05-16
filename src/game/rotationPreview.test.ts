import { describe, expect, it } from "vitest";
import {
  cellsInRotationLayer,
  inverseLayerRotation,
  isCellInRotationLayer,
  previewAngleForProgress,
  rotationToEuler,
} from "./rotationPreview";

describe("rotation preview helpers", () => {
  it("selects the physical top y-layer including side rows and top face", () => {
    const rotation = { axis: "y", layerIndex: 2, direction: 1 } as const;
    const keys = cellsInRotationLayer(rotation).map(
      (cell) => `${cell.face}:${cell.row}:${cell.col}`,
    );

    expect(keys).toHaveLength(21);
    expect(keys).toContain("front:0:0");
    expect(keys).toContain("front:0:2");
    expect(keys).toContain("back:0:1");
    expect(keys).toContain("left:0:1");
    expect(keys).toContain("right:0:1");
    expect(keys).toContain("top:0:0");
    expect(keys).toContain("top:2:2");
    expect(keys).not.toContain("bottom:1:1");
    expect(keys).not.toContain("front:2:1");
  });

  it("checks individual cell membership for x and z layers", () => {
    expect(
      isCellInRotationLayer(
        { face: "right", row: 1, col: 1 },
        { axis: "x", layerIndex: 2, direction: 1 },
      ),
    ).toBe(true);
    expect(
      isCellInRotationLayer(
        { face: "front", row: 1, col: 1 },
        { axis: "x", layerIndex: 2, direction: 1 },
      ),
    ).toBe(false);
    expect(
      isCellInRotationLayer(
        { face: "front", row: 1, col: 1 },
        { axis: "z", layerIndex: 2, direction: -1 },
      ),
    ).toBe(true);
    expect(
      isCellInRotationLayer(
        { face: "back", row: 1, col: 1 },
        { axis: "z", layerIndex: 2, direction: -1 },
      ),
    ).toBe(false);
  });

  it("maps preview progress and direction to quarter-turn radians", () => {
    expect(previewAngleForProgress({ axis: "x", layerIndex: 1, direction: 1 }, 0)).toBe(0);
    expect(previewAngleForProgress({ axis: "x", layerIndex: 1, direction: 1 }, -1)).toBe(0);
    expect(previewAngleForProgress({ axis: "x", layerIndex: 1, direction: 1 }, 0.5)).toBeCloseTo(
      Math.PI / 4,
    );
    expect(previewAngleForProgress({ axis: "z", layerIndex: 1, direction: -1 }, 1)).toBeCloseTo(
      -Math.PI / 2,
    );
    expect(previewAngleForProgress({ axis: "z", layerIndex: 1, direction: 1 }, 2)).toBeCloseTo(
      Math.PI / 2,
    );
  });

  it("converts a rotation angle into a Three.js Euler tuple", () => {
    expect(rotationToEuler({ axis: "x", layerIndex: 1, direction: 1 }, 0.25)).toEqual([
      0.25,
      0,
      0,
    ]);
    expect(rotationToEuler({ axis: "y", layerIndex: 1, direction: 1 }, 0.25)).toEqual([
      0,
      0.25,
      0,
    ]);
    expect(rotationToEuler({ axis: "z", layerIndex: 1, direction: 1 }, 0.25)).toEqual([
      0,
      0,
      0.25,
    ]);
  });

  it("creates inverse rotations without changing axis or layer", () => {
    expect(inverseLayerRotation({ axis: "y", layerIndex: 0, direction: 1 })).toEqual({
      axis: "y",
      layerIndex: 0,
      direction: -1,
    });
  });
});
