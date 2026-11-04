# Garden Atlas - Visual design audit (P036)

## Scope and baseline

Audited the committed P035 app implementation, not imagined assets. Sources: `src/Sprite.tsx`, `src/VariantSprites.tsx`, `src/components/MapScene.tsx`, `src/components/MapObject.tsx`, `src/components/ObjectIcon.tsx`, `src/mapObjectGeometry.ts`, `src/catalog.ts` and `src/styles.css`. The preset library contains 24 objects across 8 categories. These assets are authored SVG geometry, not extracted external artwork.

The app has two synchronized presentations: Scale for measurements and Illustration for pixel styling. The illustrations share object models and dimensions. Any art upgrade must preserve their coordinate systems and the v6 garden record format.

## Findings, ordered by priority

| Priority | Finding in P035 | P036 action or future direction |
| --- | --- | --- |
| High | Grass was a single green rectangle with two small decorative marks; the same grass marks appeared even when the base garden ground was soil, stone or water. | **Addressed P036:** distinct reusable world-aligned pixel tiles for all five ground types, with ground and region surfaces selecting matching textures. |
| High | Terrain regions were solid flat polygons, reducing legibility when neighboring surfaces were large. | **Addressed P036:** regions use the same surface-specific pixel tiles as the base map, with a low-contrast boundary. |
| High | Trees, shrubs, flowers and structures use relatively few large rectangular blocks, with uneven detail and silhouette distinction. | **Planned:** improve preset silhouettes and color ramps in small batches. Keep shared sprites in catalog, inspector and maps. |
| Medium | Paths and fences are mostly single flat strokes, with limited distinction between stone, gravel, timber and ornamental elements. | **Planned:** improve path edging and fence posts visually without changing stored width or hit targets. |
| Medium | Map objects are stretched to their measured width/length in both presentations, making narrow or very long shapes look distorted. | **Planned:** explore visually stable icon aspect ratio with a separately drawn measured footprint. This needs interaction/resize tests before changing. |
| Medium | Surface texture, sprite palettes, and dark UI palette do not yet share documented color tokens. | **Partly addressed:** five surface base colors are centralized in `src/mapSurfacePalette.ts`; later art updates should reuse an explicit set of shadow/midtone/highlight ramps. |
| Low | Large portions of the stylesheet still contain many compact global rules and inconsistent spacing. | Defer UI-wide reskin until map art style and mobile touch targets are agreed. Do not combine with storage or geometry changes. |

## P036 art direction and guardrails

- Cozy, readable 16-bit-inspired pixel art, restrained moss greens, warm earth browns, muted slate greys and cool blue-greens. Avoid unstructured noise or busy patterns that obscure measurements and selection outlines.
- SVG texture tiles are authored with small square marks and `patternUnits="userSpaceOnUse"`. They repeat at a fixed world scale and do not add per-cell React nodes or runtime randomness.
- Scale mode retains its measurement grid and Illustration mode keeps the same editable layout. The terrain color choices affect presentation only, not data.
- Preserve SVG selectors used by map gesture handling and accessibility, including object, resize, feature vertex, edge, boundary and drag handles. Do not alter pointer events for artwork.
- Keep existing Android PWA manifest, icons, cache worker, IndexedDB hydration, offline fallback and import/export untouched. Back up garden JSON before manual mobile QA; never clear site storage to refresh visuals.

## Next recommended art iterations

1. **P037:** polish the default broadleaf tree, shrubs and flowers first, and review the catalog preview, inspector and map at phone size. Keep all 24 preset IDs stable.
2. **P038:** enhance paths, fences, planting beds and structure silhouettes, still preserving measured footprints and interaction targets.
3. **P039:** visual consistency and mobile view comparison, contrast, zoom readability, performance on dense gardens, then consider an optional illustration skin only if the existing one proves limiting.

## Validation

P036 adds source checks for complete ground-type coverage, reusable world-space patterns and unchanged garden records, plus a browser check that the same ground art appears in both views after reload. Passing CI is necessary but does not replace visual review and physical Android touch/install verification.

## P037 - First plant sprites and narrow-line editing

- Added hand-placed pixel highlights/shadows to the default broadleaf tree, rounded shrub and wildflower visuals, plus the eight existing tree/shrub/flower variant sprites. Preset identifiers, measured footprints and botanical record fields are unchanged.
- Sub-metre paths and fences now support widths down to 0.05 m, including the existing-line editor. The toolbar exposes practical presets (0.1/0.25/0.5/1/2 m); comma decimals continue to work in text inputs.
- Open paths and fences keep their short endpoints; a close-to-start simplification remains for closed terrain/boundary outlines only.
- Thin-line decorative outline now scales with width while transparent gesture targets remain unchanged. Future art patches can refine fence posts and path details.

## P038 - Paths, fences and remaining garden object art

- Paths receive restrained paving highlights when wide enough; narrow paths keep proportional strokes and precise measured widths.
- Fences use rails and up to 32 small decorative posts sampled along each actual polyline. Wire-thin fences stay dashed. Decorations do not alter any vertex or touch hit target.
- Beds, sheds, greenhouses, stones, ponds and furniture now have extra authored pixel shading and highlights. The 24 preset IDs and 64px source sprite sizes stay unchanged.
- No runtime randomness or animation; performance and physical-phone readability should be checked with dense gardens.

## P039 - Zoom readability and mobile visual consistency

- Selection outlines, dash cadence and focused-object labels now compensate for camera zoom so they remain legible at normal phone and desktop zoom. Labels are suppressed only at very distant overview zoom where they would otherwise be unreadable; the existing selection UI is retained.
- Very narrow paths and fences retain their exact measured SVG interior strokes. When a real stroke would project under 1.25 screen pixels, a faint dashed centreline guide can appear as a *visual indicator*, not a measured width or alternate saved geometry.
- Mobile camera buttons and fractional-width presets have at least 44px CSS touch targets. Small viewports receive restrained layout adjustments and overflow checks without altering pointer handlers or map movement.
- Unit tests cover physical-pixel thresholds, zoom extremes and unchanged saved data; Chromium adds 320px/393px viewport checks, selection zoom and touch-control dimensions. Physical Android QA is still required.
