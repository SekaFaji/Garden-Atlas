import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD, clampPoint, demoGarden, emptyGarden, isGarden, loadGarden, movePlaced,
  addBoundaryCorner, moveBoundaryCorner, removeBoundaryCorner, polygonArea, validBoundary, loadRecoveryGarden,
  nextGroupId, parseGarden, removeGroup, saveGarden,
} from '../src/model.ts';

function v1Example() {
  return {
    version: 1, name: 'My original garden',
    objects: [
      { id: 'TREE-123', kind: 'tree', name: 'Pine', species: 'Unknown', group: 'Back trees', notes: 'Original note', diameterM: 3,
        placements: { scale: { x: 1, y: 2 }, illustration: { x: 8, y: 9 } } },
      { id: 'TREE-124', kind: 'tree', name: 'Other pine', species: '', group: 'back trees', notes: '', diameterM: 4, placements: { scale: { x: 4, y: 5 } } },
      { id: 'FLOWER-001', kind: 'flower', name: 'Wildflowers', species: '', group: '', notes: '', diameterM: 1.5, placements: { illustration: { x: 2, y: 3 } } },
    ],
  };
}

test('P003 demo has valid independent map layouts and shared groups', () => {
  const garden = demoGarden();
  assert.equal(isGarden(garden), true);
  assert.equal(garden.version, 3);
  assert.equal(garden.objects.length, 6);
  assert.equal(garden.groups.length, 6);
  assert.notDeepEqual(garden.objects[0].placements.scale, garden.objects[0].placements.illustration);
});

test('migrates valid P001 records without losing IDs or placements', () => {
  const legacy = v1Example();
  const upgraded = parseGarden(legacy);
  assert.ok(upgraded);
  assert.equal(upgraded.version, 3);
  assert.equal(upgraded.name, legacy.name);
  assert.equal(upgraded.groups.length, 1);
  assert.equal(upgraded.layouts.scale.ground, 'grass');
  assert.equal(upgraded.groups[0].name, 'Back trees');
  assert.equal(upgraded.objects[0].id, 'TREE-123');
  assert.equal(upgraded.objects[0].notes, 'Original note');
  assert.deepEqual(upgraded.objects[0].placements, legacy.objects[0].placements);
  assert.equal(upgraded.objects[0].groupId, upgraded.objects[1].groupId);
  assert.equal(upgraded.objects[2].groupId, null);
  assert.equal('group' in upgraded.objects[0], false);
  assert.deepEqual(parseGarden(upgraded), upgraded);
});

test('malformed group references, duplicate IDs and malformed legacy saves are rejected', () => {
  const garden = demoGarden();
  assert.equal(isGarden({ ...garden, objects: [...garden.objects, garden.objects[0]] }), false);
  assert.equal(isGarden({ ...garden, objects: [{ ...garden.objects[0], groupId: 'missing-group' }] }), false);
  assert.equal(isGarden({ ...garden, groups: [garden.groups[0], garden.groups[0]] }), false);
  assert.equal(isGarden({ ...garden, groups: [{ ...garden.groups[0], name: '   ' }] }), false);
  assert.equal(isGarden({ ...garden, objects: [{ ...garden.objects[0], diameterM: Infinity }] }), false);
  assert.equal(parseGarden({ ...v1Example(), objects: [v1Example().objects[0], v1Example().objects[0]] }), null);
  assert.equal(parseGarden({ version: 99 }), null);
});

test('group ID is stable and group deletion preserves every specimen', () => {
  const garden = demoGarden();
  const before = garden.objects.map(o => o.id);
  const groupId = garden.groups[0].id;
  const nextId = nextGroupId(garden);
  assert.equal(nextId, 'GROUP-007');
  const after = removeGroup(garden, groupId);
  assert.deepEqual(after.objects.map(o => o.id), before);
  assert.equal(after.objects[0].groupId, null);
  assert.equal(after.groups.some(g => g.id === groupId), false);
  assert.equal(garden.objects[0].groupId, groupId);
});

test('moving a whole group preserves spacing and the other map', () => {
  const garden = parseGarden(v1Example());
  assert.ok(garden);
  const moved = movePlaced(garden, 'TREE-123', 'scale', { x: 3, y: 6 }, true);
  assert.deepEqual(moved.objects[0].placements.scale, { x: 3, y: 6 });
  assert.deepEqual(moved.objects[1].placements.scale, { x: 6, y: 9 });
  assert.deepEqual(moved.objects[0].placements.illustration, { x: 8, y: 9 });
  assert.deepEqual(garden.objects[0].placements.scale, { x: 1, y: 2 });
});

test('group move clamps uniformly at boundaries instead of collapsing spacing', () => {
  const garden = parseGarden(v1Example());
  assert.ok(garden);
  const moved = movePlaced(garden, 'TREE-123', 'scale', { x: 39, y: 26 }, true);
  assert.deepEqual(moved.objects[0].placements.scale, { x: 37, y: 23 });
  assert.deepEqual(moved.objects[1].placements.scale, { x: 40, y: 26 });
});

test('moving a single object leaves its group members unchanged', () => {
  const garden = parseGarden(v1Example());
  assert.ok(garden);
  const moved = movePlaced(garden, 'TREE-123', 'scale', { x: 3, y: 6 }, false);
  assert.deepEqual(moved.objects[1].placements.scale, { x: 4, y: 5 });
  assert.deepEqual(moved.objects[0].placements.scale, { x: 3, y: 6 });
});

test('placing an unplaced object in one mode does not affect other group members', () => {
  const garden = parseGarden(v1Example());
  assert.ok(garden);
  const moved = movePlaced(garden, 'TREE-124', 'illustration', { x: 7, y: 9 }, true);
  assert.deepEqual(moved.objects[1].placements.illustration, { x: 7, y: 9 });
  assert.deepEqual(moved.objects[0].placements.illustration, { x: 8, y: 9 });
});

test('map coordinates stay inside boundaries', () => {
  assert.deepEqual(clampPoint({ x: -100, y: 100 }), { x: 0, y: WORLD.height });
});

test('a P001 local save is upgraded, with original key untouched', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, value); },
  };
  const legacy = v1Example();
  store.set('garden-atlas:p001:v1', JSON.stringify(legacy));
  const upgraded = loadGarden();
  assert.equal(upgraded.version, 3);
  assert.equal(upgraded.groups.length, 1);
  assert.equal(upgraded.layouts.scale.ground, 'grass');
  assert.equal(saveGarden(upgraded), true);
  assert.equal(store.get('garden-atlas:p001:v1'), JSON.stringify(legacy));
  assert.equal(loadGarden().objects[0].id, 'TREE-123');
  delete globalThis.localStorage;
});


test('new empty garden has no copied demo specimens and can be saved', () => {
  const garden = emptyGarden();
  assert.equal(garden.objects.length, 0);
  assert.equal(garden.groups.length, 0);
  assert.equal(isGarden(garden), true);
});

test('both maps keep their own outline and terrain without modifying shared specimens', () => {
  const original = demoGarden();
  const newer = moveBoundaryCorner(original, 'illustration', 0, { x: 4, y: 4 });
  assert.ok(newer);
  const updated = { ...newer, layouts: { ...newer.layouts, illustration: { ...newer.layouts.illustration, ground: 'soil' } } };
  assert.equal(isGarden(updated), true);
  assert.deepEqual(updated.layouts.scale, original.layouts.scale);
  assert.deepEqual(updated.objects, original.objects);
  assert.equal(updated.layouts.illustration.boundary[0].x, 4);
  assert.equal(updated.layouts.illustration.ground, 'soil');
});

test('the outline can gain and lose corners without losing existing layout records', () => {
  const garden = demoGarden();
  const five = addBoundaryCorner(garden, 'scale');
  assert.ok(five);
  assert.equal(five.layouts.scale.boundary.length, 5);
  assert.equal(isGarden(five), true);
  const four = removeBoundaryCorner(five, 'scale', 1);
  assert.ok(four);
  assert.deepEqual(four.layouts.scale.boundary, garden.layouts.scale.boundary);
  assert.deepEqual(four.layouts.illustration, garden.layouts.illustration);
  assert.deepEqual(four.objects, garden.objects);
});

test('crossed and collapsed boundaries are refused and original stays intact', () => {
  const garden = demoGarden();
  assert.equal(moveBoundaryCorner(garden, 'scale', 0, { x: 39, y: 25 }), null);
  assert.equal(moveBoundaryCorner(garden, 'scale', -1, { x: 4, y: 5 }), null);
  assert.equal(validBoundary([{ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 0, y: 3 }, { x: 3, y: 0 }]), false);
  assert.equal(validBoundary([{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 4, y: 4 }]), false);
  assert.deepEqual(garden.layouts.scale.boundary, demoGarden().layouts.scale.boundary);
});

test('polygon area is computed from actual scale outline', () => {
  assert.equal(polygonArea([{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}]), 12);
});

test('P002 backups upgrade to P003 with independent default outlines', () => {
  const current = demoGarden();
  const legacy = { version: 2, name: current.name, groups: current.groups, objects: current.objects };
  const next = parseGarden(legacy);
  assert.ok(next);
  assert.equal(next.version, 3);
  assert.equal(next.layouts.scale.ground, 'grass');
  assert.deepEqual(next.objects, legacy.objects);
  assert.deepEqual(next.groups, legacy.groups);
});

test('malformed terrain and invalid polygon are rejected', () => {
  const garden = demoGarden();
  assert.equal(isGarden({ ...garden, layouts: { ...garden.layouts, scale: { ...garden.layouts.scale, ground: 'water' } } }), false);
  assert.equal(isGarden({ ...garden, layouts: { ...garden.layouts, scale: { ...garden.layouts.scale, boundary: [{ x: 0, y: 0 }] } } }), false);
});

test('browser save preserves a recovery snapshot and falls back from corrupt primary', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, value); },
  };
  try {
    const first = demoGarden();
    assert.equal(saveGarden(first), true);
    const second = { ...first, name: 'Personal garden' };
    assert.equal(saveGarden(second), true);
    assert.equal(loadGarden().name, 'Personal garden');
    assert.equal(loadRecoveryGarden()?.name, 'Sample Garden');
    store.set('garden-atlas:p003:v3', 'invalid-json');
    assert.equal(loadGarden().name, 'Sample Garden');
    assert.equal(loadRecoveryGarden()?.name, 'Sample Garden');
  } finally { delete globalThis.localStorage; }
});

test('invalid new save falls back to P002 saved content even when newer content is corrupt', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, value); },
  };
  try {
    const prior = demoGarden();
    store.set('garden-atlas:p002:v2', JSON.stringify({ version:2, name:'Old P002 project', groups:prior.groups, objects:prior.objects }));
    store.set('garden-atlas:p003:v3', '{broken json');
    assert.equal(loadGarden().name, 'Old P002 project');
    assert.equal(loadGarden().version, 3);
  } finally { delete globalThis.localStorage; }
});
