// Visual-only. No mutation of actors, coordinates, colliders or game state.
// A cached canvas finish preserves the approved ground image and all geometry.
// It is not a new bitmap asset, terrain mask, decoration or collision layer.
const groundFinishes=new WeakMap();
const clampByte=v=>Math.max(0,Math.min(255,Math.round(v)));
export function tamanGroundColor(r,g,b,x,y){
  // Visual finish only: neutral forest-charcoal outside the existing terrain.
  // Blend its antialiased rim; never alter the authored solid/navigation mask.
  const exterior=Math.min(1,Math.max(0,(b-g*1.25)/8))*Math.min(1,Math.max(0,(70-g)/10))*Math.min(1,Math.max(0,(48-r)/10));
  if(exterior>0)return [clampByte(r+(18-r)*exterior),clampByte(g+(25-g)*exterior),clampByte(b+(21-b)*exterior)];
  const grass=Math.max(0,Math.min(1,(g-Math.max(r,b)-7)/32));
  const stone=Math.max(0,1-(Math.max(r,g,b)-Math.min(r,g,b))/32);
  const broad=Math.sin(x/91+y/133)*Math.sin(y/59-x/157);
  const grain=(((Math.imul(x|0,73856093)^Math.imul(y|0,19349663))>>>0)%101/100-.5);
  const paver=Math.sin(Math.floor((x+y)/15)*1.71+Math.floor((x-y)/15)*2.37);
  const detail=grass*(broad*3.4+grain*.9)+stone*(paver*1.65+grain*.55);
  return [clampByte(r*(1-grass*.035)+detail+stone*.8),
    clampByte(g*(1-grass*.015)+detail+stone*1.1),
    clampByte(b+grass*7.5+stone*2.3+detail)];
}
export function tamanGroundFinish(image,width,height){
  if(!image?.complete||!image.naturalWidth)return image;
  const cached=groundFinishes.get(image);
  if(cached?.width===width&&cached?.height===height)return cached;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return image;
  ctx.drawImage(image,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height),data=pixels.data;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,[r,g,b]=tamanGroundColor(data[i],data[i+1],data[i+2],x,y);
    data[i]=r;data[i+1]=g;data[i+2]=b;
  }
  ctx.putImageData(pixels,0,0);groundFinishes.set(image,canvas);return canvas;
}
const viewportGrounds=new WeakMap();
// Native-world-sized, unique terrain detail. Never carry a source scanline
// sideways: that made both the grass and the path look horizontally pulled.
const edgeHash=(x,y)=>{
  let h=Math.imul(x|0,73856093)^Math.imul(y|0,19349663);
  h=Math.imul(h^(h>>>16),0x7feb352d);h=Math.imul(h^(h>>>15),0x846ca68b);
  return ((h^(h>>>16))>>>0)/4294967295;
};
function edgeNoise(x,y,size){
  const u=x/size,v=y/size,ix=Math.floor(u),iy=Math.floor(v);
  const sx=(u-ix)**2*(3-2*(u-ix)),sy=(v-iy)**2*(3-2*(v-iy));
  const a=edgeHash(ix,iy)*(1-sx)+edgeHash(ix+1,iy)*sx;
  const b=edgeHash(ix,iy+1)*(1-sx)+edgeHash(ix+1,iy+1)*sx;
  return a*(1-sy)+b*sy;
}
export function tamanEdgePalette(sample,width,height){
  const sides=[],patches=[];
  // Reuse ground-only detail at its native pixel density. Each world cell
  // gets an independently chosen sample, with feathered joins: no repeated
  // image tile, stretched strip, or new/baked environment object.
  for(let y=0;y<height-48;y+=24)for(let x=0;x<width-48;x+=24){
    let grass=0;
    for(let v=0;v<48;v+=8)for(let u=0;u<48;u+=8){
      const i=((y+v)*width+x+u)*4;
      if(sample[i+1]>sample[i]+12&&sample[i+1]>sample[i+2]+12)grass++;
    }
    if(grass===36)patches.push([x,y]);
  }
  for(const x of [0,width-1]){
    const grass=[0,0,0],stone=[0,0,0];let ng=0,ns=0,start=-1,end=-1;
    for(let y=0;y<height;y++){
      const i=(y*width+x)*4,r=sample[i],g=sample[i+1],b=sample[i+2];
      if(g>r+12&&g>b+12){grass[0]+=r;grass[1]+=g;grass[2]+=b;ng++;}
      // Only the existing horizontal base approach, not the central plaza.
      if(y>height*.40&&y<height*.51&&Math.max(r,g,b)-Math.min(r,g,b)<26&&Math.min(r,g,b)>70){
        if(start<0)start=y;end=y;stone[0]+=r;stone[1]+=g;stone[2]+=b;ns++;
      }
    }
    sides.push({grass:grass.map((v,c)=>ng?v/ng:[76,116,44][c]),
      stone:stone.map(v=>ns?v/ns:150),start,end,sample,width,height,patches,edge:x});
  }
  return sides;
}
export function tamanOuterEdgeColor(wx,wy,side){
  const road=wy>=side.start&&wy<=side.end&&side.start>=0;
  if(road){
    // Continue the same-width paved approach. Individually shaded paving
    // cells have world-sized joints, not stretched pixels or a repeated tile.
    const cell=Math.floor(wx/24),px=((wx%24)+24)%24;
    const sourceX=(side.edge===0?0:side.width-336)+Math.floor(edgeHash(cell,7)*14)*24+Math.floor(px);
    const i=(Math.max(0,Math.min(side.height-1,Math.floor(wy)))*side.width+sourceX)*4;
    return [side.sample[i],side.sample[i+1],side.sample[i+2]];
  }
  if(side.patches.length){
    const gx=Math.floor(wx/24),gy=Math.floor(wy/24),rgb=[0,0,0];let total=0;
    for(let j=0;j<2;j++)for(let i=0;i<2;i++){
      const vx=(gx+i)*24,vy=(gy+j)*24;
      const weight=((1-Math.abs(wx-vx)/24)*(1-Math.abs(wy-vy)/24))**4;
      if(weight<=0)continue;
      const origin=side.patches[Math.floor(edgeHash(gx+i,gy+j)*side.patches.length)];
      const sx=origin[0]+Math.max(0,Math.min(47,Math.floor(wx-vx+24)));
      const sy=origin[1]+Math.max(0,Math.min(47,Math.floor(wy-vy+24)));
      const n=(sy*side.width+sx)*4;
      for(let c=0;c<3;c++)rgb[c]+=side.sample[n+c]*weight;
      total+=weight;
    }
    return rgb.map(v=>clampByte(v/total));
  }
  const broad=(edgeNoise(wx,wy,35)-.5)*18;
  const leaves=(edgeNoise(wx,wy,4)-.5)*22;
  const vein=Math.max(0,.18-edgeNoise(wx+wy*.22,wy,6))*-26;
  return side.grass.map((v,c)=>clampByte(v+broad+leaves+vein+(c===1?leaves*.12:0)));
}
export function drawTamanViewportGround(ctx,image,cw,ch,worldWidth,worldHeight,scale,camX,camY){
  // Visual overscan only: camera, world bounds and navigation stay unchanged.
  const left=camX-cw/(2*scale),top=camY-ch/(2*scale);
  if(left>=0&&top>=0&&left+cw/scale<=worldWidth&&top+ch/scale<=worldHeight)return;
  if(!image?.complete||!image.naturalWidth)return;
  const ground=tamanGroundFinish(image,worldWidth,worldHeight),key=[cw,ch,scale,camX,camY].join(':');
  let cached=viewportGrounds.get(image);
  if(cached?.key!==key){
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(cw);canvas.height=Math.ceil(ch);
    const target=canvas.getContext('2d');if(!target)return;
    const pixels=target.createImageData(canvas.width,canvas.height);
    const sample=ground.getContext('2d').getImageData(0,0,worldWidth,worldHeight).data;
    const edgePalette=tamanEdgePalette(sample,worldWidth,worldHeight);
    // Extract an average grass palette only. Carrying each edge pixel's color
    // through the margin creates scanline streaks even without scaling an image.
    const grass=[0,0,0];let grassSamples=0;
    for(const y of [0,worldHeight-1])for(let x=0;x<worldWidth;x+=7){
      const i=(y*worldWidth+x)*4;
      if(sample[i+1]>sample[i]+12&&sample[i+1]>sample[i+2]+12){for(let c=0;c<3;c++)grass[c]+=sample[i+c];grassSamples++;}
    }
    for(let c=0;c<3;c++)grass[c]=grassSamples?grass[c]/grassSamples:[76,116,44][c];
    // Generate unique world-aligned grass/paver detail in the spare viewport,
    // never stretch a scanline, repeat an image tile, crop, or resize the map.
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const wx=left+x/scale,wy=top+y/scale;
      if(wx>=0&&wx<worldWidth&&wy>=0&&wy<worldHeight)continue;
      const sx=Math.max(0,Math.min(worldWidth-1,Math.floor(wx))),sy=Math.max(0,Math.min(worldHeight-1,Math.floor(wy)));
      const s=(sy*worldWidth+sx)*4,i=(y*canvas.width+x)*4;
      if(wx<0||wx>=worldWidth){
        const side=edgePalette[wx<0?0:1],rgb=tamanOuterEdgeColor(wx,wy,side);
        const distance=wx<0?-wx:wx-worldWidth;
        // A short feather joins the authored edge; nothing is pulled beyond
        // this 10-world-pixel seam. The path remains continuous and opaque.
        const seam=Math.min(1,Math.max(0,distance)/10);
        for(let c=0;c<3;c++)pixels.data[i+c]=clampByte((sample[s+c]*(1-seam)+rgb[c]*seam)*.92);
        pixels.data[i+3]=255;continue;
      }
      const hash=(Math.imul(Math.floor(wx/2),73856093)^Math.imul(Math.floor(wy/2),19349663))>>>0;
      const grain=(hash%101/100-.5)*12,broad=Math.sin(wx/29+wy/47)*Math.sin(wy/18-wx/83)*6;
      const stone=Math.max(sample[s],sample[s+1],sample[s+2])-Math.min(sample[s],sample[s+1],sample[s+2])<20;
      const joint=stone&&(Math.abs(wx-Math.round(wx/22)*22)<1||Math.abs(wy-Math.round(wy/22)*22)<1)?-9:0;
      const blend=Math.min(1,Math.hypot(wx-sx,wy-sy)/12);
      for(let c=0;c<3;c++){
        const base=stone?sample[s+c]:grass[c];
        pixels.data[i+c]=clampByte((sample[s+c]*(1-blend)+base*blend+grain+broad+joint)*.92);
      }
      pixels.data[i+3]=255;
    }
    target.putImageData(pixels,0,0);cached={key,canvas};viewportGrounds.set(image,cached);
  }
  ctx.drawImage(cached.canvas,0,0);
}
export function tamanPropFilter(asset,x,y){
  // Rhythm through tiny lighting variation, never sprite/collider resizing.
  if(['parkFlowerFence','gardenMedium','parkTree'].includes(asset))
    return `saturate(.92) brightness(${(1+Math.sin(x*.017+y*.011)*.025).toFixed(3)})`;
  return 'none';
}
export function tamanDepthProfile(item){
  const top=item.y+item.h-item.visualH,bottom=item.y+item.h;
  // Sort at physical contact center, never at the image's lowest pixel.
  // Lower stone/feet are painted below actors; only the upper slice occludes.
  const anchors={flowerBedSmall:[.635,.75],gardenMedium:[.645,.73],parkTree:[.76,.74],
    parkBench:[.81,.78],parkBarrier:[.74,.78],parkFlowerFence:[.775,.80],parkLamp:[.95,.90]};
  const [contact,cut]=anchors[item.asset]??[1,1];
  return {top,bottom,y:top+item.visualH*contact,splitY:top+item.visualH*cut};
}
// Canopy-only, smoothly rounded, multiplied by the sprite's real alpha below.
// It reaches zero above the opaque trunk/stone and above the depth split, so
// fading cannot reveal a straight rectangular slice boundary.
export function tamanCanopyMask(x,y){
  const radius=Math.hypot((x-.5)/.39,(y-.30)/.37);
  const t=Math.max(0,Math.min(1,(1-radius)/.22));
  return t*t*(3-2*t);
}
const treeVisuals=new WeakMap();
export function tamanTreeVisual(image,frame){
  if(!image?.complete||!image.naturalWidth)return null;
  let cache=treeVisuals.get(image);if(!cache){cache=new Map();treeVisuals.set(image,cache);}
  const key=[frame.x,frame.y,frame.width,frame.height].join(':');
  if(cache.has(key))return cache.get(key);
  const canvas=document.createElement('canvas');canvas.width=frame.width;canvas.height=frame.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
  ctx.drawImage(image,frame.x,frame.y,frame.width,frame.height,0,0,frame.width,frame.height);
  const pixels=ctx.getImageData(0,0,frame.width,frame.height),mask=new Float32Array(frame.width*frame.height);
  for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++)mask[y*frame.width+x]=tamanCanopyMask((x+.5)/frame.width,(y+.5)/frame.height);
  const visual={pixels,mask,width:frame.width,height:frame.height,variants:new Map([[32,canvas]])};cache.set(key,visual);return visual;
}
export function tamanTreeFadeSprite(visual,opacity){
  if(!visual)return null;
  const level=Math.max(22,Math.min(32,Math.round(opacity*32)));
  if(visual.variants.has(level))return visual.variants.get(level);
  const canvas=document.createElement('canvas');canvas.width=visual.width;canvas.height=visual.height;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  const pixels=ctx.createImageData(visual.width,visual.height);pixels.data.set(visual.pixels.data);
  for(let i=0;i<visual.mask.length;i++)pixels.data[i*4+3]=Math.round(pixels.data[i*4+3]*(1-(1-level/32)*visual.mask[i]));
  ctx.putImageData(pixels,0,0);visual.variants.set(level,canvas);return canvas;
}
export function tamanOcclusionOpacity(item,players,visual=null){
  // Low park objects and prison segments stay opaque: depth ordering only.
  if(item.asset!=='parkTree')return 1;
  const {top,y}=tamanDepthProfile(item),left=item.x+(item.w-item.visualW)/2;
  return players.some(p=>{
    if(p.y>=y)return false;
    // Sample the torso, not the broad sprite rectangle or just the feet.
    let covered=0;
    for(let row=0;row<7;row++)for(let col=0;col<5;col++){
      let u=(p.x-16+col*8-left)/item.visualW;
      const v=(p.y-62+row*8-top)/item.visualH;
      if(item.flip)u=1-u;
      if(u<0||u>=1||v<0||v>=1)continue;
      const i=Math.floor(v*(visual?.height??1))*(visual?.width??1)+Math.floor(u*(visual?.width??1));
      covered+=visual?visual.mask[i]*visual.pixels.data[i*4+3]/255:tamanCanopyMask(u,v);
    }
    return covered/35>.22;
  })?.68:1;
}
export const tamanFadeOpacity=(a,b,dt)=>a+(b-a)*(1-Math.exp(-Math.max(0,dt)/120));
export function drawTamanContactShadows(ctx,props){
  ctx.save();
  for(const p of props){
    if(p.asset.startsWith('parkCorner'))continue;
    const rx=p.w*(p.asset==='parkLamp'?.32:.48),ry=Math.max(2,Math.min(9,p.h*.19));
    ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h-ry*.8);ctx.scale(rx,ry);
    const g=ctx.createRadialGradient(0,0,0,0,0,1);
    g.addColorStop(0,'rgba(12,25,34,.20)');g.addColorStop(.5,'rgba(12,25,34,.09)');g.addColorStop(1,'rgba(12,25,34,0)');
    ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
  ctx.restore();
}
export function drawTamanPrisonGrounding(ctx,prisons){
  ctx.save();
  for(const p of Object.values(prisons)){
    // All treatment stays under the platform or within a soft 6px contact rim.
    // Entrance and side openings remain visually readable and walkable.
    ctx.save();ctx.shadowColor='rgba(15,29,39,.22)';ctx.shadowBlur=6;ctx.shadowOffsetY=2;
    ctx.fillStyle='rgba(29,43,49,.12)';ctx.beginPath();
    ctx.roundRect(p.x+4,p.y+p.h*.18,p.w-8,p.h*.79,7);ctx.fill();ctx.restore();
    ctx.strokeStyle='rgba(163,182,182,.17)';ctx.lineWidth=2;ctx.beginPath();
    ctx.roundRect(p.x+1,p.y+p.h*.17,p.w-2,p.h*.81,8);ctx.stroke();
  }
  ctx.restore();
}
export function drawTamanWaterRipples(ctx,props,now){
  ctx.save();ctx.strokeStyle='rgba(148,224,246,.32)';ctx.lineWidth=1.2;
  for(const p of props.filter(p=>p.asset.startsWith('parkCorner'))){
    const top=p.y+p.h-p.visualH;
    const cx=p.x+p.w*(p.asset.endsWith('W')?.43:.57),cy=top+p.visualH*.65;
    for(let i=0;i<2;i++){const phase=(now/1800+i*.5)%1;ctx.globalAlpha=1-phase;ctx.beginPath();ctx.ellipse(cx,cy,9+phase*16,3+phase*5,0,0,Math.PI*2);ctx.stroke();}
  }
  ctx.restore();
}
