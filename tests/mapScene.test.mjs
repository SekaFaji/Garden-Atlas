import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = file => readFile(new URL(file,import.meta.url),'utf8');

test('P031 SVG rendering remains inside the original event-catching map surface',async()=>{
  const [map,scene]=await Promise.all([read('../src/MapView.tsx'),read('../src/components/MapScene.tsx')]);
  assert.match(map,/className="map-surface"/);
  assert.match(map,/onPointerDown=\{pointerDown\} onPointerMove=\{pointerMove\} onPointerUp=\{pointerUp\} onPointerCancel=\{cancelPointer\}/);
  assert.match(map,/<MapScene garden=\{garden\}/);
  for(const marker of ['data-corner','data-edge','data-feature-id','data-feature-node','data-feature-edge']){
    assert.ok(scene.includes(marker),`retain SVG hit target ${marker}`);
  }
  assert.match(scene,/<MapObject key=\{item.id\}/);
});

test('P031 renderer keeps the same scale/illustration layers without mutating state',async()=>{
  const scene=await read('../src/components/MapScene.tsx');
  const patterns=await read('../src/components/MapSurfacePatterns.tsx');
  for(const marker of ['property-clip','layout.regions.map','layout.lines.map','garden.reference','hidden.objects','hidden.boundary']){
    assert.ok(scene.includes(marker),`retain rendering layer ${marker}`);
  }
  assert.match(scene,/<MapSurfacePatterns\/>/);
  for(const marker of ['ground-grid','map-grass','map-soil','map-gravel','map-stone','map-water']) assert.ok(patterns.includes(marker),`retain SVG pattern ${marker}`);
  assert.doesNotMatch(scene,/useState\(|useEffect\(|onPointerDown=|onPointerUp=/);
  assert.match(scene,/objectPreviewTranslation\(garden,preview\)/);
});
