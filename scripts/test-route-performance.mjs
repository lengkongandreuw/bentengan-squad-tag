import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clickRoute,clearSegment} from '../modules/gameplay/click-navigation.ts';
import {createRouteScheduler} from '../lib/route-scheduler.js';
import {readFileSync} from 'node:fs';

// Original linear-open-set implementation: exact route parity, including ties.
function reference(start,target,width,height,passable,cell=24) {
  if(!passable(target.x,target.y))return [];
  if(clearSegment(start,target,passable))return [target];
  const cols=Math.ceil(width/cell),rows=Math.ceil(height/cell);
  const point=k=>({x:(k%cols+.5)*cell,y:(Math.floor(k/cols)+.5)*cell});
  const keyAt=p=>Math.floor(p.y/cell)*cols+Math.floor(p.x/cell);
  const first=keyAt(start),goal=keyAt(target),scores=new Map([[first,0]]),previous=new Map(),open=new Set([first]),closed=new Set();
  const heuristic=p=>Math.hypot(target.x-p.x,target.y-p.y);
  for(let iteration=0;open.size&&iteration<8000;iteration++) {
    let current=first,best=Infinity;
    for(const key of open){const score=scores.get(key)+heuristic(key===first?start:point(key));if(score<best){current=key;best=score;}}
    const here=current===first?start:point(current);
    if((current===goal||heuristic(here)<cell*2)&&clearSegment(here,target,passable)) {
      const route=[target];while(current!==first){route.unshift(point(current));current=previous.get(current);}return route;
    }
    open.delete(current);closed.add(current);
    for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++) {
      if(!x&&!y)continue;
      const cx=current%cols+x,cy=Math.floor(current/cols)+y;
      if(cx<0||cy<0||cx>=cols||cy>=rows)continue;
      const key=cy*cols+cx,next=point(key);
      if(closed.has(key)||!passable(next.x,next.y)||!clearSegment(here,next,passable))continue;
      const score=scores.get(current)+Math.hypot(next.x-here.x,next.y-here.y);
      if(score>=(scores.get(key)??Infinity))continue;
      scores.set(key,score);previous.set(key,current);open.add(key);
    }
  }
  return [];
}
void test('priority-queue navigation preserves original routes and all sampled edges',()=>{
  const cases=[];
  for(let i=0;i<60;i++) {
    const passable=(x,y)=>x>=0&&y>=0&&x<600&&y<600&&!(x>220&&x<280&&y<420+i%4*25)&&!(x>350&&x<470&&y>300&&y<370);
    cases.push({start:{x:30,y:30+i*7%530},target:{x:550,y:30+i*13%530},passable});
  }
  cases.push({start:{x:30,y:30},target:{x:550,y:550},passable:x=>!(x>220&&x<280)});
  const baselineStart=performance.now(),expected=cases.map(c=>reference(c.start,c.target,600,600,c.passable)),baselineMs=performance.now()-baselineStart;
  const optimizedStart=performance.now(),actual=cases.map(c=>clickRoute(c.start,c.target,600,600,c.passable)),optimizedMs=performance.now()-optimizedStart;
  assert.deepEqual(actual,expected);
  actual.forEach((route,i)=>{let previous=cases[i].start;for(const p of route){assert.ok(clearSegment(previous,p,cases[i].passable));previous=p;}});
  console.log(JSON.stringify({benchmark:'route search only, not game FPS',routes:cases.length,baselineMs:+baselineMs.toFixed(2),optimizedMs:+optimizedMs.toFixed(2)}));
});
void test('scheduler coalesces targets, is fair, bounded and cancellable',()=>{
  const scheduler=createRouteScheduler(),calls=[];
  for(let i=0;i<9;i++)scheduler.request(i,()=>calls.push(i));
  scheduler.request(0,()=>calls.push('latest'));
  assert.equal(scheduler.size,9);scheduler.run();assert.deepEqual(calls,['latest']);
  scheduler.request(0,()=>calls.push('next'));
  scheduler.run();assert.deepEqual(calls,['latest',1]);
  scheduler.cancel(2);while(scheduler.run()){};
  assert.deepEqual(calls,['latest',1,3,4,5,6,7,8,'next']);
  scheduler.request(0,()=>assert.fail());scheduler.clear();assert.equal(scheduler.run(),false);
});
void test('runtime renders every frame (throttled behind result overlay) and gates scoreboard work behind visibility',()=>{
  const code=readFileSync('app/prototype.tsx','utf8');
  assert.ok(code.includes("if(!clientOnly&&!paused && phase==='PLAYING') routeScheduler.run();"));
  assert.ok(code.includes("if(leaderboardOpenRef.current || phase==='ROUND_OVER' || phase==='MATCH_OVER')"));
  assert.ok(code.includes('statsBoard: cachedStatsBoard'));
  assert.ok(code.includes('draw(now,renderAdapter(clientPresentation??readCanonicalState(now,development)));'));
  assert.ok(code.includes("if(!resultOverlayShown||localNow-lastDraw>=100)"));
  assert.ok(code.includes("get('performance') === '1'"));
});
