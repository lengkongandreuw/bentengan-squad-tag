// Dedicated eight-direction sheets. Legacy atlases remain available for rescue/parkour.
import fs from 'node:fs/promises';
import sharp from 'sharp';

const files = {
  maria: ['Maria_lari hadap depan sprites.png', 'lari serong kiri bawah.png', 'Maria_run_left.png', 'lari serong kiri atas belakang.png', 'Maria_lari hadap belakang sprites.png', 'lari serong kanan atas belakang.png', 'maria_run_right.png', 'lari serong kanan bawah.png', 'maria pose idle.png', 'maria tag pose.png', 'maria_pose tertangkap.png', 'maria pose menang dan kalah.png'],
  boke: ['boke lari depan.png', 'boke kiri bawah.png', 'boke lari samping.png', 'boke kiri atas.png', 'boke lari belakang.png', 'boke kanan atas.png', 'boke lari samping 2.png', 'boke kanan bawah.png', 'boke_idle.png', 'boke_tag.png', 'boke_pose tertangkap_menang_kalah.png'],
};

async function extract(file, count) {
  const {data, info: {width, height}} = await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  // Remove only near-pure export backgrounds, not dark hair/clothes or coloured details.
  for (let i=0;i<data.length;i+=4) {
    if (Math.min(data[i],data[i+1],data[i+2])>=250 || Math.max(data[i],data[i+1],data[i+2])<=2) data[i+3]=0;
  }
  const seen=new Uint8Array(width*height), parts=[];
  for(let start=0;start<seen.length;start++) {
    if(seen[start] || data[start*4+3]<64) continue;
    const stack=[start], pixels=[]; seen[start]=1;
    let x0=width,y0=height,x1=0,y1=0;
    while(stack.length) {
      const p=stack.pop(), x=p%width,y=Math.floor(p/width); pixels.push(p);
      x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        if(x+dx<0||x+dx>=width||y+dy<0||y+dy>=height)continue;
        const n=(y+dy)*width+x+dx;
        if(!seen[n]&&data[n*4+3]>=64){seen[n]=1;stack.push(n);}
      }
    }
    if(pixels.length>32)parts.push({pixels,x0,y0,x1,y1});
  }
  const seeds=parts.sort((a,b)=>b.pixels.length-a.pixels.length).slice(0,count).sort((a,b)=>a.x0-b.x0);
  if(seeds.length!==count || seeds.some(p=>p.y1-p.y0<height*.35))throw Error(`${file}: cannot safely identify ${count} complete poses`);
  return Promise.all(seeds.map(async p=>{
    const w=p.x1-p.x0+1,h=p.y1-p.y0+1,out=Buffer.alloc(w*h*4);
    for(const n of p.pixels)data.copy(out,((Math.floor(n/width)-p.y0)*w+n%width-p.x0)*4,n*4,n*4+4);
    return {input:await sharp(out,{raw:{width:w,height:h,channels:4}}).png().toBuffer(),width:w,height:h,box:[p.x0,p.y0,w,h]};
  }));
}

for(const id of Object.keys(files)) {
  const strips=[];
  for(let i=0;i<files[id].length;i++) {
    const count=i===2||i===6?8:i<8?4:i===9?(id==='maria'?3:4):i===11?2:3;
    strips.push(await extract(`sprite-sources/${id}/${files[id][i]}`,count));
  }
  // Source edge clips Maria's outer NE/NW pose. Omit those two, rather than
  // displaying a severed face/arm or inventing missing artwork.
  if(id==='maria'){strips[3]=strips[3].slice(1);strips[5]=strips[5].slice(0,3);}
  const composites=[], manifest={id,columns:8,rows:11,cell:160,files:files[id],frames:[]};
  async function pack(frame,row,column,scale) {
    const w=Math.round(frame.width*scale),h=Math.round(frame.height*scale);
    if(w>152||h>152)throw Error(`${id} r${row}c${column} exceeds cell: ${w}x${h}`);
    const input=await sharp(frame.input).resize(w,h).png().toBuffer();
    composites.push({input,left:column*160+Math.round((160-w)/2),top:row*160+152-h});
    manifest.frames.push({row,column,sourceBox:frame.box,width:w,height:h});
  }
  for(let row=0;row<10;row++) {
    const strip=strips[row], heights=strip.map(p=>p.height).sort((a,b)=>a-b);
    const scale=(row===9?116:136)/heights[Math.floor(heights.length/2)];
    for(let c=0;c<strip.length;c++)await pack(strip[c],row,c,scale);
  }
  const states=id==='maria'?[...strips[10],...strips[11]]:strips[10];
  for(let c=0;c<states.length;c++) {
    const target=id==='maria'?(c<3?100:c===3?144:132):(c===0?100:c===1?144:132);
    await pack(states[c],10,c,target/states[c].height);
  }
  const dir=`public/characters/${id}`;
  await fs.mkdir(dir,{recursive:true});
  await sharp({create:{width:1280,height:1760,channels:4,background:'#00000000'}}).composite(composites).webp({quality:95,alphaQuality:100}).toFile(`${dir}/series-runtime.webp`);
  await fs.writeFile(`${dir}/series.json`,JSON.stringify(manifest,null,2)+'\n');
  console.log(`${id}: ${manifest.frames.length} poses packed with 8px foot gutter`);
}
