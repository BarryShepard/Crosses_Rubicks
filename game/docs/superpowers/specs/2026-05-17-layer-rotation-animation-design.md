# Layer Rotation Animation Design

## Goal

Make layer rotation understandable before and after the user commits a move. In rotate mode, the selected cube layer should visually rotate in 3D while the user drags, including wrapping around cube edges onto adjacent faces. Releasing the drag should either complete the rotation with a short snap-to-90 animation or cancel it with a reverse animation.

## Scope

Included:

- Live 3D preview for the candidate layer during rotate-mode drag.
- Affected stickers and X/O marks move together as one temporary 3D layer group.
- Preview rotates around the actual cube axis (`x`, `y`, or `z`) and selected layer index.
- Successful release animates the layer from its current preview angle to `90deg`, then applies the board rotation.
- Cancelled or ambiguous release animates the layer back to `0deg` and leaves the board unchanged.
- Input is blocked while completion or cancellation animation is running.
- Rotate mode remains armed after a cancelled or ambiguous drag.
- Undo uses the same visual language in reverse when possible.

Out of scope:

- Physics-based inertia.
- Free arbitrary-angle board state changes.
- Changing the game rules or gesture vocabulary.
- Sound effects.

## Interaction Model

Rotate mode still starts from the HUD `Rotate layer` button. During drag, the app continuously resolves the current gesture into a candidate `LayerRotation` when possible. Once the candidate is known, the selected layer is rendered as a separate animated group and rotated proportionally to drag progress.

The preview is volumetric. A row on the front face does not slide flat across the front grid. It turns around the cube axis, so edge stickers visually travel toward or behind neighboring faces during the drag. X/O marks remain attached to their stickers throughout the preview.

Release behavior:

- If the gesture is valid and crosses the commit threshold, animate to `90deg`, then call `applyTurnRotation`.
- If the gesture is too short, ambiguous, or below the commit threshold, animate back to `0deg`, do not mutate the board, and keep rotate mode armed.
- If the pointer is cancelled, use the same rollback animation.

## Architecture

Keep the pure game model unchanged. `GameState.board` remains the source of truth and should not mutate during live preview.

Add a scene-local animation state in `CubeScene`:

```ts
type RotationPreviewState = {
  rotation: LayerRotation;
  angle: number;
  phase: "dragging" | "committing" | "cancelling" | "undoing";
};
```

During rendering, split stickers into two groups:

- Static group: all cells not in the active preview layer.
- Preview group: all cells in the active preview layer, nested inside a group rotated around the correct axis by `angle`.

Layer membership should use the existing cube-space geometry helpers instead of screen-space assumptions:

- Convert each `CellId` to a sticker with `cellToSticker`.
- Use `axisValue(sticker.position, rotation.axis)` and `layerToCoord(rotation.layerIndex)` to decide whether a sticker belongs to the rotating layer.
- Rotate the group around the matching local axis.

After a commit animation finishes, clear preview state and emit `onLayerRotation(rotation)`. The parent applies the board mutation once. After a cancel animation finishes, clear preview state without emitting a rotation.

Undo should preserve current game behavior and restore the pre-rotation board. If the pending rotation is known, the scene can animate the inverse rotation first, then call the existing undo action after the animation completes. If no visual context is available, the app may fall back to the current instant undo.

## Gesture And Progress

Gesture resolution can keep using `resolveRotationGesture` as the final source for valid rotations. For live feedback, `CubeScene` needs a lightweight preview resolver that can identify the same candidate during drag after the movement passes a small intent threshold.

Angle progress should be clamped:

- `0deg` at drag start.
- Up to `90deg` in the resolved direction.
- Commit threshold around half turn progress or the existing minimum valid drag distance, whichever produces a clearer feel in testing.

Direction must match the existing `LayerRotation.direction` semantics so the final animation and board mutation agree.

## Error Handling

If the preview candidate changes during early drag, replace the preview state before the angle is substantial. Once the user has clearly committed to one layer, keep that candidate stable until release to avoid flicker.

If a drag starts outside the interpretable rotation zones, show no layer movement until a valid candidate is available. On release, treat it as cancellation.

Pointer cancellation, lost capture, or mode changes clear or roll back preview state instead of applying a board rotation.

## Testing

Unit tests:

- Helper for selecting preview-layer cells returns the correct cells for each axis and layer.
- Preview commit emits exactly one final `LayerRotation`.
- Cancelled preview does not emit a rotation.

Component or browser tests:

- In rotate mode, dragging a row causes only that layer's visible stickers to move before release.
- Successful release eventually updates the board and disables rotate mode for the turn.
- Cancelled release returns the layer visually and keeps rotate mode armed.
- Undo restores the previous board and, where implemented, uses the inverse animation.

## Acceptance Criteria

- While dragging in rotate mode, the user can see which cube layer will rotate and in which direction.
- The preview is a real 3D layer turn around the cube, including stickers wrapping around edges.
- A successful rotation visibly completes before the game board changes.
- A cancelled or ambiguous gesture visibly reverses before returning to idle.
- Game rules remain unchanged: one optional rotation before placement, undo before placement, fixed active face, and active-face win checks.
