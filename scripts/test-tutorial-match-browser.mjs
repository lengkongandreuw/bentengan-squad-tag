import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE||'playwright');
const port=process.env.BENTENG_TUTORIAL_TEST_PORT||'3040';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','vite.github.config.ts','--host','127.0.0.1','--port',port,'--strictPort'],{windowsHide:true,stdio:'ignore'});
const browser=await chromium.launch({headless:true,...(process.env.BENTENG_CHROME_PATH?{executablePath:process.env.BENTENG_CHROME_PATH}:{})});
const url=`http://127.0.0.1:${port}/bentengan-squad-tag/`,errors=[];
try{
  for(let i=0;i<60;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  await fs.mkdir('outputs/tutorial-match',{recursive:true});
  for(const {name,viewport}of [{name:'desktop',viewport:{width:1366,height:768}},{name:'mobile',viewport:{width:844,height:390}}]){
    const context=await browser.newContext({viewport}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const profile=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bentengan-player-profile-v1')));
    await page.goto(url);await page.getByLabel('PLAYER NAME',{exact:true}).fill('TutorialQA');await page.getByRole('button',{name:'SAVE NAME',exact:true}).click();
    await page.getByRole('button',{name:'START TUTORIAL',exact:true}).click();
    await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',{},{timeout:90000});
    const state=await page.evaluate(()=>window.__bentengGameCore.readState()),before=await profile();
    assert.equal(state.entities.length,4);assert.equal(state.entities.filter(p=>p.controller==='local').length,1);
    assert.equal(state.entities.filter(p=>p.controller==='bot').length,3);assert.ok(state.matchId.startsWith('tutorial:'));
    assert.equal(state.entities.filter(p=>p.team==='red').length,2);assert.equal(state.entities.filter(p=>p.team==='green').length,2);
    await page.getByRole('button',{name:'GOT IT',exact:true}).click();
    if(name==='mobile')assert.equal(await page.locator('.tutorial-coach b').innerText(),'D-pad');
    await page.keyboard.down('d');await page.waitForTimeout(50);await page.keyboard.up('d');
    assert.equal((await profile()).tutorial.currentStepId,'move','tiny input cannot complete meaningful movement');
    assert.deepEqual((await profile()).progression,before.progression);assert.deepEqual((await profile()).economy,before.economy);
    await page.getByRole('button',{name:'RETRY LESSON',exact:true}).click();await page.waitForTimeout(200);
    assert.equal((await profile()).tutorial.currentStepId,'move');
    if(name==='mobile'){
      const card=await page.locator('.tutorial-coach').boundingBox(),pad=await page.locator('.touch-dpad').boundingBox();
      assert.ok(card.y+card.height<=pad.y,'long recovery copy must not cover D-pad');
      for(const button of await page.locator('.tutorial-coach button').all())assert.ok((await button.boundingBox()).height>=44);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('.tutorial-success').evaluate(node=>getComputedStyle(node).animationName),'none');
      await page.setViewportSize({width:375,height:812});
      assert.ok((await page.locator('.tutorial-coach').boundingBox()).width<=343);
      await page.setViewportSize(viewport);
    }
    await page.screenshot({path:`outputs/tutorial-match/${name}.png`});
    await page.reload();assert.equal(await page.locator('.tutorial-coach').count(),0);
    await page.getByRole('button',{name:'TUTORIAL',exact:true}).click();
    await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',{},{timeout:90000});
    assert.equal((await profile()).tutorial.currentStepId,'intro_ui','interruption restarts scenario, not positions');
    await page.getByRole('button',{name:'SKIP TUTORIAL',exact:true}).click();await page.getByRole('button',{name:'LEAVE',exact:true}).click();
    assert.equal((await profile()).tutorial.status,'skipped');assert.deepEqual((await profile()).economy,before.economy);
    await page.locator('.enter-game').click();await page.getByRole('button',{name:'Choose Tim Merah',exact:true}).click();
    await page.getByRole('button',{name:/^CHOOSE RAJA$/i}).click({timeout:90000});await page.getByRole('button',{name:'LET’S PLAY',exact:true}).click();
    await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',{},{timeout:90000});
    const ordinary=await page.evaluate(()=>window.__bentengGameCore.readState());assert.equal(ordinary.entities.length,10);
    assert.ok(!ordinary.matchId.startsWith('tutorial:'));assert.equal(await page.locator('.tutorial-coach').count(),0);
    console.log(`${name}: real2v2, tiny-input rejection, interruption restart, exit without rewards, normal5v5 PASS; full lessons covered separately`);
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('No page errors; real user profiles untouched.');
}finally{await browser.close();server.kill();}
