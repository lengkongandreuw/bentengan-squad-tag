import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';import {startMapStudio} from './map-studio/server.mjs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const studio=await startMapStudio(0);let browser;
try{
  await mkdir('outputs/relay-phase05-07',{recursive:true});browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async route=>{
    if(route.request().method()==='POST'){writes.push(route.request().url());return route.abort();}
    const path=new URL(route.request().url()).pathname;
    if(path==='/api/library')return route.fulfill({json:{items:[],warnings:[]}});
    if(path==='/api/templates'){const r=await route.fetch(),catalog=await r.json();catalog.library=[];return route.fulfill({json:catalog});}
    return route.continue();
  });
  await page.goto(studio.origin);await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Map Studio siap')&&!document.querySelector('main').inert);
  await page.locator('#maps').selectOption('studio-edit-pasar');await page.waitForFunction(()=>document.querySelector('#mapName').value==='Pasar Senggol');assert.equal(await page.locator('#enabled').isChecked(),false);
  await page.locator('#maps').selectOption('studio-gardu-tengah');await page.waitForFunction(()=>document.querySelector('#mapName').value==='Gardu Tengah');assert.equal(await page.locator('#enabled').isChecked(),true);await page.locator('#cleanPreview').check();await page.locator('#fit').click();
  await page.waitForFunction(()=>{const c=document.querySelector('#iconPreview'),pixel=c.getContext('2d').getImageData(Math.floor(805/1920*c.width),Math.floor(540/1080*c.height),1,1).data;return pixel[0]>pixel[2]+50;});
  await page.screenshot({path:'outputs/relay-phase05-07/editor-active-and-history.png'});assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  console.log('PASS real Studio loads multiple historical aliases, opens exact old Pasar/Gardu, preserves activation and shows primitive preview; no POST writes.');
}finally{await browser?.close();await new Promise(resolve=>studio.server.close(resolve));}
