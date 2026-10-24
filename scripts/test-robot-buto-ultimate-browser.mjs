// Preview/quote cancellation. Existing profile data and wallet must remain unchanged.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import('file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0,watch:null}});
let browser;const errors=[],reports=[];
try{
 await mkdir('outputs/robot-buto-phase01',{recursive:true});await server.listen();
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const [id,title]of [['robot','JAMMER FIELD'],['buto','IRON DRIVE']]){
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(!localStorage.getItem('bentengan-player-profile-v1'))localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'phase01-qa',username:'UltimateQA',firstJoin:'2026-10-23',menang:0,kalah:0,kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:6000,unlockedCharacters:['raja','kaka','robot','buto'],unlockedArenaIds:['kampung'],arenaStats:{},processedMatchIds:[]},economy:{version:1,tokenBalance:1000,lifetimeTokenEarned:1000,lifetimeTokenSpent:0,recentTransactions:[]},ultimateUpgrades:{version:1,levels:{raja:1,kaka:2}},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-23',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}}));});
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);
  await page.locator('.enter-game').click();await page.locator('.mode-campaign').click();await page.getByRole('button',{name:id==='robot'?'Choose Tim Merah':'Choose Tim Hijau',exact:true}).click();
  await page.locator('.character-panel-select').waitFor({timeout:90000});
  for(let n=0;n<8&&(await page.locator('.character-panel-name').innerText()).toLowerCase()!==id;n++)await page.getByRole('button',{name:'Next character',exact:true}).click();
  assert.equal((await page.locator('.character-panel-name').innerText()).toLowerCase(),id);
  const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')));
  const before=await stored();await page.locator('.selection-economy button').click();await page.locator('.ultimate-upgrade-dialog:modal').waitFor();
  const text=await page.locator('.ultimate-upgrade-card').innerText();assert(text.includes(title));assert(text.includes('4 seconds'));assert(text.includes('4.5 seconds'));assert(!text.includes('Team speed'));
  if(id==='buto'){assert(text.includes('Self speed'));assert(text.includes('+25%'));}
  assert.equal(await page.locator('.ultimate-upgrade-footer>button').isEnabled(),true);
  await page.locator('.ultimate-upgrade-footer>button').click();assert.equal(await page.locator('.ultimate-purchase-confirm').count(),1);
  await page.getByRole('button',{name:'CANCEL',exact:true}).click();
  for(const [width,height]of [[1366,768],[844,390],[375,812]]){
   await page.setViewportSize({width,height});await page.screenshot({path:`outputs/robot-buto-phase01/${id}-${width}.png`});
   const close=await page.locator('.ultimate-upgrade-close').boundingBox();assert(close.x>=0&&close.y>=0&&close.x+close.width<=width+1&&close.y+close.height<=height+1);
  }
  await page.keyboard.press('Escape');const after=await stored();assert.deepEqual(after.economy,before.economy);assert.deepEqual(after.ultimateUpgrades,before.ultimateUpgrades);
  reports.push({id,title,duration:[4000,4500],quoteCancelled:true,walletUnchanged:true});await context.close();console.log(`${id} preview and wallet safety PASS`);
 }
 assert.deepEqual(errors,[]);await writeFile('outputs/robot-buto-phase01/report.json',JSON.stringify({reports,errors},null,2));
}finally{await browser?.close();await server.close();}
