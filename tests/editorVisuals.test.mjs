import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import { EDITOR_TOOLS, activeToolDescription, selectionStyle, showObjectMapLabel } from '../src/editorVisuals.ts';

test('P022 editor retains all nine existing tool modes with distinct descriptions',()=>{
 assert.deepEqual(EDITOR_TOOLS.map(x=>x.id),['select','pan','feature-edit','outline-edit','outline-draw','freehand','terrain','path','fence']);
 assert.ok(EDITOR_TOOLS.every(x=>x.name&&x.label&&x.hint));
 assert.equal(activeToolDescription('select',true).name,'MULTI SELECT');
 assert.equal(activeToolDescription('tree').name,'PLACE OBJECT');
});
test('P022 only focused object receives a map name, not all group/multi members',()=>{
 assert.equal(selectionStyle('A','g1','A',[],'g1',false),'focused');
 assert.equal(selectionStyle('B','g1','A',[],'g1',false),'group');
 assert.equal(selectionStyle('B','g1','A',['B'],'g1',true),'multiple');
 assert.equal(selectionStyle('A',null,'A',[],null,true),null);
 assert.equal(showObjectMapLabel('focused','select'),true);
 assert.equal(showObjectMapLabel('group','select'),false);
 assert.equal(showObjectMapLabel('multiple','select'),false);
 assert.equal(showObjectMapLabel('focused','pan'),false);
});
test('P022 selection and map status use the presentation helpers',async()=>{
 const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
 const map=await readFile(new URL('../src/MapView.tsx',import.meta.url),'utf8');
 assert.match(app,/EDITOR_TOOLS\.map/);
 assert.match(app,/activeToolDescription\(tool,multiSelect\)/);
 assert.match(app,/checkedIds\.length>0&&<div className="map-selection-bar map-multi-selection-bar"/);
 assert.match(map,/selectionStyle\(item\.id,item\.groupId,selectedId,selectedIds,selectedGroupId,multiSelect\)/);
 assert.match(map,/showObjectMapLabel\(marker,tool\)/);
});
