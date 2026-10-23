// Intercept every upload/save; real user config and files remain untouched.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {startMapStudio} from './server.mjs';
import {validateMap,solidAt,waterAt,speedAt} from '../../lib/map-studio-model.js';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const originalFile=await readFile('config/map-studio.json','utf8');const {server,origin}=await startMapStudio(0);let browser,page;
try{
  await mkdir('outputs/map-terrain',{recursive:true});
  const catalog=await (await fetch(origin+'/api/templates')).json(),fixture=structuredClone(catalog.builtinTemplates.find(m=>m.replaces==='kampung'));
  fixture.id='studio-terrain-qa';fixture.enabled=false;fixture.objects=fixture.objects.map(o=>({...o,asset:null}));
  const baseline=structuredClone(fixture);let snapshot=structuredClone(fixture),revision='terrain-1',uploads=0,failUpload=false;
  const image=await sharp({create:{width:80,height:40,channels:4,background:'#2c69df'}}).webp({lossless:true}).toBuffer();
  const clip={asset:'map-studio/'+ 'a'.repeat(64)+'.webp',width:80,height:40,frames:[{x:0,y:0,width:80,height:40}],fps:12};
  const patchImage=await sharp({create:{width:80,height:40,channels:4,background:'#df692c'}}).webp({lossless:true}).toBuffer(),patchClip={...clip,asset:'map-studio/'+'b'.repeat(64)+'.webp'};
  browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});page=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/api/**',async route=>{
    const request=route.request(),name=new URL(request.url()).pathname;
    if(name==='/api/state')return route.fulfill({json:{token:'qa-token',revision,capabilities:{structureVisuals:1,mapAssetBundles:1,assetOptimization:1},document:{version:1,maps:[snapshot]}}});
    if(request.method()==='POST'){
      if(name==='/api/upload'){uploads++;if(failUpload)return route.fulfill({status:400,json:{error:'QA upload rejected'}});assert.equal(request.postDataJSON().revision,revision);return route.fulfill({json:{asset:request.postDataJSON().file.name==='patch.png'?patchClip:clip}});}
      if(name==='/api/save'){snapshot=validateMap(request.postDataJSON().map);revision+='x';return route.fulfill({json:{revision,document:{version:1,maps:[snapshot]}}});}
      throw Error('Unexpected write '+name);
    }
    return route.continue();
  });
  await page.route('**/'+clip.asset+'*',route=>route.fulfill({body:image,contentType:'image/webp'}));
  await page.route('**/'+patchClip.asset+'*',route=>route.fulfill({body:patchImage,contentType:'image/webp'}));
  await page.goto(origin);await page.waitForFunction(()=>!document.querySelector('main').inert);await page.selectOption('#maps',fixture.id);
  const save=async()=>{await page.click('#save');await page.waitForFunction(()=>document.querySelector('#saveState').textContent.includes('Tersimpan')||document.querySelector('#status').classList.contains('error'));assert(!await page.locator('#status').evaluate(el=>el.classList.contains('error')),await page.locator('#status').innerText());return structuredClone(snapshot);};
  const invariant=map=>{for(const key of ['id','replaces','enabled','bases','prisons','waterMask'])assert.deepEqual(map[key],baseline[key],key+' preserved');assert.deepEqual(map.objects.slice(0,baseline.objects.length),baseline.objects);};
  const file={name:'terrain.png',mimeType:'image/png',buffer:await sharp(image).png().toBuffer()};
  await page.click('#replaceTerrain');await page.setInputFiles('#terrainFile',file);await page.waitForFunction(()=>!document.querySelector('#save').disabled);let saved=await save();assert.deepEqual(saved.terrain,clip);assert.equal(saved.objects.length,baseline.objects.length);invariant(saved);
  await page.click('#undo');assert.deepEqual((await save()).terrain,baseline.terrain);await page.click('#redo');assert.deepEqual((await save()).terrain,clip);
  await page.click('#addTerrainPatch');await page.setInputFiles('#terrainFile',{name:'patch.png',mimeType:'image/png',buffer:await sharp(patchImage).png().toBuffer()});await page.waitForFunction(()=>!document.querySelector('#save').disabled);saved=await save();const patch=saved.objects.at(-1);assert.equal(patch.behavior,'decoration');assert.equal(patch.layer,'background');assert.equal(patch.w/patch.h,2);assert.deepEqual(patch.asset,patchClip);invariant(saved);
  for(let i=0;i<100;i++){const x=i*71%saved.width,y=i*137%saved.height;assert.equal(solidAt(saved,x,y,13),solidAt(baseline,x,y,13));assert.equal(waterAt(saved,x,y),waterAt(baseline,x,y));assert.equal(speedAt(saved,x,y),speedAt(baseline,x,y));}
  const x=patch.x;await page.locator('#canvas').focus();await page.keyboard.press('ArrowRight');assert.equal(+await page.locator('#x').inputValue(),x+1);await page.keyboard.press('Control+z');assert.equal(+await page.locator('#x').inputValue(),x);
  await page.click('#undo');assert.equal((await save()).objects.length,baseline.objects.length);await page.click('#redo');assert.equal((await save()).objects.length,baseline.objects.length+1);
  await page.reload();await page.waitForFunction(()=>!document.querySelector('main').inert);await page.selectOption('#maps',fixture.id);await page.locator('#objects button').filter({hasText:'Tambalan terrain'}).click();assert.equal(await page.locator('#layer').inputValue(),'background');
  await page.locator('#cleanPreview').check();await page.waitForTimeout(150);const sample=await page.locator('#canvas').evaluate((canvas,{x,y,w,h,mapWidth})=>{const scale=canvas.width/mapWidth;return [...canvas.getContext('2d').getImageData(Math.round((x+w/2)*scale),Math.round((y+h/2)*scale),1,1).data];},{...patch,mapWidth:saved.width});assert.deepEqual(sample,[223,105,44,255],'patch paints on canvas above blue terrain');
  await page.locator('#cleanPreview').uncheck();await page.locator('#canvas').focus();await page.keyboard.press('Delete');assert.equal((await save()).objects.length,baseline.objects.length);await page.locator('#canvas').focus();await page.keyboard.press('Control+z');await save();
  await page.click('#patchLibrary');await page.locator('#library button').first().click();saved=await save();assert.equal(saved.objects.length,baseline.objects.length+2);assert.equal(saved.objects.at(-1).layer,'background');
  await page.click('#terrainLibrary');await page.locator('#library button').first().click();saved=await save();assert.equal(saved.objects.length,baseline.objects.length+2,'base replacement does not add props');
  await page.click('#restoreTerrain');saved=await save();assert.deepEqual(saved.terrain,catalog.builtinTemplates.find(m=>m.replaces===fixture.replaces).terrain);invariant(saved);assert.equal(saved.objects.length,baseline.objects.length+2,'restore keeps patches');
  failUpload=true;await page.click('#replaceTerrain');await page.setInputFiles('#terrainFile',file);await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('QA upload rejected'));assert.deepEqual((await save()).terrain,saved.terrain);
  // Reproduce old drafts produced from overlong file names. Save repairs labels,
  // not assets/geometry; Undo and subsequent numeric validation remain honest.
  snapshot.name='';snapshot.description='D'.repeat(350);snapshot.objects[0].name='N'.repeat(125);snapshot.objects[1].name=null;revision+='legacy';
  const stripLabels=value=>{const copy=structuredClone(value);delete copy.name;delete copy.description;for(const object of copy.objects)delete object.name;return copy;};const nonTextBefore=stripLabels(snapshot);
  await page.reload();await page.waitForFunction(()=>!document.querySelector('main').inert);await page.selectOption('#maps',fixture.id);saved=await save();assert.equal(saved.name,'Map tanpa nama');assert.equal(saved.description.length,300);assert.equal(saved.objects[0].name.length,100);assert.equal(saved.objects[1].name,'Objek 2');assert.deepEqual(stripLabels(saved),nonTextBefore);
  assert(await page.locator('#repairReport').isVisible());const strip=await page.locator('.publish-strip').boundingBox(),main=await page.locator('main').boundingBox();assert(main.y>=strip.y+strip.height-1,'recovery cannot hide the save-status strip');await page.screenshot({path:'outputs/map-terrain/name-recovery.png'});await page.locator('#undoTextRepair').click();await page.click('#objects button:nth-child(5)');assert.equal((await page.locator('#objectName').inputValue()).length,125,'repair can be undone without deleting the object');await page.click('#redo');assert.equal((await page.locator('#objectName').inputValue()).length,100);
  await page.locator('#objectName').evaluate(input=>{input.value='Q'.repeat(150);input.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await page.locator('#objectName').inputValue()).length,100);assert.match(await page.locator('#objectNameCount').innerText(),/100 \/ 100/);await save();
  const oldX=await page.locator('#x').inputValue();await page.locator('#x').fill('-99');assert.equal(await page.locator('#x').getAttribute('aria-invalid'),'true');await page.locator('#locateProblem').click();assert(await page.locator('#x').evaluate(input=>input===document.activeElement));assert.match(await page.locator('#status').innerText(),/Posisi objek/);
  await page.locator('#x').fill(oldX);await save();assert.equal(await page.locator('#x').getAttribute('aria-invalid'),null);
  const beforeImport=structuredClone(snapshot),backup=structuredClone(snapshot);backup.objects[0].name='Backup '+ 'B'.repeat(140);
  await page.setInputFiles('#draftFile',{name:'draft.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Cadangan dibuka'));assert.deepEqual(snapshot,beforeImport,'import does not write before Save');await page.click('#objects button:nth-child(5)');assert.equal((await page.locator('#objectName').inputValue()).length,100);await save();
  const imported=structuredClone(snapshot);await page.setInputFiles('#draftFile',{name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Cadangan tidak bisa dibaca'));assert.deepEqual(snapshot,imported,'invalid backup cannot overwrite map');
  await mkdir('outputs/map-terrain',{recursive:true});await page.screenshot({path:'outputs/map-terrain/editor.png'});assert.deepEqual(errors,[]);assert(uploads===3);assert.equal(await readFile('config/map-studio.json','utf8'),originalFile);
  console.log('PASS: terrain/patch file+library, pixels, save/reload, geometry/identity preservation, legacy long/missing labels auto-repair, report+Undo/Redo, character limit/counter and focused numeric recovery. No real source/asset writes.');
}catch(error){console.log(await page?.evaluate(()=>({status:document.querySelector('#status').textContent,terrain:document.querySelector('#terrainInfo').textContent,layer:document.querySelector('#layerFilter').value,zoom:document.querySelector('#zoom').value,assets:performance.getEntriesByType('resource').filter(r=>r.name.includes('/map-studio/')).map(r=>({url:r.name,size:r.encodedBodySize}))})));await mkdir('outputs/map-terrain',{recursive:true});await page?.screenshot({path:'outputs/map-terrain/failure.png'});throw error;}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
