import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {execFileSync} from 'node:child_process';
function loadCharacters(source){const fragment=source.slice(source.indexOf('export const CHARACTERS:'),source.indexOf('export const CHARACTER_BY_ID'));const ids=[...fragment.matchAll(/(\w+)Data as CharacterDefinition/g)].map(m=>m[1].toLowerCase());return ids.map(id=>JSON.parse(fs.readFileSync(`config/characters/${id}.json`,'utf8')));}
function loadCopy(){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/player-copy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});return exports;}
test('all 14 characters have distinct concise flavor; every gameplay stat/ID remains unchanged',()=>{
  const before=loadCharacters(execFileSync('git',['show','HEAD:lib/characters.ts'],{encoding:'utf8'})),after=loadCharacters(fs.readFileSync('lib/characters.ts','utf8'));
  assert.equal(after.length,14);assert.equal(new Set(after.map(c=>c.copy)).size,14);
  for(const next of after){const previous=before.find(c=>c.id===next.id);const mechanics=c=>Object.fromEntries(Object.entries(c).filter(([key])=>!['copy','passiveCopy'].includes(key)));assert.deepEqual(mechanics(next),mechanics(previous));assert(next.copy.length<=105,next.id);assert(next.passiveCopy.length<=100,next.id);}
});
test('player-facing maps hide editor notes without changing original descriptions',()=>{
  const {playerArenaCopy,roleLabel,playerStateLabel}=loadCopy();
  const source='Latar dan footprint Kampung; upload terrain bersih.';
  assert(!/terrain|footprint|upload/i.test(playerArenaCopy('studio-qa',source,'kampung')));assert.equal(source,'Latar dan footprint Kampung; upload terrain bersih.');
  assert.equal(playerArenaCopy('studio-qa','Jalur sempit, banyak tikungan.'),'Jalur sempit, banyak tikungan.');
  assert.equal(roleLabel['All-rounder'],'Serbabisa');assert.equal(playerStateLabel('PRISONER'),'Ditahan');
});
test('rules still explain flight immunity, restrictions and duration gates without developer vocabulary',()=>{
  const source=fs.readFileSync('modules/ui/rules-overlay.tsx','utf8'),rules=source.slice(source.indexOf('<h2 id="rules-title">'),source.indexOf('Desktop: WASD gerak'));
  for(const word of ['collider','core loop','Rules test','takeoff','pickup'])assert(!rules.includes(word),word);
  for(const text of ['5 detik','6,5 detik','2 detik','1,5 detik','4 menit','2 ronde','lepas landas','mendarat','tidak','rescue','level upgrade'])assert(rules.includes(text),text);
});
