import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE ?? 'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base=process.env.BENTENG_TEST_URL||'http://127.0.0.1:3046/bentengan-squad-tag/';
const containFocus=async(selector)=>{
  assert(await page.locator(selector).evaluate(e=>e.matches(':modal')),'native modal');
  for(let i=0;i<25;i++){
    await page.keyboard.press(i%5===0?'Shift+Tab':'Tab');
    assert(await page.locator(selector).evaluate(e=>e.contains(document.activeElement)),`focus stays in ${selector} at ${i}`);
  }
};
try{
  await mkdir('outputs/desktop-ux',{recursive:true});
  await page.goto(base);
  await page.getByLabel('PLAYER NAME',{exact:true}).fill('DesktopQA');
  await containFocus('.player-profile-overlay');
  await page.getByRole('button',{name:'SAVE NAME',exact:true}).click();
  await page.getByRole('button',{name:'SKIP',exact:true}).click();
  await page.keyboard.press('Escape');
  await page.locator('.enter-game').blur();await page.keyboard.press('Control+Enter');
  assert.equal(await page.locator('.enter-game').count(),1,'modified shortcuts must not trigger Play');
  const sound=page.locator('.sound-trigger'),muted=await sound.getAttribute('aria-pressed');
  await sound.focus();await page.keyboard.press('Space');
  assert.notEqual(await sound.getAttribute('aria-pressed'),muted,'Space activates the focused sound button');
  assert.equal(await page.locator('.enter-game').count(),1,'Space on sound must not also trigger Play');
  await page.locator('.rules-button').focus();await page.keyboard.press('Enter');
  await page.locator('.rules-overlay:modal').waitFor({timeout:5000});
  assert.equal(await page.locator('.enter-game').count(),1,'Enter on Rules must not also trigger Play');
  await page.keyboard.press('Escape');await page.locator('.enter-game').click();
  await page.getByRole('button',{name:/Choose Tim Merah/}).click();
  await page.locator('.character-panel-select').waitFor();
  for(const [width,height]of [[1366,768],[844,390],[1280,600]]){
    await page.setViewportSize({width,height});
    const copy=page.locator('.character-panel-skill p');
    assert(await copy.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=14),'character body copy at least 14px');
    const p=await copy.boundingBox(),stats=await page.locator('.character-panel-stats').boundingBox();
    assert(p.y+p.height<=stats.y+1,'description clear of stats');
    const cta=await page.locator('.character-panel-select').boundingBox();
    assert(cta.y>=0&&cta.y+cta.height<=height,'character CTA within viewport');
    const strip=page.locator('.unlock-progress-strip');assert(await strip.isVisible(),'next unlock strip visible including short landscape');
    const b=await strip.boundingBox();assert(b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height,'unlock strip fits');
    assert(!(b.x<cta.x+cta.width&&b.x+b.width>cta.x&&b.y<cta.y+cta.height&&b.y+b.height>cta.y),'strip does not cover Select');
    assert.equal(await strip.locator('progress').count(),1,'progress semantics retained');
    await page.screenshot({path:`outputs/desktop-ux/character-${width}x${height}.png`});
  }
  await page.setViewportSize({width:1366,height:768});
  await page.locator('.character-panel-select').click();
  await page.locator('.map-arena-row').first().click();await page.locator('.map-start-match').click();
  await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',null,{timeout:90000});
  assert.equal(await page.locator('main.gameplay-screen-shell[data-hud-phase="10"]').count(),1,'one shared gameplay shell');
  for(const [zone,selector]of [['match','.stage-hud'],['pause','.game-topbar'],['ultimate','.ultimate-meter-hud'],['controller','.mobile-controls']]){
    assert.equal(await page.locator(`[data-hud-zone="${zone}"] ${selector}`).count(),1,`${zone}: existing component owned once`);
    if(zone!=='controller')assert.equal(await page.locator(`[data-hud-zone="${zone}"]`).getAttribute('data-placement'),'anchored','core owner uses safe-area anchor');
  }
  assert.equal(await page.locator('.action-dock').count(),0,'dock responsibilities migrated to pause and controls');
  assert.equal(await page.locator('.control-ribbon,.active-objective,.ultimate-buff-indicator').count(),0,'no hidden legacy HUD renders remain');
  assert.equal(await page.locator('.game-topbar button').count(),1,'live topbar has Pause only');
  assert.equal(await page.locator('.gameplay-guidance,.camera-map').count(),0,'utilities are not permanent arena overlays');
  const state=()=>page.evaluate(()=>window.__bentengGameCore.readState());
  const arena=await page.locator('canvas[data-graphics-preset]').boundingBox();
  assert(arena.width>=1360&&arena.height>=760,'arena is no longer reduced by utility rail');
  await page.screenshot({path:'outputs/desktop-ux/game.png'});
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await containFocus('.pause-overlay');
  await page.getByRole('button',{name:'Profile',exact:true}).click();
  await containFocus('.player-profile-overlay');
  await page.locator('.profile-hero-card').click();
  await containFocus('.profile-character-picker');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.profile-character-picker').count(),0,'Escape closes only nested picker');
  assert(await page.locator('.player-profile-overlay').evaluate(e=>e.matches(':modal')),'parent profile remains modal');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.player-profile-overlay').count(),0);
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent),'Profile','restore profile opener');
  assert(await page.locator('.pause-overlay').evaluate(e=>e.matches(':modal')),'return to Pause after profile');
  const frozen=await state();
  for(const tab of ['Map','How to Play','Settings']){
    await page.locator('.pause-hub-layout>nav').getByRole('button',{name:tab,exact:true}).click();
    await page.waitForTimeout(400);
    assert.equal((await state()).timer,frozen.timer,`${tab}: single-player stays paused`);
    if(tab==='Map'){
      assert(await page.locator('.pause-map-preview').evaluate(e=>e.width>0&&e.height>0),'map preview initialized');
      await page.waitForFunction(()=>{const e=document.querySelector('.pause-map-preview');if(!e?.width||!e.height)return false;const pixels=e.getContext('2d').getImageData(0,0,e.width,e.height).data;return pixels.some((v,i)=>i%4!==3&&v>20);},null,{timeout:5000});
      assert(await page.locator('.camera-map button.selected').last().isVisible(),'overview selected');
    }
    if(tab==='How to Play'){
      assert(await page.locator('.how-to-play-panel [role=tabpanel] p').isVisible(),'visual core guidance lives in Pause');
      assert.equal(await page.getByRole('tab').count(),4,'four core lessons');
      await page.getByRole('tab',{name:'FORT',exact:true}).focus();await page.keyboard.press('ArrowRight');
      assert.equal(await page.getByRole('tab',{name:'TAG',exact:true}).getAttribute('aria-selected'),'true','keyboard selects next lesson');
      await page.keyboard.press('End');assert.equal(await page.getByRole('tab',{name:'CAPTURE',exact:true}).getAttribute('aria-selected'),'true');
      for(const label of ['FORT','TAG','RESCUE','CAPTURE']){
        await page.getByRole('tab',{name:label,exact:true}).click();
        assert(await page.locator('.help-preview').isVisible(),`${label} has a visible diagram`);
      }
      await page.getByRole('button',{name:'Full Rules',exact:true}).click();
      await containFocus('.rules-overlay');await page.keyboard.press('Escape');
      assert.equal(await page.locator('.rules-overlay').count(),0,'Escape closes nested rules only');
      assert(await page.locator('.pause-overlay').evaluate(e=>e.matches(':modal')));
    }
    if(tab==='Settings'){
      await page.locator('.pause-hub .audio-settings summary').click();
      await page.locator('.audio-settings-art-panel:modal').waitFor();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.audio-settings-art-panel:modal').count(),0);
      assert(await page.locator('.pause-overlay').evaluate(e=>e.matches(':modal')),'Audio returns to paused Settings');
      await page.locator('.pause-hub .graphics-settings-trigger').click();
      await page.locator('.graphics-settings-panel:modal').waitFor();
      await page.locator('.graphics-settings-panel input[value=low]').check();
      assert.equal(await page.evaluate(()=>localStorage.getItem('benteng-graphics-v1')),'low','graphics uses existing saved preferences');
      await page.keyboard.press('Escape');
      await page.locator('.pause-hub .pause-settings-row>button').last().click();
      await page.locator('.hud-settings-dialog:modal').waitFor();
      await page.locator('.hud-settings-dialog input[type=range]').fill('130');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('benteng-hud-preferences-v1')).scale),1.3);
      await page.getByLabel('Game language',{exact:true}).selectOption('id');
      assert(await page.getByRole('heading',{name:'Pengaturan',exact:true}).isVisible(),'language applies inside Pause');
      await page.getByLabel('Bahasa game',{exact:true}).selectOption('en');
      assert.equal((await state()).timer,frozen.timer,'settings changes never resume match');
    }
    await page.keyboard.press('Escape');
    assert(await page.getByRole('heading',{name:'Match overview',exact:true}).isVisible(),'Escape returns to overview');
  }
  for(const [width,height] of [[844,390],[375,812],[1920,1080]]){
    await page.setViewportSize({width,height});
    const box=await page.locator('.pause-hub').boundingBox();
    assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,'hub fits viewport');
    await page.screenshot({path:`outputs/desktop-ux/pause-${width}x${height}.png`});
  }
  await page.setViewportSize({width:1366,height:768});
  await page.keyboard.press('Escape');
  await page.locator('.pause-overlay').waitFor({state:'detached'});
  for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[844,390],[375,812]]){
    await page.setViewportSize({width,height});
    const zones=[];
    for(const name of ['fort','match','pause','ultimate']){
      const element=page.locator(`[data-hud-zone=${name}]`);if(!await element.isVisible())continue;
      const box=await element.boundingBox();zones.push([name,box]);
      assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=height+1,`${name} fits ${width}x${height} at HUD scale130`);
    }
    for(let i=0;i<zones.length;i++)for(let j=i+1;j<zones.length;j++){
      const [an,a]=zones[i],[bn,b]=zones[j];assert(!(a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y),`${width}x${height}: ${an} and ${bn} separated`);
    }
    assert.equal(await page.evaluate(()=>document.elementFromPoint(innerWidth/2,innerHeight/2)?.tagName),'CANVAS','center remains playable');
    assert.equal(await page.locator('.mobile-controls').isVisible(),width<=1100,'one input-mode-specific control surface');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.screenshot({path:`outputs/desktop-ux/core-${width}x${height}.png`});
  }
  await page.setViewportSize({width:1366,height:768});
  // Hold-Tab leaderboard still works outside dialogs.
  await page.locator('canvas[data-graphics-preset]').click({position:{x:arena.width/2,y:arena.height/2}});
  await page.keyboard.down('Tab');await page.locator('.round-stats-overlay:modal').waitFor();
  await page.keyboard.up('Tab');await page.locator('.round-stats-overlay').waitFor({state:'detached'});
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await containFocus('.pause-overlay');
  const before=await state();
  await page.getByRole('button',{name:'Restart',exact:true}).click();
  assert.match(await page.evaluate(()=>document.activeElement?.textContent),/Cancel/,'confirmation defaults to safe action');
  await containFocus('.pause-overlay');await page.keyboard.press('Escape');
  assert.equal((await state()).matchId,before.matchId,'cancel restart preserves match');
  assert.equal(await page.getByRole('button',{name:'Resume',exact:true}).count(),1,'Escape cancels confirmation only');
  await page.getByRole('button',{name:'Exit to menu',exact:true}).click();
  await page.getByRole('button',{name:'Cancel · Keep playing',exact:true}).click();
  assert.equal(await page.locator('.playing-shell').count(),1,'cancel exit preserves match');
  await page.getByRole('button',{name:'Restart',exact:true}).click();
  await page.getByRole('button',{name:'Restart match',exact:true}).click();
  await page.locator('.pause-overlay').waitFor({state:'detached'});
  await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING');
  await page.getByRole('button',{name:'Pause',exact:true}).click();
  await page.getByRole('button',{name:'Exit to menu',exact:true}).click();
  await page.getByRole('button',{name:'Exit to menu',exact:true}).click();
  await page.locator('.playing-shell').waitFor({state:'detached'});
  await page.getByRole('button',{name:'GAME RULES',exact:true}).click();
  await containFocus('.rules-overlay');await page.keyboard.press('Escape');
  assert.equal(await page.locator('.rules-overlay').count(),0);
  assert.deepEqual(errors,[]);
  console.log('Desktop UX PASS: native dialog focus/restoration, hold-Tab, safe confirmations, character readability, unobscured arena.');
}finally{await browser.close();}
