import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTouchPointerOwner} from '../modules/ui/touch-pointer-owner.ts';
void test('simultaneous movement and Sprint retain separate owners; cancel/lost-capture are idempotent',()=>{
 const calls=[],owner=createTouchPointerOwner((...v)=>calls.push(v));
 owner.press(1,'w');owner.press(2,' ');owner.release(1);owner.release(1);
 assert.deepEqual(calls,[['w',true],[' ',true],['w',false]]);owner.release(2);assert.deepEqual(calls.at(-1),[' ',false]);
});
void test('two fingers on one action do not release each other or duplicate jump pulses',()=>{
 const calls=[],owner=createTouchPointerOwner((...v)=>calls.push(v));
 owner.press(1,'shift');owner.press(2,'shift');owner.press(2,'shift');owner.release(1);
 assert.deepEqual(calls,[['shift',true]]);owner.release(2);assert.deepEqual(calls,[['shift',true],['shift',false]]);
});
void test('pause/blur/rotation clear owned keys only and accept a new gesture',()=>{
 const held=new Set(['p']),owner=createTouchPointerOwner((key,on)=>on?held.add(key):held.delete(key));
 owner.press(1,'d');owner.press(2,' ');owner.clear();owner.clear();assert.deepEqual([...held],['p']);
 owner.press(1,'a');assert(held.has('a'));owner.press(1,'s');assert(!held.has('a'));assert(held.has('s'));owner.release(1);assert.deepEqual([...held],['p']);
});
