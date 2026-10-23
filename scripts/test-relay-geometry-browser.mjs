// Isolated prototype injection. Never save/replace real maps or use user profiles.
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {startMapStudio} from './map-studio/server.mjs';
import {createGarduPrototype} from '../modules/world/relay-map/relay-layout.ts';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const watched=['config/map-studio.json','config/sprite-studio.json','config/match-format.json'],before=await Promise.all(watched.map(f=>readFile(f)));
const map={...createGarduPrototype(),enabled:true,replaces:'pasar'},fixture={version:1,maps:[map]};
const server=await createServer({configFile:'vite.github.config.ts',plugins:[{name:'isolated-relay-qa',enforce:'pre',load(id){if(id.replaceAll('\\','/').split('?')[0].endsWith('/config/map-studio.json'))return JSON.stringify(fixture);}}],server:{host:'127.0.0.1',port:0,watch:null}});
let browser,studio,page;const errors=[],writes=[];
try{
  await mkdir('outputs/relay-phase01',{recursive:true});await server.listen();studio=await startMapStudio(0);
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const editor=await browser.newPage({viewport:{width:1600,height:900}});page=editor;editor.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR '+e.message);});
  editor.on('request',r=>{if(r.url().includes('prototypes'))console.log('PROTOTYPE REQUEST '+r.url());});
  await editor.route('**/api/**',async route=>{
    if(route.request().method()==='POST'){writes.push(route.request().url());return route.abort();}
    const name=new URL(route.request().url()).pathname;
    if(name==='/api/state')return route.fulfill({json:{token:'isolated-qa',revision:'isolated-qa',capabilities:{structureVisuals:1,mapAssetBundles:1,assetOptimization:1,assetBudgetAutofix:1},document:{version:1,maps:[]}}});
    if(name==='/api/library')return route.fulfill({json:{items:[],warnings:[]}});
    if(name==='/api/templates'){const response=await route.fetch(),catalog=await response.json();catalog.library=[];return route.fulfill({json:catalog});}
    return route.continue();
  });
  await editor.goto(studio.origin);await editor.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Map Studio siap')&&!document.querySelector('main').inert);console.log('Editor ready');
  await editor.locator('#garduPrototype').click();console.log('Prototype click delivered');await editor.waitForFunction(()=>document.querySelector('#mapName').value==='Gardu Tengah');
  assert.equal(await editor.locator('#enabled').isChecked(),false);assert.equal(await editor.locator('#objects button').count(),32);
  await editor.locator('#cleanPreview').check();await editor.locator('#fit').click();
  await editor.locator('#canvas').screenshot({path:'outputs/relay-phase01/editor-clean.png'});
  const gate=await editor.locator('#canvas').evaluate(c=>{const s=c.width/1920;return [...c.getContext('2d').getImageData(Math.floor(798*s),Math.floor(507*s),1,1).data];});assert(gate[0]>gate[2],'closed gate visible without guide overlays');
  const node=await editor.locator('#canvas').evaluate(c=>{const s=c.width/1920;return [...c.getContext('2d').getImageData(Math.floor(950*s),Math.floor(420*s),1,1).data];});assert(node[2]>node[0],'A marker is above the plaza floor');
  await editor.close();
  page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    localStorage.setItem('benteng-graphics-v1','high');
    localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'relay-qa',username:'RelayQA',firstJoin:'2026-10-19T00:00:00.000Z',menang:0,kalah:0,featuredCharacterId:'raja',kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:100000,unlockedCharacters:['raja','robot'],unlockedArenaIds:['kampung','pasar','studio-gardu-tengah'],arenaStats:{},processedMatchIds:[]},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-19T00:00:00.000Z',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}}));
  });
  await page.clock.install();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);
  await page.locator('.enter-game').click();await page.getByRole('button',{name:/Choose Tim Merah/}).click();await page.locator('.character-panel-select').click({timeout:90000});
  await page.locator('.map-arena-row').filter({hasText:'Gardu Tengah'}).click();await page.locator('.map-start-match').click();
  await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
  const read=()=>page.evaluate(()=>window.__bentengGameCore.readState());const initial=await read();assert.equal(initial.arenaId,map.id);assert.equal(initial.entities.length,10);assert.equal(initial.entities.filter(p=>p.controller==='bot').length,9);
  console.log('5v5 started on isolated Gardu Tengah; user config unchanged.');
  await page.keyboard.down('w');await page.clock.runFor(500);await page.keyboard.up('w');await page.keyboard.press('Shift');await page.clock.runFor(1000);
  await page.screenshot({path:'outputs/relay-phase01/gameplay.png'});
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();
  let final=false;const progress=[];
  // Advance normal 60Hz browser frames; rules/timers/positions are not patched.
  for(let i=0;i<120;i++){
    await page.clock.runFor(10000);const state=await read();
    if(i%6===0){progress.push({elapsedSimSeconds:(i+1)*10,phase:state.phase,tick:state.tick,round:state.round,timeRemaining:state.timeRemainingSeconds});console.log(JSON.stringify(progress.at(-1)));}
    if(await page.locator('.round-stats-overlay.final,.post-match-progression').count()){final=true;break;}
    if(state.phase!=='PLAYING')await page.keyboard.press('Enter');
    if(await page.locator('.pregame-shell').count()){final=true;break;}
  }
  const finalState=await read();await page.screenshot({path:'outputs/relay-phase01/match-end.png'});
  const concurrentChanges=[];for(let i=0;i<watched.length;i++)if(!(await readFile(watched[i])).equals(before[i]))concurrentChanges.push(watched[i]);
  await writeFile('outputs/relay-phase01/report.json',JSON.stringify({final,finalState,progress,errors,writes,concurrentChanges},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);if(concurrentChanges.length)console.log('Preserved concurrent external config edits: '+concurrentChanges.join(', '));
  assert(final,'complete normal5v5 match not reached; inspect report');
  console.log('PASS: Studio clean primitives + game5v5 full match, input/parkour and pause; no config/profile writes outside isolated context, no page errors.');
}catch(error){if(page){console.log('FAIL BODY '+await page.locator('body').innerText());await writeFile('outputs/relay-phase01/failure.txt',await page.locator('body').innerText());await page.screenshot({path:'outputs/relay-phase01/failure.png'});}throw error;}
finally{await browser?.close();await server.close();if(studio)await new Promise(resolve=>studio.server.close(resolve));}
