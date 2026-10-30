## P022 — Selection visibility & active-tool clarity (2026-10-30)

- Presentation-only polish: differentiate focused, multi-selected and group-highlighted objects with clearer outlines. Only the focused selected object shows its inline map name, preventing piles of overlapping labels in large groups.
- Reuse the existing under-map hint row for a compact active-tool label and concise guidance; stronger pressed state and accessible descriptive labels for all nine original map tools.
- In multi-select mode the existing selected-object strip shows a count and a shortcut back to the existing object list for bulk actions.
- Refined active quick-palette and touch layouts without increasing toolbar button size or moving map gestures.
- No model/schema, storage, PWA, paths, photos, selection semantics or imported-garden changes. Version-6 saved gardens and backups remain compatible.
- Added regression tests for tool completeness, selection focus and map UI wiring. Phone visual and touch QA still required.

## P021 — Clearer drawing controls, safer tool switching

When using **PATH**, **FENCE**, **BORDER** or **TERRAIN**, the map displays the active drawing mode and how many vertices are needed *before* the first tap. Tap the map to add points, then choose **FINISH**. **POINT** removes the most recent draft point; **CLEAR** discards the draft. Outside text fields, Backspace removes one draft point and Escape clears the drawing.

Changing drawing tools or switching between Illustration and Scale while points are unfinished now asks before discarding the draft. Choosing Cancel keeps the current tool, view and draft. These are editor-only improvements; no objects or garden version-6 data change. Finished features still use the same validation and Undo/Redo as before.

## P020 — Smoother editing and mobile navigation (2026-10-29)

- **Garden, group and object name fields:** you can clear and retype freely; finishing with **Enter** or tapping away saves one edit, **Escape** cancels it. Empty finished garden/group names are rejected with the previous name retained. Objects retain their earlier optional-empty label behavior.
- **Mobile map handoff:** changing/restoring/importing a garden returns you to the canvas; selecting **EDIT POINTS** for an existing path, fence or terrain region from Objects takes you straight to its editing handles.
- **Narrow screens:** existing path/fence edit rows wrap rather than squeezing names, measurements and action buttons. No map/storage features, data formats or published artwork have been changed.

---

## P019 — Mobile Inspector & Layout Polish (2026-10-29)

Select a garden item, then open **DETAILS**. Its name, species/group and editable **width / length** are immediately visible. The same existing controls for **APPEARANCE & ROTATION**, **NOTES & MAP PLACEMENT** and **PLANT ATLAS · PHOTOS & HISTORY** are now in expandable sections to reduce scrolling. Use the Inspector's **MAP** action to return to the canvas.

**OPEN MAP SIZE SETTINGS** opens the existing controls above the map and takes you there. The Inspector header is smaller and inputs remain finger-friendly. The folds initially start closed; open one whenever you need to edit its fields. This patch changes layout and accessibility only, not garden schema version 6, existing IDs, photos, storage, offline behavior, or backup formats. Manual device tests remain important.

---

## P018 — Mobile navigation and gesture reliability

- On phones, the bottom navigation now provides **MAP · OBJECTS · DETAILS · GARDENS**. Selecting a tab opens its corresponding section without long manual scrolling; choosing a preset jumps to the map ready for placement.
- Map taps select objects only on release. Small finger jitter is ignored when moving objects, editing corners or resizing. To insert a path, terrain or boundary point, **tap** its edge; dragging that edge pans rather than inserting a point. Pinching zooms without committing a tap.
- All garden records and old backups remain compatible (schema version 6). This is strictly a usability patch. Manual phone testing is recommended for touch behavior.

---

## P017 — Existing editor usability polish (2026-10-29)

- **Number fields:** edit line widths, rotation and tracing image dimensions/offsets without fields reverting as you type. Tap outside or press Enter to apply; Escape cancels. Invalid values keep the previous measurement and show a notice.
- **Mobile controls:** map toolbars no longer stick on top of each other, and the active selection has an **EDIT DETAILS** shortcut directly below the map. Selecting an object from the list scrolls to its Inspector.
- **Scope:** no new garden tools or storage model changes; same data and backup formats. Physical Android checks for keyboard, pinch, save/reload and scrolling remain necessary.

# 🌿 Garden Atlas

**A touch-first, pixel-art-inspired TypeScript garden editor.** Built with React, SVG and Vite, deployed as a static site on GitHub Pages.

**Live demo:** https://sekafaji.github.io/Garden-Atlas/

Garden Atlas lets people illustrate their garden, maintain shared records for plants and structures, and use a dimensioned Scale view of the same shared garden. The included example contains **synthetic data only**—not a real address or parcel plan.

## P016 — Smaller tools and easier measurements

On mobile, map interaction tools now fit in a compact two-row grid, and the quick planting strip and object palette take up less room while retaining touch targets. No existing editor tools were removed.

Choose a map object and open **Details → Width (X) / Length (Y)**. The two numbers are independent: a 4 × 8 m bed or hedge renders at that proportion in both Scale and Illustration views and in the printable report. You can erase, temporarily type `0`, use decimal input, then **press Enter or tap away** to apply. The inputs are not validated or reverted on every keystroke. A final `0` means **not measured** on that axis; a small map icon remains so the object is selectable. Negative values or values above 100 m are rejected at commit. Press Escape before leaving the field to cancel the edit.

Existing v6 objects retain their original dimensions because missing width/length default to the saved diameter. New measurements use optional fields in the existing version-6 JSON. Resizing from a selected object's bottom-right map handle now updates both axes separately; Undo reverses the change. Geometry, specimen IDs, photographs, backup paths, offline storage and migration formats are otherwise unchanged.

## P015 — Reliability polish (no new garden features)

- **Fixed the actual editor save path:** the app now loads the browser garden library from IndexedDB before enabling editing, and queues every subsequent save to IndexedDB. P014 shipped with the IndexedDB module but the live editor still used its older localStorage calls.
- **Clear save status:** **SAVING…**, **INDEXEDDB SAVED**, **LOCAL SAVE** (limited fallback) or **SAVE FAILED**. The app only reports saved after the write completes. An unfinished/failed save prompts before a normal browser reload or close where the browser supports this.
- **Recovery and compatibility:** old localStorage data remains untouched during first migration; previous local recovery copies, JSON backup import/export and the v6 garden format are unchanged. A failed IndexedDB write is **not** falsely reported as success.
- **PWA safety:** applying a waiting service-worker update remains disabled while the save is unfinished or failed. Cache files and personal garden records are kept separate.

Before clearing browser data or testing an offline update, **export a JSON backup**, make a small edit, confirm the saved indicator, then reload to verify. Mobile operating systems may close apps without providing a reliable unload warning, and browser data can still be evicted. Multiple open tabs are not synchronized.

## P013 — IndexedDB storage, photo gallery and recovery

**New primary storage:** Garden libraries, including compressed specimen photographs and the optional reference image, are saved transactionally in browser **IndexedDB** instead of the much smaller `localStorage` area. The original browser `localStorage` garden is imported on the first run and **left untouched** as a migration fallback. When IndexedDB cannot be opened, the editor clearly identifies the limited localStorage fallback; saving may fail on large gardens, so export a backup.

- Saves are **ordered** to prevent a slower earlier save from overwriting a later edit. The top bar distinguishes SAVING, INDEXEDDB SAVED and saving failures.
- A local previous-version **checkpoint snapshot** is periodically kept in IndexedDB, and **LOCAL RECOVERY COPY** reads it. It is a best-effort second copy, not an independent backup.
- Under My Gardens, the editor reports an approximate site-storage usage estimate and offers **PROTECT LOCAL STORAGE** where browser persistent-storage permission is supported. No browser setting guarantees permanence.
- Up to **8 optimized JPEG photos per plant**, with multiselect upload, progress, editable captions, deletion and a **Save Photo** link for each picture. Photos are converted locally from JPG, PNG or WebP; each optimized photo remains size-limited for practical JSON backup files. **Original full-resolution files are not retained.**
- Garden and whole-library JSON exports include these photos and remain portable between devices. Larger backups may take more storage and time; continue downloading backups after major changes.
- Existing **version 6 garden JSON** and earlier imports remain compatible; no new mandatory fields or destructive schema changes. No cloud upload, shared accounts or automatic cross-device sync.

**Important:** Clearing site data can delete IndexedDB and localStorage together. Two tabs editing the same garden are not synchronized; close extra tabs before making substantial edits. Download backup JSON outside the browser, and look for **INDEXEDDB SAVED** after making changes.

## P012 — Plant encyclopedia and specimen history

Select any tree, shrub or flower, then open **Details → Plant Atlas** to document that individual plant. Garden beds, structures, rocks and furniture retain general notes instead.

- Shared species profiles with common/botanical names, descriptive notes and care notes. Deleting a species unlinks specimens but does not delete them.
- Identification status: unidentified, tentative, or user-confirmed. The app does not identify species automatically.
- Per-specimen planting date, observations, maintenance, photos and a permanent object ID.
- The same specimen is visible in the linked Scale and Illustration views. Earlier data remains compatible.

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
- The reference image is included in a garden's JSON backup and the full-library backup. It remains compressed and size-limited; **SAVING / NOT SAVED** means you should check the status before closing or exporting.
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

- The library is saved primarily in **browser IndexedDB**, with a limited `localStorage` fallback. It has no cloud backend or cross-device synchronization. Clearing site data may delete it; backups are essential. The app warns when saving fails.
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

## P014 — Install and use Garden Atlas offline

Garden Atlas is now an installable Progressive Web App (PWA). The **first visit needs internet access** so the browser can download and cache the complete editor (HTML, JavaScript, CSS, icons and manifest). Wait until the **OFFLINE APP READY** status appears under **MY GARDENS → OFFLINE APP & INSTALLATION** before relying on offline access. Installing via the browser menu is optional: the website can also work offline after the service worker installs.

- **Android (Chrome and compatible browsers):** open the live site; use **Install app** in the browser menu, or the app's **INSTALL APP** button when supported. Launch from the new home-screen icon.
- **iPhone / iPad:** open in Safari, use **Share → Add to Home Screen**. Some browsers and versions do not show a separate installation prompt. The installed app may have separate local storage; **export a backup from the browser and import it into the installed app** if your garden does not appear.
- **Offline:** with the installed/cache-ready app, open the map, create or edit objects, record maintenance, view previously saved photos, and export/import your own JSON files. No login and no remote database required.
- **Back online:** open the app, select **Check for updates** in My Gardens. If an app update is available, apply it **only after the local save completes**. New app versions don't intentionally overwrite garden projects.

**What offline does not mean:** first-time installation, initial asset downloads and app updates require an internet connection. Data does **not sync between phones**. If browser/site data is cleared, the app is uninstalled, or the device is damaged, the local database can be lost. Use **Backup** or **Backup All Gardens** and store the downloaded JSON files somewhere independent of the browser. Imported reference images and compressed specimen photos are included in those backups. Browser/OS storage cleanup can still evict offline caches; offline availability must be tested on the target phone.

This PWA caches only the generated first-party app files under `/Garden-Atlas/`; it does not cache arbitrary remote sites, photo feeds, or user-exported files. The service worker is generated from each production build's hashed assets and installs atomically. The garden library stays in IndexedDB, not the service-worker cache.
