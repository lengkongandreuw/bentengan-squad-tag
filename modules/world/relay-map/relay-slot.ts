import {validateDocument,type StudioMap} from '../../../lib/map-studio-model.js';
import {createGarduPrototype,GARDU_PROTOTYPE_ID,GARDU_FUTURE_SLOT} from './relay-layout.ts';
import {isRelayPrototypeMap} from './relay-prototype-visuals.js';

/** Explicit phase07 adoption; preserves old artwork/geometry and progression aliases. */
export function activateGarduSlot(document:Parameters<typeof validateDocument>[0]){
  const next=validateDocument(document),existing=next.maps.find(m=>m.id===GARDU_PROTOTYPE_ID);
  if(existing&&!isRelayPrototypeMap(existing))throw Error('Gardu ID is already used by another map. Resolve it before activation.');
  const gardu:StudioMap={...(existing??createGarduPrototype()),enabled:true,replaces:GARDU_FUTURE_SLOT,
    description:'Tiga jalur. Aktifkan Power Relay untuk membuka jalan pintas tengah—kedua tim bisa lewat.'};
  delete gardu.archived;delete gardu.deleted;
  next.maps=next.maps.map(m=>m.id===gardu.id?gardu:m.replaces===GARDU_FUTURE_SLOT?{...m,enabled:false}:m);
  if(!existing)next.maps.push(gardu);
  next.builtinStates={...next.builtinStates,[GARDU_FUTURE_SLOT]:'active'};
  return validateDocument(next);
}
