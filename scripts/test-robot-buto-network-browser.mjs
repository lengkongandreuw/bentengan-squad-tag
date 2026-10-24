// Real WebRTC + game controls. No simulation/timer/profile setters in the game.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import('file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0,watch:null}});
const contexts=[],pages=[],errors=[],reports=[];let browser;
const read=p=>p.evaluate(()=>window.__bentengGameCore?.readState());
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 await mkdir('outputs/robot-buto-phase05-07',{recursive:true});await server.listen();
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(let i=0;i<2;i++){
  const context=await browser.newContext({viewport:{width:1366,height:768}});contexts.push(context);
  await context.addInitScript(()=>{if(!localStorage.getItem('bentengan-player-profile-v1'))localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'network-ultimate-qa',username:'NetworkQA',firstJoin:'2026-10-23',menang:0,kalah:0,kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:6000,unlockedCharacters:['raja','kaka','robot','buto'],unlockedArenaIds:['kampung'],arenaStats:{},processedMatchIds:[]},economy:{version:1,tokenBalance:1000,lifetimeTokenEarned:1000,lifetimeTokenSpent:0,recentTransactions:[]},ultimateUpgrades:{version:1,levels:{robot:3,buto:3}},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-23',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}}));});
  const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);
  await page.locator('.enter-game').click();await page.locator('.mode-online').click();
  const arena=page.getByLabel('Multiplayer arena',{exact:true});await arena.locator('option').first().waitFor({state:'attached'});
  const options=await arena.locator('option').evaluateAll(list=>list.map(o=>o.value));await arena.selectOption(options.includes('kampung')?'kampung':'studio-edit-kampung');
  await page.getByLabel('Player name',{exact:true}).fill(i?'Buto QA':'Robot QA');
 }
 const [host,client]=pages;await host.getByRole('button',{name:'CREATE ROOM',exact:true}).click();await host.locator('dialog code').waitFor();
 const code=await host.locator('dialog code').textContent();await client.getByRole('button',{name:'Got a code?',exact:true}).click();
 await client.getByLabel('Room code or invite link',{exact:true}).fill(code);await client.getByRole('button',{name:'JOIN ROOM',exact:true}).click();
 await client.getByText('Lobby connected',{exact:false}).waitFor({timeout:35000});
 await host.getByLabel('Team',{exact:true}).selectOption('red');await host.getByLabel('Character',{exact:true}).selectOption('robot');
 await client.getByLabel('Team',{exact:true}).selectOption('green');await client.getByLabel('Character',{exact:true}).selectOption('buto');
 await host.getByText('HIJAU · BUTO · NOT READY',{exact:true}).waitFor();await host.getByLabel('Ready to play',{exact:false}).check();await client.getByLabel('Ready to play',{exact:false}).check();
 await host.getByRole('button',{name:'START MATCH',exact:true}).click();
 for(const p of pages)await p.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
 console.log('Real Robot/Buto WebRTC match started; charging through normal gameplay.');
 const started=Date.now(),ids=(await read(host)).entities.filter(p=>p.controller!=='bot').map(p=>p.entityId);
 const seen=new Map(),clientSeen=new Set(),until=Date.now()+100000;
 while(Date.now()<until&&(seen.size<2||clientSeen.size<2)){
  const state=await read(host),cs=await read(client);assert.notEqual(state.phase,'MATCH_OVER','match ended before the ultimate smoke test');
  for(const effect of cs.ultimate.actors??[])if(effect.jammerUntil>cs.observedAtMs||effect.driveUntil>cs.observedAtMs)clientSeen.add(effect.actorId);
  for(let index=0;index<2;index++){
   const p=state.entities.find(p=>p.entityId===ids[index]);if(!p||seen.has(p.entityId))continue;
   if(state.phase==='PLAYING'&&p.ultimateMeter>=99.9){
    const page=p.characterId==='robot'?host:client;
    if(p.state==='ACTIVE'){await page.keyboard.down('CapsLock');await wait(90);await page.keyboard.up('CapsLock');}
    else if(p.state==='IN_BASE'){await page.keyboard.down('s');await wait(120);await page.keyboard.up('s');}
   }
  }
  const after=await read(host);
  for(const effect of after.ultimate.actors??[]){
   const p=after.entities.find(p=>p.entityId===effect.actorId),deadline=effect.jammerUntil||effect.driveUntil;
   if(deadline>after.observedAtMs&&!seen.has(effect.actorId)){
    assert(deadline-after.observedAtMs<=4000,'online ignores local purchased level and uses host base');seen.set(effect.actorId,{id:p.characterId,deadline});
    await (p.characterId==='robot'?host:client).screenshot({path:`outputs/robot-buto-phase05-07/network-${p.characterId}.png`});
    reports.push({character:p.characterId,hostApplied:true,onlineDurationMs:4000});console.log(`${p.characterId} host-authoritative effect observed`);
   }
  }
  await wait(80);
 }
 assert.equal(seen.size,2,JSON.stringify({elapsed:Date.now()-started,state:await read(host)}));assert.equal(clientSeen.size,2,'client received both independent actor effects');
 await wait(4500);const end=await read(client);for(const row of end.ultimate.actors)assert(row.jammerUntil<=end.observedAtMs&&row.driveUntil<=end.observedAtMs);
 assert.deepEqual(errors,[]);await writeFile('outputs/robot-buto-phase05-07/network-report.json',JSON.stringify({reports,clientSawBoth:true,expired:true,errors},null,2));
 console.log('Robot/Buto real multiplayer activation, snapshots and expiry PASS');
}catch(error){
 await writeFile('outputs/robot-buto-phase05-07/network-failure.json',JSON.stringify({message:error.message,states:await Promise.all(pages.map(p=>read(p).catch(()=>null))),bodies:await Promise.all(pages.map(p=>p.locator('body').innerText().catch(()=>''))),errors},null,2));throw error;
}finally{for(const c of contexts)await c.close();await browser?.close();await server.close();}
