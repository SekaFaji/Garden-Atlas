import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { demoGarden, isGarden } from '../src/model.ts';
import { SURFACE_BASE, surfacePatternFill } from '../src/mapSurfacePalette.ts';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const grounds = ['grass','soil','gravel','stone','water'];

test('P036 every terrain type has an authored pixel tile and deterministic fill',async()=>{
  const patterns = await read('../src/components/MapSurfacePatterns.tsx');
  assert.deepEqual(Object.keys(SURFACE_BASE).sort(),[...grounds].sort());
  for(const ground of grounds){
    assert.equal(surfacePatternFill(ground),`url(#map-${ground})`);
    assert.ok(patterns.includes(`id="map-${ground}"`),`missing pattern ${ground}`);
    assert.ok(/^#[a-f0-9]{6}$/i.test(SURFACE_BASE[ground]));
  }
  assert.match(patterns,/patternUnits="userSpaceOnUse"/);
});

test('P036 both default garden and polygon regions use matching surface tiles',async()=>{
  const scene = await read('../src/components/MapScene.tsx');
  assert.match(scene,/fill=\{surfacePatternFill\(layout.ground\)\}/);
  assert.match(scene,/fill=\{surfacePatternFill\(reg.ground\)\}/);
  assert.match(scene,/clipPath id="property-clip"/);
  assert.match(scene,/layout.lines.map/);
  assert.match(scene,/garden.reference&&showReference/);
  assert.match(scene,/data-feature-node/);
  assert.doesNotMatch(scene,/useEffect\(|useState\(|onPointerDown=|onPointerUp=/);
});

test('P036 palette lookup does not change saved garden records or dimensions',()=>{
  const garden=demoGarden(),before=structuredClone(garden);
  assert.equal(surfacePatternFill(garden.layout.ground),'url(#map-grass)');
  for(const ground of grounds)assert.ok(surfacePatternFill(ground));
  assert.deepEqual(garden,before);
  assert.ok(isGarden(garden));
});
