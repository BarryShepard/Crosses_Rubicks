# Cube Visual Refresh Design

## Goal

Refresh the Rubik's tic-tac-toe cube visuals so cells remain visible during rotations, the board has tighter seams, and marks/palette use the newly supplied SVG assets.

## Scope

Included:

- Make the inner gray support cube transparent enough that rotating face cells no longer disappear into it.
- Reduce visual spacing between the 3x3 cells on each cube face to roughly 4-6 px at the current rendered scale.
- Use the supplied `cross.svg` and `null.svg` assets for X and O instead of text glyphs.
- Apply the supplied palette:
  - `#121212` for cube seams and the supplied black mark SVGs.
  - `#817D7E` for the scene/page background.
  - `#F1F1F1`, `#5E93B7`, `#D3A6AD`, `#D2C829`, `#EB2B26`, and `#81421F` for cube faces.
- Keep the implementation lightly structured by moving cube visual constants into a dedicated theme module.

Out of scope:

- Changing game rules or rotation gestures.
- Reworking camera controls.
- Adding alternate skins or runtime theme switching.
- Redrawing the supplied SVG files.

## Approved Direction

Use a small structural cleanup rather than placing all new constants directly inside `CubeScene.tsx`.

The app will get a `cubeTheme` module responsible for visual constants: face colors, seam color, background color, sticker size, sticker offset, mark texture scale, and base cube opacity. `CubeScene.tsx` will consume that module while keeping interaction and animation behavior unchanged.

X and O will use the original black pixel SVG files as decals. They will not be recolored per player. This matches the asset files and palette, and preserves a single strong graphic language across all faces.

## Visual Details

The current opaque inner cube is the source of cells visually disappearing during layer rotation. It should remain as a transparent depth/support object only if needed for spatial grounding. The material should be transparent with low opacity and disabled or reduced depth interference so rotating stickers remain readable.

Cell seams should read as black gaps between colored face stickers. The sticker plane size should increase relative to the current face coordinate spacing so the gap becomes roughly 4-6 px on the front face in the default camera view. The interactive overlay grid can keep its existing 3x3 layout because it is transparent and only handles placement clicks.

Each cube face should use one palette color consistently:

- Front: `#F1F1F1`
- Back: `#5E93B7`
- Right: `#D3A6AD`
- Left: `#D2C829`
- Top: `#EB2B26`
- Bottom: `#81421F`

The active-face wireframe can remain as a gameplay affordance, but it should use the black seam color rather than the previous blue.

## Files

- Root user assets:
  - `cross.svg`
  - `null.svg`
  - `pallete.svg`
- App assets to create:
  - `.worktrees/rubiks-tic-tac-toe/src/assets/cross.svg`
  - `.worktrees/rubiks-tic-tac-toe/src/assets/null.svg`
- App theme module to create:
  - `.worktrees/rubiks-tic-tac-toe/src/components/cubeTheme.ts`
- App renderer to modify:
  - `.worktrees/rubiks-tic-tac-toe/src/components/CubeScene.tsx`
  - `.worktrees/rubiks-tic-tac-toe/src/components/CubeScene.css`
  - `.worktrees/rubiks-tic-tac-toe/src/styles.css`

## Testing

Unit/component tests should verify the renderer references image-based marks rather than the old text glyph path where practical.

Browser smoke tests should continue to verify:

- The canvas renders non-empty content.
- A mark can be placed.
- New game clears state.
- Right-drag rotation still enables undo.

Manual visual verification should check:

- Rotating/previewed cells no longer disappear into the inner cube.
- Gaps between cells are visibly tighter than before.
- X/O marks render from the supplied SVG assets.
- Palette colors are visible on the cube and the scene background uses the supplied gray.

## Self-Review

- Placeholder scan: no placeholders or deferred decisions remain.
- Internal consistency: the approved structural approach, palette, mark treatment, and transparent cube behavior are aligned.
- Scope check: this is a focused visual refresh and does not require decomposition.
- Ambiguity check: face color mapping and mark treatment are explicit.
