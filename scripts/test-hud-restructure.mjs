import assert from 'node:assert/strict';
import {test} from 'node:test';
import {resolveFortStatus} from '../modules/ui/fort-status-view.ts';
import {contextualHintCandidates} from '../modules/ui/hint-policy.ts';
const actor=(team,extra={})=>({team,state:'ACTIVE',x:0,y:0,waterEnteredAt:0,...extra});
const input={actors:[],team:'blue',base:{x:0,y:0},radius:100,water:false,phase:'PLAYING',lockSeconds:0,captureProgress:0,captureSeconds:5,captured:false};
void test('contextual priority, relevance and learned memory exclude repeated beginner hints',()=>{
  const context={state:'ACTIVE',learned:[],nearObstacle:true,parkourReady:true,rescueNeeded:true,ultimateReady:true,nearEnemyFort:true,fortOpen:true,moving:true,tagOpportunity:true};
  assert.deepEqual(contextualHintCandidates(context),['rescue','capture','ultimate','parkour','tag','sprint']);
  assert.deepEqual(contextualHintCandidates({...context,learned:['rescue','capture','ultimate','parkour','tag','sprint']}),[]);
  assert.deepEqual(contextualHintCandidates({...context,state:'PRISONER'}),[]);
  assert.deepEqual(contextualHintCandidates({...context,state:'RETURNING'}),['returning']);
  assert(!contextualHintCandidates({...context,nearObstacle:false}).includes('parkour'),'free jump readiness alone is not an obstacle context');
  assert(!contextualHintCandidates({...context,fortOpen:false}).includes('capture'),'locked fort cannot invite capture');
});
void test('six fort cards reflect own-team authoritative facts without mutating actors',()=>{
  for(const [state,patch]of [['open',{}],['safe',{lockSeconds:20}],['guarded',{actors:[actor('blue')]}],['attacked',{actors:[actor('red')]}],['critical',{actors:[actor('red')],captureProgress:.8}],['captured',{captured:true,lockSeconds:20,actors:[actor('red')],captureProgress:.95}]]){
    const value={...input,...patch},before=structuredClone(value);assert.equal(resolveFortStatus(value).state,state);assert.deepEqual(value,before);
  }
  assert.equal(resolveFortStatus({...input,team:'red',actors:[actor('blue')]}).state,'attacked');
});
void test('fort status excludes flight/water/prisoners and never reports capture from progress alone',()=>{
  for(const extra of [{flight:{}},{state:'PRISONER'},{waterEnteredAt:1},{x:100}])assert.equal(resolveFortStatus({...input,water:true,actors:[actor('red',extra)]}).state,'open');
  assert.equal(resolveFortStatus({...input,captureProgress:1}).state,'open');
  assert.equal(resolveFortStatus({...input,actors:[actor('red'),actor('blue')],captureProgress:.9}).state,'critical');
  assert.equal(resolveFortStatus({...input,lockSeconds:1,actors:[actor('red')],captureProgress:.9}).state,'safe');
});
