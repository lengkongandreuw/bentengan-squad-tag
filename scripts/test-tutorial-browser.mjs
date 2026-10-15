// Isolated profiles only. No real user tab/profile or game configuration writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE||'playwright');
const port=process.env.BENTENG_TUTORIAL_TEST_PORT||'3040';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','vite.github.config.ts','--host','127.0.0.1','--port',port,'--strictPort'],{windowsHide:true,stdio:'ignore'});
const browser=await chromium.launch({headless:true,...(process.env.BENTENG_CHROME_PATH?{executablePath:process.env.BENTENG_CHROME_PATH}:{})});
const url=`http://127.0.0.1:${port}/bentengan-squad-tag/`,key='bentengan-player-profile-v1',errors=[];
try{
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  assert.ok(ready);await fs.mkdir('outputs/tutorial',{recursive:true});
  for(const {name,viewport}of [{name:'desktop',viewport:{width:1366,height:768}},{name:'mobile',viewport:{width:390,height:844}}]){
    const context=await browser.newContext({viewport}),page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    const profile=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
    await page.goto(url);await page.getByLabel('PLAYER NAME',{exact:true}).fill('TutorialQA');
    await page.getByRole('button',{name:'SAVE NAME',exact:true}).click();
    const entry=page.locator('.tutorial-entry');await entry.waitFor();
    assert.equal(await entry.getAttribute('open'),'');
    const bounds=await entry.boundingBox();
    assert.ok(Math.abs(bounds.x+bounds.width/2-viewport.width/2)<2,'dialog horizontally centered');
    assert.ok(Math.abs(bounds.y+bounds.height/2-viewport.height/2)<2,'dialog vertically centered');
    assert.equal((await profile()).tutorial.status,'not_started');
    await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('.tutorial-entry').contains(document.activeElement)));
    await page.screenshot({path:`outputs/tutorial/${name}-offer.png`});
    if(name==='mobile'){
      await entry.getByRole('button',{name:'SKIP',exact:true}).click();
      assert.equal((await profile()).tutorial.status,'skipped');assert.ok(await page.locator('.pregame-shell.step-team').count());
    }else{
      const before=await profile();await entry.getByRole('button',{name:'START TUTORIAL',exact:true}).click();
      const coach=page.locator('.tutorial-coach');await coach.waitFor({timeout:90000});
      assert.equal((await profile()).tutorial.status,'in_progress');
      assert.deepEqual((await profile()).progression,before.progression);assert.deepEqual((await profile()).economy,before.economy);
      await coach.getByRole('button',{name:'SKIP TUTORIAL',exact:true}).click();await coach.getByRole('button',{name:'CANCEL',exact:true}).click();
      assert.equal((await profile()).tutorial.status,'in_progress');
      await coach.getByRole('button',{name:'SKIP TUTORIAL',exact:true}).click();
      await coach.getByRole('button',{name:'LEAVE',exact:true}).click();
      assert.equal((await profile()).tutorial.status,'skipped');
    }
    await page.reload();assert.equal(await entry.count(),0,'skip is durable; prompt does not return');
    await page.getByRole('button',{name:'TUTORIAL',exact:true}).click();
    await page.locator('.tutorial-coach').waitFor({timeout:90000});
    assert.equal((await profile()).tutorial.replay,true);assert.equal((await profile()).tutorial.currentStepId,'intro_ui');
    await page.screenshot({path:`outputs/tutorial/${name}-replay.png`});
    await page.reload();assert.equal(await entry.count(),0,'in-progress is manually resumable, not auto-forced');
    const replay=await profile();
    await page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key));p.tutorial.status='completed';p.tutorial.completedAt=new Date().toISOString();p.tutorial.currentStepId=null;p.tutorial.rewardClaimed=true;localStorage.setItem(key,JSON.stringify(p));},key);
    await page.reload();assert.equal(await entry.count(),0);
    await page.getByRole('button',{name:'TUTORIAL',exact:true}).click();
    await page.locator('.tutorial-coach').waitFor({timeout:90000});assert.equal((await profile()).tutorial.rewardClaimed,true);
    assert.equal((await profile()).tutorial.replay,true);assert.deepEqual((await profile()).economy,replay.economy);
    await page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key));delete p.tutorial;p.menang=1;localStorage.setItem(key,JSON.stringify(p));},key);
    await page.reload();assert.equal(await entry.count(),0);assert.equal((await profile()).tutorial.status,'skipped');
    const stored=await profile();await page.evaluate(()=>{Storage.prototype.setItem=()=>{throw Error('blocked');};});
    await page.getByRole('button',{name:'TUTORIAL',exact:true}).click();
    await page.getByRole('alert').filter({hasText:/could not|storage|browser/i}).waitFor();
    assert.equal(await entry.count(),0);assert.deepEqual(await profile(),stored);
    console.log(`${name}: first offer, start/skip, exit confirmation, reload, replay, legacy, blocked storage PASS`);
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('No JavaScript errors. Real user data untouched.');
}finally{await browser.close();server.kill();}
