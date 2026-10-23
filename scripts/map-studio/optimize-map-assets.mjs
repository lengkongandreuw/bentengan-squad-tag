import sharp from 'sharp';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {realpath,readFile,mkdir,writeFile} from 'node:fs/promises';
import {mapAssets,validateMap} from '../../lib/map-studio-model.js';
import {packRects,frameKey} from '../studio-runtime-pack.mjs';
import {BUDGETS,textureBudget} from '../studio-asset-policy.mjs';
import {registerMapAsset} from './asset-library.mjs';

function layout(items){
  if(items.length===1&&items[0].width<=4096&&items[0].height<=4096)return {width:items[0].width,height:items[0].height,placements:[{x:0,y:0}]};
  return packRects(items);
}
async function repack(bytes,frames,scale){
  const {data,info}=await sharp(bytes,{limitInputPixels:32_000_000}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const aliases=[],unique=new Map();
  for(const frame of frames){
    if(frame.x+frame.width>info.width||frame.y+frame.height>info.height)throw new Error('Frame aset tidak sesuai gambar. Draft tidak diubah.');
    let pixels=Buffer.alloc(frame.width*frame.height*4);
    for(let y=0;y<frame.height;y++)data.copy(pixels,y*frame.width*4,((frame.y+y)*info.width+frame.x)*4,((frame.y+y)*info.width+frame.x+frame.width)*4);
    let width=frame.width,height=frame.height;
    if(scale<1){width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));pixels=await sharp(pixels,{raw:{width:frame.width,height:frame.height,channels:4}}).resize(width,height,{kernel:'lanczos3',fit:'fill'}).raw().toBuffer();}
    // Invisible RGB is canonicalized for sharing, never visible RGBA.
    for(let n=0;n<pixels.length;n+=4)if(!pixels[n+3])pixels.fill(0,n,n+3);
    const hash=`${width},${height}:`+createHash('sha256').update(pixels).digest('hex');
    if(!unique.has(hash))unique.set(hash,{hash,width,height,pixels});
    aliases.push({key:frameKey(frame),hash});
  }
  const items=[...unique.values()].sort((a,b)=>b.height-a.height||b.width-a.width||a.hash.localeCompare(b.hash));
  const packed=layout(items);if(!packed)return null;
  const output=Buffer.alloc(packed.width*packed.height*4),positions=new Map();
  for(let i=0;i<items.length;i++){
    const item=items[i],p=packed.placements[i];positions.set(item.hash,{x:p.x,y:p.y,width:item.width,height:item.height});
    for(let y=0;y<item.height;y++)item.pixels.copy(output,((p.y+y)*packed.width+p.x)*4,y*item.width*4,(y+1)*item.width*4);
  }
  const encoded=await sharp(output,{raw:{width:packed.width,height:packed.height,channels:4}}).webp({lossless:true,effort:4}).toBuffer();
  return {bytes:encoded,width:packed.width,height:packed.height,frames:new Map(aliases.map(a=>[a.key,positions.get(a.hash)]))};
}
export async function optimizeMapAssets(root,input){
  const original=validateMap(input),map=structuredClone(original),before=textureBudget(mapAssets(map),'map');
  const publicDir=await realpath(path.join(root,'public')),groups=new Map();
  for(const clip of mapAssets(map)){
    if(!groups.has(clip.asset))groups.set(clip.asset,{asset:clip.asset,width:clip.width,height:clip.height,clips:[],frames:new Map()});
    const group=groups.get(clip.asset);if(!group.clips.includes(clip))group.clips.push(clip);for(const frame of clip.frames)group.frames.set(frameKey(frame),frame);
  }
  // Retain only candidate encodings, not all decoded source atlases in memory.
  for(const group of groups.values()){
    const source=await realpath(path.join(publicDir,group.asset));
    if(!source.startsWith(publicDir+path.sep))throw new Error('Aset di luar proyek.');
    const bytes=await readFile(source),meta=await sharp(bytes,{limitInputPixels:32_000_000}).metadata();
    if(meta.width!==group.width||meta.height!==group.height)throw new Error('Ukuran aset tidak sesuai manifest. Draft tidak diubah.');
    const candidate=await repack(bytes,[...group.frames.values()],1);
    group.candidate=candidate&&candidate.width*candidate.height<group.width*group.height?candidate:null;
  }
  const size=()=>[...groups.values()].reduce((n,g)=>n+(g.candidate?g.candidate.width*g.candidate.height:g.width*g.height)*4,0);
  let resized=false;
  // First try exact pixels. Only if necessary, downsample modestly (at most2×).
  if(size()>BUDGETS.map.limit){
    const scale=Math.max(.5,Math.min(.98,Math.sqrt(BUDGETS.map.limit*.88/size())));
    for(const group of groups.values()){
      const source=await realpath(path.join(publicDir,group.asset));
      const candidate=await repack(await readFile(source),[...group.frames.values()],scale);
      if(candidate&&candidate.width*candidate.height<(group.candidate?group.candidate.width*group.candidate.height:group.width*group.height)){group.candidate=candidate;resized=true;}
    }
  }
  if(size()>BUDGETS.map.limit)throw new Error('Optimasi aman belum cukup untuk mencapai 128 MiB. Tidak ada objek atau frame yang dihapus. Kurangi aset unik; draft tetap utuh.');
  const folder=path.join(publicDir,'map-studio');await mkdir(folder,{recursive:true});
  const target=await realpath(folder);if(!target.startsWith(publicDir+path.sep))throw new Error('Folder aset di luar proyek.');
  let changed=0;const libraryItems=[];
  for(const group of groups.values()){
    const c=group.candidate;if(!c)continue;
    const hash=createHash('sha256').update(c.bytes).digest('hex'),asset=`map-studio/${hash}.webp`;
    await writeFile(path.join(target,hash+'.webp'),c.bytes,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
    for(const clip of group.clips){
      clip.asset=asset;clip.width=c.width;clip.height=c.height;clip.frames=clip.frames.map(f=>({...c.frames.get(frameKey(f))}));
      libraryItems.push(await registerMapAsset(root,clip,`${map.name} · dioptimalkan`));
    }
    changed++;
  }
  validateMap(map);
  return {map,libraryItems,optimization:{before:before.rgbaBytes,after:textureBudget(mapAssets(map),'map').rgbaBytes,changed,resized}};
}
