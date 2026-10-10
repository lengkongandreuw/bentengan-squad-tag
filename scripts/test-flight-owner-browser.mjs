import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE ?? 'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  await mkdir('outputs/flight-owner-qa',{recursive:true});
  for(const id of ['bebe','ciici']){
    const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/config/map-studio.json*',route=>route.fulfill({contentType:'application/javascript',body:'export default {version:1,maps:[]};'}));
    // Accelerate only the default recharge constant inside this browser fixture;
    // actor eligibility, input, simulation and presentation remain the real code.
    await page.route('**/app/prototype.tsx*',async route=>{const response=await route.fetch();const body=(await response.text()).replace(/RAJA_ULTIMATE_RECHARGE_SECONDS = 45/g,'RAJA_ULTIMATE_RECHARGE_SECONDS = 1');await route.fulfill({response,body});});
    await page.goto('http://127.0.0.1:3038/bentengan-squad-tag/');
    await page.getByLabel('PLAYER NAME',{exact:true}).fill('Flight'+id);await page.getByRole('button',{name:'SAVE NAME',exact:true}).click();
    // Only isolated QA storage is changed; actual user profiles remain untouched.
    await page.evaluate(()=>{const key='bentengan-player-profile-v1',p=JSON.parse(localStorage.getItem(key));p.progression.xp=99999;p.progression.unlockedCharacters.push('bebe','ciici');localStorage.setItem(key,JSON.stringify(p));});
    await page.reload();await page.locator('.enter-game').click();await page.getByRole('button',{name:id==='bebe'?'Choose Tim Merah':'Choose Tim Hijau',exact:true}).click();
    await page.locator('.carousel-character').filter({has:page.locator(`img[alt="${id==='bebe'?'Bebe':'Ciici'}"]`)}).dispatchEvent('click');
    await page.getByRole('button',{name:new RegExp('^CHOOSE '+id+'$','i')}).click({timeout:90000});
    await page.locator('.map-select-v2').waitFor({timeout:90000});await page.getByRole('button',{name:/^Kampung Merdeka$/i}).click();await page.locator('.map-start-match').click();
    await page.locator('canvas[data-graphics-preset]').waitFor({timeout:90000});
    await page.locator('.ultimate-meter-hud').waitFor({state:'attached'});assert.match(await page.locator('.ultimate-meter-hud').textContent(),id==='bebe'?/JET FLIGHT/:/VAMPIRE FLIGHT/);
    assert(await page.locator('.action-dock .ultimate-action').isVisible(),'compact action dock ultimate is visible');
    const exit=id==='bebe'?'d':'a';
    await page.waitForTimeout(4500);await page.keyboard.down(exit);await page.waitForTimeout(2500);await page.keyboard.up(exit);
    await page.waitForFunction(()=>document.querySelector('.ultimate-meter-hud b')?.textContent==='100%',{},{timeout:100000});
    // Move out of the fort again if the character returned during charging.
    await page.keyboard.down(exit);await page.waitForTimeout(1000);await page.keyboard.up(exit);
    assert.equal(await page.evaluate(()=>{const s=window.__bentengGameCore.readState();return s.entities.find(p=>p.entityId===s.ultimate.actorId).state;}),'ACTIVE');
    await page.evaluate(()=>{window.flightEvents=[];window.addEventListener('benteng-flight',e=>window.flightEvents.push(e.detail.name));});
    await page.keyboard.press('CapsLock',{delay:120});
    await page.waitForFunction(()=>window.flightEvents.includes('onFlightTakeoff'),{},{timeout:10000});
    assert.deepEqual(errors,[]);await page.screenshot({path:`outputs/flight-owner-qa/${id}.png`});console.log(`${id}: actual selection, correct HUD, automatic recharge and CapsLock takeoff PASS`);await page.close();
  }
}finally{await browser.close();}
