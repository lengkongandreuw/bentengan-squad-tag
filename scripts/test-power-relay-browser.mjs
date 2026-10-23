// Independent Vite fixture and browser profile; never saves the user's maps.
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'vite';
import {createGarduPrototype} from '../modules/world/relay-map/relay-layout.ts';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const map=process.env.BENTENG_RELAY_ACTUAL_ART==='1'
  ?JSON.parse(await readFile('config/map-studio.json','utf8')).maps.find(m=>m.id==='studio-gardu-tengah')
  :{...createGarduPrototype(),enabled:true,replaces:'pasar'};
assert(map,'Current Gardu map exists');
const output=process.env.BENTENG_RELAY_ACTUAL_ART==='1'?'outputs/relay-feedback':'outputs/relay-phase02-04';
const server=await createServer({configFile:'vite.github.config.ts',plugins:[{name:'isolated-relay-runtime-qa',enforce:'pre',load(id){if(id.replaceAll('\\','/').split('?')[0].endsWith('/config/map-studio.json'))return JSON.stringify({version:1,maps:[map]});},transform(code,id){
  // Deterministic interaction fixture, NOT a normal5v5/bot behavior test.
  // All actors, movement, tags, channeling and gates remain real; only bots stand still.
  if(id.replaceAll('\\','/').split('?')[0].endsWith('/app/prototype.tsx')){
    const needle='if(intent.blocked){p.vx=0;p.vy=0;return;}';assert(code.includes(needle));
    return code.replace(needle,"if(intent.blocked||p.controller==='bot'){p.vx=0;p.vy=0;return;}");
  }
}}],server:{host:'127.0.0.1',port:0,watch:null}});
let browser,page;const errors=[];
try{
  await mkdir(output,{recursive:true});await server.listen();
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'relay-runtime-qa',username:'RelayQA',firstJoin:'2026-10-20T00:00:00.000Z',menang:0,kalah:0,featuredCharacterId:'raja',kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:100000,unlockedCharacters:['raja','robot'],unlockedArenaIds:['kampung','pasar','studio-gardu-tengah'],arenaStats:{},processedMatchIds:[]},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-20T00:00:00.000Z',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}})));
  await page.clock.install();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);
  await page.locator('.enter-game').click();await page.getByRole('button',{name:/Choose Tim Merah/}).click();await page.locator('.character-panel-select').click({timeout:90000});
  await page.locator('.map-arena-row').filter({hasText:'Gardu Tengah'}).click();await page.locator('.map-start-match').click();
  await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
  const read=()=>page.evaluate(()=>({state:window.__bentengGameCore.readState(),relay:window.__bentengGameCore.readRelay()}));
  console.log('Isolated Gardu interaction fixture started; bot movement frozen in test server only.');
  assert.equal((await read()).relay.phase,'DORMANT');assert.equal(await page.locator('.map-event-hud').count(),0);
  const me=async()=>{const {state}=await read();return state.entities.find(p=>p.controller==='local');};
  async function moveTo(x,y){
    for(let i=0;i<160;i++){
      const a=await me();assert(['ACTIVE','IN_BASE'].includes(a.state),'Human captured during navigation');
      const dx=x-a.x,dy=y-a.y;if(Math.hypot(dx,dy)<10)return;
      const key=Math.abs(dx)>Math.abs(dy)?(dx>0?'d':'a'):(dy>0?'s':'w');
      await page.keyboard.down(key);await page.clock.runFor(65);await page.keyboard.up(key);
    }
    throw Error('Could not walk to '+x+','+y+'; '+JSON.stringify(await me()));
  }
  const start=await me(),legacyTeam=start.team==='red'?'blue':'red';await moveTo(start.x,100);await moveTo(960,100);await moveTo(960,420);
  const current=await read();await page.clock.runFor(Math.max(0,25100-current.relay.elapsed));
  assert.equal((await read()).relay.phase,'ANNOUNCING');await page.screenshot({path:`${output}/announce.png`});
  await page.getByRole('button',{name:'Pause',exact:true}).click();await page.clock.runFor(100);const frozen=(await read()).relay.elapsed;await page.clock.runFor(2000);assert.equal((await read()).relay.elapsed,frozen);
  await page.getByRole('button',{name:'Resume',exact:true}).click();await page.clock.runFor(1800);assert.equal((await read()).relay.phase,'ACTIVE');
  const sequence=(await read()).relay.sequence;
  for(const [i,node] of sequence.entries()){
    await moveTo(960,{A:420,B:540,C:660}[node]);await page.clock.runFor(100);
    assert.equal(await page.locator('.relay-key-instruction').count(),1);
    await page.keyboard.down('e');await page.clock.runFor(350);assert(Object.keys((await read()).relay.channels).length===1);
    await page.screenshot({path:`${output}/hold-${i}.png`});
    await page.clock.runFor(400);await page.keyboard.up('e');await page.clock.runFor(100);assert.equal((await read()).relay.progress[legacyTeam],i+1);
    if(i===0){
      assert.equal(await page.locator('.relay-key-instruction').count(),0,'Completed nodes must not invite reactivation');
      await page.keyboard.press('e');await page.clock.runFor(750);assert.equal((await read()).relay.progress[legacyTeam],1);
      assert.equal(Object.keys((await read()).relay.channels).length,0);
      await moveTo(960,{A:420,B:540,C:660}[sequence[1]]);await page.clock.runFor(100);
      for(const size of [{width:844,height:390},{width:390,height:844}]){
        await page.setViewportSize(size);await page.clock.runFor(150);const button=page.locator('.relay-activate');await button.waitFor({state:'visible'});
        const box=await button.boundingBox();assert(box&&box.width>=48&&box.height>=48);assert(box.x>=0&&box.y>=0&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1);
        const overlap=await button.evaluate(b=>{const a=b.getBoundingClientRect();return [...document.querySelectorAll('.touch-dpad,.touch-actions')].some(e=>{const r=e.getBoundingClientRect();return a.left<r.right&&a.right>r.left&&a.top<r.bottom&&a.bottom>r.top;});});assert(!overlap,'Relay control must not overlap touch controller');
        await page.screenshot({path:`${output}/mobile-${size.width}.png`});
        await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.clock.runFor(200);assert.equal(Object.keys((await read()).relay.channels).length,1);await page.mouse.up();await page.clock.runFor(50);assert.equal(Object.keys((await read()).relay.channels).length,0);assert.equal((await read()).relay.progress[legacyTeam],1);
        // Simulation cancels immediately; HUD snapshots are intentionally throttled.
        await page.clock.runFor(150);assert.match(await page.locator('.relay-notice').innerText(),/released too soon/);
      }
      await page.setViewportSize({width:1366,height:768});await page.clock.runFor(100);
    }
  }
  assert.equal((await read()).relay.phase,'GATE_OPEN');await page.screenshot({path:`${output}/open.png`});
  await moveTo(960,540);await moveTo(805,540);const camper=await me();
  const timer=(await read()).relay;await page.clock.runFor(Math.max(0,timer.closeAt-2400-timer.elapsed));
  assert.equal((await read()).relay.phase,'CLOSING');await page.screenshot({path:`${output}/closing.png`});
  const closing=(await read()).relay;await page.clock.runFor(Math.max(0,closing.closeAt-closing.elapsed)+3200);
  assert.equal((await read()).relay.phase,'COMPLETE');const clear=await me();assert.equal(clear.state,'ACTIVE');assert(Math.hypot(clear.x-camper.x,clear.y-camper.y)<80,'Safety walks to adjacent side, never teleports across the map');assert(clear.x<775||clear.x>835,'Camper must be outside gate');
  assert.deepEqual(errors,[]);await writeFile(`${output}/report.json`,JSON.stringify({sequence,final:await read(),errors},null,2));
  console.log('PASS actual keyboard movement, E650ms, mobile, pause, gates20s and real anti-camp egress; no page errors.');
}catch(error){if(page){await page.screenshot({path:`${output}/failure.png`});await writeFile(`${output}/failure.txt`,String(error)+'\n'+await page.locator('body').innerText());}throw error;}
finally{await browser?.close();await server.close();}
