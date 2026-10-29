import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
const map=await readFile(new URL('../src/MapView.tsx',import.meta.url),'utf8');
test('P021 drawing UI stays visible before any points and offers draft corrections',()=>{
  assert.match(map,/isDrawingTool\(tool\)&&<div className="drawing-controls"/);
  assert.match(map,/setDraft\(points=>points\.slice\(0,-1\)\)/);
  assert.match(map,/draft\.length<minimumDrawingPoints\(tool\)/);
  assert.match(map,/aria-live="polite"/);
});
test('P021 map mode and tool changes ask before abandoning pending draft',()=>{
  assert.match(app,/draftCount>0&&\(nextTool!==tool\|\|nextMode!==mode\)/);
  assert.match(app,/if\(!confirmDraftExit\(value\)\)return false/);
  assert.match(app,/const changeMapMode=\(next:Mode\)=>\{/);
  assert.match(app,/if\(!confirmDraftExit\('select',next\)\)return/);
  assert.match(app,/onDraftCountChange=\{setDraftCount\}/);
});
