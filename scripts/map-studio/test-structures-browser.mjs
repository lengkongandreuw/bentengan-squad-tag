import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {startMapStudio} from './server.mjs';
import {validateMap} from '../../lib/map-studio-model.js';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE ?? 'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const {server,origin}=await startMapStudio(0);
let browser;
try {
  const catalog=await (await fetch(origin+'/api/templates')).json();
  const fixture={...structuredClone(catalog.template),id:'studio-structure-qa',objects:[],enabled:false};
  const clip=catalog.library.find(a=>a.name==='fortGreen').clip;
  const errors=[];let snapshot=structuredClone(fixture),revision='fixture-1',uploads=0,modern=true,token='fixture-token',saveCount=0,corrupt=false;
  browser=await chromium.launch({headless:true,executablePath:process.env.BENTENG_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
  // Intercept all writes: this browser test never saves/uploads into user maps.
  await page.route('**/api/**',async route=>{
    const req=route.request(),name=new URL(req.url()).pathname;
    if(name==='/api/state')return route.fulfill({json:{token,revision,document:{version:1,maps:[snapshot]},...(modern?{capabilities:{structureVisuals:1}}:{})}});
    if(req.method()==='POST'){
      if(name==='/api/save'){saveCount++;assert.equal(req.headers()['x-admin-token'],token);snapshot=validateMap(req.postDataJSON().map);revision+='x';const output=structuredClone(snapshot);if(corrupt)delete output.bases.blue.visual;return route.fulfill({json:{revision,document:{version:1,maps:[output]}}});}
      if(name==='/api/upload'){uploads++;if(req.postDataJSON().file.name==='bad.png')return route.fulfill({status:400,json:{error:'Fixture rejected upload'}});return route.fulfill({json:{asset:clip}});}
      throw new Error('Unexpected write '+name);
    }
    return route.continue();
  });
  await page.goto(origin);await page.waitForFunction(()=>!document.querySelector('main').inert);
  await page.selectOption('#maps',fixture.id);
  const save=async()=>{const response=page.waitForResponse(r=>r.url().endsWith('/api/save'));await page.click('#save');await response;await page.waitForFunction(()=>document.querySelector('#saveState').textContent.includes('Tersimpan'));return structuredClone(snapshot);};
  const pick=async id=>page.locator('#objects button').filter({hasText:id}).click();
  const panel=slot=>page.locator(`.structure-visual[data-slot="${slot}"]`);
  const file=async(slot,name='test.png')=>{await panel(slot).locator('[data-action=file]').click();await page.setInputFiles('#structureFile',{name,mimeType:'image/png',buffer:Buffer.from('fixture')});await page.waitForFunction(()=>document.querySelector('#save').disabled===false);};
  for(const [name,team] of [['Benteng Merah','blue'],['Benteng Hijau','red']]){
    await pick(name);await panel('visual').locator('[data-action=library]').click();
    await page.locator('#library button').filter({hasText:/^fortGreen$/}).click();
    const first=await save();assert.equal(first.objects.length,0);assert.deepEqual({...first.bases[team],visual:undefined},{...fixture.bases[team],visual:undefined});
    assert.equal(first.bases[team].visual.asset.asset,clip.asset);
    await page.click('#undo');assert.equal((await save()).bases[team].visual,undefined,'one replacement undo');
    await page.click('#redo');assert.deepEqual((await save()).bases[team].visual,first.bases[team].visual);
    await panel('visual').locator('[data-visual-key=mirror]').check();await panel('visual').locator('[data-visual-key=mirrorY]').check();
    await panel('visual').locator('[data-visual-key=w]').fill('230');await panel('visual').locator('[data-visual-key=w]').dispatchEvent('change');
    await panel('visual').locator('[data-visual-key=offsetX]').fill('-100');await panel('visual').locator('[data-visual-key=offsetX]').dispatchEvent('change');
    const transformed=await save();assert(transformed.bases[team].visual.mirror&&transformed.bases[team].visual.mirrorY);assert.equal(transformed.bases[team].visual.w,230);assert.equal(transformed.baseRadius,undefined);
    await file('visual');await save();await file('visual');await save();assert.equal(await page.inputValue('#structureFile'),'','same file reusable');
    const beforeFailure=JSON.stringify(snapshot);await file('visual','bad.png');assert.match(await page.locator('#status').textContent(),/rejected/);assert.equal(JSON.stringify(await save()),beforeFailure,'failure leaves map unchanged');
  }
  for(const [name,team] of [['Penjara Merah','blue'],['Penjara Hijau','red']]){
    await pick(name);await file('floorVisual');const floor=await save();assert.equal(floor.prisons[team].overlayVisual,undefined);
    await file('overlayVisual');const overlay=await save();assert.deepEqual(overlay.prisons[team].floorVisual,floor.prisons[team].floorVisual);
    const {floorVisual,overlayVisual,...zone}=overlay.prisons[team];assert.deepEqual(zone,fixture.prisons[team]);assert(floorVisual&&overlayVisual);
  }
  await page.reload();await page.waitForFunction(()=>!document.querySelector('main').inert);await page.selectOption('#maps',fixture.id);await pick('Penjara Hijau');
  assert.equal(await panel('overlayVisual').locator('[data-visual-key=w]').inputValue(),String(snapshot.prisons.red.overlayVisual.w));
  await mkdir('outputs/map-studio-structures',{recursive:true});
  await panel('floorVisual').scrollIntoViewIfNeeded();await page.screenshot({path:'outputs/map-studio-structures/prison.png'});
  await panel('overlayVisual').locator('[data-action=reset]').click();const reset=await save();assert.equal(reset.prisons.red.overlayVisual,undefined);assert(reset.prisons.red.floorVisual);
  await page.click('#undo');assert((await save()).prisons.red.overlayVisual);
  await pick('Benteng Merah');await page.locator('#baseRadius').fill('90');await page.locator('#baseRadius').dispatchEvent('change');const radius=await save();assert.equal(radius.baseRadius,90);
  assert.equal(radius.bases.blue.x,fixture.bases.blue.x);
  await panel('visual').scrollIntoViewIfNeeded();await page.screenshot({path:'outputs/map-studio-structures/base.png'});
  await panel('visual').locator('[data-action=reset]').click();assert.equal((await save()).bases.blue.visual,undefined);await page.click('#undo');await save();
  await page.locator('#search').fill('crate');await page.locator('#library button').first().click();
  await page.locator('#mirror').check();await page.locator('#mirrorY').check();const object=await save();assert(object.objects[0].mirror&&object.objects[0].mirrorY);
  await pick('Benteng Merah');await panel('visual').locator('[data-visual-key=offsetX]').fill('-120');await panel('visual').locator('[data-visual-key=offsetX]').dispatchEvent('change');
  const count=saveCount;modern=false;await page.click('#save');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('versi lama'));
  assert.equal(saveCount,count,'legacy server rejected BEFORE write');assert.match(await page.locator('#saveState').textContent(),/Belum disimpan/);
  modern=true;token='restarted-token';await save();assert.equal(snapshot.bases.blue.visual.offsetX,-120,'restart session refreshed safely');
  await panel('visual').locator('[data-visual-key=offsetX]').fill('-130');await panel('visual').locator('[data-visual-key=offsetX]').dispatchEvent('change');corrupt=true;
  await page.click('#save');await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('tidak cocok'));
  assert.match(await page.locator('#saveState').textContent(),/Belum disimpan/,'mismatched saved response never clears dirty draft');
  const download=page.waitForEvent('download');await page.click('#exportDraft');assert.match((await download).suggestedFilename(),/draft.json$/);
  assert.deepEqual(errors,[]);assert(uploads>=10);
  await mkdir('outputs/map-studio-structures',{recursive:true});await page.screenshot({path:'outputs/map-studio-structures/inspector.png'});
  // Read-only source snapshot for provenance; no real config writes above.
  assert((await readFile('config/map-studio.json')).length>0);
  console.log('Both teams: library/file replace, same-file retry, failure, Undo/Redo, mirror, geometry, floor/overlay isolation and reload PASS; all writes mocked.');
} finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
