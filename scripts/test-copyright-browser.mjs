import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {preview} from 'vite';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await preview({configFile:'vite.github.config.ts',preview:{host:'127.0.0.1',port:0}});
let browser;
try{
  await mkdir('outputs/release-security',{recursive:true});
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  for(const viewport of [{width:1366,height:768},{width:844,height:390},{width:390,height:844}]){
    const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      localStorage.setItem('bentengan-player-profile-v1',JSON.stringify({schemaVersion:1,id:'copyright-qa',username:'ReleaseQA',firstJoin:'2026-10-19T00:00:00.000Z',menang:0,kalah:0,featuredCharacterId:'raja',kda:{tagMusuh:0,masukPenjara:0,rescueTeam:0},progression:{version:1,xp:0,unlockedCharacters:['raja','robot'],unlockedArenaIds:['kampung'],arenaStats:{},processedMatchIds:[]},tutorial:{version:1,status:'skipped',currentStepId:null,startedAt:null,completedAt:null,skippedAt:'2026-10-19T00:00:00.000Z',rewardClaimed:false,replay:false,sessionActive:false,learned:[]}}));
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);
    await page.locator('.splash-copyright').waitFor({state:'visible',timeout:60000});
    assert.match(await page.locator('.splash-copyright').innerText(),/Big Dade Interactive \(PT Kawanua Virtual Teknologi\)/);
    const bounds=await page.locator('.splash-copyright').boundingBox();assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1);
    for(const selector of ['.enter-game','.multiplayer-open','.pregame-actions','.profile-trigger']){
      const box=await page.locator(selector).boundingBox();if(!box)continue;
      assert(!(box.x<bounds.x+bounds.width&&box.x+box.width>bounds.x&&box.y<bounds.y+bounds.height&&box.y+box.height>bounds.y),`${selector} overlaps copyright at ${viewport.width}x${viewport.height}`);
    }
    await page.screenshot({path:`outputs/release-security/splash-${viewport.width}.png`});assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: built game copyright is visible and does not overlap menu controls at1366x768,844x390,390x844; no page errors. Isolated browser profile only.');
}finally{await browser?.close();await new Promise(resolve=>server.httpServer.close(resolve));}
