import assert from 'node:assert/strict';
import fs from 'node:fs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.BENTENG_CHROME_PATH});
const base=process.env.BENTENG_UI_URL??'http://127.0.0.1:3026/bentengan-squad-tag/';
const out='outputs/ui-priority';fs.mkdirSync(out,{recursive:true});
const observations=[],errors=[];
async function inside(page,locator,name){
  await locator.waitFor();const box=await locator.boundingBox(),vp=page.viewportSize();
  assert(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=vp.width+1&&box.y+box.height<=vp.height+1,`${name} outside viewport: ${JSON.stringify(box)}`);
  return box;
}
async function shot(page,name){await page.screenshot({path:`${out}/${name}.png`});}
try{
  for(const [kind,viewport,mobile] of [['desktop',{width:1366,height:768},false],['portrait',{width:390,height:844},true],['landscape',{width:844,height:390},true]]){
    const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile}),page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
    await page.getByLabel('USERNAME',{exact:true}).fill(`QA${kind}`);
    await page.getByRole('button',{name:'CONFIRM',exact:true}).click();
    await inside(page,page.getByRole('button',{name:'MULTIPLAYER · LOBBY',exact:true}),'Multiplayer artwork button');
    await page.waitForFunction(()=>{const image=document.querySelector('.multiplayer-open img');return image?.complete&&image.naturalWidth>0;});
    assert.match(await page.locator('.multiplayer-open img').getAttribute('src'),/controls\/multiplayer\.webp/);
    await shot(page,`${kind}-landing`);
    await page.getByRole('button',{name:'MULTIPLAYER · LOBBY',exact:true}).click();
    const lobby=page.locator('.multiplayer-panel');const box=await inside(page,lobby,'Lobby');
    assert(Math.abs(box.x+box.width/2-viewport.width/2)<3,'Lobby not centered');
    assert.equal(await page.getByLabel('Nama pemain',{exact:true}).inputValue(),`QA${kind}`);
    await page.getByRole('button',{name:'Gabung room',exact:true}).click();
    await page.getByLabel('Kode atau link undangan dari host',{exact:true}).fill(`${base}?room=BNT-ABCDEFGH-abcdefghijklmnopqrst&arena=studio-edit-kampung`);
    assert.equal(await page.getByLabel('Arena multiplayer').inputValue(),'studio-edit-kampung');
    assert(await page.getByLabel('Arena multiplayer').isDisabled());await shot(page,`${kind}-lobby`);
    await inside(page,page.getByRole('button',{name:'Tutup multiplayer'}),'Close lobby');
    await page.getByRole('button',{name:'Tutup multiplayer'}).click();
    await page.getByRole('button',{name:'GAME RULES',exact:true}).click();
    await inside(page,page.getByRole('button',{name:'Tutup',exact:true}),'Close rules');
    assert(!await page.locator('.rules-dialog').innerText().then(t=>t.includes('tetap rentan tag')));
    await page.locator('.rules-dialog').hover();await page.mouse.wheel(0,800);await page.waitForTimeout(200);
    await inside(page,page.getByRole('button',{name:'Tutup',exact:true}),'Close scrolled rules');
    await shot(page,`${kind}-rules`);await page.getByRole('button',{name:'Tutup',exact:true}).click();
    await page.getByLabel('Pengaturan volume audio',{exact:true}).click();
    await inside(page,page.getByRole('button',{name:'SAVE',exact:true}),'Save audio');
    await inside(page,page.getByRole('button',{name:'CANCEL',exact:true}),'Cancel audio');
    await shot(page,`${kind}-audio`);
    await page.getByRole('button',{name:'CANCEL',exact:true}).click();
    await page.locator('.enter-game').click();await page.getByRole('button',{name:'Pilih Tim Merah',exact:true}).click();
    const pick=page.getByRole('button',{name:/^PILIH RAJA$/i});await pick.waitFor({timeout:60000});
    await inside(page,pick,'Pick Raja');await inside(page,page.locator('.selection-economy button'),'Upgrade');
    await shot(page,`${kind}-character`);
    await page.locator('.selection-economy button').click();await inside(page,page.getByRole('button',{name:'Tutup upgrade'}),'Close upgrade');
    await page.getByRole('button',{name:'Tutup upgrade'}).click();await pick.click();
    const start=page.getByRole('button',{name:'MULAI MATCH',exact:true});await inside(page,start,'Playable default start');assert(await start.isEnabled());
    await shot(page,`${kind}-arena`);await start.click();await page.locator('canvas').first().waitFor({timeout:60000});
    await page.waitForTimeout(6500);
    if(mobile)for(const name of ['Gerak atas','Gerak kiri','Gerak kanan','Gerak bawah','Sprint','Parkour'])await inside(page,page.getByRole('button',{name,exact:true}),name);
    assert(await page.locator('.camera-map button').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))>=12);
    await inside(page,page.getByRole('button',{name:'Atur keterbacaan HUD'}),'HUD settings');
    await page.getByRole('button',{name:'Atur keterbacaan HUD'}).click();
    await page.getByLabel('Skala teks HUD').focus();await page.keyboard.press('End');
    await page.getByLabel('Kontras tinggi').check();await inside(page,page.getByRole('button',{name:'Tutup pengaturan HUD'}),'Close HUD');
    await page.getByRole('button',{name:'Tutup pengaturan HUD'}).click();assert(await page.locator('.hud-high-contrast').count());
    await page.getByRole('button',{name:'Sembunyikan panduan'}).click();
    await page.getByRole('button',{name:'Panduan · Benteng → Tag → Rescue → Rebut',exact:true}).click();
    await shot(page,`${kind}-game`);
    const bounds=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,viewport:[innerWidth,innerHeight]}));
    assert(bounds.width<=viewport.width+1&&bounds.height<=viewport.height+1,`${kind} requires scrolling: ${JSON.stringify(bounds)}`);
    observations.push({kind,lobby:box,bounds});console.log(`PASS ${kind}: viewport, modal close, playable arena, HUD, touch controls, invite`);
    await context.close();
  }
  const inviteContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const invitePage=await inviteContext.newPage();invitePage.on('pageerror',e=>errors.push(e.message));
  await invitePage.goto(`${base}?room=BNT-ABCDEFGH-abcdefghijklmnopqrst&arena=studio-edit-kampung`);
  await invitePage.getByLabel('USERNAME',{exact:true}).fill('QAInvite');await invitePage.getByRole('button',{name:'CONFIRM',exact:true}).click();
  await invitePage.getByRole('button',{name:'JOIN MATCH',exact:true}).waitFor();
  assert.equal(await invitePage.getByLabel('Arena multiplayer').inputValue(),'studio-edit-kampung');
  assert(await invitePage.getByLabel('Arena multiplayer').isDisabled());await inviteContext.close();
  console.log('PASS direct invitation opens Join after normal profile setup');
  assert.deepEqual(errors,[]);console.log('PASS no uncaught browser errors');
}finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,observations,errors},null,2));await browser.close();}
