import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {startSpriteStudio} from './server.mjs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const before=await readFile('config/sprite-studio.json'),{server,origin}=await startSpriteStudio(0);
const browser=await chromium.launch({headless:true,executablePath:process.env.BENTENG_CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
 await mkdir('outputs/sprite-workspace',{recursive:true});
 const bytes=await sharp({create:{width:256,height:256,channels:4,background:'#b04040'}}).png().toBuffer();
 for(const [width,height] of [[1920,1080],[1600,900],[1366,768],[1280,720],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}}),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST'&&!r.url().endsWith('/api/inspect'))writes.push(r.url());});
  page.on('dialog',d=>d.accept());
  await page.goto(origin);await page.waitForFunction(()=>document.querySelector('#frameLabel').textContent.includes('/'));
  assert.equal(await page.locator('#advanced').evaluate(e=>e.parentElement.className),'sprite-inspector');
  if(width>=1280){
   assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'no outer desktop scrolling');
   for(const selector of ['.sprite-browser','.sprite-workspace','.sprite-inspector']){
    const bounds=await page.locator(selector).boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<=height,selector+' fits viewport');
   }
  }
  await page.selectOption('#character','buto');await page.waitForFunction(()=>!document.querySelector('#x').disabled&&document.querySelector('#x').value!=='');
  const oldX=Number(await page.locator('#x').inputValue());await page.locator('#preview').focus();await page.keyboard.press('ArrowRight');assert.equal(Number(await page.locator('#x').inputValue()),oldX+1);
  await page.locator('#snapGrid').check();await page.locator('#preview').focus();await page.keyboard.press('ArrowRight');assert.equal(Number(await page.locator('#x').inputValue()),oldX+17);
  await page.locator('#snapGrid').uncheck();
  await page.locator('#preview').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#play').textContent(),'Play');
  await page.keyboard.press('Alt+ArrowRight');assert.ok(await page.locator('#frame').inputValue());
  await page.locator('#gridVisible').uncheck();await page.locator('#rulersVisible').uncheck();await page.selectOption('#gridSize','32');await page.locator('#gridVisible').check();await page.locator('#rulersVisible').check();
  await page.setInputFiles('#files',{name:'crop-fixture.png',mimeType:'image/png',buffer:bytes});
  await page.waitForFunction(()=>document.querySelector('#fileStatus').textContent.startsWith('File diterima'));
  assert.equal(await page.locator('.sprite-workspace').getAttribute('data-view'),'source');assert.ok(await page.locator('#cropGrid').isVisible());
  await page.locator('#cropWidth').fill('128');await page.locator('#cropHeight').fill('128');
  await page.locator('#snapGrid').check();
  const box=await page.locator('#cropBox').boundingBox(),stage=await page.locator('#cropStage').boundingBox();
  await page.mouse.move(box.x+20,box.y+40);await page.mouse.down();await page.mouse.move(box.x+20+stage.width/256*35,box.y+40);await page.mouse.up();
  assert.equal(Number(await page.locator('#cropLeft').inputValue()),32);
  const grid=await page.locator('#cropGrid').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0));assert.ok(grid,'source pixel grid renders');
  await page.click('#previewTab');assert.ok(await page.locator('#preview').isVisible());await page.click('#sourceTab');assert.ok(await page.locator('#cropBox').isVisible());
  await page.screenshot({path:`outputs/sprite-workspace/${width}x${height}.png`});
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await page.close();console.log(`PASS ${width}x${height}: layout, ruler/grid, tabs, crop snap, keyboard preview editing; no asset/config writes.`);
 }
 assert.deepEqual(await readFile('config/sprite-studio.json'),before);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
