import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {startSpriteStudio} from './server.mjs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const root=await mkdtemp(path.join(os.tmpdir(),'benteng-batch-qa-'));let server,browser,origin;
try{
 await mkdir(path.join(root,'config'),{recursive:true});await mkdir(path.join(root,'lib'));await copyFile('lib/sprite-studio-model.js',path.join(root,'lib/sprite-studio-model.js'));
 await writeFile(path.join(root,'config/game-rules.json'),JSON.stringify({teams:{red:{roster:['raja','bebe']},green:{roster:['kaka']}}}));
 const characters={};for(const id of ['raja','bebe','kaka']){await mkdir(path.join(root,'public/sprite-studio',id),{recursive:true});const asset=`sprite-studio/${id}/${'a'.repeat(64)}.webp`;await sharp({create:{width:64,height:32,channels:4,background:'#c56040'}}).webp({lossless:true}).toFile(path.join(root,'public',asset));
  const clip={asset,width:64,height:32,frames:[{x:0,y:0,width:32,height:32},{x:32,y:0,width:32,height:32}],fps:11,scale:1,x:5,y:-2,pivotX:.5,pivotY:1,loop:true,mirror:false};
  characters[id]={run:structuredClone(clip),'run.west':{...structuredClone(clip),scale:.8},'run.east':{...structuredClone(clip),scale:1.2,mirror:true},idle:{...structuredClone(clip),scale:1.5},boost_dust:structuredClone(clip)};
  if(id==='bebe'){characters[id].ultimate_takeoff={...structuredClone(clip),loop:false};characters[id].ultimate_fly=structuredClone(clip);}
 }
 await writeFile(path.join(root,'config/sprite-studio.json'),JSON.stringify({version:1,characters}));
 const original=await readFile(path.join(root,'config/sprite-studio.json'),'utf8');
 ({server,origin}=await startSpriteStudio(0,root));browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});page.on('dialog',d=>d.accept());
 await page.goto(origin+'/?character=raja&slot=run.west');await page.waitForFunction(()=>document.querySelector('#scale').value==='0.8'&&!document.querySelector('#bulkScope').disabled);
 await page.locator('#bulkEditShortcut').click();assert(await page.locator('#bulkEditor').evaluate(e=>e.open),'shortcut opens inspector');await page.locator('#scale').fill('0.9');await page.locator('#x').fill('22');
 await page.locator('#bulkSides').click();await page.getByLabel('Nilai Skala',{exact:true}).fill('1.4');assert.match(await page.locator('#bulkPreview').innerText(),/0.9 → 1.4/);
 assert.equal(await readFile(path.join(root,'config/sprite-studio.json'),'utf8'),original,'preview never saves');assert.deepEqual(writes,[]);
 await page.locator('#bulkApply').click();assert.equal(await page.locator('#scale').inputValue(),'1.4');assert.equal(await page.locator('#x').inputValue(),'22');assert.equal(await page.locator('#batchList input:checked').count(),2);
 await page.locator('#bulkUndo').click();assert.equal(await page.locator('#scale').inputValue(),'0.9');assert.equal(await page.locator('#x').inputValue(),'22');assert.equal(await page.locator('#batchList input:checked').count(),0,'original review flag restored');
 await page.locator('#bulkSides').click();await page.getByLabel('Mode Skala',{exact:true}).selectOption('multiply');await page.getByLabel('Nilai Skala',{exact:true}).fill('110');await page.getByLabel('Ubah FPS',{exact:true}).check();await page.getByLabel('Nilai FPS',{exact:true}).fill('15');await page.locator('#bulkApply').click();
 assert.equal(await page.locator('#scale').inputValue(),'0.99');assert.equal(await page.locator('#quickFps').inputValue(),'15');
 assert.equal(await readFile(path.join(root,'config/sprite-studio.json'),'utf8'),original,'staging never saves');
 await page.locator('#saveCharacter').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('2 movement / arah diterapkan'));
 const saved=JSON.parse(await readFile(path.join(root,'config/sprite-studio.json'),'utf8'));
 assert.equal(saved.characters.raja['run.west'].scale,.99);assert.equal(saved.characters.raja['run.east'].scale,1.32);assert.equal(saved.characters.raja['run.west'].x,22);assert.equal(saved.characters.raja['run.east'].x,5);assert.equal(saved.characters.raja['run.east'].mirror,true);
 for(const s of ['run.west','run.east']){assert.equal(saved.characters.raja[s].fps,15);assert.deepEqual(saved.characters.raja[s].frames,characters.raja[s].frames);assert.equal(saved.characters.raja[s].asset,characters.raja[s].asset);}
 assert.deepEqual(saved.characters.kaka,characters.kaka);assert.deepEqual(saved.characters.bebe,characters.bebe);assert.deepEqual(saved.characters.raja.idle,characters.raja.idle);assert.deepEqual(saved.characters.raja.boost_dust,characters.raja.boost_dust);
 await page.reload();await page.waitForFunction(()=>document.querySelector('#scale').value==='0.99');await page.locator('#bulkEditor>summary').click();await page.locator('#bulkSides').click();await page.getByLabel('Mode Skala',{exact:true}).selectOption('multiply');await page.getByLabel('Nilai Skala',{exact:true}).fill('500');assert(await page.locator('#bulkApply').isDisabled(),'overflow blocks entire batch');
 await page.locator('#bulkNone').click();await page.locator('#bulkTargetList input[value="run.south"]').check();await page.getByLabel('Mode Skala',{exact:true}).selectOption('set');await page.getByLabel('Nilai Skala',{exact:true}).fill('1.1');assert.match(await page.locator('#bulkPreview').innerText(),/override baru/);
 await page.locator('#bulkApply').click();assert.equal(await page.locator('#batchList input:checked').count(),1);await page.locator('#bulkUndo').click();assert.equal(await page.locator('#batchList input').count(),0,'undo removes newly staged inherited override');
 await page.locator('#bulkScope').selectOption('character');assert.equal(await page.locator('#bulkTargetList input[value="boost_dust"]').count(),0,'body scope excludes effect');
 await page.locator('#bulkExisting').click();await page.getByLabel('Mode Skala',{exact:true}).selectOption('set');await page.getByLabel('Nilai Skala',{exact:true}).fill('1.1');await page.locator('#bulkApply').click();await page.locator('#scale').fill('1.3');assert(await page.locator('#bulkUndo').isDisabled(),'undo cannot clobber a newer manual edit');
 await mkdir('outputs/sprite-batch',{recursive:true});
 for(const [width,height]of [[1920,1080],[1366,768],[844,390],[390,844]]){await page.setViewportSize({width,height});await page.locator('#bulkEditor').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:`outputs/sprite-batch/${width}x${height}.png`});}
 await page.getByLabel('Ubah Mirror horizontal',{exact:true}).focus();await page.keyboard.press('Space');assert(await page.getByLabel('Ubah Mirror horizontal',{exact:true}).isChecked(),'native checkbox supports keyboard');
 const png=await sharp({create:{width:32,height:32,channels:4,background:'#aadd44'}}).png().toBuffer();await page.setInputFiles('#files',{name:'pending.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>document.querySelector('#fileStatus').textContent.startsWith('File diterima'));
 assert(await page.locator('#bulkApply').isDisabled());assert(await page.locator('#bulkScope').isDisabled());assert(await page.locator('#bulkEditShortcut').isDisabled(),'unfinished crop cannot be batch-applied');
 assert.deepEqual(JSON.parse(await readFile(path.join(root,'config/sprite-studio.json'),'utf8')),saved,'later staged/manual/pending edits do not write');
 assert.equal(writes.filter(u=>u.endsWith('/api/save-character')).length,1,'only one explicit atomic save');assert.deepEqual(errors,[]);
 console.log('Collective editor PASS: direction presets, set/percentage scale+FPS, preservation, preview/drafts/atomic save/reload, invalid overflow, protected undo, four viewports. User config untouched.');
}finally{
 if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
 const resolved=path.resolve(root);if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('benteng-batch-qa-'))await rm(resolved,{recursive:true,force:true});
}
