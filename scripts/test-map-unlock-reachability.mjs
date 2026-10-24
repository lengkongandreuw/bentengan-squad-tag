import test from 'node:test';
import assert from 'node:assert/strict';
import mapConfig from '../config/map-studio.json' with {type:'json'};
import {getArenaUnlockProgress,resolveArenaUnlocks} from '../lib/player-profile/arena-unlocks.ts';
import {getArenaStats} from '../lib/player-profile/arena-stats.ts';
import {getProgressionArenaId} from '../lib/player-profile/arena-identity.ts';
import {orderArenaSelection,arenaSelectionDifficulty} from '../modules/ui/map-selection-assets.ts';

const active=mapConfig.maps.filter(m=>m.enabled&&!m.archived&&!m.deleted);
const fresh=()=>({menang:0,kalah:0,kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:0,unlockedCharacters:['raja','kaka'],unlockedArenaIds:['kampung'],arenaStats:{},processedMatchIds:[]}});
void test('every current selectable arena can be unlocked by attainable progression, including Taman Kota1',()=>{
  const p=fresh();p.menang=100;p.kda.tagMusuh=100;p.kda.rescueTeam=100;p.progression.xp=100000;
  for(const map of active)p.progression.arenaStats[map.id]={played:100,wins:100};
  for(const map of active)assert(getArenaUnlockProgress(p,map.id).unlocked,`${map.name} cannot remain locked after all requirements are met`);
});
void test('map selection follows campaign progression rather than Studio append order',()=>{
  const fields=active.map(m=>({id:m.id,difficulty:m.replaces==='kampung'?'easy':m.replaces&&m.replaces!=='pasar'?'hard':'normal'}));
  const before=JSON.stringify(fields);
  assert.deepEqual(orderArenaSelection(fields,getProgressionArenaId).map(f=>f.id),[
    'studio-edit-kampung','studio-gardu-tengah','studio-copy-4572a880','studio-edit-taman',
    'studio-edit-kanal','studio-edit-kanal2','studio-kampung-2420b8cf',
  ]);
  assert.equal(JSON.stringify(fields),before);
});
void test('the campaign can be completed using only earlier, already-unlocked maps',()=>{
  let p=fresh();
  const ordered=orderArenaSelection(active.map(m=>({...m,difficulty:'normal'})),getProgressionArenaId);
  for(const map of ordered){
    const state=getArenaUnlockProgress(p,map.id);
    // XP and lifetime actions can be earned by replaying the currently open map.
    p={...p,menang:100,kda:{...p.kda,tagMusuh:100,rescueTeam:100},progression:{...p.progression,xp:100000}};
    assert(getArenaUnlockProgress(p,map.id).unlocked,`${map.name} needs an inaccessible later arena: ${JSON.stringify(state.checks)}`);
    p.progression.arenaStats[map.id]={played:100,wins:100};
  }
});
void test('new enabled standalone editor maps without campaign rules are playable, but unknown/inactive maps are not',()=>{
  const p=fresh(),before=structuredClone(p),fixture={...active[0],id:'studio-free-play-test',name:'Free play',enabled:true};
  delete fixture.replaces;
  mapConfig.maps.push(fixture);
  try{
    assert(getArenaUnlockProgress(p,fixture.id).unlocked);
    assert(resolveArenaUnlocks(p).newlyUnlockedArenaIds.includes(fixture.id));
    fixture.enabled=false;assert(!getArenaUnlockProgress(p,fixture.id).unlocked);
    fixture.enabled=true;fixture.archived=true;assert(!getArenaUnlockProgress(p,fixture.id).unlocked);
    delete fixture.archived;fixture.deleted=true;assert(!getArenaUnlockProgress(p,fixture.id).unlocked);
    assert(!getArenaUnlockProgress(p,'unknown-map').unlocked);
    assert(!getArenaUnlockProgress(p,'studio-gardu-tengah').unlocked,'configured campaign is still gated');
    assert.deepEqual(p,before);
  }finally{mapConfig.maps.pop();}
});
void test('display difficulty matches campaign stage without changing simulation or asset configuration',()=>{
  assert.equal(arenaSelectionDifficulty('kampung','normal'),'easy');
  assert.equal(arenaSelectionDifficulty('pasar','normal'),'normal');
  for(const id of ['studio-copy-4572a880','taman','kanal','kanal2','studio-kampung-2420b8cf'])assert.equal(arenaSelectionDifficulty(id,'normal'),'hard');
  assert.equal(arenaSelectionDifficulty('unconfigured','normal'),'normal');
});
void test('old alias wins count without mutating stored progression or revoking historical unlocks',()=>{
  const p=fresh();p.progression.xp=450;p.kda.tagMusuh=8;p.kda.rescueTeam=2;
  p.progression.arenaStats['studio-edit-pasar']={played:3,wins:3};
  const before=structuredClone(p);
  assert(getArenaUnlockProgress(p,'studio-copy-4572a880').unlocked);
  assert(getArenaUnlockProgress(p,'studio-edit-taman').unlocked);
  assert.deepEqual(getArenaStats(p,'studio-gardu-tengah'),{played:3,wins:3});
  assert.deepEqual(p,before);
  p.progression.unlockedArenaIds.push('studio-copy-4572a880');p.progression.xp=0;
  assert(getArenaUnlockProgress(p,'studio-copy-4572a880').unlocked);
  assert(!getArenaUnlockProgress(fresh(),'never-created-map').unlocked);
});
