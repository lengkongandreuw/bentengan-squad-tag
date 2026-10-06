// Optional real-WebRTC test: requires a running local Vite server and Playwright.
import fs from 'node:fs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BENTENG_CHROME_PATH?{executablePath:process.env.BENTENG_CHROME_PATH}:{})});
const contexts=[],errors=[];
const base=process.env.BENTENG_TEST_URL||'http://127.0.0.1:3024/bentengan-squad-tag/';
fs.mkdirSync('outputs',{recursive:true});
try{
  for(let i=0;i<2;i++)contexts.push(await browser.newContext({viewport:{width:1000,height:800}}));
  const host=await contexts[0].newPage(),client=await contexts[1].newPage();
  for(const page of [host,client]){page.on('pageerror',e=>errors.push(e.message));await page.goto(new URL('scripts/fixtures/multiplayer-smoke.html',base).href);}
  await host.getByLabel('Nama pemain',{exact:true}).fill('Host QA');await host.getByRole('button',{name:'HOST MATCH',exact:true}).click();
  await host.locator('code').waitFor();const code=await host.locator('code').textContent();
  await client.getByLabel('Nama pemain',{exact:true}).fill('Client QA');await client.getByLabel('Kode room dari host',{exact:true}).fill(code);
  await client.getByRole('button',{name:'JOIN MATCH',exact:true}).click();
  await client.getByText('Lobby terhubung',{exact:false}).waitFor({timeout:25000});await host.getByText('Client QA',{exact:true}).waitFor();
  await client.getByLabel('Tim',{exact:true}).selectOption('red');
  await host.getByText('MERAH · ROBOT · BELUM SIAP',{exact:true}).waitFor();
  await client.getByLabel('Tim',{exact:true}).selectOption('green');
  await host.getByText('HIJAU · CIICI · BELUM SIAP',{exact:true}).waitFor();
  await client.getByLabel('Karakter',{exact:true}).selectOption('kaka');
  await host.getByText('HIJAU · KAKA · BELUM SIAP',{exact:true}).waitFor();
  await client.getByLabel('Saya siap',{exact:false}).check();
  await host.getByRole('button',{name:'MULAI PERSIAPAN ROOM',exact:true}).click();
  await client.getByText('Lobby dikunci · persiapan disetujui',{exact:false}).waitFor();
  await host.screenshot({path:'outputs/multiplayer-host.png',fullPage:true});
  await client.setViewportSize({width:390,height:844});await client.screenshot({path:'outputs/multiplayer-mobile.png',fullPage:true});
  await host.getByRole('button',{name:'KELUAR ROOM',exact:true}).click();
  await client.getByRole('alert').filter({hasText:'Host terputus'}).waitFor({timeout:12000});
  if(errors.length)throw Error(`Browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({status:'PASS',twoBrowserPeers:true,teamCharacterReadyStart:true,disconnect:true,pageErrors:errors}));
}catch(error){
  const details=[];for(const c of contexts)for(const page of c.pages())details.push(await page.locator('body').innerText().catch(()=>''));
  fs.writeFileSync('outputs/multiplayer-browser-failure.json',JSON.stringify({error:String(error),details,pageErrors:errors},null,2));
  console.error(JSON.stringify({status:'FAIL',error:String(error),details,pageErrors:errors}));process.exitCode=1;
}finally{for(const c of contexts)await c.close();await browser.close();}
