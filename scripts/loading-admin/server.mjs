import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir,rename,realpath} from 'node:fs/promises';
import {createHash,randomBytes} from 'node:crypto';
import sharp from 'sharp';
import {LOADING_SLOTS,validSlot,validateLoadingMedia} from '../../lib/loading-media-model.js';
import {builtinPreviews} from './preview-model.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url));
const projectRoot=path.resolve(directory,'../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export const MAX_BYTES=60*1024*1024;
const mime={png:'image/png',jpg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',ogv:'video/ogg'};
export async function inspectMedia(bytes,kind) {
  if(!bytes.length||bytes.length>MAX_BYTES)throw new Error('Media harus berisi data, maksimal 60 MB.');
  if(kind==='video') {
    let extension;
    if(bytes.length>12&&bytes.toString('ascii',4,8)==='ftyp')extension='mp4';
    else if(bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))extension='webm';
    else if(bytes.toString('ascii',0,4)==='OggS')extension='ogv';
    else throw new Error('Container video belum didukung. Gunakan MP4, WebM, atau Ogg yang bisa diputar browser.');
    return {bytes,extension,kind};
  }
  if(kind!=='image')throw new Error('Pilih gambar atau video.');
  const meta=await sharp(bytes,{limitInputPixels:40_000_000}).metadata();
  if(meta.format==='svg') {
    const source=bytes.toString('utf8');
    if(/<!DOCTYPE|<!ENTITY|<script\b|<foreignObject\b|@import/i.test(source)||
      [...source.matchAll(/(?:href\s*=\s*["']|url\(\s*["']?)([^"'\s)<>]+)/gi)].some(match=>!match[1].startsWith('#')&&!match[1].startsWith('data:image/')))
      throw new Error('SVG harus mandiri, tanpa script atau referensi file/URL eksternal.');
  }
  if(!meta.width||!meta.height||meta.width>8192||(meta.pageHeight??meta.height)>8192||(meta.pages??1)>1000||meta.width*(meta.pageHeight??meta.height)*(meta.pages??1)>250_000_000)throw new Error('Gambar terlalu besar: sisi maksimal 8192 px, 1000 frame / 250 juta total piksel.');
  // Keep animated browser formats intact; rasterize other supported inputs, including SVG, so active content cannot execute.
  const extension={png:'png',jpeg:'jpg',gif:'gif',webp:'webp',heif:meta.compression==='av1'?'avif':null}[meta.format];
  if(extension)return {bytes,extension,kind};
  if((meta.pages??1)>1)throw new Error('Animasi format ini belum didukung; gunakan GIF, WebP animasi, atau video.');
  return {bytes:await sharp(bytes,{limitInputPixels:40_000_000}).png().toBuffer(),extension:'png',kind};
}
export async function startLoadingAdmin(port=4322,root=projectRoot) {
  const file=path.join(root,'config/loading-media.json'),token=randomBytes(32).toString('hex');
  let origin,busy=false;
  const read=async()=>{const raw=await readFile(file);return {document:validateLoadingMedia(JSON.parse(raw)),revision:hash(raw)};};
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob:; media-src 'self' blob:; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    try {
      if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'Akses hanya dari panel lokal ini.'});
      const url=new URL(req.url,origin);
      if(req.method==='GET') {
        if(url.pathname==='/api/state') {
          const maps=JSON.parse(await readFile(path.join(root,'config/map-studio.json'),'utf8')).maps;
          const slots={...LOADING_SLOTS};
          for(const [id,name] of Object.entries({pasar:'Pasar Senggol',taman:'Taman Kota',kanal:'Alun Kanal Nusantara',kanal2:'Alun Kanal Nusantara 2',kampung:'Kampung Merdeka',kampung3d:'Kampung 3D'}))slots[`match:${id}`]=`Map · ${name} (bawaan)`;
          for(const map of maps)if(!map.deleted)slots[`match:${map.id}`]=`Map · ${map.name}${map.enabled?'':' (draft)'}`;
          const state=await read();for(const key of Object.keys(state.document.slots))slots[key]??=key;
          return json(200,{...state,slots,builtinPreviews:builtinPreviews(maps),token,maxBytes:MAX_BYTES});
        }
        const staticFiles={'/':'index.html','/editor.js':'editor.js','/editor.css':'editor.css'};
        if(staticFiles[url.pathname]){res.setHeader('Content-Type',url.pathname==='/'?'text/html':url.pathname.endsWith('.js')?'text/javascript':'text/css');return res.end(await readFile(path.join(directory,staticFiles[url.pathname])));}
        const candidate=decodeURIComponent(url.pathname).slice(1);
        if(/^(loading-media\/[a-f0-9]{64}\.(png|jpg|gif|webp|avif|mp4|webm|ogv)|arena-ui\/(red-loading|green-loading|kampung|kanal|pasar|taman)\.(webp|mp4)|loading-ui\/TEAM (MERAH|HIJAU) LOADING (00|20|40|60|80|100)_\.png|ui-v2\/fields\/[a-z0-9-]+\.webp|map-studio\/[a-f0-9]{64}\.(png|jpg|gif|webp|avif))$/.test(candidate)) {
          const target=await realpath(path.join(root,'public',candidate)),base=await realpath(path.join(root,'public'));
          if(!target.startsWith(base+path.sep))return json(403,{error:'Path tidak valid.'});
          const bytes=await readFile(target);res.setHeader('Content-Type',mime[path.extname(target).slice(1)]);res.setHeader('Accept-Ranges','bytes');
          if(req.headers.range){const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!match)return json(416,{error:'Range tidak valid.'});const start=Number(match[1]),end=Math.min(Number(match[2]||bytes.length-1),bytes.length-1);if(start>end)return json(416,{error:'Range di luar file.'});res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${bytes.length}`,'Content-Length':end-start+1});return res.end(bytes.subarray(start,end+1));}
          return res.end(bytes);
        }
        return json(404,{error:'Tidak ditemukan.'});
      }
      if(req.method!=='POST'||req.headers.origin!==origin||req.headers['x-admin-token']!==token)return json(403,{error:'Sesi tidak valid. Muat ulang panel.'});
      if(!['/api/upload','/api/reset','/api/fit'].includes(url.pathname))return json(404,{error:'Tidak ditemukan.'});
      if(busy)return json(409,{error:'Operasi lain sedang berjalan.'});
      busy=true;
      try {
        const slot=req.headers['x-loading-slot'],fit=req.headers['x-media-fit'];
        const preserveProgress=slot?.startsWith('character-')&&req.headers['x-preserve-progress']==='true';
        if(!validSlot(slot)||!['contain','cover'].includes(fit))throw new Error('Slot atau ukuran tampilan tidak valid.');
        const current=await read();if(req.headers['x-revision']!==current.revision)return json(409,{error:'Konfigurasi berubah di panel lain. Muat ulang sebelum menyimpan.'});
        let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>MAX_BYTES)throw new Error('Upload maksimal 60 MB.');chunks.push(chunk);}
        const document=structuredClone(current.document);
        if(url.pathname==='/api/reset')delete document.slots[slot];
        else if(url.pathname==='/api/fit'){if(!document.slots[slot])throw new Error('Slot masih bawaan. Upload media terlebih dahulu.');document.slots[slot].fit=fit;document.slots[slot].preserveProgress=preserveProgress;}
        else {
          const media=await inspectMedia(Buffer.concat(chunks),req.headers['x-media-kind']);
          const relative=`loading-media/${hash(media.bytes)}.${media.extension}`;
          await mkdir(path.join(root,'public/loading-media'),{recursive:true});
          await writeFile(path.join(root,'public',relative),media.bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
          document.slots[slot]={asset:relative,kind:media.kind,fit,preserveProgress};
        }
        validateLoadingMedia(document);
        await mkdir(path.join(root,'.preview-admin'),{recursive:true});await writeFile(path.join(root,'.preview-admin',`loading-backup-${Date.now()}-${randomBytes(4).toString('hex')}.json`),JSON.stringify(current.document));
        const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(document,null,2)+'\n');await rename(tmp,file);
        return json(200,await read());
      }finally{busy=false;}
    }catch(error){if(!res.headersSent)json(400,{error:error.code==='ENOENT'?'File tidak ditemukan.':error.message});else res.end();}
  });
  server.requestTimeout=60000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;return {server,origin};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {origin}=await startLoadingAdmin(Number(process.env.LOADING_ADMIN_PORT||4322));console.log(`Panel loading lokal: ${origin}\nSimpan lalu reload game lokal. Publish GitHub dilakukan terpisah. Jangan expose lewat tunnel.`);
}
