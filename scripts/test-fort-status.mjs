import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createMatchProgress} from '../modules/game-core/match-format.ts';
import {fortLockRemaining,fortStatusText} from '../modules/game-core/fort-status.ts';

void test('capture lock takes precedence over every guard combination until the exact boundary',()=>{
  const progress=createMatchProgress('standard');
  const remaining=fortLockRemaining(progress,'PLAYING',7000,1000);
  assert.equal(remaining,39);
  for(const guards of [[],['Raja'],[undefined,'Ciici'],['Raja','Ciici']])
    assert.equal(fortStatusText(remaining,...guards),'Benteng terkunci 39 detik');
  assert.equal(fortLockRemaining(progress,'PLAYING',45999,1000),1);
  assert.equal(fortLockRemaining(progress,'PLAYING',46000,1000),0);
  assert.equal(fortLockRemaining(progress,'PLAYING',99999,1000),0);
});

void test('enemy occupation is not the timed capture lock; both teams and open status are represented',()=>{
  assert.equal(fortStatusText(0),'Benteng terbuka');
  assert.equal(fortStatusText(0,'Raja'),'Benteng Merah ditempati Raja');
  assert.equal(fortStatusText(0,undefined,'Ciici'),'Benteng Hijau ditempati Ciici');
  assert.equal(fortStatusText(0,'Raja','Ciici'),'Kedua benteng ditempati lawan');
});

void test('legacy, golden and non-playing phases have no countdown lock',()=>{
  for(const format of ['standard','tournament','legacy-bo3']){
    const progress=createMatchProgress(format);
    for(const phase of ['COUNTDOWN','ROUND_OVER','MATCH_OVER'])
      assert.equal(fortLockRemaining(progress,phase,1000,1000),0);
    if(format==='legacy-bo3')assert.equal(fortLockRemaining(progress,'PLAYING',1000,1000),0);
    progress.golden=true;
    assert.equal(fortLockRemaining(progress,'PLAYING',1000,1000),0);
  }
});
