// Render a map-selection thumbnail from the actual game renderer, not new art.
import {createServer} from 'vite';import fs from 'node:fs/promises';import sharp from 'sharp';import {createHash} from 'node:crypto';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE??'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const server=await createServer({configFile:'vite.github.config.ts',server:{host:'127.0.0.1',port:0,watch:null}});let browser;
try{
  await server.listen();browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});const page=await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/bentengan-squad-tag/`);
  const png=await page.evaluate(async()=>{
    const renderer=await import('/bentengan-squad-tag/lib/map-studio.ts'),visuals=await import('/bentengan-squad-tag/modules/world/relay-map/relay-prototype-visuals.js');const map=renderer.studioMapById['studio-gardu-tengah'];
    await Promise.all(renderer.mapImages(map).map(image=>image.decode()));
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const ctx=canvas.getContext('2d');ctx.scale(640/map.width,360/map.height);
    renderer.drawMapTerrain(ctx,map,0);
    for(const o of [...map.objects].filter(o=>o.layer==='background').sort((a,b)=>a.z-b.z))renderer.drawMapObject(ctx,o,0);
    for(const team of ['blue','red'])for(const [kind,slot]of [['base','visual'],['prison','floorVisual']]){
      const anchor=kind==='base'?map.bases[team]:map.prisons[team],v=anchor[slot];
      if(v)renderer.drawStructureVisual(ctx,{...v,x:anchor.x+v.offsetX,y:anchor.y+v.offsetY},0);else visuals.drawRelayStructure(ctx,map,team,kind);
    }
    for(const o of [...map.objects].filter(o=>o.layer!=='background').sort((a,b)=>a.z-b.z))renderer.drawMapObject(ctx,o,0);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const image=await sharp(Buffer.from(png,'base64')).webp({quality:92,effort:6}).toBuffer(),hash=createHash('sha256').update(image).digest('hex'),asset=`map-studio/${hash}.webp`;
  await fs.writeFile('public/'+asset,image,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});console.log(JSON.stringify({asset,width:640,height:360,frames:[{x:0,y:0,width:640,height:360}],fps:1}));
}finally{await browser?.close();await server.close();}
