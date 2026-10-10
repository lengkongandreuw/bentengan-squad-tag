import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {FieldSelectScreen} from '../../modules/ui/field-select-screen';
import type {FieldConfig,FieldId} from '../../modules/world/map-data/field-types';
import '../../app/globals.css';

// Isolated presentation fixtures, never profile/storage/progression mutations.
const fields=Array.from({length:8},(_,index)=>({
  id:`studio-qa-${index}`,name:index===7?'Workshop Arena With A Very Long Custom Name To Inspect':'Arena QA '+index,
  difficulty:'normal',kicker:'Presentation fixture: long descriptions can be read without moving or clipping the start button.',
})) as unknown as FieldConfig[];
const base=new URL('../../',window.location.href).pathname;
function Fixture(){
  const [selected,setSelected]=useState<FieldId>(fields[0].id);
  return <div className="pregame-shell"><FieldSelectScreen faction={null} selectedFieldId={selected}
    fields={fields} squad={['raja','robot','jago','lala','kumis']}
    arenaStates={fields.map(field=>({id:field.id,unlocked:true,requirement:''}))}
    resolveAsset={file=>`${base}ui-v2/${file.startsWith('fields/studio-')?'fields/taman.webp':file}`}
    onSelect={setSelected} onStep={direction=>setSelected(fields[(fields.findIndex(f=>f.id===selected)+direction+fields.length)%fields.length].id)}
    onStart={()=>{document.body.dataset.started='true';}}/></div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
