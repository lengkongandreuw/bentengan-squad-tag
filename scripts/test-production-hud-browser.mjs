// Built-site smoke: no source interception, dev probes or real user browser state.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const errors=[],failed=[];
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))failed.push(`${r.status()} ${r.url()}`);});
 await page.goto(process.env.BENTENG_TEST_URL||'http://127.0.0.1:3048/bentengan-squad-tag/');
 await page.getByLabel('PLAYER NAME',{exact:true}).fill('ProductionQA');await page.getByRole('button',{name:'SAVE NAME',exact:true}).click();await page.getByRole('button',{name:'SKIP',exact:true}).click();
 await page.getByRole('button',{name:/Choose Tim Merah/}).click();await page.locator('.unlock-progress-strip').waitFor();
 assert(await page.locator('.unlock-strip-art').evaluate(img=>img.complete&&img.naturalWidth>0),'production unlock artwork loaded');
 await page.locator('.character-panel-select').click();await page.locator('.map-arena-row').first().click();await page.locator('.map-start-match').click();
 await page.locator('.stage-hud').waitFor({timeout:90000});await page.waitForTimeout(5000);
 assert.equal(await page.evaluate(()=>typeof window.__bentengGameCore),'undefined','development probe not published');
 assert.equal(await page.locator('.action-dock,.control-ribbon,.active-objective,.gameplay-guidance,.ultimate-buff-indicator').count(),0);
 assert.equal(await page.locator('.ultimate-meter-hud').count(),1);assert.equal(await page.locator('.game-topbar button').count(),1);
 await page.getByRole('button',{name:'Pause',exact:true}).click();await page.locator('.pause-overlay:modal').waitFor();
 await page.locator('.pause-hub-layout>nav').getByRole('button',{name:'Map',exact:true}).click();await page.waitForTimeout(250);
 assert(await page.locator('.pause-map-preview').evaluate(c=>c.width>0&&c.height>0));
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'How to Play',exact:true}).click();assert.equal(await page.getByRole('tab').count(),4);
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Resume',exact:true}).click();
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log('Production Pages smoke PASS: real packaged assets, next-unlock, match HUD, no legacy/probes, Pause Map/Help/Resume, no failed asset responses.');
}finally{await browser.close();}
