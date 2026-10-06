// Isolated editor acceptance: never saves/uploads into the user's project.
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, readFile, writeFile, rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
import {startMapStudio} from './server.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=await mkdtemp(path.join(os.tmpdir(),'benteng-map-preview-'));
let server,browser;
try {
  const source=JSON.parse(await readFile(path.join(root,'config/map-studio.json')));
  const taman=source.maps.find(m=>m.replaces==='taman'); assert.ok(taman);
  for(const file of ['app/prototype.tsx','config/game-rules.json','lib/field-assets.generated.ts','lib/map-studio-model.js']) {
    await mkdir(path.dirname(path.join(dir,file)),{recursive:true});await copyFile(path.join(root,file),path.join(dir,file));
  }
  await writeFile(path.join(dir,'config/map-studio.json'),JSON.stringify({version:1,maps:[taman]}));
  const publicFiles=['objects.webp','kampung-map.webp','pasar-map.webp','taman-map.webp','kanal-map.webp',
    'kanal2-ground.webp','kanal-object-atlas.webp','kanal1-water-mask.png','kanal2-water-mask.png'].map(f=>'field/'+f);
  publicFiles.push(...['kampung','pasar','taman','kanal','kanal2'].map(id=>`ui-v2/fields/${id}.webp`));
  publicFiles.push(...[taman.terrain,taman.icon,...taman.objects.map(o=>o.asset)].filter(Boolean).map(a=>a.asset));
  for(const file of new Set(publicFiles)) {
    await mkdir(path.dirname(path.join(dir,'public',file)),{recursive:true});
    await copyFile(path.join(root,'public',file),path.join(dir,'public',file));
  }
  const started=await startMapStudio(0,dir);server=started.server;
  const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE||'playwright');
  browser=await chromium.launch({headless:true,...(process.env.BENTENG_CHROME_PATH?{executablePath:process.env.BENTENG_CHROME_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],badImages=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('.webp')&&!r.ok())badImages.push(r.url());});
  await page.goto(started.origin);await page.getByText('Map Studio siap',{exact:false}).waitFor();
  await page.locator('#maps').selectOption('builtin:taman');
  await page.locator('#cleanPreview').check();
  await page.waitForFunction(()=>{
    const c=document.querySelector('#canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let varied=0;for(let i=0;i<d.length;i+=400)if(d[i]>90&&d[i+1]>70)varied++;return varied>50;
  });
  assert.match(await page.locator('#unlockIdentity').innerText(),/arena asli \(taman\)/);
  // The SAME authored background image is fetched, including baked structures.
  const fetched=Buffer.from(await page.evaluate(async()=>Array.from(new Uint8Array(await(await fetch('/field/taman-map.webp')).arrayBuffer()))));
  assert.deepEqual(fetched,await readFile(path.join(root,'public/field/taman-map.webp')));
  await mkdir(path.join(root,'outputs'),{recursive:true});
  await page.screenshot({path:path.join(root,'outputs/map-editor-taman-clean.png'),fullPage:true});
  const png=await sharp({create:{width:300,height:300,channels:4,background:'#aa4477'}}).png().toBuffer();
  await page.locator('#mapPreviewFile').setInputFiles({name:'preview.png',mimeType:'image/png',buffer:png});
  await page.getByText('File diterima',{exact:false}).waitFor();
  await page.locator('#save').click();await page.getByText('✓ Tersimpan lokal',{exact:true}).waitFor();
  const saved=JSON.parse(await readFile(path.join(dir,'config/map-studio.json'))).maps[0];
  assert.equal(saved.id,taman.id);assert.equal(saved.replaces,'taman');assert.equal(saved.icon.frames[0].width,640);assert.equal(saved.icon.frames[0].height,360);
  assert.deepEqual(saved.objects,taman.objects);assert.deepEqual(saved.terrain,taman.terrain);
  assert.deepEqual(saved.bases,taman.bases);assert.deepEqual(saved.prisons,taman.prisons);assert.equal(saved.enabled,taman.enabled);
  await page.reload();await page.getByText('Map Studio siap',{exact:false}).waitFor();
  await page.waitForFunction(()=>{const c=document.querySelector('#iconPreview'),p=c.getContext('2d').getImageData(120,67,1,1).data;return p[0]>130&&p[2]>80;});
  await page.screenshot({path:path.join(root,'outputs/map-editor-selection-preview.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(badImages,[]);
  console.log(JSON.stringify({status:'PASS',tamanSourceParity:true,thumbnailUploadSaveReload:true,collidersPreserved:true,pageErrors:errors}));
}finally {
  await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));
  assert.ok(dir.startsWith(path.join(os.tmpdir(),'benteng-map-preview-')));await rm(dir,{recursive:true,force:true});
}
