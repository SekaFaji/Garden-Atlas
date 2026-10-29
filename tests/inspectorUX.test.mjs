import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('P019 keeps identity and separate object measurements directly accessible',()=>{
 const start=app.indexOf('aria-label="Garden item details"');
 const details=app.slice(start,app.indexOf('ref={projectsPanelRef}',start));
 assert.ok(start>0);
 for(const label of ['DISPLAY NAME','SPECIES / TYPE','GROUP','ObjectDimensions']) assert.ok(details.includes(label),label);
 assert.ok(details.indexOf('ObjectDimensions')<details.indexOf('inspector-fold'), 'width and length must not be hidden in a fold');
});
test('P019 uses accessible native folds without discarding Plant Atlas or placement editing',()=>{
 assert.match(app,/className="inspector-fold"[^>]*>\s*<summary>APPEARANCE & ROTATION<\/summary>/);
 assert.match(app,/className="inspector-fold"[^>]*>\s*<summary>NOTES & MAP PLACEMENT<\/summary>/);
 assert.match(app,/className="inspector-fold inspector-atlas-fold"[^>]*>\s*<summary>PLANT ATLAS · PHOTOS & HISTORY<\/summary>/);
 assert.ok(app.includes('<PlantAtlasPanel'));
 assert.ok(app.includes('REMOVE FROM BOTH MAPS'));
 assert.ok(app.includes('onClick={duplicate}')&&app.includes('onClick={removeObject}'));
 assert.match(css,/\.inspector-fold>summary:focus-visible/);
});
test('P019 Map Size button navigates to map and targets the actual map frame',()=>{
 assert.match(app,/inspector-map-size-link[^>]*onClick=\{\(\)=>\{setMapSizeOpen\(true\);navigateTo\('map'\)/);
 assert.match(app,/mapFrameRef\.current\?\.scrollIntoView/);
 assert.match(app,/inspector-map-link[^>]*onClick=\{\(\)=>navigateTo\('map'\)\}/);
});
