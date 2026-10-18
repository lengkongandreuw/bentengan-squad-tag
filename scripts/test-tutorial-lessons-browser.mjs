import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE||'playwright');
const port=process.env.BENTENG_TUTORIAL_TEST_PORT||'3040';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','vite.github.config.ts','--host','127.0.0.1','--port',port,'--strictPort'],{windowsHide:true,stdio:'ignore'});
const browser=await chromium.launch({headless:true,...(process.env.BENTENG_CHROME_PATH?{executablePath:process.env.BENTENG_CHROME_PATH}:{})});
const url=`http://127.0.0.1:${port}/bentengan-squad-tag/`,errors=[];
let page;
const mobile=process.argv[2]==='mobile';
try{
  for(let i=0;i<60;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  await fs.mkdir('outputs/tutorial-lessons',{recursive:true});
  page=await browser.newPage({viewport:mobile?{width:844,height:390}:{width:1366,height:768},hasTouch:mobile,isMobile:mobile});page.on('pageerror',e=>errors.push(e.message));
  const touchSession=mobile?await page.context().newCDPSession(page):null;
  const holdTouch=async(locator,ms=150)=>{const box=await locator.boundingBox();await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width/2,y:box.y+box.height/2}]});await page.waitForTimeout(ms);await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  const holdDirections=async(indices,ms)=>{const points=[];for(const [id,index]of indices.entries()){const box=await page.locator('.touch-dpad button').nth(index).boundingBox();if(!box)return;points.push({id,x:box.x+box.width/2,y:box.y+box.height/2});}await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await page.waitForTimeout(ms);await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});};
  await page.goto(url);await page.getByLabel('PLAYER NAME',{exact:true}).fill('LessonQA');await page.getByRole('button',{name:'SAVE NAME',exact:true}).click();await page.getByRole('button',{name:'START TUTORIAL',exact:true}).click();
  await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',{},{timeout:90000});
  const read=()=>page.evaluate(()=>({step:JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).tutorial.currentStepId,state:window.__bentengGameCore.readState(),view:window.__bentengGameCore.readView(),goal:JSON.parse(document.querySelector('.playing-shell canvas').dataset.tutorialGoal)}));
  const clickGoal=async()=>{const data=await read(),box=await page.locator('.playing-shell canvas').boundingBox(),p=data.goal.point;if(!p)return;
    if(mobile){
      const human=data.state.entities.find(p=>p.controller==='local'),dx=p.x-human.x,dy=p.y-human.y;
      const indices=[];if(Math.abs(dx)>10)indices.push(dx>0?2:1);if(Math.abs(dy)>10)indices.push(dy>0?3:0);
      if(!indices.length)return;
      await holdDirections(indices,Math.max(50,Math.min(160,Math.hypot(dx,dy)/220*1000)));return;
    }
    const x=Math.max(box.x+20,Math.min(box.x+box.width-20,box.x+box.width/2+(p.x-data.view.x)*data.view.scale));
    const y=Math.max(box.y+70,Math.min(box.y+box.height-20,box.y+box.height/2+(p.y-data.view.y)*data.view.scale));
    const human=data.state.entities.find(p=>p.controller==='local'),hx=box.x+box.width/2+(human.x-data.view.x)*data.view.scale,hy=box.y+box.height/2+(human.y-data.view.y)*data.view.scale;
    for(const fraction of [1,.75,.5,.25]){
      const px=hx+(x-hx)*fraction,py=hy+(y-hy)*fraction;
      if(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName==='CANVAS',{x:px,y:py})){if(mobile)await page.touchscreen.tap(px,py);else await page.mouse.click(px,py);return;}
    }
  };
  const drive=async(until,limit=60000)=>{const began=Date.now();while(Date.now()-began<limit){const d=await read();if(until(d))return d;await clickGoal();await page.waitForTimeout(500);}throw Error('Lesson drive timed out: '+JSON.stringify(await read()));};
  const profileRead=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')));
  const retryLesson=async()=>{
    await page.getByRole('button',{name:'Tutorial help',exact:true}).click();
    await page.locator('.pause-overlay:modal').waitFor();
    assert(await page.getByRole('heading',{name:'How to Play',exact:true}).isVisible(),'? opens paused Help');
    await page.getByRole('button',{name:'RETRY LESSON',exact:true}).click();
    await page.locator('.pause-overlay').waitFor({state:'detached'});
  };
  let completedAt;
  for(const replay of [false,true]){
  if(replay){
    await page.reload();assert.equal(await page.locator('.tutorial-entry').count(),0,'completion suppresses first-time offer');
    await page.getByRole('button',{name:'TUTORIAL',exact:true}).click();
    await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',{},{timeout:90000});
    assert.equal((await profileRead()).tutorial.status,'completed','lifetime completion survives active replay');
  }
  await page.getByRole('button',{name:'GOT IT',exact:true}).click();
  if(mobile)await holdTouch(page.locator('.touch-dpad button').nth(2),50);else {await page.keyboard.down('d');await page.waitForTimeout(50);await page.keyboard.up('d');}assert.equal((await read()).step,'move','tiny input cannot complete move');
  await drive(d=>d.step==='sprint');
  assert.match(await page.locator('.tutorial-coach').innerText(),/Sprint.*moving/s,'the goal cannot hide the Sprint instruction');
  await page.screenshot({path:`outputs/tutorial-lessons/${mobile?'mobile':'desktop'}-sprint-instruction.png`});
  await retryLesson();await page.waitForTimeout(250);
  assert.equal(await page.locator('.playing-shell canvas').evaluate(node=>node===document.activeElement),true,'Retry restores game focus, not the button');
  if(!mobile){
    // Deliberately use the real shortcut after Retry, with no click-to-move or blur workaround.
    await page.keyboard.down('d');await page.keyboard.down(' ');await page.waitForTimeout(700);await page.keyboard.up(' ');await page.keyboard.up('d');
    assert.equal((await read()).step,'parkour','Space after Retry sprints instead of retrying again');
  }
  if(mobile){await holdTouch(page.locator('.touch-boost'));await drive(d=>d.step==='parkour',10000);}
  await page.waitForFunction(()=>{const learned=JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).tutorial.learned??[];return learned.includes('movement')&&learned.includes('sprint');},null,{timeout:3000});
  await drive(d=>d.goal.en.startsWith('Face across'));
  await page.screenshot({path:`outputs/tutorial-lessons/${mobile?'mobile':'desktop'}-destination-marker.png`});
  if(process.env.BENTENG_TUTORIAL_VISUAL_ONLY==='1'){assert.deepEqual(errors,[]);console.log('Sprint instruction, Retry→game focus, and destination marker visual smoke PASS');break;}
  if(mobile){
    const direction=await page.locator('.touch-dpad button').last().boundingBox(),jump=await page.locator('.touch-actions button[aria-label="Parkour"]').boundingBox();
    const down={id:1,x:direction.x+direction.width/2,y:direction.y+direction.height/2};
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[down]});await page.waitForTimeout(40);
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[down,{id:2,x:jump.x+jump.width/2,y:jump.y+jump.height/2}]});await page.waitForTimeout(150);
    await touchSession.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  else {await page.keyboard.down('s');await page.waitForTimeout(40);await page.keyboard.down('Shift');await page.waitForTimeout(150);await page.keyboard.up('Shift');await page.keyboard.up('s');}
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).tutorial.currentStepId==='tag_enemy',{},{timeout:10000});
  console.log('Meaningful move, real sprint and barrier traversal PASS');
  await drive(d=>d.step==='observe_prison');
  await drive(d=>d.goal.prisonReady,90000);
  const captured=await read(),friend=captured.state.entities.find(p=>p.characterId==='robot');assert.equal(friend.state,'PRISONER');
  assert.ok(captured.state.entities.find(p=>p.controller==='local').state!=='PRISONER');
  await page.screenshot({path:'outputs/tutorial-lessons/prison.png'});
  await page.getByRole('button',{name:'GOT IT',exact:true}).click();
  await drive(d=>d.step==='ultimate',90000);
  const rescued=await read();assert.notEqual(rescued.state.entities.find(p=>p.characterId==='robot').state,'PRISONER');
  const human=rescued.state.entities.find(p=>p.controller==='local');assert.equal(rescued.state.matchStats[human.entityId].tags,1);assert.equal(rescued.state.matchStats[human.entityId].rescues,1);
  await retryLesson();await page.waitForTimeout(250);
  assert.equal((await read()).step,'ultimate','retry cannot complete a lesson');
  await drive(d=>d.state.entities.find(p=>p.controller==='local').state==='ACTIVE');
  if(mobile)await holdTouch(page.locator('.touch-ultimate'));else {await page.keyboard.down('CapsLock');await page.waitForTimeout(150);await page.keyboard.up('CapsLock');}await page.waitForTimeout(500);
  assert.equal((await read()).step,'ultimate','cast start must not advance the lesson');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')).tutorial.currentStepId==='capture_benteng',{},{timeout:15000});
  if(!replay)await page.evaluate(()=>{window.__tutorialOriginalSet=Object.getOwnPropertyDescriptor(Storage.prototype,'setItem').value;Storage.prototype.setItem=function(key,value){if(key==='bentengan-player-profile-v1'&&JSON.parse(value).tutorial?.rewardClaimed)throw Error('QA storage blocked');return window.__tutorialOriginalSet.call(this,key,value);};});
  await drive(d=>d.state.phase==='MATCH_OVER',120000);
  const finished=await read();assert.equal(finished.step,'reward');assert.equal(finished.state.result.reason,'BENTENG DIREBUT');assert.equal(finished.state.result.winner,'red');
  const profile=await profileRead();assert.equal(profile.progression.xp,replay?100:0);assert.equal(profile.economy.tokenBalance,replay?10:0);assert.equal(profile.kda.tagMusuh,0);
  const finish=page.locator('.tutorial-finish');await finish.waitFor();
  if(!replay){
    await finish.getByRole('button',{name:'RETRY SAVE',exact:true}).waitFor();
    assert.ok(await finish.getByRole('alert').count());assert.equal((await profileRead()).progression.xp,0);assert.equal((await profileRead()).tutorial.rewardClaimed,false);
    await page.evaluate(()=>{Storage.prototype.setItem=window.__tutorialOriginalSet;});
    await finish.getByRole('button',{name:'RETRY SAVE',exact:true}).click();
  }
  await finish.getByRole('button',{name:'LET’S PLAY',exact:true}).waitFor();
  assert.equal(await finish.getByRole('button',{name:'CONTINUE',exact:true}).count(),0,'no forced education screens');
  assert.ok((await finish.innerText()).includes(replay?'+0 XP':'+100 XP'));
  assert.ok((await finish.innerText()).includes(replay?'+0 DOI':'+10 DOI'));
  const rewarded=await profileRead();assert.equal(rewarded.progression.xp,100);assert.equal(rewarded.economy.tokenBalance,10);
  assert.equal(rewarded.tutorial.rewardClaimed,true);assert.equal(rewarded.menang,0);assert.equal(rewarded.kalah,0);assert.deepEqual(rewarded.progression.arenaStats,{});
  const box=await finish.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=page.viewportSize().width,'reward panel fits viewport');
  assert.ok(Math.abs(box.x+box.width/2-page.viewportSize().width/2)<2,'reward panel centered horizontally');
  assert.ok(Math.abs(box.y+box.height/2-page.viewportSize().height/2)<2,'reward panel centered vertically');
  const primaryBox=await finish.getByRole('button',{name:'LET’S PLAY',exact:true}).boundingBox();assert.ok(primaryBox.y>=box.y&&primaryBox.y+primaryBox.height<=box.y+box.height,'primary action never hidden below reward scroll');
  for(const button of await finish.getByRole('button').all())assert.ok((await button.boundingBox()).height>=44);
  assert.equal(await finish.getByRole('button',{name:'LET’S PLAY',exact:true}).evaluate(node=>document.activeElement===node),true,'focus stays on the visible primary control');
  if(mobile){
    await page.setViewportSize({width:375,height:812});assert.ok((await finish.boundingBox()).width<=343);await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(async()=>{(await import('/bentengan-squad-tag/lib/language.ts')).setLanguage('id');});assert.ok((await finish.innerText()).includes('Saldo DOI'));
    await page.evaluate(async()=>{(await import('/bentengan-squad-tag/lib/language.ts')).setLanguage('en');});await page.setViewportSize({width:844,height:390});
  }
  await page.screenshot({path:`outputs/tutorial-lessons/${process.argv[2]||'desktop'}-${replay?'replay':'first'}-reward.png`});
  await finish.locator('summary').click();assert.ok((await finish.innerText()).toUpperCase().includes('BEBE'));
  assert.ok((await finish.innerText()).includes('100 / 200 XP'));assert.ok(!rewarded.progression.unlockedCharacters.includes('bebe'));
  assert.ok((await finish.innerText()).includes('regular matches'));
  await page.screenshot({path:`outputs/tutorial-lessons/${process.argv[2]||'desktop'}-arena-education.png`});
  if(!replay){
    await page.evaluate(()=>{Storage.prototype.setItem=function(key,value){if(key==='bentengan-player-profile-v1'&&JSON.parse(value).tutorial?.status==='completed')throw Error('QA completion blocked');return window.__tutorialOriginalSet.call(this,key,value);};});
    await finish.getByRole('button',{name:'LET’S PLAY',exact:true}).click();assert.ok(await finish.getByRole('alert').count());assert.equal((await profileRead()).tutorial.status,'in_progress');
    await page.evaluate(()=>{Storage.prototype.setItem=window.__tutorialOriginalSet;});
  }
  await finish.getByRole('button',{name:'LET’S PLAY',exact:true}).click();
  const done=await profileRead();assert.equal(done.tutorial.status,'completed');assert.equal(done.tutorial.sessionActive,false);assert.equal(done.tutorial.rewardClaimed,true);
  if(replay)assert.equal(done.tutorial.completedAt,completedAt);else completedAt=done.tutorial.completedAt;
  assert.ok(await page.locator('.pregame-shell.step-team').count());
  await page.screenshot({path:'outputs/tutorial-lessons/rescued.png'});assert.deepEqual(errors,[]);
  console.log('Human tag Ciici, real Kaka→Robot capture, real human rescue Robot, exact stats and zero ordinary rewards PASS');
  console.log(`${replay?'Replay':'First completion'}: complete real lessons, reward once, education, persisted completion and normal team-selection CTA PASS`);
  }
}catch(error){if(page){await page.screenshot({path:'outputs/tutorial-lessons/failure.png'}).catch(()=>{});console.log(await page.evaluate(()=>({text:document.body.innerText,profile:JSON.parse(localStorage.getItem('bentengan-player-profile-v1')),state:window.__bentengGameCore?.readState()})).catch(()=>null));}throw error;}
finally{await browser.close();server.kill();}
