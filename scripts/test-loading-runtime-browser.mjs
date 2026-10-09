import assert from 'node:assert/strict';
import {createServer} from 'vite';
import sharp from 'sharp';
import {mkdir,readFile} from 'node:fs/promises';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'playwright');
const png=await sharp({create:{width:640,height:360,channels:4,background:'#547f25'}}).png().toBuffer();
const image=`loading-media/${'a'.repeat(64)}.gif`,video=`loading-media/${'b'.repeat(64)}.mp4`;
const gif=await sharp(png).gif().toBuffer(),mp4=await readFile('public/arena-ui/pasar.mp4');
const realMedia=process.env.BENTENG_LOADING_REAL_MEDIA==='1';
const document=realMedia?JSON.parse(await readFile('config/loading-media.json','utf8')):{version:1,slots:{'character-red':{asset:image,kind:'image',fit:'contain',preserveProgress:true},'character-green':{asset:video,kind:'video',fit:'cover',preserveProgress:true}}};
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0},plugins:[{name:'qa-loading-media',enforce:'pre',resolveId(source){if(source.endsWith('/config/loading-media.json'))return '\0qa-loading.json';},load(id){if(id==='\0qa-loading.json')return JSON.stringify(document);},configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url?.endsWith(image)){res.setHeader('Content-Type','image/gif');res.end(gif);}else if(req.url?.endsWith(video)){res.setHeader('Content-Type','video/mp4');res.end(mp4);}else next();});}}]});
await server.listen();const base=`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`;
const browser=await chromium.launch({headless:true,executablePath:process.env.BENTENG_CHROME_PATH});const errors=[];
try{
  for(const [team,media]of [['Merah','img'],['Hijau',realMedia?'img':'video']]){
    const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.getByLabel("PLAYER NAME",{exact:true}).fill('QALoading'+team);await page.getByRole('button',{name:"SAVE NAME",exact:true}).click();await page.locator('.enter-game').click();
    const held=[];await page.route(/\.mp4(?:\?|$)/,async route=>{if(route.request().url().includes('loading-media'))return route.continue();held.push(route);});
    await page.getByRole('button',{name:`Pilih Tim ${team}`,exact:true}).click();
    await page.locator('.custom-loading-media '+media).waitFor({timeout:20000});
    assert.equal(await page.getByRole('progressbar',{name:"Asset loading progress",includeHidden:true}).count(),1);
    assert.equal(await page.locator('.team-loading-frame').count(),1);
    await page.waitForFunction(()=>document.querySelector('.team-loading-frame')?.naturalWidth>0);
    assert.equal(await page.locator('.asset-loading-card').isVisible(),false);
    if(media==='video')await page.waitForFunction(()=>document.querySelector('.custom-loading-media video')?.readyState>=2);
    else await page.waitForFunction(()=>document.querySelector('.custom-loading-media img')?.naturalWidth>0);
    await mkdir('outputs/loading-admin',{recursive:true});await page.screenshot({path:`outputs/loading-admin/runtime-${team}.png`});
    for(const route of held)await route.abort();await page.close();console.log(`PASS real character loading ${team}: custom ${media}, original lower-left progress artwork retained`);
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();await server.close();}
