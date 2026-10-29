import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD, clampPoint, demoGarden, isGarden, loadGarden, movePlaced,
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

test('P002 demo uses shared groups and independent layout positions', () => {
  const garden = demoGarden();
  assert.equal(isGarden(garden), true);
  assert.equal(garden.version, 2);
  assert.equal(garden.objects.length, 6);
  assert.equal(garden.groups.length, 6);
  assert.notDeepEqual(garden.objects[0].placements.scale, garden.objects[0].placements.illustration);
});

test('migrates valid P001 records without losing IDs or placements', () => {
  const legacy = v1Example();
  const upgraded = parseGarden(legacy);
  assert.ok(upgraded);
  assert.equal(upgraded.version, 2);
  assert.equal(upgraded.name, legacy.name);
  assert.equal(upgraded.groups.length, 1);
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
  assert.equal(upgraded.version, 2);
  assert.equal(upgraded.groups.length, 1);
  assert.equal(saveGarden(upgraded), true);
  assert.equal(store.get('garden-atlas:p001:v1'), JSON.stringify(legacy));
  assert.equal(loadGarden().objects[0].id, 'TREE-123');
  delete globalThis.localStorage;
});
