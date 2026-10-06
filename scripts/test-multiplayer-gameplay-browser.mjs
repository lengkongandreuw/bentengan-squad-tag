// Real runtime, two isolated WebRTC peers. No player profile or user browser read.
import fs from 'node:fs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BENTENG_CHROME_PATH?{executablePath:process.env.BENTENG_CHROME_PATH}:{})});
const contexts=[],errors=[],base=process.env.BENTENG_TEST_URL||'http://127.0.0.1:3025/bentengan-squad-tag/';
const read=page=>page.evaluate(()=>window.__bentengGameCore?.readState());
fs.mkdirSync('outputs',{recursive:true});
try{
  for(let i=0;i<2;i++)contexts.push(await browser.newContext({viewport:{width:1000,height:800}}));
  const host=await contexts[0].newPage(),client=await contexts[1].newPage();
  for(const [index,page] of [host,client].entries()){
    page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
    await page.getByLabel('USERNAME',{exact:true}).fill(`NetworkQA${index}`);
    await page.getByRole('button',{name:'CONFIRM',exact:true}).click();
    await page.getByRole('button',{name:'MULTIPLAYER · LOBBY',exact:true}).click({timeout:30000});
  }
  const arena=await host.getByLabel('Arena multiplayer',{exact:true}).inputValue();
  await client.getByLabel('Arena multiplayer',{exact:true}).selectOption(arena);
  await host.getByLabel('Nama pemain',{exact:true}).fill('Host QA');await host.getByRole('button',{name:'HOST MATCH',exact:true}).click();
  await host.locator('dialog code').waitFor();const code=await host.locator('dialog code').textContent();
  await client.getByLabel('Nama pemain',{exact:true}).fill('Client QA');await client.getByLabel('Kode room dari host',{exact:true}).fill(code);
  await client.getByRole('button',{name:'JOIN MATCH',exact:true}).click();
  await client.getByText('Lobby terhubung',{exact:false}).waitFor({timeout:25000});
  await client.getByLabel('Karakter',{exact:true}).selectOption('kodo'); // reserve outside default 5
  await host.getByText('HIJAU · KODO · BELUM SIAP',{exact:true}).waitFor();
  await client.getByLabel('Saya siap',{exact:false}).check();
  await host.getByRole('button',{name:'MULAI PERSIAPAN ROOM',exact:true}).click();
  for(const page of [host,client])await page.waitForFunction(()=>window.__bentengGameCore?.readState().phase==='PLAYING',{},{timeout:20000});
  const before=await read(host),remote=before.entities.find(p=>p.controller==='remote'),local=before.entities.find(p=>p.controller==='local');
  if(!remote||remote.characterId!=='kodo'||before.entities.length!==10)throw Error('Incorrect human/bot roster');
  const beforeRemote={x:remote.x,y:remote.y},beforeLocal={x:local.x,y:local.y};
  await client.keyboard.down('ArrowLeft');await host.keyboard.down('ArrowRight');
  // Poll real truth: initial base charge can temporarily lock movement.
  await host.waitForFunction(({remote,local,a,b})=>{
    const s=window.__bentengGameCore.readState(),r=s.entities.find(p=>p.entityId===remote),l=s.entities.find(p=>p.entityId===local);
    return Math.hypot(r.x-a.x,r.y-a.y)>20&&Math.hypot(l.x-b.x,l.y-b.y)>20;
  },{remote:remote.entityId,local:local.entityId,a:beforeRemote,b:beforeLocal},{timeout:10000});
  await client.keyboard.up('ArrowLeft');await host.keyboard.up('ArrowRight');
  await client.waitForFunction(id=>{const s=window.__bentengGameCore.readState();return s.tick>20&&s.entities[0].entityId===id;},remote.entityId,{timeout:5000});
  const hs=await read(host),cs=await read(client),cr=cs.entities.find(p=>p.entityId===remote.entityId),hr=hs.entities.find(p=>p.entityId===remote.entityId);
  if(Math.hypot(cr.x-hr.x,cr.y-hr.y)>80)throw Error('Client does not follow authoritative host');
  if(!hs.entities.some(p=>p.controller==='bot'&&Math.hypot(p.vx,p.vy)>0))throw Error('Host bots stopped');
  await host.screenshot({path:'outputs/multiplayer-gameplay-host.png',fullPage:true});
  await client.screenshot({path:'outputs/multiplayer-gameplay-client.png',fullPage:true});
  await client.setViewportSize({width:390,height:844});await client.screenshot({path:'outputs/multiplayer-gameplay-mobile.png',fullPage:true});
  await host.close();await client.getByRole('alert').filter({hasText:'Host terputus'}).waitFor({timeout:25000});
  if(errors.length)throw Error(errors.join('; '));
  console.log(JSON.stringify({status:'PASS',realGameRuntime:true,remoteInput:true,hostLocalInput:true,bots:true,clientSnapshots:true,hostDisconnect:true,arena,entities:hs.entities.length,pageErrors:errors}));
}catch(error){
  const details=[];for(const c of contexts)for(const p of c.pages())details.push({body:await p.locator('body').innerText().catch(()=>''),state:await read(p).catch(()=>null)});
  fs.writeFileSync('outputs/multiplayer-gameplay-failure.json',JSON.stringify({error:String(error),details,pageErrors:errors},null,2));
  console.error(JSON.stringify({status:'FAIL',error:String(error),details,pageErrors:errors}));process.exitCode=1;
}finally{for(const c of contexts)await c.close();await browser.close();}
