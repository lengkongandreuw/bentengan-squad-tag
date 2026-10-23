import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const configFiles=['config/map-studio.json','config/sprite-studio.json','config/game-rules.json'];
const before=await Promise.all(configFiles.map(file=>readFile(file)));
const maps=JSON.parse(before[0]).maps.filter(m=>m.enabled&&!m.archived&&!m.deleted);
const ids=['kampung','pasar','taman','kanal','kanal2','kampung3d',...maps.map(m=>m.id)];
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0}});
let browser;
const reports=[],errors=[],writes=[];
await mkdir('outputs/gameplay-optimization',{recursive:true});
try{
  await server.listen();
  const url=`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/?performance=1`;
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  for(const map of maps){
    const context=await browser.newContext({viewport:{width:1366,height:768}}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});
    await page.addInitScript(({ids})=>{
      localStorage.setItem('benteng-graphics-v1','high');
      localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'isolated-performance-qa',username:'PerfQA',firstJoin:'2026-10-19T00:00:00.000Z',menang:0,kalah:0,featuredCharacterId:'raja',kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},
        progression:{version:1,xp:100000,unlockedCharacters:['raja','robot'],unlockedArenaIds:ids,arenaStats:{},processedMatchIds:[]},
        tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-19T00:00:00.000Z',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}}));
    },{ids});
    await page.goto(url);await page.locator('.enter-game').click();
    await page.getByRole('button',{name:/Choose Tim Merah/}).click();
    await page.locator('.character-panel-select').click({timeout:90000});
    await page.locator('.map-arena-row').filter({hasText:map.name}).first().click();
    await page.locator('.map-start-match').click();
    await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
    const initial=await page.evaluate(()=>window.__bentengGameCore.readState());
    assert.equal(initial.entities.length,10);assert.equal(initial.arenaId,map.id);
    await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');await page.keyboard.press('Shift');
    const sample=await page.evaluate(()=>new Promise(resolve=>{
      const deltas=[];let previous=performance.now();
      const frame=now=>{deltas.push(now-previous);previous=now;if(deltas.length<120)requestAnimationFrame(frame);else{deltas.sort((a,b)=>a-b);const canvas=document.querySelector('canvas[data-graphics-preset]');resolve({frameP50:deltas[60],frameP95:deltas[114],work:JSON.parse(canvas.dataset.runtimePerformance||'null'),preset:canvas.dataset.graphicsPreset,pixelRatio:canvas.dataset.pixelRatio});}};requestAnimationFrame(frame);
    }));
    assert.equal(sample.preset,'high');assert.equal(sample.pixelRatio,'1');
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    await page.locator('.pause-overlay:modal').waitFor();
    const paused=await page.evaluate(()=>window.__bentengGameCore.readState());assert.equal(paused.paused,true);
    await page.waitForTimeout(150);
    assert.deepEqual((await page.evaluate(()=>window.__bentengGameCore.readState())).entities,paused.entities);
    await page.getByRole('button',{name:'Resume',exact:true}).click();
    await page.waitForFunction(()=>window.__bentengGameCore.readState().paused===false);
    await page.locator('.pause-overlay').waitFor({state:'hidden'});
    await page.screenshot({path:`outputs/gameplay-optimization/${map.id}.png`});
    reports.push({map:map.name,...sample});console.log('PASS '+map.name+': 5v5, high quality, move/jump input, pause/resume. '+JSON.stringify(sample));
    await context.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  for(let i=0;i<configFiles.length;i++)assert.deepEqual(await readFile(configFiles[i]),before[i]);
  await writeFile('outputs/gameplay-optimization/browser-report.json',JSON.stringify({environment:'Headless Chrome, Vite development; smoke measurements, not player hardware FPS comparison',reports},null,2));
  console.log('PASS all current active studio maps; no config writes or browser errors.');
}finally{await browser?.close();await server.close();}
