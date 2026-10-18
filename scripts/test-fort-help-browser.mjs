import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
  await mkdir('outputs/fort-help',{recursive:true});
  await page.goto('http://127.0.0.1:3046/bentengan-squad-tag/scripts/fixtures/fort-help-smoke.html');
  for(const state of ['safe','guarded','open','attacked','critical','captured']){
    await page.getByRole('button',{name:state,exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.fort-card img')?.naturalWidth===810);
    assert.equal(await page.locator('.fort-card').getAttribute('data-fort-state'),state);
    await page.locator('.qa-fort').screenshot({path:`outputs/fort-help/card-${state}.png`});
  }
  await page.getByRole('button',{name:'Indonesia',exact:true}).click();
  assert.equal(await page.locator('.fort-card-label').textContent(),'BENTENG DIREBUT');
  await page.getByRole('button',{name:'English',exact:true}).click();
  await page.reload();await page.locator('[data-hint-id=rescue]').waitFor();
  await page.getByLabel('Learned rescue',{exact:true}).check();assert.equal(await page.locator('[data-hint-id]').count(),0,'successful learning hides beginner hint');
  await page.reload();await page.locator('[data-hint-id=rescue]').waitFor();
  await page.waitForTimeout(4700);assert.equal(await page.locator('[data-hint-id]').count(),0,'hint expires');
  await page.getByLabel('Rescue relevant',{exact:true}).uncheck();await page.getByLabel('Rescue relevant',{exact:true}).check();
  assert.equal(await page.locator('[data-hint-id]').count(),0,'same unlearned hint does not flash again on re-entry');
  for(const [width,height]of [[1366,768],[844,390],[375,812]]){
    await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
    for(const tab of ['FORT','TAG','RESCUE','CAPTURE']){
      await page.getByRole('tab',{name:tab,exact:true}).click();
      assert.equal(await page.getByRole('tab',{name:tab,exact:true}).getAttribute('aria-selected'),'true');
      assert(await page.locator('[role=tabpanel] [role=img]').isVisible());
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
    }
    await page.locator('.pause-hub').screenshot({path:`outputs/fort-help/help-${width}x${height}.png`});
  }
  assert.deepEqual(errors,[]);console.log('Six supplied fort cards, localization, contextual lifetime/re-entry/learned suppression, four visual Help tabs across three viewports PASS');
}finally{await browser.close();}
