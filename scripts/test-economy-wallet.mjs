import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const cache = new Map();
const nativeRequire = createRequire(import.meta.url);
const load = (file) => {
  const absolute = path.resolve(file);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  if (absolute.endsWith('.json')) return JSON.parse(fs.readFileSync(absolute, 'utf8'));
  const compiledModule = { exports: {} };
  cache.set(absolute, compiledModule);
  // Vite's browser asset base is represented by a fixed test-only environment.
  const source = fs.readFileSync(absolute, 'utf8').replaceAll('import.meta.env', '({ BASE_URL: "/" })');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText.replaceAll('import.meta.env', '({ BASE_URL: "/" })');
  const requireLocal = (specifier) => {
    if (!specifier.startsWith('.')) return nativeRequire(specifier);
    const candidate = path.resolve(path.dirname(absolute), specifier);
    return load([candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.js`, path.join(candidate, 'index.ts')]
      .find((entry) => fs.existsSync(entry) && fs.statSync(entry).isFile()));
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename: absolute })(requireLocal, compiledModule, compiledModule.exports);
  return compiledModule.exports;
};
const economy = await load('lib/player-profile/economy.ts');
const { parsePlayerProfile } = await load('lib/player-profile/migrations.ts');
const service = await load('lib/player-profile/profile-service.ts');
const storage = await load('lib/player-profile/storage.ts');
const transaction = (id = 'match-1') => ({ id, type: 'match_reward', amount: 10, createdAt: '2026-10-04T00:00:00.000Z' });
const rules = load('lib/player-profile/economy-rules.ts');
const baseProfile = () => ({ schemaVersion: 1, id: 'economy-test', username: 'EconomyTest', firstJoin: '2026-10-05T00:00:00Z',
  menang: 0, kalah: 0, featuredCharacterId: 'raja', kda: { tagMusuh: 0, masukPenjara: 0, rescueTeam: 0 },
  progression: { marker: 'unchanged' }, economy: economy.createDefaultEconomy() });
const input = (id, amount=10, type='match_reward') => ({ transactionId: id, amount, type, createdAt: '2026-10-05T00:00:00Z' });
const freezeDeep = value => { if(value && typeof value==='object'){Object.values(value).forEach(freezeDeep);Object.freeze(value);}return value; };

void test('rules are centralized, immutable and reject malformed configuration without fallback',()=>{
  const config=JSON.parse(fs.readFileSync('config/economy.json','utf8'));
  assert.deepEqual(rules.economyRules,config);
  assert.equal(rules.economyRules.matchRewards.rescuePerMatchCap,6,'cap is tokens, not rescues');
  assert.ok(Object.isFrozen(rules.economyRules.matchRewards));
  for(const key of Object.keys(config.matchRewards))for(const bad of [-1,.1,NaN,Infinity,'10',undefined,Number.MAX_SAFE_INTEGER+1]) {
    assert.throws(()=>rules.parseEconomyRules({...config,matchRewards:{...config.matchRewards,[key]:bad}}),/Economy config/);
  }
  for(const bad of [0,-1,1001,.5,'50',undefined,Infinity])assert.throws(()=>rules.parseEconomyRules({...config,recentTransactionLimit:bad}));
  for(const patch of [{version:2},{currency:null},{currency:{id:'cash',label:'TOKEN'}},{currency:{id:'token',label:' '}},{matchRewards:[]}])assert.throws(()=>rules.parseEconomyRules({...config,...patch}));
  assert.throws(()=>rules.parseEconomyRules(null));
  assert.equal(rules.parseEconomyRules({...config,recentTransactionLimit:1}).recentTransactionLimit,1);
});

void test('credit and spend are atomic immutable profile operations with accurate totals',()=>{
  const original=freezeDeep(baseProfile());
  const credited=economy.creditTokens(original,{...input('credit',100),referenceId:'match-one'});
  assert.equal(credited.applied,true);
  assert.equal(economy.getTokenBalance(credited.profile),100);
  assert.equal(credited.profile.economy.lifetimeTokenEarned,100);
  assert.equal(credited.profile.progression,original.progression);
  assert.equal(economy.getTokenBalance(original),0);
  const spent=economy.spendTokens(freezeDeep(credited.profile),input('spend',40,'ultimate_upgrade'));
  assert.equal(spent.applied,true);assert.equal(spent.profile.economy.tokenBalance,60);
  assert.equal(spent.profile.economy.lifetimeTokenSpent,40);
  assert.equal(spent.profile.economy.lifetimeTokenEarned,100);
  assert.equal(spent.transaction.amount,-40);
  assert.notEqual(spent.transaction,spent.profile.economy.recentTransactions.at(-1));
  const zero=economy.spendTokens(spent.profile,input('spend-rest',60,'ultimate_upgrade'));
  assert.equal(zero.profile.economy.tokenBalance,0);
  assert.equal(zero.profile.economy.lifetimeTokenSpent,100);
});

void test('failure results retain input identity: duplicates, insufficient balance and invalid requests',()=>{
  const p=economy.creditTokens(baseProfile(),input('once',10)).profile;
  const duplicate=economy.creditTokens(p,input('once',200));
  assert.equal(duplicate.reason,'duplicate');assert.equal(duplicate.profile,p);
  assert.equal(economy.spendTokens(p,input('once',20,'ultimate_upgrade')).reason,'duplicate','same ID also protects opposite operation');
  const failed=economy.spendTokens(p,input('expensive',11,'ultimate_upgrade'));
  assert.equal(failed.reason,'insufficient_balance');assert.equal(failed.profile,p);
  for(const patch of [{amount:0},{amount:-1},{amount:.5},{amount:Infinity},{amount:Number.MAX_SAFE_INTEGER+1},{type:'ultimate_upgrade'},
    {transactionId:' '},{createdAt:'bad'},{createdAt:null},{referenceId:''}]) {
    const invalid=economy.creditTokens(p,{...input('bad'),...patch});
    assert.equal(invalid.reason,'invalid');assert.equal(invalid.profile,p);
  }
  assert.equal(economy.creditTokens(p,null).reason,'invalid');
  assert.equal(economy.spendTokens(p,input('bad',1,'match_reward')).reason,'invalid');
});

void test('unsafe counter overflow, invalid and missing legacy wallet never resets or grants',()=>{
  for(const field of ['tokenBalance','lifetimeTokenEarned']) {
    const p=baseProfile();p.economy[field]=Number.MAX_SAFE_INTEGER;
    assert.equal(economy.creditTokens(p,input('overflow')).reason,'invalid');
  }
  const p=baseProfile();p.economy.tokenBalance=100;p.economy.lifetimeTokenSpent=Number.MAX_SAFE_INTEGER;
  assert.equal(economy.spendTokens(p,input('overflow',1,'ultimate_upgrade')).reason,'invalid');
  const {economy:_omitted,...legacy}=baseProfile();
  assert.equal(economy.getTokenBalance(legacy),0);assert.equal(economy.creditTokens(legacy,input('legacy')).reason,'invalid');
  const broken={...baseProfile(),economy:{tokenBalance:999}};
  assert.equal(economy.creditTokens(broken,input('broken')).reason,'invalid');
});

void test('retained ledger deduplicates across parser roundtrip, evicts only history, never totals',()=>{
  let p=baseProfile();
  for(let i=0;i<60;i++)p=economy.creditTokens(p,input(`tx-${i}`,1)).profile;
  assert.equal(p.economy.recentTransactions.length,rules.economyRules.recentTransactionLimit);
  assert.equal(p.economy.recentTransactions[0].id,'tx-10');
  assert.equal(p.economy.tokenBalance,60);assert.equal(p.economy.lifetimeTokenEarned,60);
  const restored={...p,economy:economy.parsePlayerEconomy(JSON.parse(JSON.stringify(p.economy)))};
  assert.equal(economy.creditTokens(restored,input('tx-59')).reason,'duplicate');
  assert.equal(economy.creditTokens(restored,input('tx-0')).applied,true,'bounded ledger is not unlimited historical dedup');
  const dated=economy.creditTokens(baseProfile(),{transactionId:'date',amount:1,type:'match_reward'});
  assert.ok(Number.isFinite(Date.parse(dated.transaction.createdAt)));
});

void test('default wallets and parsed ledgers are independent', () => {
  const first = economy.createDefaultEconomy();
  const second = economy.createDefaultEconomy();
  assert.deepEqual(first, { version: 1, tokenBalance: 0, lifetimeTokenEarned: 0, lifetimeTokenSpent: 0, recentTransactions: [] });
  first.recentTransactions.push(transaction());
  assert.equal(second.recentTransactions.length, 0);
  const parsed = economy.parsePlayerEconomy(first);
  parsed.recentTransactions[0].amount = 20;
  assert.equal(first.recentTransactions[0].amount, 10);
});

void test('strict counters, transaction fields and signed safe integers', () => {
  for (const field of ['tokenBalance', 'lifetimeTokenEarned', 'lifetimeTokenSpent']) {
    for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '10']) {
      assert.equal(economy.parsePlayerEconomy({ ...economy.createDefaultEconomy(), [field]: value }), null);
    }
  }
  for (const patch of [{ id: ' ' }, { type: 'other' }, { amount: 0 }, { amount: 1.5 }, { amount: -10 },
    { amount: Number.MAX_SAFE_INTEGER + 1 }, { createdAt: 'bad-date' }, { referenceId: '' }]) {
    assert.equal(economy.parseEconomyTransaction({ ...transaction(), ...patch }), null);
  }
  assert.ok(economy.parseEconomyTransaction({ ...transaction(), type: 'ultimate_upgrade', amount: -120, referenceId: 'raja:1' }));
  assert.equal(economy.parseEconomyTransaction({ ...transaction(), type: 'ultimate_upgrade' }), null);
  assert.equal(economy.parsePlayerEconomy({ ...economy.createDefaultEconomy(), version: 2 }), null);
  assert.equal(economy.parsePlayerEconomy(undefined), null);
});

void test('ledger retains only latest 50 entries without changing totals/input', () => {
  const input = { ...economy.createDefaultEconomy(), tokenBalance: 600, lifetimeTokenEarned: 600,
    recentTransactions: Array.from({ length: 60 }, (_, index) => transaction(`match-${index}`)) };
  const parsed = economy.parsePlayerEconomy(input);
  assert.equal(parsed.recentTransactions.length, 50);
  assert.equal(parsed.recentTransactions[0].id, 'match-10');
  assert.equal(parsed.tokenBalance, 600);
  assert.equal(input.recentTransactions.length, 60);
  input.recentTransactions[0].amount = 0;
  assert.equal(economy.parsePlayerEconomy(input), null);
});

void test('profile storage roundtrip, legacy compatibility and invalid optional economy', () => {
  const previousWindow = globalThis.window;
  const entries = new Map();
  let writes = 0;
  globalThis.window = { localStorage: {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => { writes++; entries.set(key, value); },
  }, dispatchEvent: () => true };
  try {
    const profile = service.createPlayerProfile('WalletTest');
    assert.deepEqual(profile.economy, economy.createDefaultEconomy());
    assert.equal(entries.size, 1, 'reuse existing profile storage key');
    const wallet = { ...profile.economy, tokenBalance: 10, lifetimeTokenEarned: 10, recentTransactions: [transaction()] };
    assert.equal(storage.savePlayerProfile({ ...profile, economy: wallet }), true);
    const beforeRead = writes;
    assert.deepEqual(storage.loadPlayerProfile().economy, wallet);
    assert.equal(writes, beforeRead, 'valid economy read does not migrate/write');
    assert.deepEqual(service.setFeaturedCharacter('kaka').economy, wallet);
    const { economy: _omitted, ...legacy } = profile;
    assert.equal(parsePlayerProfile(legacy).economy, undefined);
    assert.deepEqual(parsePlayerProfile(legacy).progression, profile.progression);
    storage.savePlayerProfile(legacy);
    const legacyWrites = writes;
    assert.deepEqual(storage.loadPlayerProfile().economy, economy.createDefaultEconomy());
    assert.equal(writes, legacyWrites+1, 'module05 saves missing wallet once');
    storage.loadPlayerProfile();assert.equal(writes,legacyWrites+1,'migration does not replay');
    for (const invalid of [null, { ...wallet, tokenBalance: -1 }, { ...wallet, recentTransactions: [null] }]) {
      const parsed = parsePlayerProfile({ ...profile, economy: invalid });
      assert.equal(parsed.id, profile.id);
      assert.deepEqual(parsed.progression, profile.progression);
      assert.equal(parsed.economy, undefined);
    }
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

const rewards = load('lib/player-profile/match-token-rewards.ts');
const matchEngine = load('lib/player-profile/match-progression.ts');
const migration = load('lib/player-profile/economy-migration.ts');
const upgrades = load('lib/player-profile/ultimate-upgrades.ts');
const purchase = load('lib/player-profile/ultimate-purchase.ts');
const effective = load('lib/player-profile/ultimate-effective-stats.ts');
const progression = load('lib/player-profile/progression.ts');
const matchProfile = () => ({...baseProfile(),progression:progression.createDefaultProgression()});
const summary = (patch={}) => ({matchId:'reward-1',arenaId:'kampung',completed:true,won:true,tags:9,rescues:4,...patch});

void test('module07 sequential atomic purchases, exact balance, ledger and unchanged unrelated state',()=>{
  for(const id of ['raja','kaka']) {
    let p=economy.creditTokens(matchProfile(),input(`seed-${id}`,920)).profile;
    for(const level of [1,2,3]) {
      const before=freezeDeep(p),r=purchase.purchaseUltimateUpgrade(p,id,`buy-${id}-${level}`,level-1);
      assert.equal(r.applied,true);assert.equal(r.currentLevel,level);assert.equal(r.previousLevel,level-1);
      assert.equal(r.previousBalance-r.currentBalance,upgrades.getUltimateUpgradeConfig(id,level).cost);
      assert.equal(r.profile.progression,before.progression);assert.equal(p.ultimateUpgrades?.levels[id]??0,level-1);
      assert.equal(r.profile.economy.recentTransactions.at(-1).referenceId,`${id}:${level}`);
      assert.equal(r.profile.economy.recentTransactions.at(-1).amount,-upgrades.getUltimateUpgradeConfig(id,level).cost);
      assert.equal(purchase.purchaseUltimateUpgrade(r.profile,id,`buy-${id}-${level}`).reason,'duplicate');
      p=r.profile;
    }
    assert.equal(p.economy.tokenBalance,0);assert.equal(p.economy.lifetimeTokenSpent,920);
    assert.equal(purchase.purchaseUltimateUpgrade(p,id,'fourth').reason,'max_level');
    assert.equal(purchase.getNextUltimateUpgrade(p,id),null);
  }
});

void test('module07 explicit insufficient/invalid/stale/unsupported/locked failures never debit',()=>{
  const empty=freezeDeep(matchProfile());assert.equal(purchase.canPurchaseUltimateUpgrade(empty,'raja'),false);
  const funded=economy.creditTokens(matchProfile(),input('seed',1000)).profile;
  assert.equal(purchase.canPurchaseUltimateUpgrade(funded,'raja'),true);
  for(const [p,id,tx,expected,reason] of [[empty,'raja','low',0,'insufficient_balance'],
    [funded,'raja','stale',1,'level_mismatch'],[funded,'raja',' ',0,'invalid'],[funded,'raja','bad',-1,'invalid'],
    [funded,'bebe','unsupported',0,'unsupported_character'],[funded,'__proto__','unsupported',0,'unsupported_character'],
    [{...funded,ultimateUpgrades:{version:1,levels:{raja:99}}},'raja','badstate',0,'invalid']]) {
    const r=purchase.purchaseUltimateUpgrade(p,id,tx,expected);assert.equal(r.reason,reason);assert.equal(r.profile,p);
    assert.equal(r.currentBalance,r.previousBalance);assert.equal(r.currentLevel,r.previousLevel);
  }
  assert.equal(purchase.getUltimateUpgradeLevel(funded,'__proto__'),0);
  const gate=load('lib/player-profile/character-unlocks.ts'),originalGate=gate.isCharacterUnlocked;
  try {gate.isCharacterUnlocked=()=>false;
    assert.equal(purchase.purchaseUltimateUpgrade(funded,'raja','locked').reason,'character_locked');
    assert.equal(purchase.canPurchaseUltimateUpgrade(funded,'raja'),false);
  } finally {gate.isCharacterUnlocked=originalGate;}
});

void test('module07 persistence writes once, reloads authoritative levels and reports failed write',()=>{
  const previousWindow=globalThis.window,entries=new Map();let writes=0,events=0,blocked=false;
  globalThis.window={localStorage:{getItem:key=>entries.get(key)??null,setItem:(key,value)=>{if(blocked)throw new Error('blocked');writes++;entries.set(key,value);}},dispatchEvent:()=>{events++;return true;}};
  try {
    const created=service.createPlayerProfile('PurchaseTest');storage.savePlayerProfile(economy.creditTokens(created,input('seed',1000)).profile);
    const before=writes,eventsBefore=events;
    const r=service.purchasePlayerUltimateUpgrade('raja','purchase-1',0);
    assert.equal(r.applied,true);assert.equal(writes,before+1);assert.equal(events,eventsBefore+1);
    assert.equal(storage.loadPlayerProfile().ultimateUpgrades.levels.raja,1);
    assert.equal(service.purchasePlayerUltimateUpgrade('raja','purchase-1',0).reason,'duplicate');
    assert.equal(service.purchasePlayerUltimateUpgrade('raja','stale-quote',0).reason,'level_mismatch');
    assert.equal(writes,before+1);
    blocked=true;const failed=service.purchasePlayerUltimateUpgrade('raja','purchase-2',1);
    assert.equal(failed.reason,'storage_failed');assert.equal(failed.applied,false);assert.equal(events,eventsBefore+1);
    assert.equal(failed.currentLevel,1);assert.equal(failed.currentBalance,880);
    assert.equal(storage.loadPlayerProfile().ultimateUpgrades.levels.raja,1);
    blocked=false;assert.equal(service.purchasePlayerUltimateUpgrade('raja','purchase-2',1).applied,true);
  } finally {if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
});

void test('module08 all catalog tiers resolve, invalid/missing state is base and snapshots never leak to bots',()=>{
  for(const id of ['raja','kaka'])for(const level of [0,1,2,3]) {
    const p={...matchProfile(),ultimateUpgrades:{version:1,levels:{[id]:level}}};
    const stats=effective.getEffectiveUltimateStats(freezeDeep(p),id),config=upgrades.getUltimateUpgradeConfig(id,level);
    assert.equal(stats.level,level);assert.equal(stats.castMs,config.castMs);assert.equal(stats.durationMs,config.durationMs);
    assert.equal(stats.rechargeSeconds,config.rechargeSeconds);assert.ok(Object.isFrozen(stats));
    assert.equal(effective.snapshotUltimateStats(p,id,false).level,0);
  }
  for(const state of [undefined,null,{version:99,levels:{raja:3}},{version:1,levels:{raja:99}}, {version:1,levels:{raja:-1}}]) {
    assert.equal(effective.getEffectiveUltimateStats({...matchProfile(),ultimateUpgrades:state},'raja').level,0);
  }
  assert.equal(effective.getEffectiveUltimateStats(matchProfile(),'bebe'),null);
  const p={...matchProfile(),ultimateUpgrades:{version:1,levels:{raja:2}}},snapshot=effective.snapshotUltimateStats(p,'raja');
  p.ultimateUpgrades.levels.raja=3;assert.equal(snapshot.level,2);assert.equal(snapshot.speedMultiplier,1.46);
});

void test('module09 runtime smoke executes actual ultimate block: base/upgraded cast, recharge, effects, scope, audio once',()=>{
  const source=fs.readFileSync('app/prototype.tsx','utf8');
  const updateStart=source.indexOf('const update = (dt: number, now: number) =>');
  const start=source.indexOf('// Numeric match snapshot feeds authority',updateStart);
  const end=source.indexOf('const playerComboMultiplier',start);
  assert.ok(updateStart>0&&start>updateStart&&end>start);
  const helperStart=source.indexOf('const ultimateCastMsFor =');
  const helperEnd=source.indexOf('setMatchProgressionResult(null)',helperStart);
  const helper=source.slice(helperStart,helperEnd);
  const setup=`
    const {stepUltimate,ultimateCasting:coreUltimateCasting,ultimateSpeed}=core;
    const presentGameEvents=(events,consume)=>events.forEach(consume);
    const me=players[0],config=null,keys={current:new Set()},field={id:'kampung'},network=null;
    const ULTIMATE_CHARACTER_IDS=new Set(['raja','kaka']);
    const RAJA_ULTIMATE_RECHARGE_SECONDS=45,RAJA_ULTIMATE_CAST_MS=3200,KAKA_ULTIMATE_CAST_MS=3600,
      RAJA_ULTIMATE_BUFF_MS=5000,KAKA_ULTIMATE_SHIELD_MS=5000,RAJA_ULTIMATE_SPEED_MULTIPLIER=1.4;
    let ultimateMeter=0,ultimateImpactAt=0,ultimateImpactApplied=false,ultimateBuffUntil=0,ultimateShieldUntil=0,
      boostBurstUntil=0,bannerTimeout=0;
    const audio=[],messages=[];
    const gameplayAudio={play:(event)=>audio.push(event)},window={clearTimeout:()=>{},setTimeout:()=>0};
    const flightBusy=p=>!!p.flight,clamp=(v,min,max)=>Math.max(min,Math.min(max,v)),clearMouse=()=>{},
      setUltimateBannerVisible=()=>{},burst=()=>{},beep=()=>{},log=text=>messages.push(text);
    ${helper}
    return {
      castFor:ultimateCastMsFor,
      step(dt,now,press=false){
        if(press)keys.current.add('capslock');
        const input={ultimate:keys.current.has('capslock')};
        ${source.slice(start,end)}
        return {meter:ultimateMeter,casting:ultimateCasting,buffUntil:ultimateBuffUntil,shieldUntil:ultimateShieldUntil,
          multipliers:players.map(rajaUltimateMultiplier),audio:[...audio],messages:[...messages]};
      }
    };
  `;
  const output=ts.transpileModule(setup,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const initializeBlock=vm.runInThisContext(`(function(players,playerUltimateStats,core){${output}\n})`);
  const initialize=(players,stats)=>initializeBlock(players,stats,load('modules/gameplay/ultimate.ts'));
  for(const id of ['raja','kaka'])for(const level of [0,3]) {
    const p={...matchProfile(),ultimateUpgrades:{version:1,levels:{[id]:level}}};
    const stats=effective.snapshotUltimateStats(p,id);
    const players=[{characterId:id,controlled:true,team:'blue',state:'ACTIVE',x:0,y:0,vx:0,vy:0,parkourUntil:0,actionUntil:0},
      {characterId:id,controlled:false,team:'blue',state:'ACTIVE'},
      {characterId:id,controlled:false,team:'red',state:'ACTIVE'},
      {characterId:id,controlled:false,team:'blue',state:'RETURNING'}];
    const run=initialize(players,stats),me=players[0];
    assert.equal(run.castFor(players[1]),id==='raja'?3200:3600,'bot still has base cast');
    assert.equal(run.step(stats.rechargeSeconds,1000).meter,100);
    const casting=run.step(0,1000,true);assert.equal(casting.casting,true);
    assert.equal(me.actionUntil,1000+stats.castMs);assert.deepEqual(casting.audio,['ultimate']);
    const before=run.step(0,me.actionUntil-1);assert.equal(before.buffUntil,0);assert.equal(before.shieldUntil,0);
    const applied=run.step(0,me.actionUntil);
    if(id==='raja') {
      assert.equal(applied.buffUntil,me.actionUntil+stats.durationMs);
      assert.deepEqual(applied.multipliers,[stats.speedMultiplier,stats.speedMultiplier,1,1]);
    } else {
      assert.equal(applied.shieldUntil,me.actionUntil+stats.durationMs);
      assert.equal(players[1].ultimateShieldUntil,applied.shieldUntil);
      assert.equal(players[3].ultimateShieldUntil,applied.shieldUntil,'existing all-team shield scope stays');
      assert.equal(players[2].ultimateShieldUntil,undefined);
    }
    const repeated=run.step(0,me.actionUntil+1);assert.equal(repeated.messages.length,applied.messages.length);
    assert.equal(repeated.audio.length,1);
    assert.deepEqual(run.step(0,me.actionUntil+stats.durationMs).multipliers,[1,1,1,1]);
    p.ultimateUpgrades.levels[id]=level===0?3:0;
    assert.equal(run.castFor(me),stats.castMs,'external profile edit cannot change captured match stats');
  }
  assert.ok(source.includes('RAJA_ULTIMATE_TAG_BONUS = 20'));
  assert.ok(source.includes('RAJA_ULTIMATE_RESCUE_BONUS = 30'));
  assert.ok(source.includes('now - (p.actionUntil - actorUltimateCastMs)'));
  assert.ok(source.includes('actorUltimateCastMs / KAKA_ULTIMATE_FRAME_COUNT'));
  const dependencies=source.slice(source.indexOf('cancelAnimationFrame(raf)'),source.indexOf('const missionCount = useMemo'));
  assert.equal(dependencies.includes('playerProfile,'),false,'profile changes do not restart the match effect');
});

void test('module09 custom ultimate sprites keep all frames within upgraded cast without altering source FPS',()=>{
  const model=load('lib/sprite-studio-model.js');
  const frames=Array.from({length:9},(_,i)=>({x:i*10,y:0,width:10,height:10}));
  const clip={asset:'sprite-studio/raja/test.webp',width:90,height:10,frames,fps:10,loop:false,scale:1,x:0,y:0,pivotX:.5,pivotY:1,mirror:false};
  const source=fs.readFileSync('lib/sprite-studio.ts','utf8').replace(/^import .*;\r?$/gm,'');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={},context={exports,settings:{characters:{raja:{ultimate:clip}}},runtime:{version:1,assets:{}},
    ...load('lib/studio-runtime-resource.ts'),...model,
    publicAsset:asset=>asset,Image:class {complete=true;naturalWidth=90;}};
  vm.runInNewContext(output,context);
  exports.studioImages('raja');const resolve=exports.createStudioResolver();
  const state={vx:0,vy:0,now:0,state:'ACTIVE',result:null,ready:false,action:'ultimate',parkour:false};
  for(let i=0;i<9;i++) {
    const result=resolve('raja','controlled',{...state,now:i*10,ultimateProgress:i/9+.001});
    assert.equal(result.frame.x,i*10);assert.equal(result.clip.fps,10);
  }
  assert.equal(resolve('raja','controlled',{...state,now:100,ultimateProgress:.999}).frame.x,80);
  assert.equal(clip.frames.length,9);assert.equal(clip.fps,10);
});

void test('module04 exact token formula, cap boundaries, huge counts and incomplete',()=>{
  assert.deepEqual(rewards.calculateMatchTokenBreakdown({completed:true,result:'win',tags:5,rescues:3}),{match:10,victory:5,tag:5,rescue:6});
  assert.deepEqual(rewards.calculateMatchTokenBreakdown({completed:true,result:'loss',tags:4,rescues:2}),{match:10,victory:0,tag:4,rescue:4});
  assert.deepEqual(rewards.calculateMatchTokenBreakdown({completed:true,result:'loss',tags:Number.MAX_SAFE_INTEGER,rescues:Number.MAX_SAFE_INTEGER}),{match:10,victory:0,tag:5,rescue:6});
  assert.deepEqual(rewards.calculateMatchTokenBreakdown({completed:false,result:'win',tags:5,rescues:3}),rewards.zeroTokenBreakdown());
  assert.throws(()=>rewards.calculateMatchTokenBreakdown({completed:true,result:'win',tags:-1,rescues:0}));
});

void test('module04 same result atomically contains tokens/XP/stats/unlocks; duplicate and incomplete no-op',()=>{
  const p=freezeDeep(matchProfile()),r=matchEngine.applyMatchProgression(p,summary());
  assert.equal(r.applied,true);assert.equal(r.tokenEarned,26);assert.equal(r.previousTokenBalance,0);assert.equal(r.currentTokenBalance,26);
  assert.equal(r.xpEarned,284);assert.equal(r.profile.menang,1);
  assert.equal(r.profile.economy.recentTransactions[0].id,'match:reward-1');
  assert.equal(r.profile.economy.recentTransactions[0].referenceId,'reward-1');
  assert.equal(p.economy.tokenBalance,0);
  const duplicate=matchEngine.applyMatchProgression(r.profile,summary());
  assert.equal(duplicate.reason,'duplicate');assert.equal(duplicate.tokenEarned,0);assert.equal(duplicate.profile,r.profile);
  assert.deepEqual(duplicate.tokenBreakdown,rewards.zeroTokenBreakdown());
  const incomplete=matchEngine.applyMatchProgression(p,summary({completed:false}));
  assert.equal(incomplete.profile,p);assert.equal(incomplete.tokenEarned,0);
  assert.equal(matchEngine.applyMatchProgression(p,summary({won:false,tags:0,rescues:0})).tokenEarned,10);
  const overflowing=matchProfile();overflowing.economy.tokenBalance=Number.MAX_SAFE_INTEGER;
  assert.throws(()=>matchEngine.applyMatchProgression(overflowing,summary()),/Reward DOI gagal/);
  assert.equal(overflowing.progression.xp,0);assert.equal(overflowing.menang,0);
});

void test('module05 legacy zero wallet, per-field recovery, malformed ledger and no retroactive grants',()=>{
  const p=freezeDeep({...matchProfile(),menang:100,kalah:20});
  const migrated=migration.migratePlayerEconomy(p,null);
  assert.equal(migrated.migrated,true);assert.deepEqual(migrated.profile.economy,economy.createDefaultEconomy());
  assert.equal(migrated.profile.progression,p.progression);assert.equal(migrated.profile.menang,100);
  assert.equal(migration.migratePlayerEconomy(migrated.profile).migrated,false);
  const recovered=migration.migratePlayerEconomy(p,{version:1,tokenBalance:-1,lifetimeTokenEarned:40,lifetimeTokenSpent:7,
    recentTransactions:[transaction('keep'),null,{...transaction('invalid'),amount:0},transaction('keep')]}).profile;
  assert.equal(recovered.economy.tokenBalance,0);assert.equal(recovered.economy.lifetimeTokenEarned,40);assert.equal(recovered.economy.lifetimeTokenSpent,7);
  assert.equal(recovered.economy.recentTransactions.length,1);
  assert.equal(recovered.progression,p.progression);
});

void test('module04/05 storage persists rewards once, reload dedup and blocked migration keeps source data',()=>{
  const previousWindow=globalThis.window,entries=new Map();let writes=0,block=false;
  globalThis.window={localStorage:{getItem:key=>entries.get(key)??null,setItem:(key,value)=>{if(block)throw new Error('blocked');writes++;entries.set(key,value);}},dispatchEvent:()=>true};
  try {
    const p=service.createPlayerProfile('TokenStorage');const before=writes;
    const r=service.recordMatchProgression(summary());assert.equal(r.tokenEarned,26);assert.equal(writes,before+1);
    assert.equal(storage.loadPlayerProfile().economy.tokenBalance,26);
    assert.equal(service.recordMatchProgression(summary()).reason,'duplicate');assert.equal(writes,before+1);
    const {economy:_omitted,...legacy}=p;storage.savePlayerProfile(legacy);
    const rawBefore=[...entries.values()][0];block=true;
    assert.deepEqual(storage.loadPlayerProfile().economy,economy.createDefaultEconomy());
    assert.equal([...entries.values()][0],rawBefore,'failed migration does not erase old storage');
    block=false;const start=writes;storage.loadPlayerProfile();storage.loadPlayerProfile();assert.equal(writes,start+1);
    block=true;assert.throws(()=>service.recordMatchProgression(summary({matchId:'blocked-new'})),/belum tersimpan/);
    assert.equal(storage.loadPlayerProfile().economy.tokenBalance,0,'failed reward not durable');
  } finally {if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
});

void test('module06 exact bases/costs, unsupported characters, independent defaults and state roundtrip',()=>{
  assert.deepEqual(upgrades.getUltimateUpgradeConfig('raja'),{level:0,cost:0,rechargeSeconds:45,castMs:3200,durationMs:5000,speedMultiplier:1.4});
  assert.deepEqual(upgrades.getUltimateUpgradeConfig('kaka'),{level:0,cost:0,rechargeSeconds:45,castMs:3600,durationMs:5000});
  for(const id of ['raja','kaka']) {
    assert.deepEqual([1,2,3].map(l=>upgrades.getUltimateUpgradeConfig(id,l).cost),[120,280,520]);
    assert.equal([1,2,3].reduce((n,l)=>n+upgrades.getUltimateUpgradeConfig(id,l).cost,0),920);
  }
  for(const id of ['bebe','ciici','unknown','__proto__'])assert.equal(upgrades.getUltimateUpgradeConfig(id),null);
  const state=upgrades.createDefaultUltimateUpgrades(),second=upgrades.createDefaultUltimateUpgrades();state.levels.raja=2;assert.equal(second.levels.raja,0);
  const p=matchProfile();p.ultimateUpgrades=state;
  assert.equal(parsePlayerProfile(p).ultimateUpgrades.levels.raja,2);
  assert.equal(upgrades.getPlayerUltimateUpgrade(p,'raja').level,2);
  assert.equal(upgrades.getPlayerUltimateUpgrade({...p,ultimateUpgrades:{version:1,levels:{}}},'kaka').level,0);
  assert.equal(upgrades.getPlayerUltimateUpgrade(p,'bebe'),null);
  assert.equal(upgrades.parseUltimateUpgradeState({version:1,levels:{raja:4}}),null);
});

void test('module06 invalid catalog fails clearly and base values match untouched runtime constants',()=>{
  const config=JSON.parse(fs.readFileSync('config/ultimate-upgrades.json','utf8'));
  for(const change of [c=>c.characters.push(c.characters[0]),c=>c.characters[0].characterId='invalid',
    c=>c.characters[0].levels[0].level=1,c=>c.characters[0].levels[0].cost=1,c=>c.characters[0].levels[1].level=2,
    c=>c.characters[0].levels[1].cost=-1,c=>c.characters[0].levels[1].rechargeSeconds=Infinity,
    c=>c.characters[0].levels[1].castMs=0,c=>c.characters[0].levels[1].durationMs=.5,
    c=>c.characters[0].levels[1].speedMultiplier=.9,c=>c.characters[1].levels[1].shieldHP=10]) {
    const candidate=structuredClone(config);change(candidate);assert.throws(()=>upgrades.parseUltimateUpgradeCatalog(candidate),/Ultimate catalog/);
  }
  const runtime=fs.readFileSync('app/prototype.tsx','utf8');
  for(const pattern of ['RAJA_ULTIMATE_RECHARGE_SECONDS = 45','RAJA_ULTIMATE_CAST_MS = 3200','RAJA_ULTIMATE_BUFF_MS = 5000','RAJA_ULTIMATE_SPEED_MULTIPLIER = 1.4','KAKA_ULTIMATE_CAST_MS = 3600','KAKA_ULTIMATE_SHIELD_MS = 5000'])assert.ok(runtime.includes(pattern));
  assert.equal(runtime.includes('getPlayerUltimateUpgrade'),false,'no runtime modifiers in module06');
});

void test('transaction operations never access browser storage or emit profile events',()=>{
  const previousWindow=globalThis.window;
  globalThis.window={localStorage:{getItem:()=>assert.fail('unexpected read'),setItem:()=>assert.fail('unexpected write')},dispatchEvent:()=>assert.fail('unexpected event')};
  try {
    const p=economy.creditTokens(baseProfile(),input('pure',20)).profile;
    assert.equal(economy.spendTokens(p,input('pure-spend',10,'ultimate_upgrade')).applied,true);
    assert.equal(economy.getTokenBalance(p),20);
  } finally {
    if(previousWindow===undefined)delete globalThis.window;
    else globalThis.window=previousWindow;
  }
});

void test('module10–12 rendered UI uses wallet/catalog/result values and omits unsupported upgrades',()=>{
  assert.equal(rules.economyRules.currency.id,'token','DOI is a display rename, not a second wallet');
  assert.equal(rules.economyRules.currency.label,'DOI');
  const React=nativeRequire('react'),{renderToStaticMarkup}=nativeRequire('react-dom/server');
  const {TokenWallet}=load('components/token-wallet.tsx');
  const {UltimateUpgradeDetails,UltimateUpgradePanel}=load('components/ultimate-upgrade-panel.tsx');
  const {MatchTokenSummary}=load('components/match-token-summary.tsx');
  const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
  assert.match(render(TokenWallet,{profile:matchProfile()}),/Saldo 0 DOI/);
  assert.match(render(TokenWallet,{profile:matchProfile()}),/doi-coin\.png/);
  const funded=economy.creditTokens(matchProfile(),input('fund-ui',120)).profile;
  for(const id of ['raja','kaka']) {
    const html=render(UltimateUpgradeDetails,{profile:funded,characterId:id});
    assert.match(html,/economy\/label\.png/);assert.doesNotMatch(html,/TOKEN/);
    assert.match(html,/LEVEL 0 \/ 3/);assert.match(html,/120 DOI/);assert.match(html,/45 detik/);
    assert.match(html,/44 detik/);assert.match(html,/5\.5 detik/);
    const upgraded=purchase.purchaseUltimateUpgrade(funded,id,`ui-${id}`).profile;
    assert.match(render(UltimateUpgradeDetails,{profile:upgraded,characterId:id}),/Butuh 280 DOI lagi/);
    assert.match(render(UltimateUpgradePanel,{profile:upgraded,characterId:id,onRefresh:()=>{}}),/UPGRADE ULTIMATE/);
  }
  assert.equal(render(UltimateUpgradeDetails,{profile:funded,characterId:'bebe'}),'');
  assert.doesNotMatch(render(UltimateUpgradePanel,{profile:funded,characterId:'ciici',onRefresh:()=>{}}),/UPGRADE ULTIMATE/);
  const max={...funded,ultimateUpgrades:{version:1,levels:{raja:3}}};
  assert.match(render(UltimateUpgradeDetails,{profile:max,characterId:'raja'}),/MAX LEVEL/);
  const win=matchEngine.applyMatchProgression(matchProfile(),summary());
  const winHtml=render(MatchTokenSummary,{result:win});
  assert.match(winHtml,/\+26 DOI TOTAL/);assert.match(winHtml,/26 DOI/);
  const loss=matchEngine.applyMatchProgression(matchProfile(),summary({won:false,tags:0,rescues:0}));
  assert.match(render(MatchTokenSummary,{result:loss}),/\+10 DOI TOTAL/);
  for(const result of [matchEngine.applyMatchProgression(win.profile,summary()),matchEngine.applyMatchProgression(matchProfile(),summary({completed:false}))]) {
    assert.doesNotMatch(render(MatchTokenSummary,{result}),/DOI TOTAL|\+\d+ DOI/);
  }
});

void test('module11 actual React click handlers confirm once, refresh saved profile, and report blocked storage',()=>{
  const React=nativeRequire('react'),previousWindow=globalThis.window,previousDocument=globalThis.document;
  const entries=new Map(),slots=[];let blocked=false,refreshes=0,cursor=0;
  globalThis.window={localStorage:{getItem:key=>entries.get(key)??null,setItem:(key,value)=>{if(blocked)throw Error('blocked');entries.set(key,value);}},dispatchEvent:()=>true};
  globalThis.document={body:{}};
  const hooks={...React,useEffect:()=>{},useState:initial=>{
    const index=cursor++;if(!(index in slots))slots[index]=initial;
    return [slots[index],value=>{slots[index]=typeof value==='function'?value(slots[index]):value;}];
  },useRef:initial=>{const index=cursor++;if(!(index in slots))slots[index]={current:initial};return slots[index];}};
  const source=ts.transpileModule(fs.readFileSync('components/ultimate-upgrade-panel.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  const mod={exports:{}};
  const requireUI=specifier=>{
    if(specifier==='react')return hooks;
    if(specifier==='react-dom')return {createPortal:child=>child};
    if(!specifier.startsWith('.'))return nativeRequire(specifier);
    const candidate=path.resolve('components',specifier);
    return load([`${candidate}.ts`,`${candidate}.tsx`,path.join(candidate,'index.ts')].find(fs.existsSync));
  };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(requireUI,mod,mod.exports);
  const elements=node=>!node?[]:Array.isArray(node)?node.flatMap(elements):typeof node==='object'&&node.props?[node,...elements(node.props.children)]:[];
  const textContent=node=>Array.isArray(node)?node.map(textContent).join(''):node&&typeof node==='object'?textContent(node.props?.children):String(node??'');
  const button=(tree,label)=>elements(tree).find(node=>node.type==='button'&&textContent(node.props.children).includes(label));
  let profile;
  const render=()=>{cursor=0;return mod.exports.UltimateUpgradePanel({profile,characterId:'raja',onRefresh:()=>{refreshes++;profile=storage.loadPlayerProfile();}});};
  try {
    profile=service.createPlayerProfile('ClickTest');profile=economy.creditTokens(profile,input('click-fund',400)).profile;storage.savePlayerProfile(profile);
    button(render(),'UPGRADE ULTIMATE').props.onClick();
    button(render(),'UPGRADE ·').props.onClick();
    assert.equal(storage.loadPlayerProfile().economy.tokenBalance,400,'opening confirmation cannot debit');
    button(render(),'BATAL').props.onClick();
    assert.equal(storage.loadPlayerProfile().economy.tokenBalance,400,'cancel cannot debit');
    button(render(),'UPGRADE ·').props.onClick();
    const confirm=button(render(),'KONFIRMASI PEMBELIAN').props.onClick;
    confirm();confirm();
    assert.equal(profile.economy.tokenBalance,280);assert.equal(purchase.getUltimateUpgradeLevel(profile,'raja'),1);
    assert.equal(profile.economy.recentTransactions.filter(tx=>tx.type==='ultimate_upgrade').length,1);
    assert.match(textContent(render()),/Berhasil!/);assert.ok(refreshes>=1);
    button(render(),'UPGRADE ·').props.onClick();blocked=true;
    button(render(),'KONFIRMASI PEMBELIAN').props.onClick();
    assert.equal(profile.economy.tokenBalance,280);assert.equal(purchase.getUltimateUpgradeLevel(profile,'raja'),1);
    assert.match(textContent(render()),/Gagal menyimpan/);
    blocked=false;button(render(),'UPGRADE ·').props.onClick();button(render(),'KONFIRMASI PEMBELIAN').props.onClick();
    assert.equal(profile.economy.tokenBalance,0);assert.equal(purchase.getUltimateUpgradeLevel(profile,'raja'),2);
    assert.equal(button(render(),'DOI BELUM CUKUP').props.disabled,true);
    profile=economy.creditTokens(profile,input('stale-fund',520)).profile;storage.savePlayerProfile(profile);
    button(render(),'UPGRADE ·').props.onClick();
    assert.equal(service.purchasePlayerUltimateUpgrade('raja','outside-purchase',2).applied,true);
    button(render(),'KONFIRMASI PEMBELIAN').props.onClick();
    assert.match(textContent(render()),/Level telah berubah/);
    assert.equal(profile.economy.tokenBalance,0);assert.equal(purchase.getUltimateUpgradeLevel(profile,'raja'),3);
    assert.equal(button(render(),'MAX LEVEL').props.disabled,true);
    let stopped=false;elements(render()).find(node=>node.type==='dialog').props.onKeyDown({stopPropagation:()=>{stopped=true;}});
    assert.equal(stopped,true,'keyboard within upgrade does not navigate the game menu');
  } finally {
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  }
});

void test('module13 complete persisted match→wallet→purchase→reload→runtime journey for Raja and Kaka',()=>{
  const previousWindow=globalThis.window;
  try {
    for(const id of ['raja','kaka']) {
      const entries=new Map();globalThis.window={localStorage:{getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value)},dispatchEvent:()=>true};
      let profile=service.createPlayerProfile(`Journey${id}`),matches=0;
      assert.equal(profile.economy.tokenBalance,0);
      const reached=[];
      for(let level=1;level<=3;level++) {
        while(!purchase.canPurchaseUltimateUpgrade(profile,id)) {
          matches++;
          const match=summary({matchId:`${id}-${matches}`,won:true,tags:1,rescues:1});
          const reward=service.recordMatchProgression(match);
          assert.equal(reward.tokenEarned,18);
          assert.equal(service.recordMatchProgression(match).tokenEarned,0);
          profile=storage.loadPlayerProfile();assert.ok(profile.economy.tokenBalance>=0);
        }
        const result=service.purchasePlayerUltimateUpgrade(id,`journey-${id}-${level}`,level-1);
        assert.equal(result.applied,true);profile=storage.loadPlayerProfile();
        assert.equal(profile.ultimateUpgrades.levels[id],level);
        const runtime=effective.snapshotUltimateStats(profile,id);
        const config=upgrades.getUltimateUpgradeConfig(id,level);
        assert.equal(runtime.durationMs,config.durationMs);assert.equal(runtime.castMs,config.castMs);
        assert.equal(runtime.rechargeSeconds,config.rechargeSeconds);
        assert.equal(effective.snapshotUltimateStats(profile,id,false).level,0);
        reached.push(matches);
      }
      assert.deepEqual(reached,[7,23,52],'synthetic 18 TOKEN/match, not measured player telemetry');
      assert.equal(profile.economy.tokenBalance,16);assert.equal(profile.economy.lifetimeTokenEarned,936);
      assert.equal(profile.economy.lifetimeTokenSpent,920);assert.equal(profile.economy.recentTransactions.length,50);
      assert.equal(profile.menang,52);assert.ok(profile.progression.xp>0);
      assert.equal(entries.size,1,'no new storage key');
      assert.equal(service.purchasePlayerUltimateUpgrade(id,'max-rejected').reason,'max_level');
    }
  } finally {if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;}
});
