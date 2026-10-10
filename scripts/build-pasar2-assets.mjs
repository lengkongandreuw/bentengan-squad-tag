// Independent build: never writes original/shared map assets or atlases.
import sharp from 'sharp';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const root=path.resolve(import.meta.dirname,'..'),input=path.join(root,'Assets/map/pasar2'),output=path.join(root,'public/field/pasar2');
await mkdir(output,{recursive:true});
const assets={},layers=[];
async function pack(id,png){
  png=await sharp(png).resize(496,496,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
  const m=await sharp(png).metadata(),i=layers.length,x=(i%4)*512+8,y=Math.floor(i/4)*512+8;
  assets[id]={x,y,width:m.width,height:m.height};layers.push({input:png,left:x,top:y});
  await sharp(png).webp({quality:96,alphaQuality:100}).toFile(path.join(output,`${id}.webp`));
}
const ids=['map2Center','map2Cart','map2BarrierRed','map2PlanterRed','marketStallA','map2Trash','marketStallB','marketStallC','snackCart','foodCart','lamp','plant'];
const cuts=[[0,460,770,1090,1448],[0,410,755,1090,1448],[0,440,790,1075,1448]],ys=[0,420,740,1086];
for(let i=0;i<ids.length;i++){
  const r=Math.floor(i/4),c=i%4;
  const cell=await sharp(path.join(input,'market-sprites-v2.png')).extract({left:cuts[r][c],top:ys[r],width:cuts[r][c+1]-cuts[r][c],height:ys[r+1]-ys[r]}).png().toBuffer();
  await pack(ids[i],await sharp(cell).trim({threshold:12}).png().toBuffer());
}
const border=path.join(input,'waterfront-sprites-v2.png');
// Unequal spacing in the sheet: explicit crops prevent neighboring sprite tips.
const borderCells=[{left:90,top:125,width:730,height:245},{left:925,top:125,width:700,height:280},{left:260,top:410,width:390,height:445},{left:820,top:500,width:805,height:355}];
for(const [i,id] of ['plantFence','canalBridgeH','canalBridgeV','bunting'].entries()){
  const cell=await sharp(border).extract(borderCells[i]).png().toBuffer();
  await pack(id,await sharp(cell).trim({threshold:12}).png().toBuffer());
}
const original=JSON.parse(await readFile(path.join(root,'public/field/manifest.json'),'utf8'));
for(const id of ['fortRed','fortGreen','map2PrisonRedFloor','map2PrisonRedOverlay','map2PrisonGreenFloor','map2PrisonGreenOverlay']){
  const f=original.objects.assets[id];
  await pack(id,await sharp(path.join(root,'public/field',f.atlas??original.objects.file)).extract({left:f.x,top:f.y,width:f.width,height:f.height}).png().toBuffer());
}
const height=Math.ceil(layers.length/4)*512;
await sharp({create:{width:2048,height,channels:4,background:'#00000000'}}).composite(layers).webp({quality:96,alphaQuality:100}).toFile(path.join(output,'objects.webp'));
await sharp(path.join(input,'ground-v2.png')).resize(2100,1050,{fit:'cover'}).webp({quality:94}).toFile(path.join(output,'ground.webp'));
const manifest={version:2,width:2100,height:1050,ground:'pasar2/ground.webp',objects:{file:'pasar2/objects.webp',width:2048,height,assets}};
await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await writeFile(path.join(root,'lib/pasar2-atlas.generated.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Generated isolated Pasar 2 bundle, 22 separated sprites. Shared assets untouched.');
