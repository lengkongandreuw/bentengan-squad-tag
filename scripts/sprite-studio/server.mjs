import http from 'node:http';
import { readFile,writeFile,mkdir,rename,realpath,stat } from 'node:fs/promises';
import { randomBytes,createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { compileSprites } from './compile.mjs';
import { SLOTS,validateClip,validateSpriteDocument } from '../../lib/sprite-studio-model.js';
const directory=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(directory,'../..');
const hash=b=>createHash('sha256').update(b).digest('hex');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json','.mp4':'video/mp4','.jpg':'image/jpeg','.gif':'image/gif','.woff2':'font/woff2','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'};
function command(program,args,cwd,timeout=180000) {
  return new Promise((resolve,reject)=>{
    const child=spawn(program,args,{cwd,windowsHide:true,shell:false,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'}});
    let output='';const collect=b=>{output=(output+b).slice(-16000);};child.stdout.on('data',collect);child.stderr.on('data',collect);
    const timer=setTimeout(()=>{child.kill();reject(new Error('Waktu proses habis. Periksa Git/terminal.'));},timeout);
    child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);code===0?resolve(output.trim()):reject(new Error(output||`Proses gagal (${code})`));});
  });
}
export async function startSpriteStudio(port=4319,projectRoot=root) {
  const configFile=path.join(projectRoot,'config/sprite-studio.json');
  const rules=JSON.parse(await readFile(path.join(projectRoot,'config/game-rules.json'),'utf8'));
  const roster=Object.entries(rules.teams).flatMap(([team,t])=>t.roster.map(id=>({id,team,name:id==='ciici'?'Ciici':id[0].toUpperCase()+id.slice(1)})));
  const ids=roster.map(r=>r.id),token=randomBytes(32).toString('hex');
  const readConfig=async()=>{const b=await readFile(configFile);return {document:validateSpriteDocument(JSON.parse(b),ids),revision:hash(b)};};
  let origin,busy=false,job={status:'idle',message:''};
  const git=args=>command('git',['-c',`safe.directory=${projectRoot.replaceAll('\\','/')}`,...args],projectRoot);
  const build=async()=>{await command(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],projectRoot);await command(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.github.config.ts'],projectRoot);};
  async function runJob(publish) {
    try {
      job={status:'running',message:publish?'Memeriksa Git dan sprite…':'Membangun preview game…'};
      const current=await readConfig();
      const assets=[...new Set(Object.values(current.document.characters).flatMap(s=>Object.values(s).map(c=>`public/${c.asset}`)))];
      for(const asset of assets)await stat(path.join(projectRoot,asset));
      if(publish) {
        if(await git(['branch','--show-current'])!=='main')throw new Error('Publish hanya dari main.');
        if(!['https://github.com/lengkongandreuw/bentengan-squad-tag.git','git@github.com:lengkongandreuw/bentengan-squad-tag.git'].includes(await git(['remote','get-url','github'])))throw new Error('Remote github tidak sesuai.');
        const changes=(await git(['status','--porcelain','--untracked-files=all'])).split('\n').filter(Boolean);
        if(changes.some(s=>s.slice(3)!=='config/sprite-studio.json'&&!/^public\/sprite-studio\/[a-z]+\/[a-f0-9]{64}\.webp$/.test(s.slice(3))))throw new Error('Ada perubahan lain di proyek. Commit/sinkronkan perubahan tersebut dahulu sebelum Publish dari studio.');
        await git(['fetch','--filter=blob:none','github','main']);
        if(await git(['rev-list','--count','HEAD..github/main'])!=='0')throw new Error('GitHub memiliki commit baru. Sinkronkan proyek dahulu; studio tidak melakukan merge otomatis.');
        if(await git(['rev-list','--count','github/main..HEAD'])!=='0')throw new Error('Ada commit lokal belum dipush. Selesaikan publikasi commit tersebut dahulu.');
      }
      await build();
      if(!publish) {job={status:'success',message:'Build siap. Buka Uji game; pilih karakter yang Anda edit.',url:'/bentengan-squad-tag/'};return;}
      await git(['add','--','config/sprite-studio.json',...assets]);
      if(await git(['diff','--cached','--name-only']))await git(['commit','-m','Update in-game sprites from Sprite Studio']);
      const sha=await git(['rev-parse','HEAD']);
      job.message='Mengirim sprite ke GitHub…';
      await git(['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','github','main']);
      job.message='Push selesai. Menunggu deployment GitHub Pages…';
      for(let i=0;i<100;i++) {
        const runs=JSON.parse(await command('gh',['run','list','--repo','lengkongandreuw/bentengan-squad-tag','--workflow','pages.yml','--limit','10','--json','headSha,status,conclusion,url'],projectRoot,30000));
        const run=runs.find(r=>r.headSha===sha);
        if(run?.status==='completed') {
          if(run.conclusion!=='success')throw new Error(`Push tersimpan tetapi deployment ${run.conclusion}. Lihat ${run.url}`);
          job={status:'success',message:'Sprite berhasil dipublikasikan. GitHub Pages siap.',url:'https://lengkongandreuw.github.io/bentengan-squad-tag/'};return;
        }
        await new Promise(r=>setTimeout(r,5000));
      }
      throw new Error('Push selesai; deployment belum terkonfirmasi. Periksa GitHub Actions.');
    } catch(e) {job={status:'error',message:e.message};} finally {busy=false;}
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
    const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
    try {
      if(req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site')return json(403,{error:'Gunakan panel lokal yang sama.'});
      const url=new URL(req.url,origin);
      if(req.method==='GET') {
        if(url.pathname==='/api/state')return json(200,{...await readConfig(),roster,token,job});
        if(url.pathname==='/api/job')return json(200,job);
        const editors={'/':'index.html','/editor.js':'editor.js','/editor.css':'editor.css'};
        if(editors[url.pathname]||url.pathname==='/model.js') {
          res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'");
          const file=url.pathname==='/model.js'?path.join(projectRoot,'lib/sprite-studio-model.js'):path.join(directory,editors[url.pathname]);
          res.setHeader('Content-Type',mime[path.extname(file)]);return res.end(await readFile(file));
        }
        const name=decodeURIComponent(url.pathname).slice(1);
        let base,relative;
        if(/^(sprite-studio\/[a-z]+\/[a-f0-9]{64}\.webp|characters\/[a-z]+\/(atlas\.webp|animations\.json|series\.webp|series\.json)|field\/kampung-map\.webp|favicon-bst\.png)$/.test(name)){base=path.join(projectRoot,'public');relative=name;}
        else if(name.startsWith('bentengan-squad-tag/')){base=path.join(projectRoot,'dist-pages');relative=name.slice('bentengan-squad-tag/'.length)||'index.html';}
        else return json(404,{error:'Tidak ditemukan.'});
        const resolved=await realpath(path.join(base,relative)),rootDir=await realpath(base);
        if(!resolved.startsWith(rootDir+path.sep))return json(403,{error:'Path tidak valid.'});
        res.setHeader('Content-Type',mime[path.extname(resolved)]??'application/octet-stream');
        return res.end(await readFile(resolved));
      }
      if(req.method!=='POST'||req.headers.origin!==origin||req.headers['x-admin-token']!==token)return json(403,{error:'Sesi tidak valid. Muat ulang panel.'});
      if(busy)return json(409,{error:'Proses lain sedang berjalan.'});
      if(!['/api/compile','/api/save','/api/build','/api/publish'].includes(url.pathname))return json(404,{error:'Tidak ditemukan.'});
      if(req.headers['content-type']!=='application/json')throw new Error('Gunakan JSON.');
      busy=true;
      try {
        let length=0;const chunks=[];for await(const chunk of req){length+=chunk.length;if(length>42*1024*1024)throw new Error('Upload maksimal 30 MB.');chunks.push(chunk);}
        const data=JSON.parse(Buffer.concat(chunks).toString());
        const current=await readConfig();
        if(data.revision!==current.revision)return json(409,{error:'Konfigurasi berubah. Muat ulang sebelum menyimpan.'});
        if(['/api/build','/api/publish'].includes(url.pathname)){job={status:'running',message:'Memulai…'};void runJob(url.pathname==='/api/publish');return json(202,job);}
        if(!ids.includes(data.id)||!SLOTS.includes(data.slot))throw new Error('Karakter/slot tidak valid.');
        if(url.pathname==='/api/compile') {
          const atlas=await compileSprites(data.files,data.options);
          const asset=`sprite-studio/${data.id}/${atlas.hash}.webp`;
          await mkdir(path.dirname(path.join(projectRoot,'public',asset)),{recursive:true});
          const assetDir=await realpath(path.dirname(path.join(projectRoot,'public',asset))),publicDir=await realpath(path.join(projectRoot,'public'));
          if(!assetDir.startsWith(publicDir+path.sep))throw new Error('Folder aset di luar proyek.');
          await writeFile(path.join(projectRoot,'public',asset),atlas.bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
          return json(200,{clip:{asset,width:atlas.width,height:atlas.height,frames:atlas.frames,fps:12,scale:1,x:0,y:0,pivotX:.5,pivotY:1,mirror:false,loop:['run','idle','prisoner'].includes(data.slot.split('.')[0])}});
        }
        const document=structuredClone(current.document);
        if(data.clip===null) {if(document.characters[data.id])delete document.characters[data.id][data.slot];}
        else {
          const clip=validateClip(data.clip,data.id);
          const target=await realpath(path.join(projectRoot,'public',clip.asset)),publicDir=await realpath(path.join(projectRoot,'public'));
          if(!target.startsWith(publicDir+path.sep))throw new Error('Aset di luar proyek.');
          const meta=await sharp(await readFile(target)).metadata();if(meta.width!==clip.width||meta.height!==clip.height)throw new Error('Ukuran atlas tidak cocok.');
          document.characters[data.id]??={};document.characters[data.id][data.slot]=clip;
        }
        if(document.characters[data.id]&&!Object.keys(document.characters[data.id]).length)delete document.characters[data.id];
        validateSpriteDocument(document,ids);
        const backup=path.join(projectRoot,'.preview-admin');await mkdir(backup,{recursive:true});
        await writeFile(path.join(backup,`sprite-backup-${Date.now()}-${randomBytes(4).toString('hex')}.json`),JSON.stringify(current.document,null,2));
        await writeFile(`${configFile}.tmp`,JSON.stringify(document,null,2)+'\n');await rename(`${configFile}.tmp`,configFile);
        return json(200,await readConfig());
      } finally {if(job.status!=='running')busy=false;}
    } catch(e){json(400,{error:e.code==='ENOENT'?'Aset/build belum tersedia. Jalankan Build + Uji game.':e.message});}
  });
  server.requestTimeout=60000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;return {server,origin};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {origin}=await startSpriteStudio(Number(process.env.SPRITE_STUDIO_PORT||4319));console.log(`Sprite Studio: ${origin}\nBiarkan terminal tetap terbuka. Ctrl+C untuk menutup.`);
}
