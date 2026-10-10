import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {templates} from './templates.mjs';
const {chromium}=await import(process.env.BENTENG_PLAYWRIGHT_MODULE ?? 'file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const catalog=await templates(process.cwd()),m=structuredClone(catalog.template);
m.id='studio-structure-runtime-qa';m.name='Structure Runtime QA';m.replaces='kampung';m.enabled=true;m.objects=[];m.baseRadius=91;
const asset=catalog.library.find(a=>a.name==='fortGreen').clip;
const visual=(w,h)=>({asset,w,h,offsetX:0,offsetY:0,rotation:0,opacity:.8,mirror:true,mirrorY:true,visible:true});
for(const [team,n]of [['blue',0],['red',1]]){
  m.bases[team].visual=visual(227+n,199+n);
  m.prisons[team].floorVisual=visual(213+n,187+n);
  m.prisons[team].overlayVisual=visual(241+n,201+n);
}
const browser=await chromium.launch({headless:true,executablePath:process.env.BENTENG_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];let injected=false;
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/config/map-studio.json*',route=>{
    injected=true;return route.fulfill({contentType:'application/javascript',body:`export default ${JSON.stringify({version:1,maps:[m]})};`});
  });
  await page.addInitScript(()=>{
    window.structureDraws=[];const original=Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'drawImage').value;
    CanvasRenderingContext2D.prototype.drawImage=function(...args){
      if(this.canvas.matches('canvas[data-graphics-preset]')&&args.length===9){
        const w=args[7],h=args[8];
        if([[227,199],[228,200],[213,187],[214,188],[241,201],[242,202]].some(d=>d[0]===w&&d[1]===h)){
          const t=this.getTransform();window.structureDraws.push({w,h,a:t.a,d:t.d,opacity:this.globalAlpha,source:args[0].src});
          if(window.structureDraws.length>60)window.structureDraws.shift();
        }
      }
      return original.apply(this,args);
    };
  });
  await page.goto(process.env.BENTENG_GAME_QA_URL ?? 'http://127.0.0.1:3038/bentengan-squad-tag/');
  await page.getByLabel('PLAYER NAME',{exact:true}).fill('StructuresQA');await page.getByRole('button',{name:'SAVE NAME',exact:true}).click();
  await page.locator('.enter-game').click();await page.getByRole('button',{name:'Choose Tim Merah',exact:true}).click();
  await page.getByRole('button',{name:/^CHOOSE RAJA$/i}).click({timeout:90000});
  await page.locator('.map-select-v2').waitFor({timeout:90000});assert(injected,'isolated config injected into actual game');
  await page.getByRole('button',{name:/^Structure Runtime QA$/}).click();await page.locator('.map-start-match').click();
  await page.locator('canvas[data-graphics-preset]').waitFor({timeout:90000});
  // Tactical/overview renders the full arena, including the opponent structures.
  await page.keyboard.press('c');await page.keyboard.press('c');
  await page.waitForFunction(()=>window.structureDraws.some(d=>d.w===227)&&window.structureDraws.some(d=>d.w===241),{},{timeout:30000});
  const draws=await page.evaluate(()=>window.structureDraws);
  for(const w of [227,213,241]){const d=draws.find(x=>x.w===w);assert(d,w+' rendered');assert(d.a<0&&d.d<0,'both mirror axes rendered');assert(Math.abs(d.opacity-.8)<.001);}
  assert(draws.findIndex(d=>d.w===213)<draws.findIndex(d=>d.w===241),'floor draws before overlay');
  assert.deepEqual(errors,[]);await mkdir('outputs/map-studio-structures',{recursive:true});await page.screenshot({path:'outputs/map-studio-structures/runtime.png'});
  console.log('Actual game custom base/floor/overlay render, both mirror axes, opacity and layer order PASS. Source config untouched.');
}finally{await browser.close();}
