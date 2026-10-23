import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {performance} from 'node:perf_hooks';
import {createMapPropDepth} from '../modules/ui/map-prop-depth.ts';
import {createStudioDepth} from '../modules/ui/studio-depth.ts';
import * as taman from '../lib/taman-visuals.js';
import * as pasar from '../lib/pasar2-visuals.js';
import {TAMAN_ATLAS} from '../lib/taman-layout.js';
import {TAMAN_PROPS,TAMAN_PRISONS} from '../lib/taman-layout.js';
import {PASAR2_PROPS,PASAR2_PRISONS} from '../lib/pasar2-layout.js';

function compiled(source,require=()=>{throw Error('Unexpected import');}) {
  const exports={};
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInThisContext(`(function(exports,require){${code}\n})`)(exports,require);
  return exports;
}
const beforeDepth=compiled(readFileSync('scripts/fixtures/map-prop-depth-before.ts.txt','utf8'),id=>id.includes('taman-layout')?{TAMAN_ATLAS}:id.includes('taman-visuals')?taman:pasar).createMapPropDepth;
const currentBot=readFileSync('modules/gameplay/ai-movement.ts','utf8');
const botHelpers=`const botDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const weaknessFor=(p,w)=>w.weakness&&(!w.weakness.enemiesOnly||p.team!==w.localTeam)?w.weakness:undefined;
const botSees=(p,q,now,weakness)=>!weakness||(now>=q.parkourUntil&&botDistance(p,q)<=weakness.visionRadius);
const GUARD_ALERT_RADIUS=2;`;
const beforeBot=compiled(botHelpers+readFileSync('scripts/fixtures/bot-plan-before.ts.txt','utf8')).planBot;
const afterBot=compiled(botHelpers+currentBot.slice(currentBot.indexOf('export function planBot('),currentBot.indexOf('export type GuardSlot'))).planBot;
let seed=12345;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function botCase(i){
  const players=Array.from({length:10},(_,j)=>({id:'p'+j,entityId:'e'+j,team:j%2?'red':'blue',controlled:j===0,
    state:['ACTIVE','IN_BASE','RETURNING','PRISONER'][Math.floor(random()*4)],x:Math.floor(random()*1000),y:Math.floor(random()*700),
    vx:random()*20,vy:random()*20,exitOrder:Math.floor(random()*5),boost:random()*100,aiSeed:random()*9,prisonIndex:j%3,parkourUntil:j%3?0:3000}));
  // Exact ties verify that the first candidate still wins.
  if(i%5===0){players[2]={...players[2],state:'ACTIVE',x:players[4].x,y:players[4].y,exitOrder:players[4].exitOrder};}
  const w={players,width:1000,height:700,localTeam:'blue',bases:{blue:{x:100,y:350},red:{x:900,y:350}},
    refills:Array.from({length:8},()=>({x:Math.floor(random()*1000),y:Math.floor(random()*700)})),
    request:i%7?null:{requesterId:'p3',assignedRescuerId:'p2'},
    profile:{rescueCutoff:1.4,threatRadius:220,playerBias:30,prediction:.3},
    ...(i%2?{weakness:{enemiesOnly:i%3===0,visionRadius:350}}:{}),
    ...(i%3?{}:{duty:{guards:{blue:'p2',red:'p1'},baseRadius:100}})};
  return {players,w,now:1000+i%3000};
}
void test('bot choices retain exact strategy, target, tie, guard, rescue and vision rules',()=>{
  const cases=Array.from({length:1200},(_,i)=>botCase(i));
  for(const {players,w,now} of cases){const before=structuredClone(w);
    for(const p of players)assert.deepEqual(afterBot(p,now,w),beforeBot(p,now,w));
    assert.deepEqual(w,before);
  }
  const run=fn=>{const start=performance.now();for(let pass=0;pass<8;pass++)for(const c of cases)for(const p of c.players)fn(p,c.now,c.w);return performance.now()-start;};
  run(beforeBot);run(afterBot);
  const baseline=run(beforeBot),optimized=run(afterBot);
  console.log(JSON.stringify({benchmark:'96000 bot decisions; CPU only, not game FPS',baselineMs:+baseline.toFixed(2),optimizedMs:+optimized.toFixed(2)}));
});

function field(id,count=45){
  const assets=id==='pasar'?['map2Center','marketStallA','snackCart','plantFence']:['parkTree','parkBench','parkFlowerFence','gardenMedium','parkLamp'];
  return {id,obstacles:Array.from({length:count},(_,i)=>({asset:assets[i%assets.length],x:i%9*100,y:Math.floor(i/9)*110,
    w:80,h:30,visualW:100,visualH:130,flip:!!(i%2),hidden:i%13===0,underlay:i%17===0})),
    prisons:{red:{x:130,y:90,w:150,h:120},blue:{x:650,y:490,w:150,h:120}}};
}
function renderer(factory,f,record=true){
  const trace=[];
  const noop=()=>{};
  const ctx=new Proxy({}, {get:(obj,key)=>obj[key]??(obj[key]=record?(...args)=>trace.push([key,...args]):noop),set:(obj,key,v)=>{obj[key]=v;if(record)trace.push(['set',key,v]);return true;}});
  const render=factory(f,()=>ctx,null,(_ctx,...args)=>{if(record)trace.push(['asset',...args]);});
  return {trace,render:(actors,now)=>{trace.length=0;render(actors,now,p=>{if(record)trace.push(['actor',p.entityId]);});return trace;}};
}
void test('cached map depth keeps every draw command, opacity, ripple and actor tie order',()=>{
  for(const id of ['pasar','taman']){
    const f=field(id),original=structuredClone(f),old=renderer(beforeDepth,f),next=renderer(createMapPropDepth,f);
    for(let frame=0;frame<150;frame++){
      const players=Array.from({length:10},(_,i)=>({entityId:'e'+i,x:i*95+frame%60,y:i%3===0?140:(frame*17+i*30)%650}));
      assert.deepEqual(next.render(players,1000+frame*17),old.render(players,1000+frame*17));
    }
    assert.deepEqual(f,original);
    const oldEmpty=renderer(beforeDepth,f),nextEmpty=renderer(createMapPropDepth,f);
    assert.deepEqual(nextEmpty.render([],1200),oldEmpty.render([],1200));
    const bench=factory=>{const r=renderer(factory,f,false),actors=Array.from({length:10},(_,i)=>({entityId:'e'+i,x:i*95,y:i*40})),start=performance.now();
      for(let n=0;n<4000;n++){actors[0].y=n%600;r.render(actors,1000+n*17);}return performance.now()-start;};
    bench(beforeDepth);bench(createMapPropDepth);
    console.log(JSON.stringify({benchmark:`${id}: 4000 map-depth frames, mock canvas (not FPS/GPU)`,baselineMs:+bench(beforeDepth).toFixed(2),optimizedMs:+bench(createMapPropDepth).toFixed(2)}));
  }
  for(const [id,obstacles,prisons] of [['taman',TAMAN_PROPS,TAMAN_PRISONS],['pasar',PASAR2_PROPS,PASAR2_PRISONS]]){
    const f={id,obstacles,prisons},old=renderer(beforeDepth,f),next=renderer(createMapPropDepth,f);
    for(let n=0;n<90;n++){
      const actors=Array.from({length:10},(_,i)=>({entityId:'e'+i,x:(n*19+i*140)%1800,y:(n*29+i*90)%1000}));
      assert.deepEqual(next.render(actors,2000+n*17),old.render(actors,2000+n*17));
    }
  }
});
void test('studio maps preserve exact z/y ordering, ties and viewport culling',()=>{
  const objects=Array.from({length:300},(_,i)=>({id:i,y:i%20*30,h:30,z:i%5-2}));
  const before=structuredClone(objects),draw=createStudioDepth(objects);
  const old=(players,visible)=>[...players.map(p=>({z:0,y:p.y,id:'p'+p.id})),...objects.filter(visible).map(o=>({z:o.z,y:o.y+o.h,id:'o'+o.id}))].sort((a,b)=>a.z-b.z||a.y-b.y).map(e=>e.id);
  const players=Array.from({length:10},(_,i)=>({id:i,y:i*30}));
  for(let n=0;n<200;n++){
    players[0].y=n*4;
    const visible=o=>(o.id+n)%4!==0,actual=[];
    draw(players,visible,p=>actual.push('p'+p.id),o=>actual.push('o'+o.id));
    assert.deepEqual(actual,old(players,visible));
  }
  const empty=[];draw([],()=>false,p=>empty.push(p),o=>empty.push(o));assert.deepEqual(empty,[]);
  assert.deepEqual(objects,before);
  const visible=()=>true;
  const bench=fn=>{const start=performance.now();for(let n=0;n<10000;n++)fn();return performance.now()-start;};
  const noop=()=>{};
  const baseline=bench(()=>{
    const entries=[...players.map(p=>({z:0,y:p.y,draw:()=>noop(p)})),...objects.filter(visible).map(o=>({z:o.z,y:o.y+o.h,draw:()=>noop(o)}))];
    entries.sort((a,b)=>a.z-b.z||a.y-b.y).forEach(e=>e.draw());
  });
  const optimized=bench(()=>draw(players,visible,noop,noop));
  console.log(JSON.stringify({benchmark:'300 studio objects, 10000 depth frames (CPU only, not FPS)',baselineMs:+baseline.toFixed(2),optimizedMs:+optimized.toFixed(2)}));
});
