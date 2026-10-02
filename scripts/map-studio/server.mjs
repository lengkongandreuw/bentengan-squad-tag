import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir,rename,realpath,stat} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import sharp from 'sharp';
import {compileSprites} from '../sprite-studio/compile.mjs';
import {validateDocument,validateMap,mapIssues} from '../../lib/map-studio-model.js';
import {templates} from './templates.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../..'),hash=b=>createHash('sha256').update(b).digest('hex');
const mime={'.webp':'image/webp','.png':'image/png','.gif':'image/gif','.jpg':'image/jpeg','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf','.mp4':'video/mp4','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
function command(program,args,cwd){return new Promise((resolve,reject)=>{const child=spawn(program,args,{cwd,shell:false,windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}});let output='';const timer=setTimeout(()=>{child.kill();reject(new Error('Proses melewati batas 5 menit. Periksa terminal.'));},300000);for(const stream of [child.stdout,child.stderr])stream.on('data',b=>output=(output+b).slice(-20000));child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',c=>{clearTimeout(timer);c===0?resolve(output.trim()):reject(new Error(output||'Proses gagal.'));});});}
export async function startMapStudio(port=4320,projectRoot=root){
  const config=path.join(projectRoot,'config/map-studio.json'),token=randomBytes(32).toString('hex');let origin,busy=false,job={status:'idle',message:''};
  const read=async()=>{const b=await readFile(config);return{document:validateDocument(JSON.parse(b)),revision:hash(b)};};
  const safeFile=async(base,relative)=>{const dir=await realpath(base),file=await realpath(path.join(base,relative));if(!file.startsWith(dir+path.sep))throw new Error('Path di luar proyek.');return file;};
  const git=args=>command('git',['-c',`safe.directory=${projectRoot.replaceAll('\\','/')}`,...args],projectRoot);
  const verify=async(m)=>{for(const a of [m.terrain,m.icon,...m.objects.map(o=>o.asset)].filter(Boolean)){const file=await safeFile(path.join(projectRoot,'public'),a.asset),meta=await sharp(await readFile(file)).metadata();if(meta.width!==a.width||meta.height!==a.height)throw new Error('Ukuran aset tidak sesuai manifest.');}};
  async function runJob(publish){try{
    job={status:'running',message:'Memeriksa map dan aset…'};const current=await read();for(const m of current.document.maps){await verify(m);if(m.enabled&&mapIssues(m).length)throw new Error(`${m.name}: ${mapIssues(m)[0].message}`);}
    const assets=[...new Set(current.document.maps.flatMap(m=>[m.terrain,m.icon,...m.objects.map(o=>o.asset)].filter(Boolean).map(a=>`public/${a.asset}`)).filter(p=>p.startsWith('public/map-studio/')))];
    if(publish){if(await git(['branch','--show-current'])!=='main')throw new Error('Publish hanya dari main.');if(!['https://github.com/lengkongandreuw/bentengan-squad-tag.git','git@github.com:lengkongandreuw/bentengan-squad-tag.git'].includes(await git(['remote','get-url','github'])))throw new Error('Remote github tidak sesuai.');
      const changes=(await git(['status','--porcelain','--untracked-files=all'])).split('\n').filter(Boolean);if(changes.some(s=>s.slice(3)!=='config/map-studio.json'&&!/^public\/map-studio\/[a-f0-9]{64}\.webp$/.test(s.slice(3))))throw new Error('Ada perubahan non-map. Commit/push atau amankan perubahan lain dahulu. Map Studio tidak ikut mengunggahnya.');
      await git(['fetch','--filter=blob:none','github','main']);if(await git(['rev-list','--count','HEAD..github/main'])!=='0'||await git(['rev-list','--count','github/main..HEAD'])!=='0')throw new Error('Sinkronkan commit lokal dan GitHub dahulu. Tidak melakukan merge atau force-push otomatis.');}
    job.message='Build dan pemeriksaan TypeScript…';await command(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],projectRoot);await command(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.github.config.ts'],projectRoot);
    if(!publish){job={status:'success',message:'Build game siap. Map aktif tersedia di pilihan arena.',url:'/bentengan-squad-tag/'};return;}
    await git(['add','--','config/map-studio.json',...assets]);if(await git(['diff','--cached','--name-only']))await git(['commit','-m','Update maps from Map Studio']);await git(['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','github','main']);job={status:'success',message:'Map dipush. Tunggu workflow Pages sukses sebelum refresh game.',url:'https://github.com/lengkongandreuw/bentengan-squad-tag/actions'};
  }catch(e){job={status:'error',message:e.message};}finally{busy=false;}}
  const server=http.createServer(async(req,res)=>{const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};try{
    if(req.headers.host!==new URL(origin).host)return json(403,{error:'Host tidak valid.'});const url=new URL(req.url,origin);res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
    if(req.method==='GET'){
      if(url.pathname==='/api/state')return json(200,{...await read(),token,job});if(url.pathname==='/api/templates')return json(200,await templates(projectRoot));if(url.pathname==='/api/job')return json(200,job);
      const local={'/':'index.html','/editor.js':'editor.js','/editor.css':'editor.css'};let file;
      if(local[url.pathname])file=path.join(here,local[url.pathname]);else if(url.pathname==='/model.js')file=path.join(projectRoot,'lib/map-studio-model.js');
      else if(/^\/map-studio\/[a-f0-9]{64}\.webp$/.test(url.pathname)||/^\/field\/(objects|grounds|animated|kampung-map)\.webp$/.test(url.pathname))file=await safeFile(path.join(projectRoot,'public'),url.pathname.slice(1));
      else if(url.pathname.startsWith('/bentengan-squad-tag/'))file=await safeFile(path.join(projectRoot,'dist-pages'),decodeURIComponent(url.pathname.slice(21))||'index.html');else return json(404,{error:'Tidak ditemukan.'});
      if(local[url.pathname]||url.pathname==='/model.js')res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');return res.end(await readFile(file));
    }
    if(req.method!=='POST'||req.headers.origin!==origin||req.headers['x-admin-token']!==token)return json(403,{error:'Sesi tidak valid. Refresh panel.'});if(busy)return json(409,{error:'Proses lain sedang berlangsung.'});if(!['/api/upload','/api/save','/api/build','/api/publish'].includes(url.pathname))return json(404,{error:'Tidak ditemukan.'});if(req.headers['content-type']!=='application/json')throw new Error('Gunakan JSON.');
    busy=true;try{let length=0;const chunks=[];for await(const c of req){length+=c.length;if(length>42*1024*1024)throw new Error('Upload maksimal 30 MB.');chunks.push(c);}const data=JSON.parse(Buffer.concat(chunks).toString()),current=await read();if(data.revision!==current.revision)return json(409,{error:'Data di disk berubah. Refresh panel setelah menyimpan draft Anda.'});
      if(['/api/build','/api/publish'].includes(url.pathname)){job={status:'running',message:'Memulai…'};void runJob(url.pathname==='/api/publish');return json(202,job);}
      if(url.pathname==='/api/upload'){
        let file=data.file;
        if(data.kind==='icon'){if(typeof file?.data!=='string'||file.data.length>42*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(file.data))throw new Error('File ikon tidak valid.');const bytes=Buffer.from(file.data,'base64'),meta=await sharp(bytes,{limitInputPixels:32_000_000}).metadata();if(bytes.length>30*1024*1024||!['png','gif','webp'].includes(meta.format)||meta.width>4096||(meta.pageHeight??meta.height)>4096||(meta.pages??1)>128)throw new Error('Ikon terlalu besar atau format tidak didukung.');file={data:(await sharp(bytes,{page:0,pages:1}).resize(640,360,{fit:'contain',background:'#17241f'}).png().toBuffer()).toString('base64')};}
        const result=await compileSprites([file],{}),asset=`map-studio/${result.hash}.webp`,dir=path.join(projectRoot,'public/map-studio');await mkdir(dir,{recursive:true});const publicDir=await realpath(path.join(projectRoot,'public')),resolved=await realpath(dir);if(!resolved.startsWith(publicDir+path.sep))throw new Error('Folder aset di luar proyek.');await writeFile(path.join(resolved,`${result.hash}.webp`),result.bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});return json(200,{asset:{asset,width:result.width,height:result.height,frames:result.frames,fps:12}});
      }
      const map=validateMap(data.map);await verify(map);const issues=mapIssues(map);if(map.enabled&&issues.length)return json(400,{error:'Map belum bisa diaktifkan: '+issues[0].message,issues});const document=structuredClone(current.document),index=document.maps.findIndex(m=>m.id===map.id);if(index<0)document.maps.push(map);else document.maps[index]=map;validateDocument(document);
      const backup=path.join(projectRoot,'.preview-admin');await mkdir(backup,{recursive:true});await writeFile(path.join(backup,`map-backup-${Date.now()}-${randomBytes(4).toString('hex')}.json`),JSON.stringify(current.document));const temp=`${config}.${randomBytes(4).toString('hex')}.tmp`;await writeFile(temp,JSON.stringify(document,null,2)+'\n');await rename(temp,config);return json(200,{...await read(),issues});
    }finally{if(job.status!=='running')busy=false;}
  }catch(e){json(400,{error:e.code==='ENOENT'?'Aset/build belum ada. Periksa upload atau jalankan Build game.':e.message});}});
  server.requestTimeout=60000;await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});origin=`http://127.0.0.1:${server.address().port}`;return{server,origin};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {origin}=await startMapStudio(Number(process.env.MAP_STUDIO_PORT||4320));console.log(`Map Studio: ${origin}\nLocal/private. Biarkan terminal terbuka; Ctrl+C untuk menutup.`);}
