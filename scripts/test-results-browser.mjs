import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE ?? 'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const base=process.env.BENTENG_TEST_URL||'http://127.0.0.1:3038/bentengan-squad-tag/';
try{
  await mkdir('outputs/results-qa',{recursive:true});const errors=[];
  for(const [width,height]of [[1366,768],[1920,1080],[1024,768],[390,844],[844,390]]){
    const desktop=width>=1280&&height>=760;
    const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL('scripts/fixtures/results-smoke.html',base).href);
    for(const mode of ['final','round','leaderboard']){
      // Fixture-only debug navs overlap on narrow screens. Keyboard activation
      // selects scenarios without changing the production UI being tested.
      await page.evaluate(mode=>window.resultsQA.pick(mode),mode);
      const root=mode==='final'?'.after-match':'.round-stats-panel';
      await page.locator(root).waitFor();
      const overlay=await page.locator('.round-stats-overlay').boundingBox(),panel=await page.locator(root).boundingBox();
      assert(Math.abs(overlay.width-width)<1&&Math.abs(overlay.height-height)<1,'dialog fills arena');
      assert(Math.abs(panel.x+panel.width/2-width/2)<2,'horizontal center');
      if(desktop){
        assert(Math.abs(panel.y+panel.height/2-height/2)<2,'vertical center');
        assert(panel.y>=0&&panel.y+panel.height<=height,'panel fits viewport');
      }else{
        assert(panel.width<=width+1,'no horizontal overflow on compact viewports');
      }
      assert(await page.locator('.round-stats-overlay').evaluate(e=>getComputedStyle(e).backgroundColor==='rgba(2, 5, 4, 0.78)'),'dark full-arena background');
      if(mode==='final'){
        assert.equal(await page.locator('.after-match-rewards-body').count(),0,'rewards stay behind NEXT');
        const shellW=await page.locator('.after-match').evaluate(e=>e.getBoundingClientRect().width);
        assert(Math.abs(shellW-Math.min(1360,width*0.96))<3,'shared container contract');
        assert(await page.getByRole('button',{name:'NEXT',exact:true}).isVisible(),'NEXT is the primary action');
        const nextBox=await page.getByRole('button',{name:'NEXT',exact:true}).boundingBox();
        assert(nextBox.y>=0&&nextBox.y+nextBox.height<=height,'NEXT stays inside viewport before scrolling');
        await page.locator('.after-match-panel').evaluate(e=>{e.scrollTop=e.scrollHeight;});
        const scrolledNext=await page.getByRole('button',{name:'NEXT',exact:true}).boundingBox();
        assert(Math.abs(scrolledNext.y-nextBox.y)<1,'scrolling roster never moves NEXT');
        assert(await page.locator('dialog').evaluate(e=>e.matches(':modal')),'results use native modal focus containment');
        await page.screenshot({path:`outputs/results-qa/${width}x${height}-${mode}-results.png`});
        await page.getByRole('button',{name:'NEXT',exact:true}).click();
        assert.equal(await page.locator('.after-match-rewards-card.xp').count(),1,'XP reward card');
        assert.equal(await page.locator('.after-match-rewards-card.doi').count(),1,'DOI reward card');
        assert.equal(await page.locator('.after-match-rewards-level').count(),1,'level progression strip');
        assert.equal(await page.locator('.after-match-rewards-unlocks').count(),1,'unlock panel');
        const bodyW=await page.locator('.after-match-rewards-body').evaluate(e=>e.getBoundingClientRect().width);
        const contentW=await page.locator('.after-match').evaluate(e=>{const style=getComputedStyle(e);return e.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);});
        const bodyRatio=bodyW/contentW;
        assert(bodyRatio>0.96&&bodyRatio<0.98,'rewards body fills 97% of the container content box (excluding padding/scrollbar)');
        assert(await page.getByRole('button',{name:'REMATCH',exact:true}).isVisible(),'REMATCH is the primary footer action');
        const rematchBox=await page.getByRole('button',{name:'REMATCH',exact:true}).boundingBox();
        assert(rematchBox.y>=0&&rematchBox.y+rematchBox.height<=height,'REMATCH stays inside viewport');
        assert(await page.locator('.after-match-rewards-footer .after-match-quit').isVisible(),'KELUAR stays available');
        await page.screenshot({path:`outputs/results-qa/${width}x${height}-${mode}-rewards.png`});
        await page.locator('.after-match-rewards-unlocks > button').click();
        assert.equal(await page.locator('.after-match-rewards-unlock-empty').count(),1,'MENGERTI dismisses unlock cards');
        for(const reward of ['plain','max','duplicate','incomplete','none']){
          await page.evaluate(reward=>window.resultsQA.pickReward(reward),reward);
          assert.equal(await page.locator('.after-match-rewards-body').count(),1,`${reward}: rewards body present`);
          await page.screenshot({path:`outputs/results-qa/${width}x${height}-${mode}-rewards-${reward}.png`});
        }
        await page.evaluate(()=>window.resultsQA.pickReward('levelup'));
      }else{
        assert.equal(await page.locator('.round-stats-panel .match-progression-summary').count(),0);
        const actions=page.locator('.round-stats-actions');await actions.scrollIntoViewIfNeeded();assert(await actions.isVisible());
        await page.screenshot({path:`outputs/results-qa/${width}x${height}-${mode}.png`});
      }
      assert(await page.locator('.round-stats-overlay').getAttribute('open')!==null,'manual leaderboard is open too');
    }
    await page.close();
  }
  assert.deepEqual(errors,[]);console.log('Final (results+NEXT+rewards cards/strip/unlocks/footer, all reward states)/round/leaderboard: shared 1360 container, desktop fit without scroll, compact without horizontal overflow, five viewports PASS.');
}finally{await browser.close();}
