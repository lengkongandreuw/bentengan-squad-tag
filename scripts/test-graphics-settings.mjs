import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GRAPHICS_PRESETS,AUTO_PIXEL_RATIO,normalizeGraphics,graphicsPixelRatio,graphicsPreset,saveGraphicsPreset,autoInitialPixelRatio,nextAutoPixelRatio} from '../lib/graphics-settings.js';
test('presets sanitize invalid values and default to auto; manual presets keep previous ratios',()=>{
  for(const value of [null,undefined,'bad','toString','__proto__',{},1]) assert.equal(normalizeGraphics(value),'auto');
  assert.equal(graphicsPixelRatio('high',2),2);
  assert.equal(graphicsPixelRatio('high',1),1);
  assert.equal(graphicsPixelRatio('low',2),.75);
  assert.equal(graphicsPixelRatio('balanced',2),1.5);
  for(const ratio of [1,1.25,2,3,NaN,Infinity]) {
    assert(graphicsPixelRatio('low',ratio)<=graphicsPixelRatio('balanced',ratio));
    assert(graphicsPixelRatio('balanced',ratio)<=graphicsPixelRatio('high',ratio));
  }
  assert.equal(GRAPHICS_PRESETS.high.particleStride,1);
  assert.equal(GRAPHICS_PRESETS.auto.label,'Otomatis');
});
test('auto starts like Seimbang on HiDPI and like Tinggi on 1x displays',()=>{
  assert.equal(autoInitialPixelRatio(2),graphicsPixelRatio('balanced',2));
  assert.equal(autoInitialPixelRatio(1),graphicsPixelRatio('high',1));
  assert.equal(graphicsPixelRatio('auto',2),1.5);
  assert.equal(graphicsPixelRatio('auto',1),1);
  assert.equal(graphicsPixelRatio('auto',2,.2),AUTO_PIXEL_RATIO.min);
  assert.equal(graphicsPixelRatio('auto',2,5),2);
  assert.equal(GRAPHICS_PRESETS.auto.particleStride,1);
});
test('auto resolution steps down on slow frames and up with spare budget, within bounds',()=>{
  assert.equal(nextAutoPixelRatio(1.5,30,25,2),1.4);
  assert.equal(nextAutoPixelRatio(1.5,16.7,8,2),1.6);
  assert.equal(nextAutoPixelRatio(1.5,16.7,15,2),1.5);
  assert.equal(nextAutoPixelRatio(.6,40,30,2),.6);
  assert.equal(nextAutoPixelRatio(2,8,4,2),2);
  assert.equal(nextAutoPixelRatio(1,8,4,1),1);
  let ratio=2;for(let i=0;i<30;i++)ratio=nextAutoPixelRatio(ratio,35,30,2);
  assert.equal(ratio,AUTO_PIXEL_RATIO.min);
});
test('storage unavailable fails safely',()=>{
  assert.equal(graphicsPreset(),'auto');
  assert.equal(saveGraphicsPreset('low'),'low');
});
test('storage round trip contains only graphic preset; saved manual choice is respected',()=>{
  const values=new Map();
  globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  try {
    assert.equal(graphicsPreset(),'auto');
    values.set('benteng-graphics-v1','high');assert.equal(graphicsPreset(),'high');
    saveGraphicsPreset('balanced');assert.equal(graphicsPreset(),'balanced');
    saveGraphicsPreset('low');assert.equal(graphicsPreset(),'low');
    saveGraphicsPreset('wrong');assert.equal(graphicsPreset(),'auto');
    assert.equal(values.size,1);
  } finally { delete globalThis.localStorage; }
});
