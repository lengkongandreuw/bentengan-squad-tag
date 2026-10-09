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
  await host.getByLabel("Player name",{exact:true}).fill('Host QA');await host.getByRole('button',{name:"CREATE ROOM",exact:true}).click();
  await host.locator('code').waitFor();const code=await host.locator('code').textContent();
  await client.getByRole('button',{name:"Got a code?",exact:true}).click();
  await client.getByLabel("Player name",{exact:true}).fill('Client QA');await client.getByLabel("Room code or invite link",{exact:true}).fill(code);
  await client.getByRole('button',{name:"JOIN ROOM",exact:true}).click();
  await client.getByText("Lobby connected",{exact:false}).waitFor({timeout:25000});await host.getByText('Client QA',{exact:true}).waitFor();
  await client.getByLabel("Team",{exact:true}).selectOption('red');
  await host.getByText('MERAH · ROBOT · BELUM SIAP',{exact:true}).waitFor();
  await client.getByLabel("Team",{exact:true}).selectOption('green');
  await host.getByText('HIJAU · CIICI · BELUM SIAP',{exact:true}).waitFor();
  await client.getByLabel("Character",{exact:true}).selectOption('kaka');
  await host.getByText('HIJAU · KAKA · BELUM SIAP',{exact:true}).waitFor();
  await client.getByLabel("Ready to play",{exact:false}).check();
  await host.getByRole('button',{name:"START MATCH",exact:true}).click();
  await client.getByText("Lobby locked · match setup confirmed",{exact:false}).waitFor();
  await host.screenshot({path:'outputs/multiplayer-host.png',fullPage:true});
  await client.setViewportSize({width:390,height:844});await client.screenshot({path:'outputs/multiplayer-mobile.png',fullPage:true});
  await host.getByRole('button',{name:"LEAVE ROOM",exact:true}).click();
  await client.getByRole('alert').filter({hasText:'Host terputus'}).waitFor({timeout:12000});
  if(errors.length)throw Error(`Browser errors: ${errors.join('; ')}`);
  console.log(JSON.stringify({status:'PASS',twoBrowserPeers:true,teamCharacterReadyStart:true,disconnect:true,pageErrors:errors}));
}catch(error){
  const details=[];for(const c of contexts)for(const page of c.pages())details.push(await page.locator('body').innerText().catch(()=>''));
  fs.writeFileSync('outputs/multiplayer-browser-failure.json',JSON.stringify({error:String(error),details,pageErrors:errors},null,2));
  console.error(JSON.stringify({status:'FAIL',error:String(error),details,pageErrors:errors}));process.exitCode=1;
}finally{for(const c of contexts)await c.close();await browser.close();}
