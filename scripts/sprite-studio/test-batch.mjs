import {test} from 'node:test';
import assert from 'node:assert/strict';
import {batchTargets,planBatchEdit} from '../../lib/sprite-studio-batch.js';
const clip=(n=1)=>({asset:`sprite-studio/raja/${'a'.repeat(64)}.webp`,width:32,height:32,frames:[{x:0,y:0,width:32,height:32}],fps:11,scale:n,x:3,y:-4,pivotX:.5,pivotY:1,loop:true,mirror:false});
const context=()=>({characters:{raja:{run:clip(),'run.west':clip(.8),'run.east':{...clip(1.2),mirror:true},idle:clip(2),boost_dust:clip(.5)},kaka:{idle:{...clip(),asset:`sprite-studio/kaka/${'b'.repeat(64)}.webp`}}},drafts:{},character:'raja',action:'run',scope:'action'});
void test('collective absolute scale edits only selected angles, preserving assets/frames and unselected properties',()=>{
 const c=context(),before=structuredClone(c),p=planBatchEdit(c,['run.west','run.east'],{scale:{mode:'set',value:1.5}});
 assert.deepEqual(Object.keys(p.changes),['run.west','run.east']);for(const [s,v]of Object.entries(p.changes)){assert.equal(v.scale,1.5);assert.deepEqual({...v,scale:c.characters.raja[s].scale},c.characters.raja[s]);}assert.deepEqual(c,before);
});
void test('relative scale preserves directional ratios; offsets add and FPS/pivot/mirror can be combined',()=>{
 const c=context(),p=planBatchEdit(c,['run.west','run.east'],{scale:{mode:'multiply',value:1.1},x:{mode:'add',value:5},y:{mode:'set',value:2},fps:{mode:'set',value:15},pivotX:{mode:'set',value:.4},mirror:{mode:'set',value:false}});
 assert.equal(p.changes['run.west'].scale,.88);assert.equal(p.changes['run.east'].scale,1.32);for(const v of Object.values(p.changes)){assert.equal(v.x,8);assert.equal(v.y,2);assert.equal(v.fps,15);assert.equal(v.pivotX,.4);assert.equal(v.mirror,false);}
});
void test('existing drafts take precedence; default can create explicit directional overrides but deletions stay deleted',()=>{
 const c=context();c.drafts.raja={'run.west':{clip:clip(1.7),reviewed:false},'run.north':{clip:null,reviewed:true}};
 const targets=batchTargets(c);assert.equal(targets.find(t=>t.slot==='run.south').source,'inherited');assert.equal(targets.find(t=>t.slot==='run.west').clip.scale,1.7);assert.equal(targets.find(t=>t.slot==='run.north').clip,null);
 assert.equal(planBatchEdit(c,['run.south'],{scale:{mode:'set',value:2}}).changes['run.south'].asset,clip().asset);
 assert.throws(()=>planBatchEdit(c,['run.north'],{scale:{mode:'set',value:2}}));
});
void test('character-wide body operations exclude dust; dust scope excludes body and does not borrow another owner asset',()=>{
 const c=context();c.scope='character';assert(batchTargets(c).some(t=>t.slot==='idle'));assert(!batchTargets(c).some(t=>t.slot.startsWith('boost_dust')));
 c.action='boost_dust';assert.deepEqual(batchTargets(c).map(t=>t.slot),['boost_dust']);c.action='run';c.characters.raja={};assert(batchTargets({...c,scope:'action'}).every(t=>t.clip===null));
});
void test('invalid property, overflow or one bad target rejects entire plan without mutation; no-ops create no drafts',()=>{
 const c=context(),before=structuredClone(c);for(const fields of [{scale:{mode:'set',value:4.1}},{scale:{mode:'multiply',value:0}},{fps:{mode:'set',value:1.5}},{asset:{mode:'set',value:'x'}},{x:{mode:'add',value:150}},{pivotY:{mode:'set',value:NaN}},{}])assert.throws(()=>planBatchEdit(c,['run.west','run.east'],fields));
 assert.throws(()=>planBatchEdit(c,['run.west','idle'],{scale:{mode:'set',value:1}}));assert.deepEqual(c,before);assert.deepEqual(planBatchEdit(c,['run.west'],{scale:{mode:'set',value:.8}}).changes,{});
});
void test('flight and dust loop policies remain canonical after bulk edits',()=>{
 const base=clip(),c={characters:{bebe:{ultimate_takeoff:{...base,asset:`sprite-studio/bebe/${'a'.repeat(64)}.webp`,loop:false},ultimate_fly:{...base,asset:`sprite-studio/bebe/${'a'.repeat(64)}.webp`}}},character:'bebe',action:'ultimate_takeoff',scope:'character'};
 assert.equal(planBatchEdit(c,['ultimate_takeoff','ultimate_fly'],{loop:{mode:'set',value:false},scale:{mode:'set',value:1.2}}).changes.ultimate_fly.loop,true);
});
