import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.BENTENG_PLAYWRIGHT_MODULE ??
  'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser = await chromium.launch({headless:true,executablePath:process.env.BENTENG_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const url=process.env.BENTENG_UI_URL ?? 'http://127.0.0.1:3038/bentengan-squad-tag/';
await mkdir('outputs/map-selection',{recursive:true});
const errors=[];
try {
  for(const [name,width,height] of [['full',1920,1080],['desktop',1366,768],['narrow',1280,720],['tablet',1024,768],['portrait',390,844],['landscape',844,390]]) {
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<1100});
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    p.on('response',r=>{if(r.status()>=400 && r.url().includes('/map-selection/')) errors.push(`${r.status()} ${r.url()}`);});
    await p.goto(url);await p.getByLabel('PLAYER NAME',{exact:true}).fill(`Map${name}`);
    await p.getByRole('button',{name:'SAVE NAME',exact:true}).click();
    await p.locator('.enter-game').click();await p.getByRole('button',{name:'Choose Tim Merah',exact:true}).click();
    await p.getByRole('button',{name:/^CHOOSE RAJA$/i}).click({timeout:60000});
    await p.locator('.map-select-v2').waitFor({timeout:60000});
    assert.match(await p.locator('.map-arena-row').first().getAttribute('aria-label'),/^Kampung Merdeka/,'edited Kampung remains first');
    assert.match(await p.locator('.map-arena-row[aria-pressed="true"]').getAttribute('aria-label'),/^Kampung Merdeka/,'default selection is edited Kampung');
    await p.waitForFunction(()=>[...document.querySelectorAll('.map-select-v2 img')].every(i=>i.complete&&i.naturalWidth>0));
    assert(await p.locator('.map-start-match').isEnabled());
    assert.equal(await p.locator('.arena-unlock-panel').count(),0);
    assert.equal(await p.locator('.field-card').count(),0);
    const active=p.locator('.map-arena-row[aria-pressed="true"]');
    assert.match(await p.locator('.map-art-frame').getAttribute('src'),/map-frame-red/);
    assert.match(await p.locator('.map-main-preview>img').first().getAttribute('src'),/map-studio\/|fields\//);
    const initial=await active.getAttribute('aria-label');
    // Existing cycling intentionally uses only the playable pool. A new
    // profile may have exactly one playable arena, so cycling can stay put.
    await p.keyboard.press('ArrowRight');await p.waitForTimeout(100);
    assert(await p.locator('.map-start-match').isEnabled());
    await p.keyboard.press('ArrowLeft');await p.waitForTimeout(100);
    assert.equal(await active.getAttribute('aria-label'),initial);
    await p.screenshot({path:`outputs/map-selection/${name}-red.png`});
    const locked=p.locator('.map-arena-row[aria-label*="LOCKED"]').first();
    if(await locked.count()) {
      if(width<1100)await locked.tap();else await locked.click();
      assert(await p.locator('.map-start-match').isDisabled());
      assert.equal(await p.locator('.map-preview-lock').count(),1);
      const requirement=await p.locator('.map-arena-info p').innerText();assert(requirement.length>10);
      await p.keyboard.press('Enter');assert(await p.locator('.map-select-v2').isVisible());
      await p.screenshot({path:`outputs/map-selection/${name}-locked.png`});
    }
    const last=p.locator('.map-arena-row').last();await last.click();
    assert.equal(await last.getAttribute('aria-pressed'),'true');
    await p.locator('.graffiti-back').click();assert(await p.locator('.character-select-screen,.roster-screen').count());
    if(name==='full') {
      await p.locator('.character-panel-select').click();await p.locator('.map-start-match').click();
      await p.locator('canvas[data-graphics-preset]').waitFor({timeout:60000});
    }
    await context.close();console.log(`${name}: selection, custom preview, locks, keyboard, Back PASS`);
  }
  const context=await browser.newContext({viewport:{width:1366,height:768}}),p=await context.newPage();
  p.on('pageerror',e=>errors.push(e.message));await p.goto(url);
  await p.getByLabel('PLAYER NAME',{exact:true}).fill('MapGreen');await p.getByRole('button',{name:'SAVE NAME',exact:true}).click();
  await p.locator('.enter-game').click();await p.getByRole('button',{name:'Choose Tim Hijau',exact:true}).click();
  await p.locator('.character-panel-select').waitFor({timeout:60000});await p.locator('.character-panel-select').click();
  await p.locator('.map-select-v2').waitFor({timeout:60000});
  assert.match(await p.locator('.map-art-frame').getAttribute('src'),/map-frame-green/);
  await p.waitForFunction(()=>[...document.querySelectorAll('.map-select-v2 img')].every(i=>i.complete&&i.naturalWidth>0));
  await p.screenshot({path:'outputs/map-selection/desktop-green.png'});
  await p.keyboard.press('Enter');await p.locator('canvas[data-graphics-preset]').waitFor({timeout:60000});
  await context.close();console.log('Green: artwork and unlocked Start PASS');
  const fixtureContext=await browser.newContext({viewport:{width:1366,height:768}}),fixture=await fixtureContext.newPage();
  fixture.on('pageerror',e=>errors.push(e.message));
  await fixture.goto(new URL('scripts/fixtures/map-selection-smoke.html',url).href);
  await fixture.locator('.map-select-v2').waitFor();
  assert.match(await fixture.locator('.map-art-frame').getAttribute('src'),/purple/);
  await fixture.getByRole('button',{name:'Next arena'}).click();
  assert.match(await fixture.locator('.map-arena-row[aria-pressed="true"]').innerText(),/Arena QA 1/);
  await fixture.locator('.map-arena-row').last().click();
  await fixture.waitForFunction(()=>[...document.querySelectorAll('.map-select-v2 img')].every(i=>i.complete&&i.naturalWidth>0));
  assert.equal(await fixture.locator('.map-arena-row').count(),8);
  assert(await fixture.locator('.map-arena-list').evaluate(e=>e.scrollTop>0));
  const box=await fixture.locator('.map-start-match').boundingBox();assert(box&&box.x>=0&&box.x+box.width<=1366);
  await fixture.screenshot({path:'outputs/map-selection/neutral-long-name.png'});
  await fixtureContext.close();console.log('Neutral purple, >4 rows, list scroll, long custom name PASS');
  assert.deepEqual(errors,[]);console.log('No page errors / failed map artwork requests.');
} finally {await browser.close();}
