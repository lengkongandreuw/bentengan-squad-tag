import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GRAPHICS_PRESETS,normalizeGraphics,graphicsPixelRatio,graphicsPreset,saveGraphicsPreset} from '../lib/graphics-settings.js';
test('presets sanitize invalid values and retain previous high quality by default',()=>{
  for(const value of [null,undefined,'bad','toString','__proto__',{},1]) assert.equal(normalizeGraphics(value),'high');
  assert.equal(graphicsPixelRatio('high',2),2);
  assert.equal(graphicsPixelRatio('high',1),1);
  assert.equal(graphicsPixelRatio('low',2),.75);
  assert.equal(graphicsPixelRatio('balanced',2),1.5);
  for(const ratio of [1,1.25,2,3,NaN,Infinity]) {
    assert(graphicsPixelRatio('low',ratio)<=graphicsPixelRatio('balanced',ratio));
    assert(graphicsPixelRatio('balanced',ratio)<=graphicsPixelRatio('high',ratio));
  }
  assert.equal(GRAPHICS_PRESETS.high.particleStride,1);
});
test('storage unavailable fails safely',()=>{
  assert.equal(graphicsPreset(),'high');
  assert.equal(saveGraphicsPreset('low'),'low');
});
test('storage round trip contains only graphic preset',()=>{
  const values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  try {
    saveGraphicsPreset('balanced');assert.equal(graphicsPreset(),'balanced');
    saveGraphicsPreset('low');assert.equal(graphicsPreset(),'low');
    saveGraphicsPreset('wrong');assert.equal(graphicsPreset(),'high');
    assert.equal(values.size,1);
  } finally { delete globalThis.localStorage; }
});
