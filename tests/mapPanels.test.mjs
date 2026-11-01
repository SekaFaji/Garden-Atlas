import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = path => readFile(new URL(path, import.meta.url), 'utf8');

test('P033 map size rendering delegates validation, scaling and persistence to App', async () => {
  const [app, panel] = await Promise.all([
    source('../src/App.tsx'), source('../src/components/MapSizePanel.tsx'),
  ]);
  assert.match(app, /<MapSizePanel garden=\{garden\} dimensions=\{dims\} resizeMode=\{resizeMode\}/);
  assert.match(app, /onApply=\{changeDimensions\}/);
  assert.match(app, /onExpand=\{expandAroundGarden\}/);
  assert.match(panel, /id="map-size-panel"/);
  assert.match(panel, /onDimensionChange\('width',e.target.value\)/);
  assert.match(panel, /onDimensionChange\('height',e.target.value\)/);
  assert.match(panel, /onResizeModeChange\('scale'\)/);
  assert.match(panel, /onClick=\{onApply\}/);
  assert.match(panel, /onClick=\{onReset\}/);
  assert.match(panel, /onExpand\(25\)/);
  assert.doesNotMatch(panel, /\bapplyGarden\(|resizeGarden\(|resizeWorkspace\(|localStorage|indexedDB|window.confirm/);
  assert.match(app, /if\(resizeMode==='scale'&&!window.confirm/);
  assert.match(app, /const next=resizeMode==='scale'\?resizeGarden\(garden,width,height\):resizeWorkspace\(garden,width,height\)/);
});

test('P033 tracing controls delegate image processing and saving to App', async () => {
  const [app, panel] = await Promise.all([
    source('../src/App.tsx'), source('../src/components/ReferenceImagePanel.tsx'),
  ]);
  assert.match(app, /<ReferenceImagePanel garden=\{garden\} open=\{referenceOpen\}/);
  assert.match(app, /onImport=\{referenceChange\}/);
  assert.match(app, /onOpacityChange=\{opacity=>updateReference\(\{opacity\}\)\}/);
  assert.match(app, /onPositionChange=\{updateReference\}/);
  assert.match(panel, /id="reference-panel"/);
  assert.match(panel, /onChange=\{onImport\}/);
  assert.match(panel, /onClick=\{onRemove\}/);
  assert.match(panel, /onOpacityChange\(Number\(e.target.value\)\/100\)/);
  assert.match(panel, /onCommit=\{onWidthChange\}/);
  assert.match(panel, /onPositionChange\(\{x\}\)/);
  assert.match(panel, /onPositionChange\(\{y\}\)/);
  assert.doesNotMatch(panel, /\bapplyGarden\(|imageToReference\(|createBrowserWriter|localStorage|indexedDB|window.confirm/);
  assert.match(app, /const originatingProjectId=libraryRef.current.activeId/);
  assert.match(app, /if\(libraryRef.current.activeId!==originatingProjectId\)/);
});
