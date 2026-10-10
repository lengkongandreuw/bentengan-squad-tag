import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE ?? 'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  await mkdir('outputs/results-qa',{recursive:true});const errors=[];
  for(const [width,height]of [[1366,768],[1920,1080],[390,844],[844,390]]){
    const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:3038/bentengan-squad-tag/scripts/fixtures/results-smoke.html');
    for(const mode of ['final','round','leaderboard']){
      await page.getByRole('button',{name:mode,exact:true}).click();await page.locator('.round-stats-panel').waitFor();
      const overlay=await page.locator('.round-stats-overlay').boundingBox(),panel=await page.locator('.round-stats-panel').boundingBox();
      assert(Math.abs(overlay.width-width)<1&&Math.abs(overlay.height-height)<1,'dialog fills arena');
      assert(Math.abs(panel.x+panel.width/2-width/2)<2,'horizontal center');
      assert(Math.abs(panel.y+panel.height/2-height/2)<2,'vertical center');
      assert(panel.y>=0&&panel.y+panel.height<=height,'panel fits viewport');
      assert(await page.locator('.round-stats-overlay').evaluate(e=>getComputedStyle(e).backgroundColor==='rgba(2, 5, 4, 0.78)'),'dark full-arena background');
      assert.equal(await page.locator('.round-stats-panel .match-progression-summary').count(),mode==='final'?1:0);
      const actions=page.locator('.round-stats-actions');await actions.scrollIntoViewIfNeeded();assert(await actions.isVisible());
      assert(await page.locator('.round-stats-overlay').getAttribute('open')!==null,'manual leaderboard is open too');
      await page.screenshot({path:`outputs/results-qa/${width}x${height}-${mode}.png`});
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);console.log('Final/round/leaderboard: full dark backdrop, centered panel, contained rewards, scrolling actions across four viewports PASS.');
}finally{await browser.close();}
