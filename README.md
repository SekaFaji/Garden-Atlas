# 🌿 Garden Atlas

**A touch-first, pixel-art-inspired TypeScript garden editor.** Built with React, SVG and Vite, deployed as a static site on GitHub Pages.

**Live demo:** https://sekafaji.github.io/Garden-Atlas/

Garden Atlas lets people illustrate their garden, maintain shared records for plants and structures, and use a dimensioned Scale view of the same shared garden. The included example contains **synthetic data only**—not a real address or parcel plan.

## P013 — IndexedDB Storage & Photo Gallery (2026-10-29)

- Complete browser garden libraries now save transactionally in IndexedDB; existing localStorage gardens are copied on first load without deleting older data.
- Autosave is queued in edit order. The top bar distinguishes saving, successful IndexedDB saves and failed saves.
- A previous valid library is periodically checkpointed for recovery; garden/library JSON backups remain essential.
- Optional browser persistent-storage request and approximate site quota display under My Gardens.
- Specimen photo galleries now allow up to eight optimized JPEG images per plant, batch import/progress, editable captions, removal and individual photo downloads.
- Garden schema remains version 6; old P001–P012 garden backups and previous browser data remain compatible.
- Photos are still optimized copies included in JSON, not original full-resolution archives. Clearing site data may delete all browser copies.

## P012 — Plant encyclopedia and specimen history

Select any **tree, shrub or flower** on the map, then open **Details → Plant Atlas** to document that individual plant. Garden beds, structures, rocks and furniture are not single plant specimens, so they retain their existing general notes instead.

- **Separate species profiles:** create a shared entry with common/botanical names, a description and care notes; link multiple independent plants to it. Deleting a species unlinks its specimens but keeps them and their history.
- **Identification confidence:** unidentified, tentative, or user-confirmed. The app does not identify species automatically and does not verify labels.
- **Individual histories:** optional planting date, dated observations, and dated maintenance entries (watering, pruning, feeding, planting, inspection or other), each tied to the specimen's permanent object ID.
- **Local photos:** add up to **eight compressed JPEG images per plant**, imported from JPG/PNG/WebP files. Images are processed in the browser, stored with the garden, shown in the Inspector and included in garden JSON backups and print reports. Photo captions are editable.
- **Undo:** editing notes, species profiles, specimen histories and photos uses the existing history mechanism; typing bursts are grouped.
- **Compatibility:** still garden file **version 6**, with optional `speciesLibrary` and `plant` fields. Old gardens, object IDs, original species text, map placements and legacy imports remain intact. Duplicating a plant keeps its species association but starts with a clean specimen history, date and photos.

**Storage warning:** IndexedDB provides more space than localStorage, but browser data can still be cleared or evicted. Photos are locally compressed and included in JSON backups. Watch the save-status indicator and export regular backups outside this browser. No automatic cross-device sync.

## P010 — Edit existing map features and lock layers

- Use **EDIT FEATURES** in the map toolbar, then tap a drawn path, fence or terrain region to select it.
- **Drag a visible vertex handle** to reshape the feature. **Tap an edge** to insert a new vertex. Select a handle and choose **REMOVE SELECTED POINT** to delete it (minimum: three terrain corners or two path points).
- Edits validate polygons and path geometry before committing. Invalid changes retain the original shape and show a notice. Successful edits are one undoable operation.
- Select a tree or structure in **SELECT** mode and drag the square resize handle on its lower-right corner. Resizing is shared between Scale and Illustration; existing numeric size entry still works.
- **LAYERS** now has individual show/hide and **LOCK/EDIT** controls for objects, terrain, paths/fences and the property outline. Locked layers cannot be moved or drawn over through the corresponding map tools; the object inspector respects object locks.
- Locks are **temporary editor controls**, not yet persistent project permissions. Objects, regions, lines, backups and migration format are unchanged (garden version 6).
- Mobile note: when editing features, choose the feature first to expose its handles. Pinch to zoom in for precision. Physical-device gesture testing remains necessary.

## P007 — Two connected views, one garden

Garden Atlas is a mobile-friendly garden design web app. Its Scale and Illustration buttons change **how the same garden looks**, not where its objects are stored. A tree, path, fence, ground region or property boundary edited in either view immediately appears in the other. One shared position is retained per item.

**Upgrading a garden from P001–P006:** the old views may contain different positions. On first opening an old garden, preview Scale and Illustration, then explicitly choose which old layout becomes the shared editable map. Until you confirm, garden editing is locked. The entire original garden, including **both** old view layouts and placements, stays in the version-6 `linkMigration.original` archive. Use *Download original two-view backup* or *My Gardens → Export original pre-link maps* to recover either original layout; your JSON garden backup also includes the archive. Do not clear browser data until you have downloaded a backup.

**Undo / Redo:** large, accessible buttons are near the map, with Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y outside text inputs. Typing bursts in the same field share a history step. Dragging a whole group, placing objects and editing shapes each create one step. Up to 40 snapshots are kept **only until the page is reloaded**.

## Previous capabilities — P004–P006

### Mobile-first map
- **Drag an item directly** using one finger or mouse. The item follows your finger; coordinates are committed once on release.
- **Pan on empty ground** with one finger, or use the Pan tool.
- **Pinch zoom** with two fingers; mouse wheel and zoom buttons also work.
- **FIT** zooms to the property boundary; **AREA** shows more surrounding workspace. Zoom is continuous and considerably wider than P003.
- **Undo / redo** garden edits; both views use one shared garden layout.
- **Object hit areas** are larger than their actual sprites for easier selection on a phone.
- A bottom tab bar on small screens keeps the large map visible and places Objects / Details / Gardens in collapsible panels.

### Flexible garden layouts
- Change workspace width and height from **10 to 500 metres**, with a confirmation before proportional scaling of all coordinates. This is a flat local plan, not a cadastral/GPS survey.
- **EDIT BORDER:** drag individual vertices, or touch any segment to insert an extra point. The drawing is checked before it replaces a valid boundary.
- **DRAW BORDER:** touch several corners and press **FINISH** to create a polygon.
- **FREEHAND:** trace an approximate outline and release; the stroke is simplified into editable points. Invalid traces don't replace the old border.
- **TERRAIN:** draw independent, fillable polygons using grass, soil, gravel, stone or water. These are 2D visual regions, not elevation contours or terrain simulation.
- **PATH / FENCE:** tap a sequence of points and press **FINISH**. Each line gets an editable name and width (metres), is independently saved on the active map and appears in the printable report. The tool draws 2D paths/fences, not 3D structures.
- Show/hide object, boundary, paths/fences and terrain layers. The two views now display the same shared placements, boundaries and terrain regions.

### Faster editing, garden reports and multiple gardens
- Place many objects without reselecting the toolbox item; duplicate an existing record for fast reuse. A mobile quick-palette stays directly above the map.
- Select several objects in the object list and assign them to a group in one action.
- **PDF / PRINT** opens the browser print dialog for a detailed garden book with both garden maps, group descriptions, and all specimen records. Choose **Save as PDF** in your browser to generate a PDF locally; this is not a separate binary PDF download service.
- Move grouped objects together by selecting the group and dragging a member.
- Keep **up to 20 garden projects** in this browser, and switch between them.
- Automatic browser-local saving, periodic previous-save recovery, JSON export/import of a garden **as a new project**, plus whole-library JSON backup/restore.
- On first load P001–P003 local gardens are upgraded; importing old JSON backups also works. Prior localStorage keys are not modified.

## P008 — Map size and surroundings

The **MAP SIZE** button is now in the toolbar immediately above the editor map, including on mobile. The inspector no longer hides the only way to change the workspace dimensions.

- Enter a custom **workspace width and height**, 10–500 metres each. These are editable map dimensions, **not** zoom percentages or the property's land area.
- **Keep actual garden size and positions** (recommended): change the surrounding workspace without affecting any existing measured tree, boundary, path or terrain coordinates. Shrinking is rejected if it would cut off anything.
- **Scale entire garden to fit**: explicitly stretch all positions and shapes to the new width and height. This changes measurements; it requires confirmation and can be undone.
- **+10 m each side** or **+25 m each side** adds room for surrounding roads, neighbouring land and context without distorting the garden; all coordinates translate together so spacing remains unchanged.
- Use **EDIT BORDER** or **DRAW BORDER** to reshape the *actual property boundary*, which is separate from workspace width and height.
- Size edits work in both linked Scale and Illustration views, are included in browser autosave and backups, and can be undone during the editor session.

## P009 — Multi-object editing and trace-image overlay

- **MULTI** directly above the map switches to touch-friendly multi-select: tap individual objects to select/deselect them. Drag any selected object to move the whole selection in one Undo step, preserving relative spacing. Use **SELECT ALL PLACED** or checkboxes in the object list for bulk selection.
- Bulk operations in the Objects panel: align to left/right/top/bottom, distribute evenly on X/Y (3+ placed objects), assign selected objects to groups, or delete the selection after confirmation.
- **SNAP** in the toolbar optionally snaps placements/movements to a 0.5 m grid. When off, the existing Scale view 0.1 m snapping is retained; Illustration stays freeform.
- Each object's **rotation** can be edited in the Inspector (0–359 degrees). This changes its sprite's presentation, not its shared measured location or diameter.
- Open **TRACE IMAGE** near the map to import a local JPG, PNG or WebP image. Images up to 15 MB are decoded and compressed locally into a bounded JPEG before saving; no upload or external image service is used.
- Adjust reference **opacity, image width (metres), and X/Y offsets**, and toggle visibility. The same image alignment appears in Scale and Illustration. Importing a new photo replaces the previous one in the current garden.
- The reference image is included in a garden's JSON backup and the full-library backup. Its size is restricted because this release still uses browser `localStorage`; **NOT SAVED** means you must export a backup immediately.
- Tracing is **manually aligned**, not georeferenced or automatically calibrated. Know a real-world distance before using the overlaid image for measurements. The image overlay is deliberately excluded from printable maps.
- Existing version-6 gardens remain valid without a migration; reference and rotation fields are optional. Older versions still migrate through the existing parser.

## How to use

1. Start by opening **GARDENS** and creating an empty garden, or edit a copy of the sample.
2. Drag an object; drag empty space to navigate. Pinch the map or use **AREA** to see beyond your property's outline.
3. Select **EDIT BORDER**, and drag corners or touch a border edge to add a corner; for a completely new border use **DRAW BORDER** or **FREEHAND**.
4. Use **TERRAIN**, select a ground type, then draw the corners of a region and press **FINISH**. For walkways and fences choose **PATH** or **FENCE** and tap points along a line; the sidebar lets you edit the resulting feature's width or delete it.
5. Go to **DETAILS** to rename the selected tree, set species, rotation and notes, or duplicate it. Use **MAP SIZE** above the canvas to change map dimensions. Use the quick palette above the map for rapid planting.
6. Use the top bar **PDF / PRINT** button, then select **Save as PDF** in the browser print dialog.
7. Export regular **BACKUP** files from the top bar, or go to GARDENS to export **all** projects.

### Important limitations

- The library is stored primarily in **browser IndexedDB**, with a limited localStorage fallback. It has no cloud backend or cross-device synchronization. Clearing site data may delete it; backups are essential. The app warns when saving fails.
- Project import **adds** a garden; whole-library import requires confirmation because it replaces the local library.
- Advanced PDF output, plant encyclopedia and photo albums, real elevation, editable path/fence segments, planned-vs-existing scenarios and object resize handles are **not yet implemented**.
- Undo history is scoped to the open garden editing session, not saved after a browser reload.
- Neither map should be used as a legally accurate land survey without additional calibration and authoritative measurements.

## Development

Node.js 20.19+ or 22.12+ and npm:

```bash
npm install
npm test
npm run build
npm run dev
```

Vite is configured with `base: '/Garden-Atlas/'`. The [deployment workflow](.github/workflows/deploy.yml) runs tests and a production build and deploys to GitHub Pages from `main`.

## Data model and compatibility

Project data format **v6** (P009 extends it with optional `reference` and object `rotation`, without changing the version) contains `width`, `height`, `groups`, `objects` (with one optional `position` each), and a shared `layout` with `boundary`, `ground`, `regions`, and editable `lines` (paths/fences). Older projects include a full original P006 archive that preserves both independent layouts. The browser library format is separately versioned as `version: 1` and contains garden projects with stable project IDs.

P001–P006 garden JSON is migrated without discarding specimen IDs, notes, groups or original independent map data. A source-view confirmation is required before editing. Use an exported JSON backup before editing or upgrading.

## License

MIT. The pixel-block SVG art and sample data are original to this project.

## P011 — Expanded pixel-art garden object library

The **OBJECTS** panel contains a searchable **PIXEL-ART PRESETS** catalog. Filter by category or search for a name (e.g. pine, greenhouse, pond, bench). Choose a preset and tap the map to place multiple copies; the selected preset supplies an editable starting name, size and original pixel-art sprite. You can still move, resize, rotate, group and annotate the object normally. The top quick palette offers category shortcuts using each category's default preset.

Currently there are **24 presets across eight categories**: trees, shrubs, flowers, beds, structures, rocks, ponds and furniture. In an existing object's Inspector, the **PIXEL-ART APPEARANCE** dropdown changes its sprite without changing the object's stable ID, name, species field, notes, diameter or position. Existing objects without a `presetId` keep their previous P010 art until you choose a variant.

The `presetId` field is optional in the existing v6 Garden JSON schema; old P001–P010 JSON backups remain readable. Saved garden backups now include preset selections. The same sprite appears on both linked map styles and printable maps. These are **stylized visual presets**, not verified species identifications or exact-to-scale models. Custom user-uploaded sprite images, species profiles, care histories and photo galleries are not yet implemented.
