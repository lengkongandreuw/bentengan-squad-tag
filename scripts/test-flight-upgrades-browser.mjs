// Isolated QA profiles and normal purchase/input UI; no source/timer overrides.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0,watch:null}});
const out='outputs/flight-upgrades',reports=[],errors=[];
const files=['config/map-studio.json','config/sprite-studio.json'],before=await Promise.all(files.map(f=>readFile(f)));let browser;
try{
 await mkdir(out,{recursive:true});await server.listen();browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const id of ['bebe','ciici']){
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const seeded={schemaVersion:1,id:'flight-upgrade-'+id,username:'Fly'+id,firstJoin:'2026-10-23T00:00:00.000Z',menang:0,kalah:0,featuredCharacterId:id,kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:6000,unlockedCharacters:['raja','kaka','bebe','ciici'],unlockedArenaIds:['kampung'],arenaStats:{},processedMatchIds:[]},economy:{version:1,tokenBalance:1000,lifetimeTokenEarned:1000,lifetimeTokenSpent:0,recentTransactions:[]},ultimateUpgrades:{version:1,levels:{raja:0,kaka:0}},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-23T00:00:00.000Z',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}};
  // Seed once only: reload must retain actual purchases rather than overwrite them.
  await page.addInitScript(p=>{if(!localStorage.getItem('bentengan-player-profile-v1'))localStorage.setItem('bentengan-player-profile-v1',JSON.stringify(p));},seeded);
  await page.clock.install();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/?format=standard`);
  await page.locator('.enter-game').click();await page.locator('.mode-campaign').click();await page.getByRole('button',{name:id==='bebe'?'Choose Tim Merah':'Choose Tim Hijau',exact:true}).click();
  await page.locator('.character-panel-select').waitFor({timeout:90000});
  // Carousel's own previous/next buttons avoid clicking obscured background portraits.
  for(let step=0;step<8;step++){
   if((await page.locator('.character-panel-name').innerText()).toLowerCase()===id)break;
   await page.getByRole('button',{name:'Next character',exact:true}).click();
  }
  assert.equal((await page.locator('.character-panel-name').innerText()).toLowerCase(),id);
  await page.locator('.selection-economy button').click();await page.locator('.ultimate-upgrade-dialog:modal').waitFor();
  assert.match(await page.locator('.ultimate-upgrade-card').innerText(),/Flight duration/);
  await page.screenshot({path:`${out}/${id}-before.png`});
  for(const [level,cost]of [[1,120],[2,280],[3,520]]){
   const previousBalance=await page.evaluate(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).economy.tokenBalance);
   await page.locator('.ultimate-upgrade-footer>button').click();
   await page.getByRole('button',{name:'CONFIRM PURCHASE',exact:true}).click();
   await page.waitForFunction(({id,level})=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).ultimateUpgrades.levels[id]===level,{id,level});
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).economy.tokenBalance),previousBalance-cost);
   assert.match(await page.locator('.ultimate-upgrade-card').innerText(),new RegExp(`${4+level} seconds`));
   assert.equal(await page.locator('.ultimate-upgrade-footer>button').isDisabled(),level===3);
  }
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')));
  assert.equal(saved.economy.tokenBalance,80);assert.equal(saved.economy.lifetimeTokenSpent,920);
  assert.equal(saved.economy.recentTransactions.filter(tx=>tx.type==='ultimate_upgrade').length,3);
  await page.setViewportSize({width:844,height:390});await page.screenshot({path:`${out}/${id}-max-landscape.png`});await page.setViewportSize({width:1366,height:768});
  await page.keyboard.press('Escape');await page.locator('.character-panel-select').click();await page.locator('.map-arena-row').first().click();
  await page.locator('.map-difficulty-toggle').getByRole('button',{name:'Easy bots',exact:true}).click();await page.locator('.map-start-match').click();
  await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
  // Freeze wall-clock gaps between assertions; advance the normal simulation
  // explicitly, keeping the test inside one round's fort-lock window.
  await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  assert.equal(await page.locator('canvas[data-ultimate-stats]').evaluate(c=>JSON.parse(c.dataset.ultimateStats).durationMs),7000);
  await page.evaluate(()=>{window.flightEvents=[];window.addEventListener('benteng-flight',e=>window.flightEvents.push(e.detail));});
  await page.clock.runFor(45050);await page.locator('canvas[data-graphics-preset]').focus();
  const actor=()=>page.evaluate(()=>window.__bentengGameCore.readState().entities.find(p=>p.controller==='local'));
  for(let n=0;n<40&&(await actor()).ultimateMeter<100;n++)await page.clock.runFor(500);
  assert.equal((await actor()).ultimateMeter,100,JSON.stringify(await actor()));
  // Activate on the first eligible frame after leaving home, not one second
  // later when ordinary bots may already have captured the unprotected actor.
  const direction=id==='bebe'?'d':'a';
  for(let n=0;n<160&&!(await actor()).flight;n++){
   const me=await actor();
   if(me.state==='IN_BASE'){
    const key=n%20<10?'s':direction;await page.keyboard.down(key);await page.clock.runFor(100);await page.keyboard.up(key);
   }else if(me.state==='ACTIVE'){
    await page.keyboard.down('CapsLock');await page.clock.runFor(100);await page.keyboard.up('CapsLock');
   }else await page.clock.runFor(250);
  }
  assert((await actor()).flight,JSON.stringify(await actor()));
  for(let n=0;n<100&&(await actor()).flight?.stage==='FLIGHT_TAKEOFF';n++)await page.clock.runFor(100);
  const flying=await actor();assert.equal(flying.flight?.stage,'FLYING');assert(flying.flight.remaining>6.8,'runtime uses purchased7s, not base4s');
  await page.clock.runFor(6000);assert.equal((await actor()).flight?.stage,'FLYING',JSON.stringify(await page.evaluate(()=>({actor:window.__bentengGameCore.readState().entities.find(p=>p.controller==='local'),phase:window.__bentengGameCore.readState().phase,events:window.flightEvents}))));
  for(let n=0;n<25&&(await actor()).flight;n++)await page.clock.runFor(100);
  assert.equal((await actor()).flight,null,'expiry directly restores normal state');
  const events=await page.evaluate(()=>window.flightEvents);assert.equal(events.filter(e=>e.name==='ultimate_flight_ended').length,1);assert(!events.some(e=>e.stage==='FLIGHT_LANDING'));
  await page.reload();assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).ultimateUpgrades.levels[id],id),3);
  reports.push({id,level:3,durationMs:7000,spent:920,balance:80,events});await context.close();console.log(`${id}: UI purchases, wallet,7s runtime and immediate expiry PASS`);
 }
 assert.deepEqual(errors,[]);for(let i=0;i<files.length;i++)assert.deepEqual(await readFile(files[i]),before[i]);
 await writeFile(`${out}/report.json`,JSON.stringify({reports,errors},null,2));
}finally{await browser?.close();await server.close();}
