import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {activateGarduSlot} from '../modules/world/relay-map/relay-slot.ts';
import {createGarduPrototype} from '../modules/world/relay-map/relay-layout.ts';
import {validateDocument} from '../lib/map-studio-model.js';
import {editableMapVersion,mapVersions} from './map-studio/map-versions.mjs';
import {orderArenaSelection} from '../modules/ui/map-selection-assets.ts';
import {getProgressionArenaId,getProgressionArenaIds} from '../lib/player-profile/arena-identity.ts';
import {getArenaUnlockRequirement,getArenaUnlockProgress} from '../lib/player-profile/arena-unlocks.ts';
import {getArenaStats,applyArenaMatchStat} from '../lib/player-profile/arena-stats.ts';
import {progressionRules} from '../lib/player-profile/progression-rules.ts';
const raw=JSON.parse(await readFile(new URL('../config/map-studio.json',import.meta.url),'utf8'));
await test('phase07 active map2 is Gardu, all older Pasar versions retained and exactly one active slot',()=>{
  const source={version:1,maps:[{...createGarduPrototype(),id:'studio-old-pasar',name:'My market',enabled:true,replaces:'pasar'}]},before=JSON.stringify(source),next=activateGarduSlot(source);
  assert.equal(JSON.stringify(source),before);assert.deepEqual(next.maps[0],{...validateDocument(source).maps[0],enabled:false});assert.equal(next.maps[1].replaces,'pasar');assert(next.maps[1].enabled);assert.deepEqual(activateGarduSlot(next),next);
  assert.equal(raw.maps.filter(m=>m.replaces==='pasar'&&m.enabled&&!m.archived&&!m.deleted).map(m=>m.id).join(),'studio-gardu-tengah');assert(raw.maps.find(m=>m.id==='studio-edit-pasar'));assert.equal(raw.maps.find(m=>m.id==='studio-edit-pasar').enabled,false);validateDocument(raw);
});
await test('inactive historical replacement never shadows exact editor selection or live Gardu slot',()=>{
  const original={...createGarduPrototype(),id:'studio-native',replaces:'pasar'},old={...original,id:'studio-old',name:'Old',enabled:false},live={...original,id:'studio-gardu-tengah',name:'Gardu Tengah',enabled:true};
  const doc={maps:[old,live]},versions=mapVersions(doc,[{id:'pasar',name:'Pasar',editable:true}],[original]);
  assert(!versions.find(v=>v.kind==='native').active);assert.equal(editableMapVersion(versions.find(v=>v.value===live.id),doc.maps).map.name,'Gardu Tengah');assert.equal(editableMapVersion(versions.find(v=>v.value===old.id),doc.maps).map.name,'Old');
  assert.throws(()=>validateDocument({version:1,maps:[{...old,enabled:true},live]}),/aktif/);
});
await test('Gardu occupies selection position2 without losing canonical aliases or touching other fields',()=>{
  const fields=[{id:'custom-easy',difficulty:'easy'},{id:'studio-gardu-tengah',difficulty:'normal'},{id:'kampung3d',difficulty:'easy'},{id:'studio-edit-kampung',difficulty:'easy'},{id:'taman',difficulty:'hard'}],before=JSON.stringify(fields);
  assert.deepEqual(orderArenaSelection(fields,getProgressionArenaId).slice(0,2).map(m=>m.id),['studio-edit-kampung','studio-gardu-tengah']);assert.equal(JSON.stringify(fields),before);
  assert.equal(getProgressionArenaId('studio-gardu-tengah'),'pasar');assert.equal(getProgressionArenaId('studio-edit-pasar'),'pasar');assert(getProgressionArenaIds('pasar').includes('studio-edit-pasar'));
});
await test('map2 still requires level2 AND one tier1 win; historical unlocks/stats survive with no migration',()=>{
  const requirement=getArenaUnlockRequirement('studio-gardu-tengah');assert.equal(requirement.minLevel,2);assert.deepEqual(requirement,getArenaUnlockRequirement('pasar'));
  const profile={menang:0,kda:{tagMusuh:0,rescueTeam:0},progression:{xp:0,unlockedArenaIds:['kampung'],arenaStats:{}}};
  assert(!getArenaUnlockProgress(profile,'studio-gardu-tengah').unlocked);
  const level2={...profile,progression:{...profile.progression,xp:progressionRules.playerLevelThresholds[1]}};assert(!getArenaUnlockProgress(level2,'studio-gardu-tengah').unlocked);
  const eligible={...level2,menang:1,progression:{...level2.progression,arenaStats:{kampung:{played:1,wins:1}}}};assert(getArenaUnlockProgress(eligible,'studio-gardu-tengah').unlocked);
  for(const id of ['pasar','studio-edit-pasar','studio-gardu-tengah'])assert(getArenaUnlockProgress({...profile,progression:{...profile.progression,unlockedArenaIds:[id]}},'studio-gardu-tengah').unlocked);
  const historical={...eligible,progression:{...eligible.progression,arenaStats:{pasar:{played:2,wins:1},'studio-edit-pasar':{played:3,wins:2}}}},before=JSON.stringify(historical);
  assert.deepEqual(getArenaStats(historical,'studio-gardu-tengah'),{played:5,wins:3});const next=applyArenaMatchStat(historical,'studio-gardu-tengah',true);assert.deepEqual(getArenaStats(next,'pasar'),{played:6,wins:4});assert.equal(JSON.stringify(historical),before);
});
