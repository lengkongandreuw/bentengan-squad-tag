import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const {chromium}=await import('file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0,watch:null}});
let browser;const errors=[],report=[];
try{
 await mkdir('outputs/home-menu',{recursive:true});await server.listen();
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 for(const [width,height]of [[1920,1080],[1366,768],[844,390],[375,812]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().includes('/home-menu/')&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(()=>localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'home-qa',username:'HomeQA',firstJoin:'2026-10-23',menang:0,kalah:0,kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:0,unlockedCharacters:['raja','kaka'],unlockedArenaIds:['kampung'],arenaStats:{},processedMatchIds:[]},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-23',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}})));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);
  const visibleBounds=async selector=>{
   for(const rect of await page.locator(selector).evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};}))){
    assert(rect.x>=-1&&rect.y>=-1&&rect.right<=width+1&&rect.bottom<=height+1,`${width}x${height} ${selector}: ${JSON.stringify(rect)}`);
    assert(rect.w>=24&&rect.h>=24);
   }
  };
  await page.locator('.enter-game').waitFor();await page.waitForTimeout(500);
  assert.match(await page.locator('.splash-logo').getAttribute('src'),/home-menu\/logo\.webp$/);
  assert.equal(await page.locator('.home-version').count(),0,'version is baked into supplied logo');
  await page.locator('.comic-home').evaluate(async root=>Promise.all([...root.querySelectorAll('img')].map(i=>i.decode())));
  await visibleBounds('.enter-game,.home-actions button,.profile-trigger');
  await page.screenshot({path:`outputs/home-menu/home-${width}.png`});
  await page.getByRole('button',{name:'HOW TO PLAY',exact:true}).click();await page.locator('.rules-overlay:modal').waitFor();await page.keyboard.press('Escape');
  assert.equal(await page.locator('.enter-game').count(),1,'Rules activation cannot trigger Play');
  await page.getByRole('button',{name:'CREDITS',exact:true}).click();await page.locator('.developer-credits:modal').waitFor();
  assert.match(await page.locator('.developer-credits .menu-art-back img').getAttribute('src'),/home-menu\/back\.webp$/);
  await page.locator('.developer-credits .menu-art-back').click();
  await page.getByRole('button',{name:'SETTINGS',exact:true}).click();await page.locator('.home-settings-dialog:modal').waitFor();
  await page.getByText('AUDIO & LANGUAGE',{exact:true}).click();await page.locator('.audio-settings-art-panel:modal').waitFor();
  await page.keyboard.press('Escape');assert(await page.locator('.home-settings-dialog').evaluate(d=>d.open));
  await page.getByRole('button',{name:'Graphics settings',exact:true}).click();await page.locator('.graphics-settings-panel:modal').waitFor();await page.keyboard.press('Escape');
  assert(await page.locator('.home-settings-dialog').evaluate(d=>d.open));
  await page.keyboard.press('Escape');assert(await page.getByRole('button',{name:'SETTINGS',exact:true}).evaluate(b=>b===document.activeElement));
  await page.locator('.enter-game').click();await page.locator('.mode-campaign').waitFor();await page.waitForTimeout(500);
  await page.locator('.mode-select-screen').evaluate(async root=>Promise.all([...root.querySelectorAll('img')].map(i=>i.decode())));
  await visibleBounds('.mode-card,.graffiti-back,.profile-trigger');await page.screenshot({path:`outputs/home-menu/modes-${width}.png`});
  await page.locator('.mode-campaign').focus();await page.keyboard.press('ArrowDown');assert(await page.locator('.mode-online').evaluate(b=>b===document.activeElement));
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Underdevelopment',exact:true}).waitFor();
  await page.waitForTimeout(400);await visibleBounds('.custom-room-card button');await page.screenshot({path:`outputs/home-menu/custom-${width}.png`});
  await page.locator('.custom-room-card').getByRole('button',{name:'Back',exact:true}).click();await page.locator('.mode-campaign').waitFor();
  await page.locator('.mode-online').click();await page.locator('.multiplayer-panel').waitFor();await page.keyboard.press('Escape');
  await page.locator('.mode-campaign').click();await page.getByRole('button',{name:'Choose Tim Merah',exact:true}).waitFor();
  const checkBack=async()=>{assert.match(await page.locator('.graffiti-back img').getAttribute('src'),/home-menu\/back\.webp$/);await visibleBounds('.graffiti-back');};
  await checkBack();await page.waitForTimeout(550);await page.screenshot({path:`outputs/home-menu/team-${width}.png`});
  await page.getByRole('button',{name:'Choose Tim Merah',exact:true}).click();await page.locator('.character-panel-select').waitFor({timeout:90000});
  await checkBack();await page.waitForTimeout(550);await page.screenshot({path:`outputs/home-menu/character-${width}.png`});
  await page.locator('.character-panel-select').click();await page.locator('.map-start-match').waitFor();await checkBack();
  await page.waitForTimeout(550);await page.screenshot({path:`outputs/home-menu/field-${width}.png`});
  await page.locator('.graffiti-back').click();await page.locator('.character-panel-select').waitFor();
  await page.locator('.graffiti-back').click();await page.getByRole('button',{name:'Choose Tim Merah',exact:true}).waitFor();
  await page.locator('.graffiti-back').click();await page.locator('.mode-campaign').waitFor();
  // Input remains live during a reveal. Rapid back/forward must not queue timers.
  await page.locator('.mode-campaign').click();await page.keyboard.press('Escape');await page.locator('.mode-campaign').waitFor();
  assert.equal(await page.locator('.menu-reveal').count(),1);assert.equal(await page.locator('.menu-reveal').evaluate(n=>getComputedStyle(n).pointerEvents),'none');
  await page.keyboard.press('Escape');await page.locator('.enter-game').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.enter-game').click();
  assert.equal(await page.locator('.mode-card').first().evaluate(b=>getComputedStyle(b).animationName),'none');
  assert.equal(await page.locator('.menu-reveal').evaluate(n=>getComputedStyle(n).display),'none');
  if(width===1366){
   await page.locator('.mode-campaign').click();await page.getByRole('button',{name:'Choose Tim Merah',exact:true}).click();
   await page.locator('.character-panel-select').click({timeout:90000});await page.locator('.map-start-match').click();
   await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
   await page.getByRole('button',{name:'Pause',exact:true}).click();await page.locator('.pause-overlay:modal').waitFor();
   await page.locator('.pause-hub-layout nav').getByRole('button',{name:'How to Play',exact:true}).click();
   const back=page.getByRole('button',{name:'Back to Pause',exact:true});
   assert.match(await back.locator('img').getAttribute('src'),/home-menu\/back\.webp$/);
   assert.equal(await back.evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)','old primary-button skin must not surround supplied Back');
   await visibleBounds('.pause-overlay .menu-art-back');await page.screenshot({path:'outputs/home-menu/pause-back.png'});
   await back.click();assert.equal(await page.locator('.pause-hub-layout nav button[aria-current="page"]').innerText(),'Overview');
  }
  report.push({width,height,navigation:true,settings:true,custom:true,reducedMotion:true});await context.close();console.log(`${width}x${height} PASS`);
 }
 assert.deepEqual(errors,[]);await writeFile('outputs/home-menu/report.json',JSON.stringify({report,errors},null,2));
}finally{await browser?.close();await server.close();}
