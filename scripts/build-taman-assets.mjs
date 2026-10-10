// Independent Taman bundle. Never writes Nusantara/Pasar/shared binary atlases.
import sharp from 'sharp';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'public/field/taman');
export async function buildTamanAssets(){
  await mkdir(out,{recursive:true});
  const assets={},layers=[];
  async function pack(id,input,trim=true){
    let sprite=sharp(input);if(trim)sprite=sprite.trim({threshold:12});
    const png=await sprite.resize(496,496,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
    const m=await sharp(png).metadata(),i=layers.length,x=i%4*512+8,y=Math.floor(i/4)*512+8;
    assets[id]={x,y,width:m.width,height:m.height};layers.push({input:png,left:x,top:y});
    await sharp(png).webp({quality:96,alphaQuality:100}).toFile(path.join(out,id+'.webp'));
  }
  async function crop(id,file,left,top,width,height){await pack(id,await sharp(path.join(root,file)).extract({left,top,width,height}).png().toBuffer());}
  const sheet='field-sources/v3-park-objects.png';
  await crop('parkBench',sheet,54,42,279,136);
  await crop('parkBarrier',sheet,51,226,245,99);
  await crop('parkLamp',sheet,1279,830,83,184);
  await crop('parkPlanterLong',sheet,63,623,569,173);
  await crop('parkPlanter',sheet,1080,373,318,224);
  // Complete, enclosed ornamental pool; mirror horizontally only, never rotate
  // the pseudo-3D perspective. Each corner remains its own renderable object.
  for(const id of ['parkCornerNW','parkCornerNE','parkCornerSW','parkCornerSE']){
    let pond=sharp(path.join(root,'Assets/map/taman/pond-complete.png'));
    if(id.endsWith('E'))pond=pond.flop();
    await pack(id,await pond.png().toBuffer());
  }
  const old='Assets/map/map3/objects-layout.png';
  await crop('flowerBedSmall',old,774,334,128,119); // central fountain only
  await crop('parkTree',old,364,88,140,143);
  await crop('gardenMedium',old,642,572,150,115);
  await crop('parkFlowerFence',sheet,58,830,344,184);
  const manifest=JSON.parse(await readFile(path.join(root,'public/field/manifest.json'),'utf8'));
  for(const id of ['fortRed','fortGreen']){
    const f=manifest.objects.assets[id];
    await pack(id,await sharp(path.join(root,'public/field',f.atlas??manifest.objects.file)).extract({left:f.x,top:f.y,width:f.width,height:f.height}).png().toBuffer());
  }
  // Split one prison into floor, back wall and front shoulders. Preserve the
  // same full frame for all pieces, so depth ordering cannot move the artwork.
  const png=await sharp(path.join(root,'Assets/map/taman/prison.png')).trim({threshold:12}).resize(496,496,{fit:'inside'}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height}=png.info;
  for(const [id,lo,hi] of [['parkPrisonBlueFloor',.28,.64],['parkPrisonRedOverlay',0,.28],['parkPrisonBlueOverlay',.64,1]]){
    const data=Buffer.from(png.data);
    for(let y=0;y<height;y++)if(y<height*lo||y>=height*hi)for(let x=0;x<width;x++)data[(y*width+x)*4+3]=0;
    await pack(id,await sharp(data,{raw:{width,height,channels:4}}).png().toBuffer(),false);
  }
  const atlasHeight=Math.ceil(layers.length/4)*512;
  await sharp({create:{width:2048,height:atlasHeight,channels:4,background:'#00000000'}}).composite(layers).webp({quality:96,alphaQuality:100}).toFile(path.join(out,'objects.webp'));
  // Inpaint only the former exterior. Retain the approved interior pixels,
  // plaza and routes; both 2:1 sources resize uniformly without any crop.
  const original=await sharp(path.join(root,'Assets/map/taman/ground.png')).resize(1920,960,{fit:'inside'}).removeAlpha().raw().toBuffer();
  const extensionMeta=await sharp(path.join(root,'Assets/map/taman/ground-edge.png')).metadata();
  if(extensionMeta.width/extensionMeta.height!==2)throw new Error('Taman ground extension must have exact 2:1 proportions');
  const extension=await sharp(path.join(root,'Assets/map/taman/ground-edge.png')).resize(1920,960,{fit:'inside'}).removeAlpha().raw().toBuffer();
  const edge=Buffer.alloc(1920*960);
  for(let i=0;i<edge.length;i++){const [r,g,b]=original.subarray(i*3,i*3+3);edge[i]=r<40&&g<65&&b>g*1.35?255:0;}
  // Morphology expands dark foreground: invert first to grow the replacement
  // into the antialiased old rim, not shrink it and leave a dark outline.
  const inverted=Buffer.from(edge.map(v=>255-v));
  const grown=await sharp(inverted,{raw:{width:1920,height:960,channels:1}}).dilate(6).greyscale().raw().toBuffer();
  for(let i=0;i<grown.length;i++)grown[i]=255-grown[i];
  const blend=await sharp(grown,{raw:{width:1920,height:960,channels:1}}).blur(1.2).greyscale().raw().toBuffer();
  const ground=Buffer.from(original);
  for(let i=0;i<blend.length;i++)for(let c=0;c<3;c++)ground[i*3+c]=Math.round(original[i*3+c]+(extension[i*3+c]-original[i*3+c])*blend[i]/255);
  await sharp(ground,{raw:{width:1920,height:960,channels:3}}).webp({quality:95}).toFile(path.join(out,'ground.webp'));
  // Navigation mask only, not a visual edit: navy outside the authored park
  // is not terrain. Reuse the existing solid-mask collision architecture.
  // Visual overscan is not new playable terrain: preserve the exact original
  // navigation boundary, independently of the now fully filled background.
  const boundary=await sharp(path.join(root,'Assets/map/taman/ground.png')).resize(1920,960,{fit:'inside'}).webp({quality:95}).toBuffer();
  const raw=await sharp(boundary).resize(960,480).removeAlpha().raw().toBuffer();
  const voidMask=Buffer.alloc(960*480);
  for(let i=0;i<voidMask.length;i++){
    const [r,g,b]=raw.subarray(i*3,i*3+3);
    voidMask[i]=r<40&&g<65&&b>g*1.35?255:0;
  }
  await sharp(voidMask,{raw:{width:960,height:480,channels:1}}).png().toFile(path.join(out,'void-mask.png'));
  const bundle={version:1,width:1920,height:960,ground:'taman/ground.webp',solidMask:{file:'taman/void-mask.png',width:960,height:480},objects:{file:'taman/objects.webp',width:2048,height:atlasHeight,assets}};
  await writeFile(path.join(out,'manifest.json'),JSON.stringify(bundle,null,2)+'\n');
  await writeFile(path.join(root,'lib/taman-atlas.generated.json'),JSON.stringify(bundle,null,2)+'\n');
  console.log('Taman: ground +',layers.length,'separate sprites; other map assets untouched.');
  return bundle;
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename))await buildTamanAssets();
