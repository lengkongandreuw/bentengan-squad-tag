import assert from 'node:assert/strict';
import {test} from 'node:test';
import {activePlayerEffect,createPlayerStatusFeedback,projectPlayerEffect,drawPlayerEffects,teamBuffDeadline} from '../modules/ui/player-status-feedback.ts';
const actor=(over={})=>({entityId:'local',x:500,y:300,state:'ACTIVE',parkourUntil:0,rescueShieldUntil:0,ultimateShieldUntil:0,fallNoticeUntil:0,...over});
void test('status projection uses only actual states/timers, never speed or an invented protection',()=>{
  const p=actor(),before=structuredClone(p);assert.equal(activePlayerEffect(p,1000),null);assert.deepEqual(p,before);
  for(const [id,patch]of [['captured',{state:'PRISONER'}],['warning',{fallNoticeUntil:2000}],['warning',{flight:{warning:true}}],['shielded',{ultimateShieldUntil:2000}],['immune',{parkourUntil:2000}],['immune',{state:'RETURNING',rescueShieldUntil:2000}],['returning',{state:'RETURNING'}]])assert.equal(activePlayerEffect(actor(patch),1000).id,id);
  assert.equal(activePlayerEffect(actor({rescueShieldUntil:2000}),1000),null,'rescue protection belongs to returning actor only');
  assert.equal(activePlayerEffect(p,1000,2000).id,'boost');assert.equal(activePlayerEffect(p,1000,0,2000).id,'powered');
  assert.equal(activePlayerEffect(actor({ultimateShieldUntil:1000}),1000),null,'exact expiry boundary');
});
void test('feedback hides after 2.8s, resets only on a real transition/reapplication and prunes removed actors',()=>{
  const feedback=createPlayerStatusFeedback(),p=actor({state:'PRISONER'});
  assert.equal(feedback.read(p,1000).id,'captured');assert.equal(feedback.read(p,3799).id,'captured');assert.equal(feedback.read(p,3800),null);assert.equal(feedback.read(p,9000),null);
  feedback.read(actor(),9001);assert.equal(feedback.read(p,9002).age,0);
  feedback.retain([]);assert.equal(feedback.read(p,9500).age,0);
  feedback.clear();const s=actor({ultimateShieldUntil:20000});assert.equal(feedback.read(s,10000).age,0);assert.equal(feedback.read({...s,ultimateShieldUntil:21000},11000).age,0);
});
void test('ultimate feedback follows the real caster team, including non-caster host and opposite-team client',()=>{
 const casters=[{team:'red',until:2000},{team:'green',until:3000}];
 assert.equal(teamBuffDeadline({team:'red',state:'ACTIVE'},casters),2000);assert.equal(teamBuffDeadline({team:'green',state:'ACTIVE'},casters),3000);
 assert.equal(teamBuffDeadline({team:'blue',state:'ACTIVE'},casters),0);assert.equal(teamBuffDeadline({team:'red',state:'IN_BASE'},casters),0);
 assert.equal(activePlayerEffect(actor({state:'IN_BASE'}),1000,0,2000),null);assert.equal(activePlayerEffect(actor({state:'RETURNING'}),1000,0,2000).id,'returning');
});
void test('follow/tactical/overview projection stays anchored and drawing never mutates actor truth',()=>{
  const p=actor(),before=structuredClone(p);
  for(const scale of [.25,1,1.5,2]){
    const view={x:500,y:300,width:1000,height:600,scale};
    assert.deepEqual(projectPlayerEffect(p,view,false),{x:500,y:300+40*scale+5});
    assert.deepEqual(projectPlayerEffect({...p,x:510,y:320},view,true),{x:500+10*scale,y:300+85*scale+5});
  }
  const ctx={save(){},restore(){},measureText:s=>({width:s.length*6}),beginPath(){},roundRect(){},fill(){},stroke(){},fillText(){}};
  const items=[{p,id:'shielded',age:0,tagRow:false},{p:{...p,entityId:'second'},id:'immune',age:0,tagRow:false}];
  const badges=drawPlayerEffects(ctx,items,{x:500,y:300,width:1000,height:600,scale:1},false,1.3,true);
  assert.equal(badges.length,1,'crowd does not stack conflicting badges');assert.equal(badges[0].alpha,1);assert.equal(badges[0].text,'SHIELDED');assert.deepEqual(p,before);
});
