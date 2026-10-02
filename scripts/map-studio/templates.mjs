import ts from 'typescript';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
// Only trusted repository code is evaluated. Uploaded map data is never executed.
export async function templates(root){
  const source=await readFile(path.join(root,'app/prototype.tsx'),'utf8'),tree=ts.createSourceFile('prototype.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),decls=new Map();
  for(const s of tree.statements)if(ts.isVariableStatement(s))for(const d of s.declarationList.declarations)decls.set(d.name.getText(tree),d.initializer);
  const names=['W','H','DESIGN_W','DESIGN_H','MAP1_GUIDE_WIDTH','MAP1_GUIDE_HEIGHT','MAP1_WORLD_WIDTH','MAP1_WORLD_HEIGHT','BASES','guideObstacle'],raw=decls.get('GUIDE_FIELD_CONFIGS')?.elements?.[0];if(!raw)throw new Error('Template Kampung tidak ditemukan.');
  const snippet=names.map(n=>`const ${n}=${decls.get(n).getText(tree)};`).join('\n')+`const GUIDE_FIELD_CONFIGS=[${raw.getText(tree)}]; const fields=${decls.get('FIELD_CONFIGS').getText(tree)}; result=fields[0];`,ctx={structuredClone,result:null};vm.runInNewContext(ts.transpile(snippet,{target:ts.ScriptTarget.ES2022}),ctx,{timeout:1000});const field=JSON.parse(JSON.stringify(ctx.result));
  const src=await readFile(path.join(root,'lib/field-assets.generated.ts'),'utf8'),at=ts.createSourceFile('atlas.ts',src,ts.ScriptTarget.Latest,true);let atlas;for(const s of at.statements)if(ts.isVariableStatement(s))for(const d of s.declarationList.declarations)if(d.name.getText(at)==='FIELD_OBJECT_ATLAS')atlas=JSON.parse(d.initializer.expression?.getText(at)??d.initializer.getText(at));
  const asset=id=>({asset:'field/objects.webp',width:atlas.width,height:atlas.height,frames:[atlas.assets[id]],fps:12}),points=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}],objects=[];
  for(const [i,o] of field.obstacles.entries()){const visual={id:`obj-visual-${i}`,name:o.asset,asset:asset(o.asset),x:o.x+o.w/2-o.visualW/2,y:o.y+o.h-o.visualH,w:o.visualW,h:o.visualH,rotation:0,opacity:1,layer:'world',z:0,behavior:'decoration',slow:.5,shape:'rect',points,visible:true,locked:false,mirror:!!o.flip};if(!o.hidden&&!o.underlay)objects.push(visual);objects.push({...visual,id:`obj-collider-${i}`,name:'Batas '+o.asset,asset:null,x:o.x,y:o.y,w:o.w,h:o.h,behavior:'parkour'});}
  const meta=await sharp(await readFile(path.join(root,'public/field/kampung-map.webp'))).metadata();
  return {template:{id:'studio-kampung-copy',name:'Kampung Merdeka — salinan',description:'Latar dan footprint Kampung. Beberapa dekorasi menyatu di latar; upload terrain bersih untuk memisahkannya.',width:field.width,height:field.height,enabled:false,terrain:{asset:'field/kampung-map.webp',width:meta.width,height:meta.height,frames:[{x:0,y:0,width:meta.width,height:meta.height}],fps:12},icon:null,terrainMode:'stretch',tileSize:256,objects,bases:field.bases,prisons:Object.fromEntries(Object.entries(field.prisons).map(([t,p])=>[t,{x:p.x,y:p.y,w:p.w,h:p.h}]))},library:Object.keys(atlas.assets).map(id=>({name:id,clip:asset(id)}))};
}
