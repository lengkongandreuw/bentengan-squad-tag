import {DIRECTIONS,SLOTS,slotAllowed,isFlightSlot,slotLoop,validateClip,validateBoostDust} from './sprite-studio-model.js';
export const BATCH_FIELDS=['scale','fps','x','y','pivotX','pivotY','mirror','loop'];
/** Only this character's custom clips/drafts; never manufacture a legacy/global asset. */
export function batchTargets({characters,drafts={},character,action,scope='action'}){
  const saved=characters[character]??{},pending=drafts[character]??{};
  const own=s=>Object.hasOwn(pending,s)?pending[s].clip:saved[s];
  const slots=scope==='character'?SLOTS.filter(s=>(s.split('.')[0]==='boost_dust')===(action==='boost_dust')&&(Object.hasOwn(saved,s)||Object.hasOwn(pending,s))):[action,...DIRECTIONS.map(d=>`${action}.${d}`)];
  return slots.filter(s=>slotAllowed(character,s)).map(slot=>{
    const explicit=Object.hasOwn(pending,slot)||Object.hasOwn(saved,slot),base=slot.split('.')[0];
    const clip=explicit?own(slot):own(base),source=Object.hasOwn(pending,slot)?'draft':explicit?'saved':clip?'inherited':'missing';
    return {slot,clip:clip??null,source};
  });
}
/** Pure atomic plan. Assets, frames, other properties/slots/characters stay untouched. */
export function planBatchEdit(context,slots,fields){
  if(!Array.isArray(slots)||!slots.length||slots.length>SLOTS.length||new Set(slots).size!==slots.length)throw Error('Pilih slot yang akan diedit.');
  const keys=Object.keys(fields??{});if(!keys.length||keys.some(k=>!BATCH_FIELDS.includes(k)))throw Error('Pilih properti yang akan diubah.');
  for(const key of keys){const {mode,value}=fields[key]??{};
    const modes=key==='scale'?['set','multiply']:['x','y'].includes(key)?['set','add']:['set'];
    if(!modes.includes(mode)||(['mirror','loop'].includes(key)?typeof value!=='boolean':typeof value!=='number'||!Number.isFinite(value)))throw Error(`Nilai ${key} tidak valid.`);
    if(key==='scale'&&mode==='multiply'&&value<=0)throw Error('Pengali skala harus positif.');
    if(key==='fps'&&!Number.isInteger(value))throw Error('FPS harus bilangan bulat 1–60.');
  }
  const targets=new Map(batchTargets(context).map(t=>[t.slot,t])),changes={},rows=[];
  for(const slot of slots){const target=targets.get(slot);if(!target?.clip)throw Error(`${slot}: belum ada sprite custom, atau sedang dihapus.`);
    const before=structuredClone(target.clip),after=structuredClone(before);
    for(const key of keys){const {mode,value}=fields[key];after[key]=mode==='multiply'?Math.round(before[key]*value*1e6)/1e6:mode==='add'?Math.round((before[key]+value)*1e6)/1e6:value;}
    if(isFlightSlot(slot)||['boost_dust','ultimate_cast'].includes(slot.split('.')[0]))after.loop=slotLoop(slot);
    const valid=validateClip(after,context.character);if(slot.split('.')[0]==='boost_dust')validateBoostDust(valid);
    const changed=keys.some(k=>before[k]!==valid[k]);
    rows.push({slot,source:target.source,before,after:valid,changed});if(changed)changes[slot]=valid;
  }
  return {changes,rows,fields:keys};
}
