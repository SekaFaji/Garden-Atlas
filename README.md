# 🌿 Garden Atlas

**A touch-first, pixel-art-inspired TypeScript garden editor.** Built with React, SVG and Vite, deployed as a static site on GitHub Pages.

**Live demo:** https://sekafaji.github.io/Garden-Atlas/

Garden Atlas lets people illustrate their garden, maintain shared records for plants and structures, and create a separate dimensioned Scale map. The included example contains **synthetic data only**—not a real address or parcel plan.

## P004–P006 — Touch editor, garden reports, paths and fences

### Mobile-first map
- **Drag an item directly** using one finger or mouse. The item follows your finger; coordinates are committed once on release.
- **Pan on empty ground** with one finger, or use the Pan tool.
- **Pinch zoom** with two fingers; mouse wheel and zoom buttons also work.
- **FIT** zooms to the property boundary; **AREA** shows more surrounding workspace. Zoom is continuous and considerably wider than P003.
- **Undo / redo** garden edits; operations preserve independent map placements.
- **Object hit areas** are larger than their actual sprites for easier selection on a phone.
- A bottom tab bar on small screens keeps the large map visible and places Objects / Details / Gardens in collapsible panels.

### Flexible garden layouts
- Change workspace width and height from **10 to 500 metres**, with a confirmation before proportional scaling of all coordinates. This is a flat local plan, not a cadastral/GPS survey.
- **EDIT BORDER:** drag individual vertices, or touch any segment to insert an extra point. The drawing is checked before it replaces a valid boundary.
- **DRAW BORDER:** touch several corners and press **FINISH** to create a polygon.
- **FREEHAND:** trace an approximate outline and release; the stroke is simplified into editable points. Invalid traces don't replace the old border.
- **TERRAIN:** draw independent, fillable polygons using grass, soil, gravel, stone or water. These are 2D visual regions, not elevation contours or terrain simulation.
- **PATH / FENCE:** tap a sequence of points and press **FINISH**. Each line gets an editable name and width (metres), is independently saved on the active map and appears in the printable report. The tool draws 2D paths/fences, not 3D structures.
- Show/hide object, boundary and terrain layers. The two maps can have independent placements, boundaries and terrain regions.

### Faster editing, garden reports and multiple gardens
- Place many objects without reselecting the toolbox item; duplicate an existing record for fast reuse. A mobile quick-palette stays directly above the map.
- Select several objects in the object list and assign them to a group in one action.
- **PDF / PRINT** opens the browser print dialog for a detailed garden book with both garden maps, group descriptions, and all specimen records. Choose **Save as PDF** in your browser to generate a PDF locally; this is not a separate binary PDF download service.
- Move grouped objects together by selecting the group and dragging a member.
- Keep **up to 20 garden projects** in this browser, and switch between them.
- Automatic browser-local saving, periodic previous-save recovery, JSON export/import of a garden **as a new project**, plus whole-library JSON backup/restore.
- On first load P001–P003 local gardens are upgraded; importing old JSON backups also works. Prior localStorage keys are not modified.

## How to use

1. Start by opening **GARDENS** and creating an empty garden, or edit a copy of the sample.
2. Drag an object; drag empty space to navigate. Pinch the map or use **AREA** to see beyond your property's outline.
3. Select **EDIT BORDER**, and drag corners or touch a border edge to add a corner; for a completely new border use **DRAW BORDER** or **FREEHAND**.
4. Use **TERRAIN**, select a ground type, then draw the corners of a region and press **FINISH**. For walkways and fences choose **PATH** or **FENCE** and tap points along a line; the sidebar lets you edit the resulting feature's width or delete it.
5. Go to **DETAILS** to rename the selected tree, set species and notes, duplicate it or change map dimensions. Use the quick palette above the map for rapid planting.
6. Use the top bar **PDF / PRINT** button, then select **Save as PDF** in the browser print dialog.
7. Export regular **BACKUP** files from the top bar, or go to GARDENS to export **all** projects.

### Important limitations

- The library is stored in **browser `localStorage`**. It has no cloud backend or cross-device synchronization. Clearing site data may delete it; backups are essential. The app warns when saving fails.
- Project import **adds** a garden; whole-library import requires confirmation because it replaces the local library.
- Advanced paginated PDF layout and automated PDF download, plant photo attachments/encyclopedia, real elevation, freehand paths with width, fence components, planned-vs-existing scenarios and richer multi-select/group tools are **not yet implemented**.
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

Project data format **v5** contains `width`, `height`, `groups`, `objects`, and two independent layouts with their own `boundary`, `ground`, `regions`, and editable `lines` (paths/fences). Objects have permanent IDs and independent `scale`/`illustration` coordinates. The browser library format is separately versioned as `version: 1` and contains garden projects with stable project IDs.

P001–P004 garden JSON is migrated without discarding saved specimen IDs, notes, placements, groups or P003 polygon boundaries. Use an exported JSON backup before editing or upgrading.

## License

MIT. The pixel-block SVG art and sample data are original to this project.
