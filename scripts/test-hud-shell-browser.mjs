import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base=process.env.BENTENG_TEST_URL||'http://127.0.0.1:3046/bentengan-squad-tag/';
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
try{
  await mkdir('outputs/hud-shell',{recursive:true});
  for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[844,390],[375,812]]){
    const page=await browser.newPage({viewport:{width,height}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('scripts/fixtures/hud-shell-smoke.html',base).href);
    await page.getByRole('button',{name:'Pause',exact:true}).waitFor();
    const zone=name=>page.locator(`[data-hud-zone="${name}"]`);
    const visible=[];
    for(const name of ['fort','match','pause','context','ultimate','controller']){
      if(!await zone(name).isVisible())continue;
      const box=await zone(name).boundingBox();visible.push([name,box]);
      assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,`${width}×${height}: ${name} fits viewport`);
    }
    for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++)assert(!overlap(visible[i][1],visible[j][1]),`${width}×${height}: ${visible[i][0]} / ${visible[j][0]} do not overlap`);
    assert(await page.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight/2)?.tagName==='CANVAS'),'HUD does not create a full-screen pointer blocker');
    for(let i=0;i<8;i++){
      await page.keyboard.press('Tab');
      const bounds=await page.evaluate(()=>{const r=document.activeElement?.getBoundingClientRect();return document.activeElement?.tagName==='BUTTON'?{y:r.y,bottom:r.bottom}:null;});
      if(bounds)assert(bounds.y>=0&&bounds.bottom<=height,'keyboard target stays on screen');
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    await page.screenshot({path:`outputs/hud-shell/contract-${width}x${height}.png`});
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Shared HUD anchor contract PASS: five viewports, no intersecting zones, safe canvas hit-test, keyboard bounds, reduced-motion.');
}finally{await browser.close();}
