import test from 'node:test';
import assert from 'node:assert/strict';
import { requiredToolLayer, toolLockMessage, needsDraftExitConfirmation, draftExitMessage } from '../src/toolAccess.ts';
import { readFile } from 'node:fs/promises';

const unlocked=()=>({objects:false,regions:false,lines:false,boundary:false});
test('P034 tool to layer mapping retains all nine tools and eight object tools',()=>{
 assert.equal(requiredToolLayer('select'),null);
 assert.equal(requiredToolLayer('pan'),null);
 for(const tool of ['outline-edit','outline-draw','freehand'])assert.equal(requiredToolLayer(tool),'boundary');
 assert.equal(requiredToolLayer('terrain'),'regions');
 for(const tool of ['path','fence','feature-edit'])assert.equal(requiredToolLayer(tool),'lines');
 for(const tool of ['tree','shrub','flower','bed','house','rock','pond','furniture'])assert.equal(requiredToolLayer(tool),'objects');
});
test('P034 locked layers block edits, including the original feature edit exception',()=>{
 const locked={objects:true,regions:true,lines:true,boundary:true};
 assert.equal(toolLockMessage('select',locked),null);
 assert.equal(toolLockMessage('pan',locked),null);
 assert.equal(toolLockMessage('tree',locked),'Unlock objects to use this tool.');
 assert.equal(toolLockMessage('path',locked),'Unlock lines to use this tool.');
 assert.equal(toolLockMessage('terrain',locked),'Unlock regions to use this tool.');
 assert.equal(toolLockMessage('feature-edit',locked),'Unlock lines to use this tool.');
 assert.equal(toolLockMessage('feature-edit',{...locked,regions:false}),null);
 assert.equal(toolLockMessage('feature-edit',{...locked,lines:false}),null);
 assert.equal(toolLockMessage('tree',unlocked()),null);
});
test('P034 unfinished drafts only prompt for actual tool or view changes',()=>{
 assert.equal(needsDraftExitConfirmation(0,'path','terrain','scale','scale'),false);
 assert.equal(needsDraftExitConfirmation(2,'path','path','scale','scale'),false);
 assert.equal(needsDraftExitConfirmation(2,'path','terrain','scale','scale'),true);
 assert.equal(needsDraftExitConfirmation(2,'path','path','scale','illustration'),true);
 assert.equal(draftExitMessage(1),'Discard 1 unfinished drawing point? Finish or clear the shape first to keep working on it.');
 assert.equal(draftExitMessage(2),'Discard 2 unfinished drawing points? Finish or clear the shape first to keep working on it.');
});
test('P034 toolbar delegates permission checks and undo history to App',async()=>{
 const [app,toolbar]=await Promise.all([
  readFile(new URL('../src/App.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/components/MapEditingToolbar.tsx',import.meta.url),'utf8')
 ]);
 assert.match(app,/<MapEditingToolbar tool=\{tool\}/);
 assert.match(app,/toolLockMessage\(value,locked\)/);
 assert.match(app,/needsDraftExitConfirmation\(draftCount,tool,nextTool,mode,nextMode\)/);
 assert.match(app,/onUndo=\{undo\} onRedo=\{redo\}/);
 assert.match(toolbar,/className="editor-history-bar"/);
 assert.match(toolbar,/className="primary-tools"/);
 assert.match(toolbar,/onSelectTool\(x.id\)/);
 assert.match(toolbar,/onClick=\{onToggleMultiSelect\}/);
 assert.match(toolbar,/onClick=\{onToggleSnap\}/);
 assert.match(toolbar,/onClick=\{onUndo\}/);
 assert.match(toolbar,/onClick=\{onRedo\}/);
 assert.doesNotMatch(toolbar,/applyGarden|setLibrary|createBrowserWriter|window.confirm/);
});
