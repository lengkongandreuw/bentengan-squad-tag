// Render actual editor HTML/CSS in an isolated blank page. No HTTP server/fetch.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
const {chromium}=await import('file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const html=(await readFile('scripts/map-studio/index.html','utf8')).replace(/<link[^>]*>/g,'').replace(/<script[\s\S]*?<\/script>/g,'');
  await page.setContent(html);await page.addStyleTag({content:await readFile('scripts/map-studio/editor.css','utf8')});
  await page.evaluate(()=>{document.querySelector('#properties').hidden=false;document.querySelector('#nothing').hidden=true;document.querySelector('#objectName').value='parkBarrier';document.querySelector('#objectNameCount').textContent='11 / 100 karakter';document.querySelector('#selectionTitle').textContent='parkBarrier';document.querySelector('#textureBudget').textContent='Perkiraan tekstur RGBA: 137.7 MiB.';document.querySelector('#optimizeMapImages').hidden=false;for(const name of ['Benteng Merah','Penjara Hijau','parkBarrier']){const b=document.createElement('button');b.textContent=name;document.querySelector('#objects').append(b);}});
  await page.addScriptTag({content:(await readFile('scripts/map-studio/coachmarks.js','utf8')).replace('export function installMapCoachmarks','function installMapCoachmarks')+'\nwindow.releaseCoaches=installMapCoachmarks();'});
  assert.equal(await page.locator('#objectsPanel').getAttribute('open'),null);
  assert.equal(await page.locator('#objectNameHelp').isVisible(),false);
  const help=page.getByRole('button',{name:'Bantuan: Nama objek',exact:true});await help.click();
  const dialog=page.getByRole('dialog',{name:'Nama objek',exact:true});await dialog.waitFor({state:'visible'});
  assert.match(await dialog.innerText(),/11 \/ 100/);
  await page.evaluate(()=>document.querySelector('#objectNameCount').textContent='12 / 100 karakter');assert.match(await dialog.innerText(),/12 \/ 100/);
  await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);assert.equal(await help.getAttribute('aria-expanded'),'false');
  await help.focus();await page.keyboard.press('Enter');await dialog.waitFor({state:'visible'});await dialog.getByRole('button',{name:'Tutup',exact:true}).click();
  await page.locator('#objectsPanel>summary').click();assert.equal(await page.locator('#objects button').first().isVisible(),true);await page.locator('#objectsPanel>summary').click();assert.equal(await page.locator('#objects button').first().isVisible(),false);
  await page.evaluate(()=>{const root=document.querySelector('#structureProperties');root.hidden=false;root.innerHTML='<details class="structure-visual" open><summary>Visual Benteng</summary><p>Ukuran dan mirror hanya mengubah gambar.</p></details>';});
  const dynamic=page.getByRole('button',{name:'Bantuan: Visual Benteng',exact:true});await dynamic.waitFor();await dynamic.click();assert.match(await page.getByRole('dialog',{name:'Visual Benteng',exact:true}).innerText(),/mirror/);
  await page.keyboard.press('Escape');await page.evaluate(()=>document.querySelector('#structureProperties').replaceChildren());await page.waitForFunction(()=>!Array.from(document.querySelectorAll('.coach-popover')).some(p=>p.getAttribute('aria-label')==='Visual Benteng'));
  await mkdir('outputs/map-coachmarks',{recursive:true});await page.screenshot({path:'outputs/map-coachmarks/1366.png'});
  await page.setViewportSize({width:844,height:390});await help.click();const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=844&&box.y+box.height<=390);await page.screenshot({path:'outputs/map-coachmarks/844.png'});
  assert.deepEqual(errors,[]);console.log('PASS offline coachmark click/keyboard/Escape/counter/dynamic cleanup, collapsed objects and viewport containment. No HTTP/project writes.');
}finally{await browser.close();}
