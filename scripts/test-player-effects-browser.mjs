import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 await mkdir('outputs/player-effects',{recursive:true});
 for(const [width,height]of [[1366,768],[844,390],[375,812]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(new URL('scripts/fixtures/player-effects-smoke.html',process.env.BENTENG_TEST_URL||'http://127.0.0.1:3046/bentengan-squad-tag/').href);
  await page.waitForFunction(()=>window.drawProjection);let previousWidth;
  for(const zoom of [.25,1,1.5,2]){
   const result=await page.evaluate(z=>window.drawProjection(z),zoom),b=result.badges[0];assert(b);assert.equal(b.text,'IMMUNE');
   assert(Math.abs(b.x+b.width/2-result.ground.x)<1,'horizontal camera anchor');assert.equal(b.y,result.ground.y+65*zoom+5,'below nameplate and relational tag, not face');
   if(previousWidth)assert.equal(b.width,previousWidth,'text screen size independent of world zoom');previousWidth=b.width;
   assert(await page.locator('canvas').evaluate((c,r)=>{const data=c.getContext('2d').getImageData(Math.floor(r.x),Math.floor(r.y),Math.floor(r.width),Math.floor(r.height)).data;return data.some((v,i)=>i%4===0&&v>100);},b),'badge actually renders text/border pixels');
   await page.screenshot({path:`outputs/player-effects/${width}-zoom-${zoom}.png`});
  }
  await page.emulateMedia({reducedMotion:'reduce'});const {badges}=await page.evaluate(()=>window.drawProjection(1,1.3));assert.equal(badges[0].alpha,1);assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Player effect rendering PASS: actual resolver, three viewports, four camera scales, fixed readable text, ground/nameplate anchors, reduced motion.');
}finally{await browser.close();}
