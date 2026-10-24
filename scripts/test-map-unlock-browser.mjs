// Actual UI, isolated profiles; no granting every arena to hide unlock failures.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0,watch:null}});
const files=['config/map-studio.json','config/map-runtime.json'],before=await Promise.all(files.map(f=>readFile(f)));
const expected=['Kampung Merdeka','Gardu Tengah','Taman Kota 1','Taman Kota 2','Alun Kanal Nusantara','Cagar Taman Budaya','Arena Benteng 1'];
const reports=[],errors=[];let browser;
/** @type {[string,number,number,number,number,Record<string,{played:number;wins:number}>,number][]} */
const profileCases=[
 ['fresh',0,0,0,0,{},1],
 ['level3',450,4,8,2,{kampung:{played:1,wins:1},'studio-edit-pasar':{played:3,wins:3}},4],
 ['veteran',6000,40,100,30,{kampung:{played:1,wins:1},'studio-edit-pasar':{played:3,wins:3},'studio-edit-taman':{played:4,wins:4},'studio-edit-kanal':{played:5,wins:5},'studio-edit-kanal2':{played:7,wins:7}},7],
];
try{
 await mkdir('outputs/map-unlock',{recursive:true});await server.listen();
 browser=await chromium.launch({headless:true,executablePath:process.env.BENTENG_CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const [name,xp,wins,tags,rescues,arenaStats,unlockedCount] of profileCases){
  const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const profile={schemaVersion:1,id:'map-unlock-qa',username:'MapUnlockQA',firstJoin:'2026-10-23T00:00:00.000Z',menang:wins,kalah:0,featuredCharacterId:'raja',kda:{tagMusuh:tags,masukPenjara:0,rescueTeam:rescues},progression:{version:1,xp,unlockedCharacters:['raja','kaka'],unlockedArenaIds:['kampung'],arenaStats,processedMatchIds:[]},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-23T00:00:00.000Z',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}};
  await page.addInitScript(p=>localStorage.setItem('bentengan-player-profile-v1',JSON.stringify(p)),profile);
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);
  await page.locator('.enter-game').click();await page.locator('.mode-campaign').click();await page.getByRole('button',{name:/Choose Tim Merah/}).click();await page.locator('.character-panel-select').click({timeout:90000});
  const rows=page.locator('.map-arena-row');assert.deepEqual((await rows.allTextContents()).map(t=>t.trim()),expected);
  let count=0;const difficulties=[];
  for(let i=0;i<expected.length;i++){
   await rows.nth(i).click();const playable=await page.locator('.map-start-match').isEnabled();
   assert.equal(playable,i<unlockedCount,`${name}: ${expected[i]} availability`);count+=Number(playable);
   difficulties.push((await page.locator('.map-info-difficulty').innerText()).trim());
   if(!playable)assert(!/not playable yet/i.test(await page.locator('.map-arena-info p').innerText()),'locked maps explain actual requirements');
  }
  assert.deepEqual(difficulties.map(s=>s.toLowerCase()),['easy','normal','hard','hard','hard','hard','hard']);
  await page.screenshot({path:`outputs/map-unlock/${name}.png`});
  if(name==='veteran'){
   await rows.filter({hasText:'Taman Kota 1'}).click();await page.locator('.map-start-match').click();
   await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
   assert.equal(await page.evaluate(()=>window.__bentengGameCore.readState().arenaId),'studio-copy-4572a880');
   await page.getByRole('button',{name:'Pause',exact:true}).click();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')));
   assert.deepEqual(saved.progression.arenaStats,arenaStats,'historical stats are not reset by opening maps');
  }
  reports.push({profile:name,unlocked:count,order:expected,difficulties});await context.close();
 }
 assert.deepEqual(errors,[]);for(let i=0;i<files.length;i++)assert.deepEqual(await readFile(files[i]),before[i]);
 await writeFile('outputs/map-unlock/report.json',JSON.stringify({reports,errors},null,2));console.log('PASS real map selection: fresh1/7, level3 4/7, veteran7/7, Taman Kota1 actual match, old stats/maps preserved.');
}finally{await browser?.close();await server.close();}
