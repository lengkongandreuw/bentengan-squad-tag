import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {startMapStudio} from '../map-studio/server.mjs';
import {startSpriteStudio} from '../sprite-studio/server.mjs';
import {startAdmin} from '../character-admin/server.mjs';

const directory=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(directory,'../..');
export async function startEngine(port=4330,projectRoot=root){
  const studios=[];
  const children=[];
  const server=http.createServer(async(req,res)=>{
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','no-referrer');
    try{
      if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'Panel hanya dapat diakses dari origin lokal yang sama.'});
      if(req.method!=='GET')return json(405,{error:'Gunakan editor untuk perubahan proyek.'});
      const url=new URL(req.url,origin);
      if(url.pathname==='/api/studios')return json(studios.length===3?200:503,{name:'Benteng Engine',studios});
      const file={'/':'index.html','/engine.js':'engine.js','/engine.css':'engine.css'}[url.pathname];
      if(!file)return json(404,{error:'Tidak ditemukan.'});
      res.setHeader('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src ${studios.map(s=>s.origin).join(' ')||"'none'"}; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
      res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');
      res.end(await readFile(path.join(directory,file)));
    }catch{json(500,{error:'Panel gagal dimuat. Periksa log Benteng Engine.'});}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  const close=async()=>{await Promise.all(children.map(child=>new Promise(resolve=>child.close(resolve))));await new Promise(resolve=>server.close(resolve));};
  try{
    for(const [id,title,summary,start] of [
      ['maps','Map Studio','Arena, collider, benteng, penjara dan preview map.',startMapStudio],
      ['sprites','Sprite Studio','Animasi movement, arah, crop, frame dan titik kaki.',startSpriteStudio],
      ['characters','Karakter & Suara','Gambar pilihan karakter, posisi, suara dan layer audio.',startAdmin],
    ]){
      const child=await start(0,projectRoot,{parentOrigin:origin});children.push(child.server);studios.push({id,title,summary,origin:child.origin});
    }
  }catch(error){await close();throw error;}
  return {server,origin,studios,close};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const engine=await startEngine(Number(process.env.BENTENG_ENGINE_PORT||4330));
  console.log(`Benteng Engine: ${engine.origin}\nLokal/private. Jangan expose melalui tunnel. Satu proses menjalankan ketiga editor.`);
  let closing=false;
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(closing)return;closing=true;void engine.close().then(()=>process.exit(0));});
}
