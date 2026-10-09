import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
function fixture(saved=null,blocked=false){
  const dictionary={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/player-translations.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:dictionary.exports});
  const listeners=new Map(),data=new Map(saved?[['benteng.language.v1',saved]]:[]),document={documentElement:{lang:'en'}},localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{if(blocked)throw Error('blocked');data.set(k,v);}};
  const window={addEventListener:(n,cb)=>listeners.set(n,cb),removeEventListener:n=>listeners.delete(n),dispatchEvent:e=>listeners.get(e.type)?.(),localStorage};const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/language.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:name=>name==='react'?{useSyncExternalStore:(_,snapshot)=>snapshot()}:dictionary.exports,window,document,localStorage,Event:class{constructor(type){this.type=type;}}});
  return {api:exports,data,document,dictionary:dictionary.exports.playerTranslations};
}
void test('English defaults, Indonesian persists, switching updates document language without touching game data',()=>{
  const {api,data,document}=fixture();data.set('benteng-profile','untouched');assert.equal(api.getLanguage(),'en');assert.equal(api.t('CARA MAIN'),'HOW TO PLAY');assert.equal(api.setLanguage('id'),true);assert.equal(api.t('CARA MAIN'),'CARA MAIN');assert.equal(document.documentElement.lang,'id');assert.equal(data.get('benteng-profile'),'untouched');assert.equal(fixture(data.get(api.LANGUAGE_STORAGE_KEY)).api.getLanguage(),'id');api.setLanguage('en');assert.equal(api.t('CARA MAIN'),'HOW TO PLAY');
});
void test('templates preserve names, numbers, currency and punctuation; user content and non-string nodes pass through',()=>{
  const {api}=fixture();assert.equal(api.t('TITAH HALILINTAR · rekan di lapangan bergerak +43% selama 5.5 detik.'),'TITAH HALILINTAR · teammates on the field move +43% faster for 5.5 seconds.');assert.equal(api.t('Saldo 120 DOI'),'Balance: 120 DOI');assert.equal(api.t(' LEVEL BERIKUTNYA · '),' NEXT LEVEL · ');assert.equal(api.t('Nama pemain minimal 3 karakter.'),'Use at least 3 characters for your name.');for(const name of ['Raja','Ciici','Tim Merah','Pasar Senggol','TITAH HALILINTAR','DOI','My custom arena'])assert.equal(api.t(name),name);const node={props:{children:'anything'}};assert.equal(api.t(node),node);assert.equal(api.t(45),45);
});
void test('blocked storage keeps session language working and corrupt preferences safely default to English',()=>{const {api}=fixture('broken',true);assert.equal(api.getLanguage(),'en');assert.equal(api.setLanguage('id'),false);assert.equal(api.getLanguage(),'id');assert.equal(api.t('SIMPAN'),'SIMPAN');});
void test('all character flavor/passive descriptions and stock arena copy have English translations',()=>{
  const {dictionary}=fixture();for(const file of ['lib/characters.ts','lib/player-copy.ts']){const ast=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);function visit(n){if(ts.isPropertyAssignment(n)&&ts.isStringLiteral(n.initializer)&&(file.endsWith('player-copy.ts')||['copy','passiveCopy'].includes(n.name.getText(ast))))assert(dictionary[n.initializer.text],n.initializer.text);ts.forEachChild(n,visit);}visit(ast);}
});
