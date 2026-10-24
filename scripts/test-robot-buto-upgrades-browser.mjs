// Actual solo purchase/input/match flow; isolated profiles, no actor/source overrides.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import('file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0,watch:null}});
let browser;const errors=[],reports=[];
try{
 await mkdir('outputs/robot-buto-phase05-07',{recursive:true});await server.listen();
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const id of ['robot','buto']){
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(!localStorage.getItem('bentengan-player-profile-v1'))localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'effects-qa',username:'EffectsQA',firstJoin:'2026-10-23',menang:0,kalah:0,kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:6000,unlockedCharacters:['raja','kaka','robot','buto'],unlockedArenaIds:['kampung'],arenaStats:{},processedMatchIds:[]},economy:{version:1,tokenBalance:1000,lifetimeTokenEarned:1000,lifetimeTokenSpent:0,recentTransactions:[]},ultimateUpgrades:{version:1,levels:{raja:0,kaka:0}},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-23',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}}));});
  await page.clock.install();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/?format=standard`);
  await page.locator('.enter-game').click();await page.locator('.mode-campaign').click();await page.getByRole('button',{name:id==='robot'?'Choose Tim Merah':'Choose Tim Hijau',exact:true}).click();
  await page.locator('.character-panel-select').waitFor({timeout:90000});
  for(let n=0;n<8&&(await page.locator('.character-panel-name').innerText()).toLowerCase()!==id;n++)await page.getByRole('button',{name:'Next character',exact:true}).click();
  assert.equal((await page.locator('.character-panel-name').innerText()).toLowerCase(),id);
  await page.locator('.selection-economy button').click();for(let tier=1;tier<=3;tier++){await page.locator('.ultimate-upgrade-footer>button').click();await page.getByRole('button',{name:'CONFIRM PURCHASE',exact:true}).click();}
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).economy.tokenBalance),80);
  await page.keyboard.press('Escape');await page.locator('.character-panel-select').click();await page.locator('.map-arena-row').first().click();
  await page.locator('.map-difficulty-toggle').getByRole('button',{name:'Easy bots',exact:true}).click();await page.locator('.map-start-match').click();
  await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});await page.clock.pauseAt(await page.evaluate(()=>Date.now()+100));
  const actor=()=>page.evaluate(()=>window.__bentengGameCore.readState().entities.find(p=>p.controller==='local'));
  const effects=()=>page.locator('canvas[data-ultimate-effects]').evaluate(c=>JSON.parse(c.dataset.ultimateEffects));
  await page.clock.runFor(45050);await page.locator('canvas[data-graphics-preset]').focus();
  for(let n=0;n<40&&(await actor()).ultimateMeter<100;n++)await page.clock.runFor(250);
  assert.equal((await actor()).ultimateMeter,100);
  const key=id==='robot'?'jammerUntil':'driveUntil';
  for(let n=0;n<150&&!(await effects())[key];n++){
   const me=await actor();
   if(me.state==='IN_BASE'){const direction=n%20<10?'s':id==='robot'?'d':'a';await page.keyboard.down(direction);await page.clock.runFor(100);await page.keyboard.up(direction);}
   else if(me.state==='ACTIVE'){await page.keyboard.down('CapsLock');await page.clock.runFor(100);await page.keyboard.up('CapsLock');}
   else await page.clock.runFor(100);
  }
  const applied=await effects();assert(applied[key]>0,JSON.stringify({actor:await actor(),applied}));
  assert((await actor()).ultimateMeter<10,'activation consumed full meter');
  const remaining=applied[key]-await page.evaluate(()=>performance.now());assert(remaining>5000&&remaining<=5500,`purchased duration5500ms, remaining=${remaining}`);
  if(id==='buto'){
   assert.equal((await actor()).state,'ACTIVE');assert(applied.driveActive);
   const before=await actor();await page.keyboard.down('Shift');await page.clock.runFor(150);await page.keyboard.up('Shift');const after=await actor();
   assert.equal(after.parkourUntil,before.parkourUntil);assert.equal(after.boost,before.boost);assert.equal((await effects()).parkourReason,'IRON_DRIVE');
  }
  await page.screenshot({path:`outputs/robot-buto-phase05-07/${id}-active.png`});
  await page.clock.runFor(6100);assert.equal((await effects()).driveActive,false);assert.notEqual((await effects()).parkourReason,'IRON_DRIVE');
  await page.reload();assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).ultimateUpgrades.levels[id],id),3);
  reports.push({id,activated:true,durationMs:5500,purchase:920,expired:true});await context.close();console.log(`${id} real activation, duration and expiry PASS`);
 }
 assert.deepEqual(errors,[]);await writeFile('outputs/robot-buto-phase05-07/report.json',JSON.stringify({reports,errors},null,2));
}finally{await browser?.close();await server.close();}
