import sharp from 'sharp';
import { createHash } from 'node:crypto';
const int=(v,min,max,label)=>{if(!Number.isInteger(v)||v<min||v>max)throw new Error(`${label} tidak valid.`);return v;};
export async function compileSprites(files,options={}) {
  if(!Array.isArray(files)||!files.length||files.length>128) throw new Error('Upload 1–128 gambar/frame.');
  const inputs=files.map(f=>{if(typeof f.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(f.data))throw new Error('Data gambar tidak valid.');return Buffer.from(f.data,'base64');});
  if(inputs.reduce((n,b)=>n+b.length,0)>30*1024*1024)throw new Error('Total upload maksimal 30 MB.');
  let frames=[],pixelBudget=0;
  for(const bytes of inputs) {
    const meta=await sharp(bytes,{limitInputPixels:32_000_000}).metadata();
    if(!['png','gif','webp'].includes(meta.format)) throw new Error('Gunakan PNG, GIF, atau WebP.');
    const h=meta.pageHeight??meta.height,pages=meta.pages??1;
    if(!meta.width||!h||meta.width>4096||h>4096||pages>128||meta.width*h*pages>64_000_000)throw new Error('Gambar terlalu besar: sisi 4096, 128 frame, 64 juta pixel.');
    pixelBudget+=meta.width*h*pages;
    if(pixelBudget>64_000_000)throw new Error('Total upload melebihi 64 juta pixel.');
    if(inputs.length>1&&pages>1)throw new Error('Multi-file harus berisi gambar statis.');
    if(pages>1) {
      for(let page=0;page<pages;page++)frames.push(await sharp(bytes,{page,pages:1}).ensureAlpha().png().toBuffer());
    } else if(inputs.length===1) {
      const cols=int(options.columns??1,1,128,'Kolom'),rows=int(options.rows??1,1,128,'Baris');
      const count=int(options.count??cols*rows,1,Math.min(128,cols*rows),'Jumlah frame');
      const cw=Math.floor(meta.width/cols),ch=Math.floor(h/rows);
      if(!cw||!ch)throw new Error('Sel terlalu kecil.');
      const order=options.order?.length?options.order:Array.from({length:count},(_,i)=>i);
      if(order.length!==count)throw new Error('Urutan harus berisi jumlah frame yang dipilih.');
      for(const index of order) {
        int(index,0,cols*rows-1,'Indeks frame');
        frames.push(await sharp(bytes).extract({left:index%cols*cw,top:Math.floor(index/cols)*ch,width:cw,height:ch}).ensureAlpha().png().toBuffer());
      }
    } else frames.push(await sharp(bytes).ensureAlpha().png().toBuffer());
  }
  if(frames.length>128)throw new Error('Maksimal 128 frame.');
  if((inputs.length>1||frames.length>1&&options.columns===1&&options.rows===1)&&options.order?.length) {
    frames=options.order.map(index=>frames[int(index,0,frames.length-1,'Indeks frame')]);
    if(!frames.length||frames.length>128)throw new Error('Urutan maksimal 128 frame.');
  }
  // One crop shared by all frames preserves animation alignment. Never trim each
  // pose independently: doing that can shift feet or clip wide poses.
  const crop=options.crop;
  if(crop) {
    for(const key of ['left','top'])int(crop[key],0,4096,'Crop');
    for(const key of ['width','height'])int(crop[key],1,4096,'Crop');
    frames=await Promise.all(frames.map(async bytes=>{
      const m=await sharp(bytes).metadata();
      if(crop.left+crop.width>m.width||crop.top+crop.height>m.height)throw new Error('Crop keluar dari frame.');
      return sharp(bytes).extract(crop).png().toBuffer();
    }));
  }
  const sizes=await Promise.all(frames.map(f=>sharp(f).metadata()));
  const cw=Math.max(...sizes.map(m=>m.width))+8,ch=Math.max(...sizes.map(m=>m.height))+8;
  const cols=Math.min(frames.length,Math.floor(4096/cw)),rows=Math.ceil(frames.length/Math.max(1,cols));
  if(!cols||rows*ch>4096)throw new Error('Atlas melebihi 4096px. Kecilkan frame atau jumlah frame.');
  const atlas=await sharp({create:{width:cols*cw,height:rows*ch,channels:4,background:'#00000000'}}).composite(frames.map((input,i)=>({input,left:i%cols*cw+Math.floor((cw-sizes[i].width)/2),top:Math.floor(i/cols)*ch+ch-4-sizes[i].height}))).webp({lossless:true}).toBuffer();
  return {bytes:atlas,hash:createHash('sha256').update(atlas).digest('hex'),width:cols*cw,height:rows*ch,frames:frames.map((_,i)=>({x:i%cols*cw,y:Math.floor(i/cols)*ch,width:cw,height:ch}))};
}
