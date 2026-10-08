import {test} from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {solidAt,waterAt,speedAt} from '../lib/map-studio-model.js';
import {createMapQueries,objectBounds,visibleBounds} from '../lib/map-runtime-index.js';

void test('indexed map queries retain exact rotated polygon/ellipse/bridge/mask/slow rules',()=>{
  const map={width:800,height:800,waterMask:{width:4,height:4,rows:[[0,1],[2,4],[],[0,4]]},objects:[]};
  for(let i=0;i<120;i++)map.objects.push({x:(i%12)*60-30,y:Math.floor(i/12)*60-30,w:40+i%7,h:30+i%9,rotation:(i*37)%360,shape:['rect','ellipse','polygon'][i%3],behavior:['solid','parkour','water','bridge','slow','decoration'][i%6],slow:.4,points:[{x:0,y:0},{x:1,y:.1},{x:.3,y:1}]});
  // Very large objects use bounded global candidates rather than huge buckets.
  map.objects.push({x:-7000,y:-7000,w:15000,h:15000,rotation:0,shape:'rect',behavior:'water'});
  const before=JSON.stringify(map),q=createMapQueries(map);
  for(let i=0;i<1500;i++){
    const x=(i*89)%900-50,y=(i*137)%900-50,r=[0,2,13,28,32,80][i%6];
    for(const jumping of [false,true])assert.equal(q.solidAt(x,y,r,jumping),solidAt(map,x,y,r,jumping));
    assert.equal(q.waterAt(x,y),waterAt(map,x,y));assert.equal(q.speedAt(x,y),speedAt(map,x,y));
  }
  assert.equal(JSON.stringify(map),before);
});
void test('collision broad-phase materially reduces work without approximate collision shapes',()=>{
  const objects=Array.from({length:1600},(_,i)=>({x:i%40*100,y:Math.floor(i/40)*100,w:35,h:50,rotation:i%2*45,behavior:'solid',shape:'rect'}));
  const map={width:4000,height:4000,objects},q=createMapQueries(map),points=Array.from({length:2000},(_,i)=>({x:i*137%4000,y:i*191%4000}));
  const start=performance.now(),expected=points.map(p=>solidAt(map,p.x,p.y)),linearMs=performance.now()-start;
  const indexedStart=performance.now(),actual=points.map(p=>q.solidAt(p.x,p.y)),indexedMs=performance.now()-indexedStart;
  assert.deepEqual(actual,expected);
  const candidates=points.reduce((n,p)=>n+q.nearby(p.x,p.y,13).objects.length,0);
  assert.ok(candidates<points.length*objects.length*.02);
  console.log(JSON.stringify({benchmark:'collision only (not measured game FPS)',objects:1600,queries:2000,linearMs:+linearMs.toFixed(2),indexedMs:+indexedMs.toFixed(2),candidateReductionPercent:+(100*(1-candidates/(points.length*objects.length))).toFixed(2)}));
});
void test('offscreen culling preserves rotated extents and objects reappearing at viewport edges',()=>{
  const bounds=objectBounds({x:100,y:100,w:100,h:20,rotation:45});
  assert.ok(bounds.top<100&&bounds.bottom>120);
  assert.equal(visibleBounds(bounds,{left:0,right:110,top:0,bottom:110}),true);
  assert.equal(visibleBounds(bounds,{left:1000,right:1100,top:1000,bottom:1100}),false);
  assert.equal(visibleBounds(bounds,{left:bounds.right,right:bounds.right+10,top:bounds.top,bottom:bounds.bottom}),true);
});
void test('runtime checks contact range before expensive LOS; original quality settings retained',()=>{
  const code=readFileSync('app/prototype.tsx','utf8'),section=code.slice(code.indexOf('const tagCheck ='),code.indexOf('const rescueCheck ='));
  assert.ok(section.includes('tagContacts(players,now,interactionRules)'));
  const core=readFileSync('lib/game-core/interactions.ts','utf8');
  const exports={},context={exports,tagEligible:()=>true,distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),sweptContactDistance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)};
  vm.runInNewContext(ts.transpileModule(core.slice(core.indexOf('export function tagContacts('),core.indexOf('export function resolveTag(')),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
  let lineTests=0;const rules={tagRange:()=>20,lineOfSight:()=>{lineTests++;return true;}};
  const actors=[{id:'a',x:0,y:0,exitOrder:2},{id:'b',x:1000,y:0,exitOrder:1}];
  assert.equal(exports.tagContacts(actors,0,rules).length,0);assert.equal(lineTests,0);
  actors[1].x=10;assert.equal(exports.tagContacts(actors,0,rules).length,1);assert.equal(lineTests,1);
  assert.ok(code.includes("imageSmoothingQuality = 'high'"));
  assert.ok(code.includes('studioLayers.world.filter(objectVisible)'));
  assert.ok(code.includes('createMapQueries(studioMap)'));
  assert.ok(code.includes('retainStudioImages(matchCharacters)'));
  assert.ok(code.includes('for (const id of matchCharacters)'));
});
