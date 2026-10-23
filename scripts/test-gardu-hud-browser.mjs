import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';
import {createServer} from 'vite';import react from '@vitejs/plugin-react';
const {chromium}=await import('file:///C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
const fixture=`import React from 'react';import{createRoot}from'react-dom/client';
import{ContextualHint}from'/modules/ui/contextual-hint.tsx';import{MapEventHud,relayHudVisible}from'/modules/ui/map-event-hud.tsx';
import{setLanguage}from'/lib/language.ts';import'/modules/ui/gameplay-screen-shell.css';
const root=createRoot(document.getElementById('root'));window.held=false;window.setLang=setLanguage;
window.showHud=(context,view)=>root.render(React.createElement(ContextualHint,{context,active:true,priority:relayHudVisible(view)?React.createElement(MapEventHud,{view,onHold:h=>window.held=h}):undefined}));`;
const server=await createServer({configFile:false,plugins:[react(),{name:'isolated-gardu-hud',resolveId(id){if(id==='/gardu-hud-fixture.js')return id;},load(id){if(id==='/gardu-hud-fixture.js')return fixture;},configureServer(server){server.middlewares.use('/gardu-hud-qa',async(req,res,next)=>{try{res.setHeader('Content-Type','text/html');res.end(await server.transformIndexHtml('/gardu-hud-qa','<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#354338"><div id="root" style="position:fixed;bottom:12px;left:12px;width:min(360px,calc(100vw - 24px))"></div><script type="module" src="/gardu-hud-fixture.js"></script></body></html>'));}catch(e){next(e);}});}}],server:{host:'127.0.0.1',port:0,watch:null}});
let browser;const errors=[];
try{
  await mkdir('outputs/gardu-gameplay-fixes',{recursive:true});await server.listen();browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/gardu-hud-qa`);await page.waitForFunction(()=>!!window.showHud);
  const context={state:'ACTIVE',learned:['movement','sprint','parkour','tag','rescue','ultimate','capture'],nearObstacle:false,parkourReady:false,rescueNeeded:false,ultimateReady:false,nearEnemyFort:false,fortOpen:false,moving:false,tagOpportunity:false};
  const view={phase:'ACTIVE',sequence:['A','B','C'],progress:0,opponentProgress:1,node:'A',channel:0,remaining:20,feedback:null,waiting:false};
  const show=(c=context,v=view)=>page.evaluate(({c,v})=>window.showHud(c,v),{c,v});
  await show();await page.locator('.map-event-hud').waitFor();await page.screenshot({path:'outputs/gardu-gameplay-fixes/hud-near.png'});
  for(const {patch,hint}of [{patch:{rescueNeeded:true},hint:'rescue'},{patch:{tagOpportunity:true},hint:'tag'},{patch:{nearEnemyFort:true,fortOpen:true},hint:'capture'},{patch:{state:'RETURNING'},hint:'returning'}]){
    await show({...context,...patch});await page.locator(`[data-hint-id="${hint}"]`).waitFor();assert.equal(await page.locator('.map-event-hud').count(),0);
  }
  await show({...context,state:'PRISONER'});await page.waitForFunction(()=>!document.querySelector('.core-context-hint'));
  await show(context,{...view,node:null});await page.waitForFunction(()=>!document.querySelector('.map-event-hud'));
  for(const size of [{width:375,height:812},{width:844,height:390}]){
    await page.setViewportSize(size);await show();const button=page.locator('.relay-activate');await button.waitFor({state:'visible'});const box=await button.boundingBox();assert(box&&box.height>=48&&box.width>=48);assert(box.y>=0&&box.x>=0&&box.y+box.height<=size.height&&box.x+box.width<=size.width);
    await button.focus();await page.keyboard.down('Space');assert(await page.evaluate(()=>window.held));await page.keyboard.up('Space');assert.equal(await page.evaluate(()=>window.held),false);
    await page.screenshot({path:`outputs/gardu-gameplay-fixes/hud-${size.width}.png`});
  }
  await page.evaluate(()=>window.setLang('id'));await page.getByRole('button',{name:/Tahan ACTIVATE/}).waitFor();
  assert.deepEqual(errors,[]);console.log('PASS actual HUD components: urgent learned rescue/tag/capture/return, prisoner/far suppression, 375px/landscape, Space release, EN/ID, reduced motion.');
}finally{await browser?.close();await server.close();}
