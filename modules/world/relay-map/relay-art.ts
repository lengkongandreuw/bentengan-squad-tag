import {validateMap,type StudioMap,type MapAsset} from '../../../lib/map-studio-model.js';
type Art={terrain:MapAsset;atlas:{asset:string;width:number;height:number};frames:Record<string,{x:number;y:number;width:number;height:number}>};
/** Appearance only. Original coordinates, collision, rules and identity are preserved. */
export function applyGarduArt(source:StudioMap,art:Art):StudioMap{
  const map=structuredClone(source);
  const asset=(name:string):MapAsset=>{const frame=art.frames[name];if(!frame)throw Error('Missing Gardu frame '+name);return {...art.atlas,frames:[{...frame}],fps:1};};
  map.terrain=structuredClone(art.terrain);
  for(const o of map.objects){
    const id=o.id;let name:string|undefined;
    if(id==='obj-relay-plaza')name='plaza';
    else if(id.startsWith('obj-power-gate-')){name='gateClosed';o.openAsset=asset('gateOpen');}
    else if(/^obj-power-relay-node-[abc]$/.test(id))name='node';
    else if(id.startsWith('obj-relay-wall-'))name='wallHorizontal';
    else if(/^obj-relay-(west|east)-wall-/.test(id))name='wallVertical';
    else if(id.startsWith('obj-relay-outer-'))name=id.includes('south')?'blockVents':'block';
    else if(id.startsWith('obj-relay-parkour-'))name='rail';
    else if(id.startsWith('obj-relay-approach-'))name='barrier';
    else if(id.startsWith('obj-relay-prison-cover-'))name='cover';
    if(name)o.asset=asset(name);
  }
  for(const team of ['blue','red'] as const){
    const base=map.bases[team],prison=map.prisons[team],size=(map.baseRadius??68)*2;
    base.visual={asset:asset(team==='blue'?'fortRed':'fortGreen'),w:size,h:size,offsetX:-size/2,offsetY:-size/2,rotation:0,opacity:1,mirror:false,visible:true};
    prison.floorVisual={asset:asset(team==='blue'?'prisonRed':'prisonGreen'),w:prison.w,h:prison.h,offsetX:0,offsetY:0,rotation:0,opacity:1,mirror:false,visible:true};
  }
  return validateMap(map);
}
