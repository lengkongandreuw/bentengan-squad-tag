// Local runtime selection rules, not a claim about an older published build.
export const mapActive = m => !!m?.enabled && !m.archived && !m.deleted;
export function mapVersions(document, builtins, templates, showHidden = false) {
  const entries=[];
  for(const b of builtins){
    const saved=document.maps.find(m=>m.replaces===b.id),state=document.builtinStates?.[b.id]??'active';
    const active=state==='active'&&!mapActive(saved),source=templates.find(m=>m.replaces===b.id);
    if(active || showHidden || state==='active')entries.push({value:'builtin:'+b.id,kind:'native',readOnly:true,active,
      group:active?'Aktif di konfigurasi lokal':'Versi asli / arsip',
      label:`[${active?'Aktif lokal · Asli':state==='deleted'?'Sampah · Asli':state==='archived'?'Arsip · Asli':'Asli · Tidak dipakai'}] ${b.name}${b.editable?'':' · 3D (daftar saja)'}`,
      map:source?{...source,enabled:active}:null});
  }
  for(const m of document.maps){
    if(!showHidden&&(m.archived||m.deleted))continue;
    if(mapActive(m))entries.push({value:'live:'+m.id,kind:'saved',readOnly:true,active:true,
      group:'Aktif di konfigurasi lokal',label:`[Aktif lokal · Editor] ${m.name}`,map:m});
    entries.push({value:m.id,kind:'saved',readOnly:false,active:mapActive(m),group:'Draft / versi editor untuk diedit',
      label:`[${m.deleted?'Sampah':m.archived?'Arsip':mapActive(m)?'Edit versi aktif lokal':'Draft nonaktif'}] ${m.name}${m.replaces?' · pengganti '+m.replaces:''}`,map:m});
  }
  return entries;
}
