import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, clampPoint, demoGarden, isGarden, loadGarden, saveGarden } from '../src/model.ts';

test('sample garden validates and contains distinct map placements', () => {
  const garden = demoGarden();
  assert.equal(isGarden(garden), true);
  assert.equal(garden.objects.length, 6);
  const tree = garden.objects[0];
  assert.notDeepEqual(tree.placements.scale, tree.placements.illustration);
});

test('invalid records and duplicate specimen IDs are rejected', () => {
  const garden = demoGarden();
  assert.equal(isGarden({ ...garden, objects: [...garden.objects, garden.objects[0]] }), false);
  assert.equal(isGarden({ ...garden, objects: [{ ...garden.objects[0], diameterM: Infinity }] }), false);
  assert.equal(isGarden({ ...garden, version: 99 }), false);
});

test('map positions remain inside canvas boundaries', () => {
  assert.deepEqual(clampPoint({ x: -100, y: 100 }), { x: 0, y: WORLD.height });
  assert.deepEqual(clampPoint({ x: 4, y: 10 }), { x: 4, y: 10 });
});

test('local persistence round trips when storage is available', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem(key) { return store.get(key) ?? null; },
    setItem(key, value) { store.set(key, value); },
  };
  const garden = demoGarden();
  garden.name = 'A saved garden';
  assert.equal(saveGarden(garden), true);
  assert.equal(loadGarden().name, 'A saved garden');
  delete globalThis.localStorage;
});
