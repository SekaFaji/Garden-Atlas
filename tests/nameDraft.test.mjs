import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseNameDraft} from '../src/nameDraft.ts';
const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/NameDraftInput.tsx',import.meta.url),'utf8');
const inspector=readFileSync(new URL('../src/components/GardenInspector.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');

test('P020 names accept intermediate blank typing but reject empty final garden/group names',()=>{
 assert.equal(parseNameDraft('',80),null);
 assert.equal(parseNameDraft('   ',120),null);
 assert.equal(parseNameDraft(' New Garden ',80),'New Garden');
 assert.equal(parseNameDraft('A'.repeat(81),80),null);
 assert.equal(parseNameDraft('A'.repeat(80),80),'A'.repeat(80));
});
test('P020 object names keep previous optional-empty semantics',()=>{
 assert.equal(parseNameDraft('',80,true),'');
 assert.equal(parseNameDraft('   ',80,true),'   ');
 assert.equal(parseNameDraft('Oak',80,true),'Oak');
});
test('P020 invalid validator configuration is rejected',()=>{
 for (const size of [0,301,1.5,NaN])assert.equal(parseNameDraft('Oak',size),null);
});
test('P020 editor commits names once on blur or Enter and Escape cancels',()=>{
 assert.match(ui,/onBlur=\{finish\}/);
 assert.match(ui,/e\.key==='Enter'/);
 assert.match(ui,/e\.key==='Escape'/);
 assert.match(ui,/if\(result!==value\)onCommit\(result\)/);
 assert.ok(app.includes('label="Garden name"'));
 for(const label of ['Group name','Object name'])assert.ok(inspector.includes(`label="${label}"`));
});
test('P020 switching gardens/importing/repairing a project returns to the map',()=>{
 const swap=app.slice(app.indexOf('const replaceLibrary='),app.indexOf('const undo='));
 assert.match(swap,/navigateTo\('map'\)/);
 assert.ok(app.includes('replaceLibrary(next);'));
});
test('P020 choosing existing terrain or path editing opens the map',()=>{
 assert.match(app,/kind:'region',id:r\.id\}[\s\S]{0,120}navigateTo\('map'\)/);
 assert.match(app,/kind:'line',id:line\.id\}[\s\S]{0,120}navigateTo\('map'\)/);
 assert.match(css,/@media\(max-width:760px\)[\s\S]*\.line-entry\{flex-wrap:wrap/);
});
