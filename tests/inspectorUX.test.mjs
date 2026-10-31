import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const inspector=readFileSync(new URL('../src/components/GardenInspector.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('P029 Inspector keeps identity and separate measurements directly accessible',()=>{
 const start=inspector.indexOf('aria-label="Garden item details"');
 const details=inspector.slice(start);
 assert.ok(start>0);
 for(const label of ['DISPLAY NAME','SPECIES / TYPE','GROUP','ObjectDimensions'])assert.ok(details.includes(label),label);
 assert.ok(details.indexOf('ObjectDimensions')<details.indexOf('inspector-fold'), 'dimensions must not be hidden');
 assert.match(app,/<GardenInspector panelRef=\{inspectorRef\}/);
});
test('P029 preserves accessible folds and Plant Atlas editing',()=>{
 assert.match(inspector,/className="inspector-fold"[^>]*>\s*<summary>APPEARANCE & ROTATION<\/summary>/);
 assert.match(inspector,/className="inspector-fold"[^>]*>\s*<summary>NOTES & MAP PLACEMENT<\/summary>/);
 assert.match(inspector,/className="inspector-fold inspector-atlas-fold"[^>]*>\s*<summary>PLANT ATLAS · PHOTOS & HISTORY<\/summary>/);
 assert.ok(inspector.includes('<PlantAtlasPanel'));
 assert.ok(inspector.includes('REMOVE FROM BOTH MAPS'));
 assert.ok(inspector.includes('onClick={onDuplicate}')&&inspector.includes('onClick={onDeleteObject}'));
 assert.match(css,/\.inspector-fold>summary:focus-visible/);
});
test('P029 Map Size shortcut is delegated to App navigation and frame',()=>{
 assert.match(inspector,/inspector-map-size-link[^>]*onClick=\{onMapSettings\}/);
 assert.match(app,/onMapSettings=\{\(\)=>\{setMapSizeOpen\(true\);navigateTo\('map'\)/);
 assert.match(app,/mapFrameRef\.current\?\.scrollIntoView/);
 assert.match(inspector,/inspector-map-link[^>]*onClick=\{onMap\}/);
});
test('P029 extracted Inspector leaves history and garden mutations in App',()=>{
 assert.doesNotMatch(inspector,/from ['"]\.\.\/App['"]/);
 assert.doesNotMatch(inspector,/\bapplyGarden\(|\bcreateBrowserWriter\(|\blibraryRef\./);
 for(const prop of ['onUpdateObject={objectPatch}','onResizeObjectAxes=','onPresetChange=','onAtlasChange=','onRenameGroup=','onGroupNotes=','onDeleteGroup=']){
   assert.ok(app.includes(prop),`App must own ${prop}`);
 }
 for(const handler of ['onUpdateObject','onResizeObjectAxes','onAtlasChange','onRenameGroup','onDeleteGroup'])assert.ok(inspector.includes(handler));
});
