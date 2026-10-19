import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';import os from 'node:os';import sharp from 'sharp';
import {startSpriteStudio} from './server.mjs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const root=await mkdtemp(path.join(os.tmpdir(),'benteng-workbench-qa-'));let server,browser,origin;
try{
 await mkdir(path.join(root,'config'),{recursive:true});await mkdir(path.join(root,'lib'));await copyFile('lib/sprite-studio-model.js',path.join(root,'lib/sprite-studio-model.js'));
 await writeFile(path.join(root,'lib/characters.ts'),"id: 'raja', visualScale: 3; id: 'kaka', visualScale: 3; id: 'buto', visualScale: 1;");
 await mkdir(path.join(root,'config/characters'));for(const [id,scale]of [['raja',1],['kaka',1.25]])await writeFile(path.join(root,`config/characters/${id}.json`),JSON.stringify({id,visualScale:scale}));
 await writeFile(path.join(root,'config/game-rules.json'),JSON.stringify({teams:{red:{roster:['raja']},green:{roster:['kaka','buto']}}}));
 const characters={};for(const [id,color,scale]of [['raja','#ff4422',1],['kaka','#22bbee',1.4]]){
  await mkdir(path.join(root,'public/sprite-studio',id),{recursive:true});const asset=`sprite-studio/${id}/${'a'.repeat(64)}.webp`;
  await sharp({create:{width:128,height:64,channels:4,background:color}}).webp({lossless:true}).toFile(path.join(root,'public',asset));
  characters[id]={run:{asset,width:128,height:64,frames:[{x:0,y:0,width:64,height:64},{x:64,y:0,width:64,height:64}],fps:8,scale,x:0,y:0,pivotX:.5,pivotY:1,loop:true,mirror:false}};
 }
 await mkdir(path.join(root,'public/characters/buto'),{recursive:true});await sharp({create:{width:64,height:64,channels:4,background:'#cc77dd'}}).webp().toFile(path.join(root,'public/characters/buto/atlas.webp'));
 const frame=[{x:0,y:0,width:64,height:64}];await writeFile(path.join(root,'public/characters/buto/animations.json'),JSON.stringify({directions:Object.fromEntries(['south','north','east','west'].map(d=>[d,{idle:frame,run:frame}]))}));
 const file=path.join(root,'config/sprite-studio.json');await writeFile(file,JSON.stringify({version:1,characters}));const initial=await readFile(file,'utf8');
 ({server,origin}=await startSpriteStudio(0,root));browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});page.on('dialog',d=>d.message().startsWith('Publish')?d.dismiss():d.accept());
 await page.goto(origin+'/?character=raja&slot=run');await page.waitForFunction(()=>document.querySelector('#frameLabel').textContent.includes('/2'));
 assert.equal(await page.locator('#advanced').evaluate(e=>e.open),false,'advanced/crop hidden until needed');assert.equal(await page.locator('#settings').evaluate(e=>e.parentElement.className),'sprite-inspector');
 assert(await page.locator('#scaleRange').isVisible());assert(await page.locator('#applyCurrent').isVisible());assert(await page.locator('#saveCharacter').isVisible());assert(await page.locator('#publish').isHidden());
 await page.selectOption('#scaleReference','kaka');await page.waitForFunction(()=>document.querySelector('#scaleComparison').dataset.referenceHeight==='129.5');
 assert.match(await page.locator('#scaleCompareInfo').innerText(),/Kaka.*1.25 × 1.4/);const metrics=await page.locator('#scaleComparison').evaluate(e=>({...e.dataset}));assert.equal(+metrics.currentHeight,74);assert.notEqual(metrics.currentX,metrics.referenceX);
 await page.locator('#scaleRange').fill('1.6');await page.waitForFunction(()=>document.querySelector('#scaleComparison').dataset.currentHeight==='118.4');assert.equal(await page.locator('#scale').inputValue(),'1.6');assert.match(await page.locator('#draftSaveState').innerText(),/draft belum disimpan/);assert.equal(await readFile(file,'utf8'),initial);
 await page.selectOption('#zoom','2');await page.waitForFunction(()=>document.querySelector('#scaleComparison').dataset.zoom==='2');assert.equal(await page.locator('#scaleComparison').getAttribute('data-reference-height'),'129.5','zoom is shared, not auto-fit');
 await page.selectOption('#scaleCompareMode','overlay');await page.waitForFunction(()=>{const d=document.querySelector('#scaleComparison').dataset;return d.currentX===d.referenceX;});
 await page.locator('#play').click();const paused=await page.locator('#scaleComparison').getAttribute('data-reference-frame');await page.waitForTimeout(300);assert.equal(await page.locator('#scaleComparison').getAttribute('data-reference-frame'),paused,'pause freezes both timelines');
 await page.locator('#scaleUp').click();assert.equal(await page.locator('#scale').inputValue(),'1.68');
 await page.keyboard.press('Control+s');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('1 movement / arah diterapkan'));const saved=JSON.parse(await readFile(file,'utf8'));assert.equal(saved.characters.raja.run.scale,1.68);assert.deepEqual(saved.characters.kaka,characters.kaka,'reference is never changed');
 await page.locator('#scaleCompareClear').click();assert.equal(await page.locator('#scaleReference').inputValue(),'');await page.selectOption('#scaleReference','buto');await page.waitForFunction(()=>document.querySelector('#scaleCompareInfo').textContent.includes('sprite bawaan'));
 await mkdir('outputs/sprite-workbench',{recursive:true});
 for(const [width,height]of [[1920,1080],[1366,768],[1280,720],[844,390],[390,844]]){
  await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const b=await page.locator('.studio-savebar').boundingBox();assert(b.x>=0&&b.x+b.width<=width+1);
  if(width>=1280){assert(b.y+b.height<=height+1,'save actions remain in desktop viewport');assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'no desktop outer scroll');
   for(const selector of ['#preview','#play','#quickFps','.sprite-workspace .playback']){const box=await page.locator(selector).boundingBox();assert(box.y>=0&&box.y+box.height<=b.y+1,`${selector} and feet/timeline stay above save bar`);}
  }
  await page.screenshot({path:`outputs/sprite-workbench/${width}x${height}.png`});
 }
 await page.setViewportSize({width:1366,height:768});await page.locator('#advanced>summary').click();await page.locator('#releaseTools>summary').click();await page.locator('#publish').click();assert(!writes.some(u=>u.endsWith('/api/publish')),'cancel Publish has no side effect');
 const png=await sharp({create:{width:64,height:64,channels:4,background:'#44ff33'}}).png().toBuffer();await page.setInputFiles('#files',{name:'new.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('#fileStatus').textContent.startsWith('File diterima'));
 assert(await page.locator('#uploadOptions').evaluate(e=>e.open));assert(await page.locator('#advanced').evaluate(e=>e.open));assert(await page.locator('#compile').isEnabled());assert(await page.locator('#applyCurrent').isDisabled());
 assert.equal(writes.filter(u=>u.endsWith('/api/save-character')).length,1);assert.deepEqual(errors,[]);console.log('Sprite UX PASS: prominent scale/slider, persistent save/status, Ctrl+S, live read-only cross-character comparison, common units/zoom/footing, overlay, pause, legacy fallback, upload disclosure, guarded Publish, five viewports.');
}finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));const resolved=path.resolve(root);if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('benteng-workbench-qa-'))await rm(resolved,{recursive:true,force:true});}
