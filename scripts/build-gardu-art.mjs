// Deterministic sprite-sheet extraction/packing and encoding, not creative image editing.
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import sharp from 'sharp';
export async function buildGarduArt(terrainPath,atlasPath){
  const bytes=await fs.readFile(atlasPath),meta=await sharp(bytes).metadata();
  if(!meta.hasAlpha)throw Error('Generated atlas must preserve genuine transparency.');
  const names=['block','wallVertical','wallHorizontal','rail','gateClosed','gateOpen','node','plaza','fortRed','fortGreen','prisonRed','prisonGreen','barrier','blockVents','cover','plate'];
  const boxes=[
    [0,0,.335,.25],[.335,0,.15,.25],[.49,0,.255,.25],[.75,0,.25,.25],
    [0,.25,.25,.26],[.25,.25,.24,.26],[.50,.25,.24,.26],[.745,.25,.255,.26],
    [0,.52,.25,.23],[.26,.52,.235,.23],[.50,.52,.24,.23],[.745,.52,.255,.23],
    [0,.77,.26,.18],[.265,.77,.30,.18],[.58,.77,.235,.18],[.83,.77,.16,.18],
  ];
  const frames={},composite=[],report=[];
  for(let i=0;i<names.length;i++){
    const [x,y,w,h]=boxes[i],roi={left:Math.floor(x*meta.width),top:Math.floor(y*meta.height),width:Math.floor(w*meta.width),height:Math.floor(h*meta.height)};
    const {data,info}=await sharp(bytes).extract(roi).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    // Generated sheets can have near-transparent specks in gutters. Locate the
    // principal connected silhouette; retain original alpha inside its padded crop.
    const seen=new Uint8Array(info.width*info.height);let main={count:0,left:0,top:0,right:-1,bottom:-1};
    for(let seed=0;seed<seen.length;seed++){
      if(seen[seed]||data[seed*4+3]<64)continue;
      const queue=[seed],part={count:0,left:info.width,top:info.height,right:-1,bottom:-1};seen[seed]=1;
      for(let at=0;at<queue.length;at++){
        const p=queue[at],px=p%info.width,py=Math.floor(p/info.width);part.count++;part.left=Math.min(part.left,px);part.top=Math.min(part.top,py);part.right=Math.max(part.right,px);part.bottom=Math.max(part.bottom,py);
        for(const n of [px>0?p-1:-1,px<info.width-1?p+1:-1,py>0?p-info.width:-1,py<info.height-1?p+info.width:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=64){seen[n]=1;queue.push(n);}
      }
      if(part.count>main.count)main=part;
    }
    if(main.count<50)throw Error('Empty sprite '+names[i]);
    const left=Math.max(0,main.left-2),top=Math.max(0,main.top-2),right=Math.min(info.width-1,main.right+2),bottom=Math.min(info.height-1,main.bottom+2);
    const trimmed=await sharp(data,{raw:info}).extract({left,top,width:right-left+1,height:bottom-top+1}).resize({width:252,height:252,fit:'inside',withoutEnlargement:true,kernel:'lanczos3'}).png().toBuffer();
    const m=await sharp(trimmed).metadata(),tx=i%4*256+2,ty=Math.floor(i/4)*256+2;
    composite.push({input:trimmed,left:tx,top:ty});frames[names[i]]={x:tx,y:ty,width:m.width,height:m.height};report.push({name:names[i],source:{...roi,left:roi.left+left,top:roi.top+top,width:right-left+1,height:bottom-top+1},frame:frames[names[i]]});
  }
  const atlas=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composite).webp({lossless:true,effort:6}).toBuffer();
  const terrain=await sharp(terrainPath).resize({width:1600,height:900,fit:'fill',kernel:'lanczos3'}).webp({quality:90,effort:6}).toBuffer();
  const save=async b=>{const hash=createHash('sha256').update(b).digest('hex'),asset=`map-studio/${hash}.webp`;await fs.mkdir('public/map-studio',{recursive:true});await fs.writeFile('public/'+asset,b,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});return asset;};
  const manifest={version:1,terrain:{asset:await save(terrain),width:1600,height:900,frames:[{x:0,y:0,width:1600,height:900}],fps:1},atlas:{asset:await save(atlas),width:1024,height:1024},frames,bytes:terrain.length+atlas.length,decodedBytes:(1600*900+1024*1024)*4,extraction:report};
  return manifest;
}
if(process.argv[2]&&process.argv[3])console.log(JSON.stringify(await buildGarduArt(process.argv[2],process.argv[3])));
