import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drawBoostDust} from '../modules/ui/boost-dust.ts';
const recorder=()=>{const ops=[];return {ops,ctx:{save:()=>ops.push(['save']),restore:()=>ops.push(['restore']),translate:(...a)=>ops.push(['translate',...a]),rotate:(...a)=>ops.push(['rotate',...a]),scale:(...a)=>ops.push(['scale',...a]),drawImage:(...a)=>ops.push(['draw',...a])}};};
void test('boost draw preserves built-in frame timing and quietly skips an unloaded image',()=>{
  const image={complete:true,naturalWidth:1024},p={x:100,y:200,vx:0,vy:-100},r=recorder();
  drawBoostDust(r.ctx,p,78,image,null,-Math.PI/2);
  assert.deepEqual(r.ops.find(o=>o[0]==='draw'),['draw',image,256,0,256,192,-78,-29,92,69]);
  assert.deepEqual(r.ops.find(o=>o[0]==='rotate'),['rotate',-Math.PI/2]);
  const empty=recorder();drawBoostDust(empty.ctx,p,78,{complete:false,naturalWidth:0},null,0);assert.deepEqual(empty.ops,[]);
});
void test('dedicated direction is not rotated again; generic effects follow exact diagonal velocity',()=>{
  const clip={scale:1,x:20,y:5,pivotX:.5,pivotY:.5,mirror:true},frame={x:0,y:0,width:40,height:20},image={},p={x:100,y:200,vx:-10,vy:-10};
  for(const rotate of [false,true]){
    const r=recorder();drawBoostDust(r.ctx,p,78,{}, {clip,frame,image,rotate},0);
    assert.equal(r.ops.some(o=>o[0]==='rotate'),rotate);
    if(rotate)assert.deepEqual(r.ops.find(o=>o[0]==='rotate'),['rotate',-Math.PI*.75]);
    assert.deepEqual(r.ops.find(o=>o[0]==='draw'),['draw',image,0,0,40,20,-69,-34.5,138,69]);
    assert.deepEqual(r.ops.find(o=>o[0]==='scale'),['scale',-1,1]);
  }
});
void test('trimmed runtime atlas retains logical effect scale and pivot',()=>{
  const clip={scale:1,x:0,y:0,pivotX:.5,pivotY:.5,mirror:false},frame={x:0,y:0,width:40,height:20},packedFrame={x:5,y:6,width:10,height:8,left:12,top:4},image={},r=recorder();
  drawBoostDust(r.ctx,{x:0,y:0,vx:1,vy:0},0,{}, {clip,frame,image,packedFrame,rotate:false},0);
  const draw=r.ops.find(o=>o[0]==='draw');
  assert.deepEqual(draw.slice(1,6),[image,5,6,10,8]);
  assert.equal(draw[6],-69+12*3.45);assert.equal(draw[7],-34.5+4*3.45);
  assert.equal(draw[8],10*3.45);assert.equal(draw[9],8*3.45);
});
