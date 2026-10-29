# P018 — Mobile navigation and safe touch gestures (2026-10-29)

- Focused UI/UX patch only; no new garden data fields or gardening features.
- Mobile navigation now includes MAP, OBJECTS, DETAILS and GARDENS. Switching a tab scrolls directly to its panel; the MAP tab restores the editor toolbar. Choosing a preset returns directly to the canvas for placement.
- One-finger taps select objects on pointer release (not pointer down), avoiding incidental selection during two-finger pinch. Tiny finger movements no longer move objects, boundary corners, feature nodes, or resize handles.
- Touching a path/terrain/property edge only inserts a point after a stationary tap. An edge swipe pans instead; pinch gestures never create points.
- Mobile bottom navigation reserves device safe areas; mobile panels scroll clear of the bar. Original IndexedDB saves, offline caching, object IDs, and garden format v6 unchanged.
- Automated intent tests supplement previous model tests; manual Android touch/scroll tests remain required.

---

## P017 — Mobile Toolbars & Measurement Input Polish (2026-10-29)

- Fixed per-keystroke reversion in existing path/fence width fields, new path/fence width, object rotation, and tracing image width/X/Y offsets; commit valid values on blur or Enter, Escape restores unchanged state.
- Removed overlapping sticky mobile editing rows, kept all tools and quick palette available.
- Made selected objects easier to edit using a compact map selection strip and a scroll-to-Inspector action; object list selection uses the same navigation.
- Raised mobile input font sizes, kept touch-sized controls, and did not change garden v6 schema, save paths, or existing feature semantics.
- Added tests for number parsing, bounds and intermediate editing states.

## P016 — Mobile tool compactness and object dimensions (2026-10-29)

- Reduced main tool button bulk, abbreviated labels, and arranged mobile interaction tools in a two-row, five-column grid rather than a long horizontally-scrolling toolbar.
- Reduced quick-add button and object palette footprint without removing tool choices or access labels.
- Replaced immediate, constrained diameter input with independent width/length editable drafts. Blank/zero while typing no longer gets rejected mid-entry; final value `0` means not measured, invalid final input reverts with feedback.
- Optional `widthM` and `lengthM` fields are independently saved, drawn in both linked views, resized from the corner handle and shown in print. Old single-diameter v6 gardens remain visually unchanged until edited.
- Preserved app storage, map layers, object IDs, specimen histories, photos and JSON migration. Added four regression tests; total suite: 63 passing locally.

## P015 — Storage integration and editor reliability (2026-10-29)

- Fixed the real P014 editor to hydrate from IndexedDB and use ordered asynchronous save writes rather than the legacy localStorage autosave effect.
- Editing waits for load completion, preserving existing browser gardens; previous localStorage keys are left untouched.
- Distinguished in-progress saving from failed writes in the header and prevented claiming success before a write completes.
- Warns about closing/reloading with unfinished or failed saves where supported; PWA updates stay blocked while unsaved.
- Uses IndexedDB recovery where available; fallback remains explicitly limited to localStorage.
- Added regression tests for save failure, disabled IndexedDB, and editor wiring; fixed a zero-usage storage estimate edge case.
- No new garden features or format migration; version 6 backups remain valid.

## P013 — IndexedDB Storage & Photo Gallery (2026-10-29)
- Added async IndexedDB primary storage for complete multi-garden libraries, preserving prior localStorage saves unchanged during first-run migration.
- Writes serialized in edit order, with time-based valid-revision recovery checkpoints, explicit saving/saved/failure UI and fallback when IndexedDB is unavailable.
- Added site-storage estimate and optional browser persistent-storage request; external JSON backups are still required.
- Upgraded specimen gallery from 3 to 8 compressed photos per plant, added batch import/progress and individual JPEG export links.
- Raised optimized-photo size/dimension limits for better clarity; photos remain locally compressed and included in garden/library JSON backups (not original full-resolution archives).
- Increased import limits to allow larger photo-inclusive backups. Garden model remains v6 and P001–P012 backups continue to be accepted.
- Added IndexedDB migration, queue ordering, corruption recovery, checkpoint rotation and localStorage fallback tests.

## P012 — Plant Atlas and Specimen Records (2026-10-29)
- Added shared species encyclopedia (common/botanical names, description and care notes) plus individual specimen profiles.
- Added identification confidence, planting date, dated observations and dated maintenance history for planted object kinds.
- Added compressed local photo upload with a three-thumbnail limit per specimen and editable captions.
- Included specimen data and photos in garden JSON backups and printable report.
- Reused existing v6 schema with optional validated fields, preserving old backups and stable object IDs.
- Duplicating a plant no longer copies its personal history or photographs.
- Added dedicated plant-atlas regression tests. Browser storage is not cloud synchronization; larger photo libraries will need IndexedDB.

## P008 — Visible Map Size & Surrounding Workspace
- Added MAP SIZE button directly above the map, usable on phones.
- Added custom map dimensions, 10–500 m, with preserve-position and explicit scale-all modes.
- Added +10m / +25m surrounding context controls, preserving all relative geometry.
- Refuse destructive workspace shrinking that would clip any feature.
- Reused existing v6 storage and linked views, with Undo/Redo for map size edits.

## P007 — Linked Maps & Safer Undo/Redo (2026-10-29)

- Linked Scale and Illustration views through one authoritative layout and one location per specimen.
- Map edits (trees, boundaries, ground regions, paths, fences) now appear in both views automatically.
- Added a data-version-6 migration with explicit Scale/Illustration source choice for existing gardens.
- Archived each complete original pre-link garden, including both independent layouts; original maps can be exported.
- Moved undo/redo controls near the map and added desktop keyboard shortcuts with field-aware handling.
- Coalesced consecutive edits to one text field into fewer undo steps; kept 40 action snapshots per session.
- Preserved JSON imports, browser autosaving, multi-garden library and original pixel-art sprites.
- Updated test suite to cover migration, archive round-trips, linked geometries and edit grouping.

# Changelog

## P010 — Editable Map Features, Resize Handles & Layer Locking (2026-10-29)

- Added direct editing of existing path, fence and terrain vertices, with edge insertion and selected-point removal.
- Added polygon validation to avoid overwriting valid regions with crossing or collapsed edits.
- Added a touch-sized object resize handle with one-step undo and unchanged shared map geometry.
- Added independent layer visibility and lock toggles (objects, terrain, paths/fences, property boundary).
- Retained garden v6 data format, existing projects, import/export and browser autosaving.
- Added four automated tests for vertex editing and object resizing.

## P001 — Pixel Garden Editor Foundation (2026-10-29)

- Scaffolded a TypeScript + React + Vite web app for the Garden Atlas repository.
- Added a responsive dark green pixel-inspired editor with five original SVG object sprites.
- Added object placement, drag, selection, editing, deletion and stable record IDs.
- Added independent Scale and Illustration map positions sharing one object record.
- Added a measured sample grid (40 × 26 metres) with placement snapping.
- Added local browser saving and import/export of validated JSON backups.
- Added a synthetic demonstration garden with no personal property data.
- Added four automated model tests and a GitHub Pages deployment workflow.

### Known limits

- PDF generation, polygon drawing, real grouping, advanced map panning, photographs, and the plant encyclopedia are planned, not implemented.
- Coordinates are a flat local plan; not a geographic survey or a georeferenced parcel.
- LocalStorage is a prototype store, not guaranteed durable storage. Export regular backups.
- Browser interface and production Vite build require dependency installation and should be verified after npm access is available.

## P002 — Editable Garden Groups (2026-10-29)

- Introduced permanent group IDs, editable group names and shared group notes.
- Added Create Group, group library, group inspector and member navigation.
- Replaced free-text per-object group labels with a group selector for linked membership.
- Selecting a group highlights its placed members; dragging any highlighted member moves the whole group in the active map, preserving their relative spacing and respecting map bounds.
- Kept Scale and Illustration placements independent, including when moving groups.
- Added v1→v2 import and local-save migration; the original P001 localStorage key is retained as a fallback backup.
- Added model tests for migration, references, boundary clamping, group deletion and independent layout behavior.

### Notes

- A group contains shared object records; it is not yet a drawable hedge line or a terrain polygon.
- Group movement operates on already-placed objects in the current map only. An unplaced object is placed individually.
- Photos, layers, advanced shape drawing and printable garden books remain future patches.

## P003 — Mobile Controls, Garden Outline & Backup Safety (2026-10-29)

- Added touch-friendly tap-to-move controls and map-width fitting at 100% zoom. Desktop mouse/pen drag is retained.
- Added polygon outline editing per map with indexed corners and add/remove tools; invalid boundary edits are rejected.
- Added configurable whole-plot ground styles: grass, soil, gravel and stone, independent by map mode.
- Added new blank garden creation without demo content, plus clear browser-autosave and backup/recovery messaging.
- Improved JSON backup naming and P001/P002 data migration into `version: 3`; retained older browser storage keys.
- Added limited previous-save browser recovery fallback for an invalid current save; downloadable JSON is still the essential backup.
- Expanded the model test suite to 19 passing tests. Fixed malformed-key fallback and boundary edge intersection handling.

### P003 limitations

- The workspace remains fixed at 40 × 26, so the plot outline is editable only within that space.
- Ground style applies to the whole plot, not multiple terrain regions, slopes or elevations.
- LocalStorage and previous-save recovery cannot survive browser data clearing or guarantee no data loss; export JSON regularly.
- P003 is not a finished landscape surveying tool; full UI/device interaction must be verified after GitHub Pages deployment.

## P004 — Mobile editor and flexible garden workspace
- Rebuilt map navigation around direct pointer drag and two-finger pinch zoom, eliminating P003's tap-to-move requirement.
- Added boundary tracing, corner drag, arbitrary edge points, editable independent terrain regions, resizable canvas and a separate map camera.
- Introduced a multi-garden browser library, backup-all/restore-all, safe legacy migrations and local recovery.
- Added undo/redo, duplicate/repeat-place and mobile panel navigation; no fabricated survey or private sample data.

## P005 — Mobile quick tools, batch grouping and printable garden book
- Kept a quick-add pixel object palette next to the mobile map so users can place trees without scrolling the full toolbox.
- Added safe batch group assignment from a checkbox object list.
- Added a local print-ready garden report showing both map layouts, group notes, specimen records, measurements and IDs; browser print provides Save as PDF.

## P006 — Editable paths and fences
- Added path and fence waypoint tools to both maps, with configurable width and saved line records.
- Added feature management controls and printable report representation.
- Upgraded garden files to schema v5 and automatically migrates P001–P004 gardens and v4 browser libraries without changing stable IDs.
- Expanded model and migration tests to 27 checks.

## P009 — Multi-Select and Reference Tracing (2026-10-29)

- Added multi-select for touching multiple items on the map; drag selected items together in one Undo step.
- Added left/right/top/bottom alignment, spacing controls and confirmation-based bulk deletion.
- Added optional 0.5-metre grid snapping and numeric sprite rotation.
- Added compressed local reference JPG import, opacity and geometry controls, show/hide toggle, and shared overlay in both map styles.
- Added safe validation for image data and workspace bounds; image follows world resize/expansion.
- Kept existing v6 garden data and P001–P006 import/migration paths intact.
- Added regression tests for bulk movement, alignment, reference validation and dimensions.

### Limits

- Reference photos are capped after compression and stored in localStorage; monitor the NOT SAVED indicator and download backups.
- Tracing alignment is manual, not GPS calibrated; this is not a land survey.
- No object rotation handles or on-map image-transform gestures yet; image sizing and offsets are edited numerically.

## P011 — Original Pixel-Art Object Catalog
- Added a searchable, category-filtered library of 24 reusable presets across eight object categories: trees, shrubs, flowers, beds, structures, rocks, ponds and furniture.
- Added original 64×64 pixel-block SVG variants for conifers, flowering trees, fruit trees, hedges, flowers, raised beds, sheds, greenhouses, stones, ponds and garden furniture.
- Extended the existing garden v6 records with an **optional** `presetId`; old objects without a preset remain valid and retain their original art.
- Added reusable preset placement, names and starting diameters, plus a non-destructive appearance selector for existing objects.
- Updated editor thumbnails, both linked map styles and printable maps to use the same selected sprite.
- Added model tests covering catalog uniqueness, filtering, saved IDs, old backups, linked placement and bad preset rejection (39 tests in total).
- These art presets are visual templates, not botanical identifications; no downloaded images, cloud accounts or external assets were added.

## P014 — Offline PWA & Installation
- Added home-screen manifest and custom pixel-art 192/512 PNG icons matching the existing favicon.
- Automatically generate a versioned service worker after each production build. Precache only app HTML, JavaScript, CSS, icons and manifest within the GitHub Pages project scope.
- Offline-capable app shell, online/offline notice, installation guidance, update checks and user-initiated update activation only after local saves.
- Kept garden data and photo archives in IndexedDB, distinct from cached app files. Existing JSON imports/exports still work offline.
- Added PWA integration tests and documentation for first-launch requirements, independent device storage and recovery limitations.
