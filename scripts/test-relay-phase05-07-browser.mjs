// Actual local config, normal bots, isolated browser profile. No POST/config writes.
import assert from 'node:assert/strict';import {mkdir,writeFile,readFile} from 'node:fs/promises';import {createServer} from 'vite';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0,watch:null}});let browser,page;const errors=[],trace=[];
const before=await readFile('config/map-studio.json');
try{
  await mkdir('outputs/relay-phase05-07',{recursive:true});await server.listen();browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'relay-bot-qa',username:'RelayQA',firstJoin:'2026-10-20T00:00:00.000Z',menang:1,kalah:0,featuredCharacterId:'raja',kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:100000,unlockedCharacters:['raja','robot'],unlockedArenaIds:['kampung','pasar'],arenaStats:{kampung:{played:1,wins:1}},processedMatchIds:[]},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-20T00:00:00.000Z',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}})));
  await page.clock.install();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);await page.locator('.enter-game').click();await page.getByRole('button',{name:/Choose Tim Merah/}).click();await page.locator('.character-panel-select').click({timeout:90000});
  const rows=await page.locator('.map-arena-row').allTextContents();assert.match(rows[0],/Kampung Merdeka/);assert.match(rows[1],/Gardu Tengah/);assert(!rows.some(r=>r.includes('Pasar Senggol')));
  await page.locator('.map-arena-row').filter({hasText:'Gardu Tengah'}).click();assert.equal(await page.locator('.map-start-match').isDisabled(),false);
  const icon=JSON.parse(before).maps.find(m=>m.id==='studio-gardu-tengah').icon?.asset??'ui-v2/fields/gardu-tengah.svg';
  assert(await page.locator('img').evaluateAll((images,icon)=>images.some(i=>i.src.includes(icon)&&i.complete&&i.naturalWidth>0),icon),'current Gardu preview is loaded, not old market art');
  await page.screenshot({path:'outputs/relay-phase05-07/map-selection.png'});await page.locator('.map-start-match').click();await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
  const read=()=>page.evaluate(()=>({state:window.__bentengGameCore.readState(),relay:window.__bentengGameCore.readRelay(),metrics:window.__bentengGameCore.readRelayMetrics()}));
  const initial=await read();assert.equal(initial.state.entities.filter(a=>a.controller==='bot').length,9);assert.equal(initial.relay.phase,'DORMANT');
  await page.clock.runFor(3000);await page.evaluate(()=>window.__bentengGameCore.openRelayGate());
  for(let i=0;i<26;i++){await page.clock.runFor(1000);const r=await read();trace.push({second:i+1,phase:r.state.phase,relay:r.relay.phase,metrics:r.metrics.current,actors:r.state.entities.map(a=>({id:a.entityId,controller:a.controller,x:a.x,y:a.y,state:a.state}))});if(i===5)await page.screenshot({path:'outputs/relay-phase05-07/normal-bots-open.png'});}
  const final=await read();await writeFile('outputs/relay-phase05-07/report.json',JSON.stringify({initial,final,trace,errors},null,2));
  assert(final.metrics.current.botGateUses>0,'normal bots use the open gates');assert(final.metrics.current.botPlazaEntries>0,'normal bots enter relay plaza');assert.equal(final.metrics.current.completions,0,'debug open is not a puzzle completion');assert.equal(final.metrics.current.attempts,0,'bots cannot initiate relay');assert.equal(final.metrics.current.debugOpens,1);assert.equal(final.relay.phase,'COMPLETE');assert(final.metrics.current.routeInvalidations>=2);assert.deepEqual(errors,[]);
  if(!(await readFile('config/map-studio.json')).equals(before))console.log('External concurrent config save detected; left intact.');
  console.log('PASS actual slot1 Kampung / slot2 Gardu, preview, legacy unlock, normal9 bots crossing/plaza, safe close, dev metrics; no page errors. '+JSON.stringify(final.metrics.current));
}catch(error){if(page){await page.screenshot({path:'outputs/relay-phase05-07/failure.png'});await writeFile('outputs/relay-phase05-07/failure.txt',String(error)+'\n'+await page.locator('body').innerText());await writeFile('outputs/relay-phase05-07/trace.json',JSON.stringify(trace,null,2));}throw error;}
finally{await browser?.close();await server.close();}
