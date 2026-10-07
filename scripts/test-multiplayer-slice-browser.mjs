// Actual game/runtime/WebRTC. Only isolated QA contexts and normal UI controls.
import fs from 'node:fs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE||'playwright');
const humans=Number(process.env.BENTENG_HUMANS||2),complete=process.env.BENTENG_COMPLETE_MATCH==='1';
if(![2,3,4].includes(humans)||complete&&humans!==2)throw Error('Use2–4 humans; complete slice currently tests2.');
const browser=await chromium.launch({headless:true,...(process.env.BENTENG_CHROME_PATH?{executablePath:process.env.BENTENG_CHROME_PATH}:{})});
const contexts=[],pages=[],errors=[],base=process.env.BENTENG_TEST_URL||'http://127.0.0.1:3026/bentengan-squad-tag/';
const read=page=>page.evaluate(()=>window.__bentengGameCore?.readState());
const metrics=page=>page.evaluate(()=>window.__bentengGameCore?.readNetwork());
const characters=['raja','kaka','bebe','ciici'],directions=['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function routeToEnemyBase(page){
  await page.getByRole('button',{name:/^overall$/i}).click();
  const target=await page.evaluate(()=>{
    const probe=window.__bentengGameCore,s=probe.readState(),a=probe.readArena(),me=s.entities[0],base=s.objective.bases[me.team==='red'?'green':'red'];
    const canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect(),scale=Math.min(r.width/a.width,r.height/a.height);
    return {x:r.left+r.width/2+(base.x-a.width/2)*scale,y:r.top+r.height/2+(base.y-a.height/2)*scale};
  });
  await page.mouse.click(target.x,target.y);
}
fs.mkdirSync('outputs',{recursive:true});
try{
  for(let index=0;index<humans;index++){
    const context=await browser.newContext({viewport:{width:1280,height:800}});contexts.push(context);
    const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
    await page.getByLabel('USERNAME',{exact:true}).fill(`SliceQA${index}`);await page.getByRole('button',{name:'CONFIRM',exact:true}).click();
    await page.getByRole('button',{name:'MULTIPLAYER · LOBBY',exact:true}).click();
    const arenaSelect=page.getByLabel('Arena multiplayer',{exact:true}),requestedArena=process.env.BENTENG_ARENA_ID||'kampung';
    await arenaSelect.waitFor();await arenaSelect.locator('option').first().waitFor({state:'attached'});
    const availableArenas=await arenaSelect.locator('option').evaluateAll(options=>options.map(option=>option.value));
    const arenaId=availableArenas.includes(requestedArena)?requestedArena:!process.env.BENTENG_ARENA_ID&&availableArenas.includes('studio-edit-kampung')?'studio-edit-kampung':null;
    if(!arenaId)throw Error(`QA arena ${requestedArena} unavailable; set BENTENG_ARENA_ID to an active arena. Available: ${availableArenas.join(', ')}`);
    await arenaSelect.selectOption(arenaId);await page.getByLabel('Nama pemain',{exact:true}).fill(`Peer${index}`);
  }
  const host=pages[0];await host.getByRole('button',{name:'HOST MATCH',exact:true}).click();await host.locator('dialog code').waitFor();
  const code=await host.locator('dialog code').textContent();
  const invitation=await host.getByLabel('Link undangan (arena otomatis)',{exact:true}).inputValue();
  for(let index=1;index<humans;index++){
    const page=pages[index];await page.getByRole('button',{name:'Gabung room',exact:true}).click();
    await page.getByLabel('Kode atau link undangan dari host',{exact:true}).fill(process.env.BENTENG_INVITE_CODE_ONLY==='1'?code:invitation);
    if(process.env.BENTENG_INVITE_CODE_ONLY!=='1'&&!await page.getByLabel('Arena multiplayer',{exact:true}).isDisabled())throw Error('Invite did not select/lock host arena');
    await page.getByRole('button',{name:'JOIN MATCH',exact:true}).click();
    await page.getByText('Lobby terhubung',{exact:false}).waitFor({timeout:25000});
    await page.getByLabel('Tim',{exact:true}).selectOption(index%2?'green':'red');
    await page.getByLabel('Karakter',{exact:true}).selectOption(characters[index]);
    await host.getByText(`${index%2?'HIJAU':'MERAH'} · ${characters[index].toUpperCase()} · BELUM SIAP`,{exact:true}).waitFor();
    await page.getByLabel('Saya siap',{exact:false}).check();
  }
  await host.getByRole('button',{name:'MULAI PERSIAPAN ROOM',exact:true}).click();
  for(const page of pages)await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',{},{timeout:20000});
  let state=await read(host);const identities=characters.slice(0,humans).map(character=>state.entities.find(p=>p.characterId===character&&p.controller!=='bot'));
  if(identities.some(p=>!p)||new Set(identities.map(p=>p.entityId)).size!==humans||state.entities.filter(p=>p.controller==='bot').length!==10-humans)throw Error('Incorrect human/bot roster');
  for(let index=0;index<humans;index++){const s=await read(pages[index]);if(s.entities[0].entityId!==identities[index].entityId)throw Error('Wrong controlled entity');await pages[index].keyboard.down(directions[index]);}
  const before=state.entities.map(p=>({id:p.entityId,x:p.x,y:p.y}));
  await host.waitForFunction(({ids,before})=>{const s=window.__bentengGameCore.readState();return ids.every((id,index)=>{
    const p=s.entities.find(p=>p.entityId===id),old=before.find(p=>p.id===id);
    if(!['IN_BASE','ACTIVE'].includes(p.state))return false;
    return [p.x-old.x,old.x-p.x,p.y-old.y,old.y-p.y][index]>20;
  });},{ids:identities.map(p=>p.entityId),before},{timeout:15000});
  for(let index=0;index<humans;index++)await pages[index].keyboard.up(directions[index]);
  await delay(3000);const measurement=await metrics(host); // real wall time, not accelerated clock
  fs.writeFileSync(`outputs/multiplayer-${humans}-humans-metrics.json`,JSON.stringify(measurement,null,2));
  console.log(JSON.stringify({stage:'movement',humans,measurement}));
  if(complete){
    const deadline=Date.now()+240000;let routedRound=0,lastStatus='',lastR=0;
    while(Date.now()<deadline){
      state=await read(host);if(!state)throw Error('Host runtime ended unexpectedly');
      const status=`${state.phase}:${state.round}`;
      if(status!==lastStatus){console.log(JSON.stringify({stage:'match',phase:state.phase,round:state.round,timer:state.timeRemainingSeconds}));lastStatus=status;}
      if(state.phase==='MATCH_OVER')break;
      if(state.phase==='PLAYING'){
        if(routedRound!==state.round&&state.entities[0].state!=='PRISONER'){await routeToEnemyBase(host);routedRound=state.round;}
        for(const page of pages){const s=await read(page),me=s?.entities[0];if(!me)continue;
          if(me.ultimateMeter>=99.9&&me.state==='ACTIVE')await page.keyboard.press('CapsLock',{delay:100});
          if(me.state==='PRISONER'&&Date.now()-lastR>1500){await page.keyboard.press('r',{delay:100});lastR=Date.now();}
        }
        const clientState=await read(pages[1]);
        if(clientState.entities[0].state==='ACTIVE'||clientState.entities[0].state==='IN_BASE')await pages[1].keyboard.down('ArrowLeft');
        else await pages[1].keyboard.up('ArrowLeft');
        // A rescue clears mouse routing; restore it if host stopped or returned.
        const me=state.entities[0];if(me.state==='RETURNING'||me.state==='PRISONER')routedRound=0;
      }
      await delay(300);
    }
    if(state.phase!=='MATCH_OVER')throw Error('No completed real match within240 seconds');
    await pages[1].keyboard.up('ArrowLeft');
    for(const page of pages)await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='MATCH_OVER',{},{timeout:10000});
    const client=await read(pages[1]);if(client.result?.winner!==state.result?.winner)throw Error('Winner differs');
    const rewards=[];
    for(let index=0;index<humans;index++){
      await pages[index].locator('.match-progression-summary').waitFor({timeout:10000});
      const text=await pages[index].locator('.match-progression-summary').innerText();if(!/XP TOTAL/.test(text)||!/DOI/.test(text)||/belum tersedia/.test(text))throw Error('Progression handoff missing');
      rewards.push(text);await pages[index].screenshot({path:`outputs/multiplayer-slice-result-${index}.png`,fullPage:true});
    }
    const result={status:'PASS',humans,completedMatch:true,matchId:state.matchId,winner:state.result.winner,reason:state.result.reason,score:state.teams,
      stats:state.matchStats,rewards,measurement,finalMeasurement:await metrics(host),pageErrors:errors};
    fs.writeFileSync('outputs/multiplayer-two-player-slice.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }else {
    for(let index=1;index<humans-1;index++){
      await pages[index].close();const id=identities[index].entityId;
      await host.waitForFunction(id=>window.__bentengGameCore.readState().entities.find(p=>p.entityId===id)?.controller==='bot',id,{timeout:25000});
      const s=await read(host),p=s.entities.find(p=>p.entityId===id);if(p.characterId!==identities[index].characterId||s.entities.length!==10)throw Error('Takeover replaced identity');
    }
    const survivor=pages.at(-1);await survivor.keyboard.down('ArrowUp');await delay(1000);await survivor.keyboard.up('ArrowUp');
    const s=await read(host);if(s.entities.filter(p=>p.controller==='bot').length!==8||s.entities.filter(p=>p.controller==='remote').length!==1)throw Error('Incorrect individual takeover count');
    await host.close();await survivor.getByRole('alert').filter({hasText:'HOST DISCONNECTED'}).waitFor({timeout:25000});
    console.log(JSON.stringify({status:'PASS',humans,individualTakeovers:humans-2,botFill:true,ownership:true,hostDisconnect:true,measurement,pageErrors:errors}));
  }
  if(errors.length)throw Error(errors.join('; '));
}catch(error){
  const details=[];for(const context of contexts)for(const page of context.pages())details.push({body:await page.locator('body').innerText().catch(()=>''),state:await read(page).catch(()=>null)});
  fs.writeFileSync(`outputs/multiplayer-slice-${humans}-failure.json`,JSON.stringify({error:String(error),details,pageErrors:errors},null,2));
  console.error(JSON.stringify({status:'FAIL',humans,error:String(error),pageErrors:errors}));process.exitCode=1;
}finally{for(const context of contexts)await context.close();await browser.close();}
