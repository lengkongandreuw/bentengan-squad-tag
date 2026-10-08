import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,copyFile,readdir} from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';
import sharp from 'sharp';
import {startLoadingAdmin} from './loading-admin/server.mjs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'playwright');
const root=await mkdtemp(path.join(os.tmpdir(),'loading-browser-'));await mkdir(path.join(root,'config'));
await writeFile(path.join(root,'config/loading-media.json'),JSON.stringify({version:1,slots:{}}));await writeFile(path.join(root,'config/map-studio.json'),JSON.stringify({maps:[{id:'studio-qa',name:'QA arena',enabled:true}]}));
for(const dir of ['loading-ui','arena-ui']){await mkdir(path.join(root,'public',dir),{recursive:true});for(const name of await readdir('public/'+dir)){if(/\.(png|webp|mp4)$/.test(name))await copyFile(path.join('public',dir,name),path.join(root,'public',dir,name));}}
const {server,origin}=await startLoadingAdmin(0,root),browser=await chromium.launch({headless:true,executablePath:process.env.BENTENG_CHROME_PATH});const errors=[];
const png=await sharp({create:{width:640,height:360,channels:4,background:'#547f25'}}).png().toBuffer();
const gif=await sharp(png).gif().toBuffer();
try {
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]) {
    const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));page.on('dialog',dialog=>dialog.accept());await page.goto(origin);
    await page.selectOption('#slot','character-red');await page.locator('#preserve-progress').uncheck();await page.setInputFiles('#file',{name:'test.gif',mimeType:'image/gif',buffer:gif});
    await page.waitForFunction(()=>!document.querySelector('#save').disabled);
    assert.match(await page.locator('#current-source').innerText(),/bawaan/);assert.match(await page.locator('#draft-source').innerText(),/test.gif/);
    await page.waitForFunction(()=>document.querySelector('#current-frame').naturalWidth>0);assert(await page.locator('#current-frame').isVisible());assert.equal(await page.locator('#draft-frame').isVisible(),false);
    await page.locator('#percent').fill('85');await page.locator('#percent').dispatchEvent('input');assert.match(await page.locator('#current-frame').getAttribute('src'),/80_/);
    await page.selectOption('#fit','contain');assert.match(await page.locator('#media').getAttribute('class'),/contain/);assert.match(await page.locator('#current-media').getAttribute('class'),/cover/);
    await mkdir('outputs/loading-admin',{recursive:true});await page.screenshot({path:`outputs/loading-admin/compare-${viewport.width}.png`,fullPage:true});
    await page.locator('#error-preview').check();assert(await page.locator('#current-progress').isVisible());await page.locator('#error-preview').uncheck();assert.equal(await page.locator('#current-progress').isVisible(),false);
    await page.click('#play');await page.waitForTimeout(300);assert.match(await page.locator('#play').innerText(),/Jeda/);await page.click('#play');
    await page.click('#save');await page.locator('#message').filter({hasText:'Tersimpan lokal'}).waitFor();
    assert.equal(await page.locator('#media img').getAttribute('src').then(v=>v.endsWith('.gif')),true);
    assert.equal(await page.locator('#fallback').isVisible(),false);
    await page.reload();await page.selectOption('#slot','character-red');assert.equal(await page.locator('#fit').inputValue(),'contain');await page.locator('#media img').waitFor();
    assert.equal(await page.locator('#current-media img').getAttribute('src'),await page.locator('#media img').getAttribute('src'));
    await page.locator('#preserve-progress').check();await page.locator('#draft-frame').waitFor({state:'visible'});assert.equal(await page.locator('#current-frame').isVisible(),false);
    await page.click('#save-fit');await page.locator('#message').filter({hasText:'Tersimpan lokal'}).waitFor();await page.locator('#current-frame').waitFor({state:'visible'});
    await page.selectOption('#slot','match');await page.setInputFiles('#file',{name:'test.mp4',mimeType:'video/mp4',buffer:await readFile('public/arena-ui/pasar.mp4')});
    await page.waitForFunction(()=>!document.querySelector('#save').disabled,{timeout:20000});await page.click('#save');await page.locator('#message').filter({hasText:'Tersimpan lokal'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('#media video')?.readyState>=2);
    assert(await page.locator('#media video').evaluate(v=>v.muted&&v.loop));
    await page.selectOption('#slot','match:studio-qa');assert.match(await page.locator('#status').innerText(),/MENGIKUTI/);
    await page.selectOption('#aspect','phone');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await mkdir('outputs/loading-admin',{recursive:true});await page.screenshot({path:`outputs/loading-admin/${viewport.width}.png`,fullPage:true});
    await page.selectOption('#slot','character-red');await page.click('#reset');await page.locator('#message').filter({hasText:'Tersimpan lokal'}).waitFor();assert.match(await page.locator('#status').innerText(),/BAWAAN/);
    await page.close();console.log(`PASS loading admin ${viewport.width}: GIF/video upload, persisted fit, inherited map default, reset and responsive preview`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
