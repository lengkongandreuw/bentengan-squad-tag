// Actual current config, normal bots and isolated profile. No debug opening or writes.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import('file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0,watch:null}});
const output='outputs/gardu-gameplay-fixes',before=await readFile('config/map-studio.json');
const map=JSON.parse(before).maps.find(m=>m.id==='studio-gardu-tengah');
const errors=[],trace=[],activated=new Set();let browser,page;
try{
  await mkdir(output,{recursive:true});await server.listen();
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'gardu-natural-fix-qa',username:'GarduQA',firstJoin:'2026-10-21T00:00:00.000Z',menang:1,kalah:0,featuredCharacterId:'raja',kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:100000,unlockedCharacters:['raja','robot'],unlockedArenaIds:['kampung','pasar'],arenaStats:{kampung:{played:1,wins:1}},processedMatchIds:[]},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-21T00:00:00.000Z',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}})));
  await page.clock.install();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);
  await page.locator('.enter-game').click();await page.getByRole('button',{name:/Choose Tim Merah/}).click();await page.locator('.character-panel-select').click({timeout:90000});
  await page.locator('.map-arena-row').filter({hasText:'Gardu Tengah'}).click();await page.locator('.map-start-match').click();
  await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
  const read=()=>page.evaluate(()=>({state:window.__bentengGameCore.readState(),relay:window.__bentengGameCore.readRelay(),metrics:window.__bentengGameCore.readRelayMetrics()}));
  const initial=await read();
  for(const p of initial.state.entities){const b=map.bases[p.team==='red'?'blue':'red'];assert(Math.hypot(p.x-b.x,p.y-b.y)<map.baseRadius,'All spawns inside charging radius');}
  for(let i=0;i<90;i++){
    await page.clock.runFor(1000);const r=await read();
    for(const p of r.state.entities)if(p.controller==='bot'&&p.exitOrder>0)activated.add(p.entityId);
    trace.push({second:i+1,round:r.state.round,phase:r.state.phase,relay:r.relay,metrics:r.metrics,actors:r.state.entities.map(p=>({id:p.entityId,controller:p.controller,state:p.state,order:p.exitOrder,x:p.x,y:p.y,captures:p.captures}))});
    if(i===9)assert.equal(activated.size,9,'All nine bots must genuinely exit/activate within ten seconds');
    if(i===39||i===69)await page.screenshot({path:`${output}/natural-${i+1}.png`});
    if(r.state.phase==='MATCH_OVER')break;
  }
  const final=await read(),rounds=[...final.metrics.history.map(h=>h.metrics),final.metrics.current];
  const aggregate=rounds.reduce((a,m)=>({attempts:a.attempts+m.attempts,completions:a.completions+m.completions,tagsNearRelay:a.tagsNearRelay+m.tagsNearRelay,gateUses:a.gateUses+m.gateUses,debugOpens:a.debugOpens+m.debugOpens}),{attempts:0,completions:0,tagsNearRelay:0,gateUses:0,debugOpens:0});
  await writeFile(`${output}/report.json`,JSON.stringify({initial,final,activated:[...activated],aggregate,trace,errors},null,2));
  assert.equal(activated.size,9);assert.equal(aggregate.debugOpens,0);assert(aggregate.attempts>0,'Natural bots must attempt Relay');assert(trace.some(t=>t.actors.some(p=>p.controller==='bot'&&p.captures>0)),'Bots genuinely tag, not just move');assert.deepEqual(errors,[]);
  assert((await readFile('config/map-studio.json')).equals(before),'QA must not change maps');
  console.log('PASS natural game, all nine bots activated, no debug openings: '+JSON.stringify(aggregate));
}catch(error){if(page){await page.screenshot({path:`${output}/failure.png`});await writeFile(`${output}/failure.json`,JSON.stringify({error:String(error),trace,errors},null,2));}throw error;}
finally{await browser?.close();await server.close();}
