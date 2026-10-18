// Private real-game QA profile. Does not read or alter the user's browser/studios.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),errors=[];
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
try{
 await mkdir('outputs/mobile-controller',{recursive:true});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BENTENG_TEST_URL||'http://127.0.0.1:3046/bentengan-squad-tag/');
 await page.getByLabel('PLAYER NAME',{exact:true}).fill('TouchQA');await page.getByRole('button',{name:'SAVE NAME',exact:true}).click();await page.getByRole('button',{name:'SKIP',exact:true}).click();
 await page.getByRole('button',{name:/Choose Tim Merah/}).click();await page.locator('.character-panel-select').waitFor();
 for(const [width,height]of [[375,812],[320,568],[844,390]]){
  await page.setViewportSize({width,height});const strip=await page.locator('.unlock-progress-strip').boundingBox(),cta=await page.locator('.character-panel-select').boundingBox();
  assert(strip.y>=0&&strip.y+strip.height<=height,'unlock fits portrait and landscape');assert(!overlap(strip,cta),'unlock does not cover Select');
  await page.screenshot({path:`outputs/mobile-controller/selection-${width}.png`});
 }
 await page.locator('.character-panel-select').click();await page.locator('.map-arena-row').first().click();await page.locator('.map-start-match').click();
 await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
 const read=()=>page.evaluate(()=>{const s=window.__bentengGameCore.readState();return s.entities.find(p=>p.controller==='local');});
 const waitStopped=()=>page.waitForFunction(()=>{const p=window.__bentengGameCore.readState().entities.find(p=>p.controller==='local');return p.vx===0&&p.vy===0;},null,{timeout:4000});
 const cdp=await page.context().newCDPSession(page);
 const point=async(selector,id)=>{const r=await page.locator(selector).boundingBox();return {id,x:r.x+r.width/2,y:r.y+r.height/2};};
 const start=points=>cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
 const end=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const initial=await read();await start([await point('.touch-dpad button:nth-child(3)',1),await point('.touch-boost',2)]);
 await page.waitForFunction(()=>window.__bentengGameCore.readEffects().some(b=>b.id==='boost'),null,{timeout:3000});
 assert((await read()).x>initial.x,'movement+Sprint accepted together');
 const badge=await page.evaluate(()=>{const core=window.__bentengGameCore,p=core.readState().entities.find(a=>a.controller==='local'),b=core.readEffects().find(a=>a.actorId===p.entityId),v=core.readView();return {b,p,v};});
 assert(Math.abs(badge.b.x+badge.b.width/2-((badge.p.x-badge.v.x)*badge.v.scale+badge.v.width/2))<8,'status follows actual actor/camera');
 await page.screenshot({path:'outputs/mobile-controller/sprint-feedback.png'});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await page.waitForTimeout(250);
 await waitStopped();
 await start([await point('.touch-dpad button:nth-child(3)',1)]);await page.waitForTimeout(100);
 await page.setViewportSize({width:375,height:812});await waitStopped();await end();await waitStopped();
 for(const [width,height]of [[844,390],[640,360],[375,812],[320,568]]){
  await page.setViewportSize({width,height});const boxes=[];
  for(const button of await page.locator('.mobile-controls button').all()){
   const b=await button.boundingBox();assert(b.width>=48&&b.height>=48,'48px minimum target');assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,'controls fit');boxes.push(b);
  }
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert(!overlap({...boxes[i],x:boxes[i].x-3.9,y:boxes[i].y-3.9,width:boxes[i].width+7.8,height:boxes[i].height+7.8},boxes[j]),'8px target clearance');
  for(const hint of await page.locator('[data-hud-zone=context]').all())if(await hint.isVisible()){const b=await hint.boundingBox();for(const c of boxes)assert(!overlap(b,c),'context does not cover thumbs');}
  assert.equal(await page.locator('.game-topbar button').count(),1,'Pause is the sole live utility');
  assert.equal(await page.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight/2)?.tagName),'CANVAS','middle remains playable');
  const left=await page.locator('.touch-dpad').boundingBox(),right=await page.locator('.touch-actions').boundingBox();
  assert.equal(await page.evaluate(x=>document.elementFromPoint(x,innerHeight-30)?.tagName,(left.x+left.width+right.x)/2),'CANVAS','gap between thumb islands is not a pointer blocker');
  await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:`outputs/mobile-controller/game-${width}x${height}.png`});
 }
 await page.setViewportSize({width:844,height:390});await start([await point('.touch-dpad button:nth-child(3)',1)]);await page.waitForTimeout(100);
 await page.getByRole('button',{name:'Pause',exact:true}).click();await end();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.waitForTimeout(250);
 await waitStopped();
 assert.deepEqual(errors,[]);console.log('Mobile controller PASS: portrait/landscape/320px, target spacing, canvas hit testing, real multi-touch Sprint/status, cancel/rotation/Pause release.');
}finally{await browser.close();}
