import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {startMapStudio} from './server.mjs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE ?? 'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const before=await readFile('config/map-studio.json');
const {server,origin}=await startMapStudio(0);
let browser;
const errors=[],writes=[];
try{
  await mkdir('outputs/map-studio-workspace',{recursive:true});
  browser=await chromium.launch({headless:true,executablePath:process.env.BENTENG_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  for(const [width,height] of [[1920,1080],[1600,900],[1366,768],[1280,720]]){
    const page=await browser.newPage({viewport:{width,height}});
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});
    await page.goto(origin);await page.waitForFunction(()=>!document.querySelector('main').inert);
    assert(await page.locator('#validate').isEnabled(),'read-only map validation stays available');
    assert.equal(await page.locator('.workspace #issues').count(),0);
    assert.equal(await page.locator('main > aside:last-child #issues').count(),1);
    const value=await page.locator('#maps option').evaluateAll(options=>options.find(o=>o.textContent.includes('[Edit versi aktif lokal]'))?.value);
    assert(value,'fixture needs an existing editable map');await page.selectOption('#maps',value);
    await page.click('#fit');
    assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1 && document.body.scrollHeight<=innerHeight+1),'desktop has no outer page scroll');
    for(const id of ['undo','redo','save','test','build','publish','fit']){
      const b=await page.locator('#'+id).boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width&&b.y+b.height<=height,id+' visible');
    }
    const viewport=page.locator('#viewport'),bounds=await viewport.boundingBox();assert(bounds&&bounds.height>height*.4,'canvas receives usable height');
    assert(await viewport.evaluate(e=>{const c=e.querySelector('canvas');return c.width<=e.clientWidth && c.height<=e.clientHeight;}),'Fit map fits both dimensions');
    await page.locator('#zoom').fill('160');await page.locator('#zoom').dispatchEvent('input');
    assert(await viewport.evaluate(e=>e.scrollWidth>e.clientWidth&&e.scrollHeight>e.clientHeight),'zoom overflow belongs to canvas viewport');
    await viewport.evaluate(e=>{e.scrollTop=100;e.scrollLeft=100;});
    assert(await viewport.evaluate(e=>e.scrollTop>0&&e.scrollLeft>0));
    await page.locator('main > aside:first-child').evaluate(e=>{e.scrollTop=e.scrollHeight;});
    await page.locator('#library').evaluate(e=>{e.scrollTop=100;});
    assert(await page.locator('#library').evaluate(e=>e.scrollTop>0),'library scrolls independently');
    await page.locator('#validationPanel').evaluate(e=>{e.open=true;});
    await page.locator('main > aside:last-child').evaluate(e=>{e.scrollTop=e.scrollHeight;});
    const after=await viewport.boundingBox();assert.deepEqual(after,bounds,'sidebar/validation scrolling does not move canvas');
    assert(await page.locator('main > aside:last-child').evaluate(e=>e.scrollTop>0),'inspector independently scrolls');
    await page.click('#fit');await page.screenshot({path:`outputs/map-studio-workspace/${width}x${height}.png`});
    await page.click('#test');assert(await page.locator('#testingTools').isVisible());
    assert((await viewport.boundingBox()).height>120,'dummy tools leave canvas visible');
    await page.click('#test');await page.close();console.log(`${width}x${height}: shell, scroll, Fit, validation, dummy PASS`);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(await readFile('config/map-studio.json'),before);
  console.log('No page errors, API writes or map-data changes.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
