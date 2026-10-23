import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createStudioHistory,nativeKeyboardTarget} from './studio-keyboard.js';

void test('bounded detached history groups a held key/drag, branches redo and resets safely',()=>{
  let value={x:0,nested:{scale:1}},updates=0;
  const history=createStudioHistory(()=>value,next=>{value=next;},()=>updates++);history.reset();
  history.begin();for(let i=1;i<=10;i++){value.x=i;history.record();}history.end();
  history.undo();assert.equal(value.x,0);history.redo();assert.equal(value.x,10);
  value.nested.scale=2;history.record();history.undo();assert.equal(value.nested.scale,1);
  value.x=4;history.record();assert.equal(history.canRedo,false);
  for(let i=0;i<60;i++){value.x=i+100;history.record();}
  let count=0;while(history.canUndo){history.undo();count++;}assert.equal(count,40);
  history.reset();assert.equal(history.canRedo,false);assert.equal(history.canUndo,false);assert.ok(updates>0);
});
void test('native keyboard target checks the composed ancestry, not just the clicked node',()=>{
  assert.equal(nativeKeyboardTarget({composedPath:()=>[{matches:()=>false},{matches:selector=>selector.includes('contenteditable')}]}),true);
  assert.equal(nativeKeyboardTarget({composedPath:()=>[{},null,{matches:()=>false}]}),false);
});
