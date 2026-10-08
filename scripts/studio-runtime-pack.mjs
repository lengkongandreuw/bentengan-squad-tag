import sharp from 'sharp';
import {createHash} from 'node:crypto';

export const frameKey = f => `${f.x},${f.y},${f.width},${f.height}`;

// Keep two transparent edge pixels for filtered sampling; no resizing/reduction.
export function trimFrame(data, imageWidth, f) {
  let left=f.width,top=f.height,right=-1,bottom=-1;
  for(let y=0;y<f.height;y++)for(let x=0;x<f.width;x++) {
    if(data[((f.y+y)*imageWidth+f.x+x)*4+3]) {
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
  }
  if(right<0)return {left:0,top:0,width:1,height:1};
  left=Math.max(0,left-2);top=Math.max(0,top-2);
  right=Math.min(f.width-1,right+2);bottom=Math.min(f.height-1,bottom+2);
  return {left,top,width:right-left+1,height:bottom-top+1};
}

export function packRects(items, limit=4096) {
  let best=null;
  for(const target of [256,512,768,1024,1536,2048,3072,4096].filter(w=>w<=limit)) {
    let x=0,y=0,rowHeight=0,width=0;
    const placements=[];
    for(const item of items) {
      const w=item.width+4,h=item.height+4;
      if(w>target){placements.length=0;break;}
      if(x+w>target){y+=rowHeight;x=0;rowHeight=0;}
      placements.push({x:x+2,y:y+2});x+=w;rowHeight=Math.max(rowHeight,h);width=Math.max(width,x);
    }
    const height=y+rowHeight;
    if(placements.length===items.length&&height<=limit&&(!best||width*height<best.width*best.height))best={width,height,placements};
  }
  return best;
}

export async function optimizeAtlas(input, frames) {
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const unique=[...new Map(frames.map(f=>[frameKey(f),f])).values()];
  const aliases=[],contents=new Map();
  for(const f of unique){
    const item={key:frameKey(f),frame:f,...trimFrame(data,info.width,f)};
    const pixels=Buffer.alloc(item.width*item.height*4);
    for(let y=0;y<item.height;y++){
      const start=((f.y+item.top+y)*info.width+f.x+item.left)*4;
      data.copy(pixels,y*item.width*4,start,start+item.width*4);
    }
    // RGB of fully transparent pixels is not visible; canonicalize it so
    // identical poses with different transparent padding share texture storage.
    for(let i=0;i<pixels.length;i+=4)if(!pixels[i+3])pixels.fill(0,i,i+3);
    const key=`${item.width},${item.height}:`+createHash('sha256').update(pixels).digest('hex');
    let canonical=contents.get(key);
    if(!canonical){canonical={...item,pixels};contents.set(key,canonical);}
    aliases.push({item,canonical});
  }
  const items=[...contents.values()].sort((a,b)=>b.height-a.height||b.width-a.width||a.key.localeCompare(b.key));
  const packed=packRects(items);
  if(!packed||packed.width*packed.height>=info.width*info.height)return null;
  const pixels=Buffer.alloc(packed.width*packed.height*4),mapping={};
  for(let i=0;i<items.length;i++) {
    const item=items[i],position=packed.placements[i];
    for(let y=0;y<item.height;y++)item.pixels.copy(pixels,((position.y+y)*packed.width+position.x)*4,y*item.width*4,(y+1)*item.width*4);
    item.position=position;
  }
  aliases.sort((a,b)=>b.item.height-a.item.height||b.item.width-a.item.width||a.item.key.localeCompare(b.item.key));
  for(const {item,canonical}of aliases)mapping[item.key]={...canonical.position,width:item.width,height:item.height,left:item.left,top:item.top};
  // Lossless encoding retains visible source pixels (source WebP is never rewritten).
  const output=await sharp(pixels,{raw:{width:packed.width,height:packed.height,channels:4}}).webp({lossless:true,effort:4}).toBuffer();
  return {output,width:packed.width,height:packed.height,sourceWidth:info.width,sourceHeight:info.height,frames:mapping};
}
