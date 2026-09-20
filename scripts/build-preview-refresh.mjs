import sharp from 'sharp';

// Targeted refresh; also runs after the main UI generator so source rebuilds
// cannot silently restore the old portraits or bisect the red-team crown.
for (const id of ['boke', 'kodo']) {
  await sharp(`asset-inbox/2026-09-20-preview-refresh/${id}.png`)
    .trim({background:{r:0,g:0,b:0,alpha:0}})
    .resize({width:400,height:600,fit:'inside'})
    .webp({quality:82,alphaQuality:96,effort:5})
    .toFile(`public/ui-v2/portraits/${id}.webp`);
}
const source='asset-inbox/2026-09-01-ui-refresh-v3/buttons/button tim merah.png';
for(const [state,top,height] of [['normal',0,466],['active',466,558]]) {
  const crop=await sharp(source).extract({left:0,top,width:782,height}).png().toBuffer();
  await sharp(crop).trim({background:{r:0,g:0,b:0,alpha:0}})
    .extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}})
    .resize({width:720,height:360,fit:'inside'})
    .webp({quality:84,alphaQuality:96,effort:5})
    .toFile(`public/ui-v2/controls/team-red-${state}.webp`);
}
console.log('Boke/Kodo previews and complete red-team normal/active logos rebuilt.');
