import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = file => readFile(new URL(file, import.meta.url), 'utf8');

test('P030 object list and layer editing are presentational components', async () => {
  const [app, items, layers] = await Promise.all([
    source('../src/App.tsx'), source('../src/components/GardenObjectList.tsx'),
    source('../src/components/GardenLayersPanel.tsx'),
  ]);
  assert.match(app, /<GardenObjectList garden=\{garden\}/);
  assert.match(app, /<GardenLayersPanel garden=\{garden\}/);
  for (const component of [items, layers]) {
    assert.doesNotMatch(component, /from ['"]\.\.\/App['"]/);
    assert.doesNotMatch(component, /\bapplyGarden\(|\bcreateBrowserWriter\(|\blibraryRef\./);
  }
  assert.match(items, /02 \/ GARDEN ITEMS/);
  assert.match(items, /03 \/ GROUPS/);
  assert.match(layers, /04 \/ LAYERS/);
  assert.match(layers, /05 \/ TERRAIN AREAS & LINES/);
  assert.doesNotMatch(app, /02 \/ GARDEN ITEMS|04 \/ LAYERS/);
});

test('P030 selection, grouping and map-navigation callbacks remain owned by App', async () => {
  const [app, items, layers] = await Promise.all([
    source('../src/App.tsx'), source('../src/components/GardenObjectList.tsx'),
    source('../src/components/GardenLayersPanel.tsx'),
  ]);
  for (const prop of ['onSelectObject=', 'onCheckObject=', 'onSelectAllPlaced=',
    'onAlign={alignChecked}', 'onDeleteSelected={deleteChecked}',
    'onAssignGroup={assignChecked}', 'onSelectGroup={selectGroup}']) {
    assert.ok(app.includes(prop), `Missing object list callback: ${prop}`);
  }
  for (const prop of ['onVisibilityChange=', 'onToggleLayerLock=', 'onEditFeature=',
    'onDeleteRegion=', 'onRenameLine=', 'onChangeLineWidth=', 'onDeleteLine=']) {
    assert.ok(app.includes(prop), `Missing layer callback: ${prop}`);
  }
  assert.match(app, /onEditFeature=\{feature=>\{if\(!setNewTool\('feature-edit'\)\)return;setSelectedFeature\(feature\);setSelectedVertex\(null\);navigateTo\('map'\);\}\}/);
  assert.match(items, /onCheckObject\(object\.id, e\.target\.checked\)/);
  assert.match(layers, /onVisibilityChange\(layer\.key, e\.target\.checked\)/);
});

test('P030 no existing layer action lost or made editable while locked', async () => {
  const [layers, items] = await Promise.all([
    source('../src/components/GardenLayersPanel.tsx'), source('../src/components/GardenObjectList.tsx'),
  ]);
  assert.match(layers, /disabled=\{locked\.regions\}/);
  assert.match(layers, /disabled=\{locked\.lines\}/);
  assert.match(layers, /onRenameLine\(line\.id, e\.target\.value\)/);
  assert.match(layers, /onChangeLineWidth\(line\.id, widthM\)/);
  assert.match(layers, /onDeleteLine\(line\.id\)/);
  assert.match(items, /disabled=\{!checkedIds\.length\}/);
  assert.match(items, /onAssignGroup\(e\.target\.value === 'none' \? null : e\.target\.value\)/);
  assert.match(items, /onCreateGroup\(\)/);
});
