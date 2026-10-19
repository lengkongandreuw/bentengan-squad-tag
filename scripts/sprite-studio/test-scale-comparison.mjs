import {test} from 'node:test';
import assert from 'node:assert/strict';
import {comparisonSource,comparisonGeometry} from '../../lib/sprite-scale-comparison.js';
const c=(scale=1)=>({scale,x:3,y:-2,pivotX:.4,pivotY:1,mirror:false});
void test('reference resolution is read-only and explicit about draft, direction, default or legacy',()=>{
 const chars={raja:{run:c(), 'run.west':c(2)}},drafts={raja:{'run.west':{clip:c(1.5)}}},before=structuredClone({chars,drafts});
 assert.equal(comparisonSource(chars,drafts,'raja','run.west').source,'draft');assert.equal(comparisonSource(chars,drafts,'raja','run.west').clip.scale,1.5);
 assert.equal(comparisonSource(chars,{},'raja','run.west').source,'saved');assert.equal(comparisonSource(chars,{},'raja','run.north').source,'inherited');assert.equal(comparisonSource(chars,{},'kaka','run.north').source,'legacy');
 assert.deepEqual({chars,drafts},before);drafts.raja['run.west'].clip=null;assert.equal(comparisonSource(chars,drafts,'raja','run.west').clip.scale,1,'deleted direction falls back to action default');
});
void test('scale comparator uses gameplay visualScale, common zoom and foot baseline, not per-image fit',()=>{
 const frame={width:40,height:80};for(const zoom of [.5,1,2,3]){
  const a=comparisonGeometry(c(1),frame,1,zoom,300,400),b=comparisonGeometry(c(2),frame,1.2,zoom,600,400);
  assert.equal(a.baseY,b.baseY);assert.equal(a.height,74);assert.equal(b.height,177.6);assert.equal(b.screenHeight/a.screenHeight,2.4);assert.equal(a.y+a.screenHeight,400-2*zoom);
  const overlay=comparisonGeometry(c(2),frame,1.2,zoom,300,400);assert.equal(overlay.baseX,a.baseX);assert.equal(overlay.screenHeight,b.screenHeight);
 }
 const mirrored=comparisonGeometry({...c(),mirror:true},frame,1,1,300,400);assert.equal(mirrored.x,300+3-37*.6);
});
