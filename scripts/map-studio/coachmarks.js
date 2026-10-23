/** Keep real help nodes/IDs alive: counters and dynamic descriptions still update. */
export function installMapCoachmarks(doc=document){
  const handled=new WeakSet(),groups=new WeakMap(),records=new Set();let sequence=0,queued=false;
  const controls={objectName:'Nama objek',width:'Lebar dunia',height:'Tinggi dunia',behavior:'Perilaku',shape:'Bentuk batas',layer:'Layer',fps:'FPS animasi',x:'Posisi X',y:'Posisi Y',w:'Lebar',h:'Tinggi'};
  function group(anchor,title){
    if(groups.has(anchor))return groups.get(anchor);
    const trigger=doc.createElement('button');trigger.type='button';trigger.className='coach-trigger';trigger.textContent='?';trigger.dataset.studioHelp='true';
    trigger.setAttribute('aria-label',`Bantuan: ${title}`);trigger.setAttribute('aria-expanded','false');
    const popup=doc.createElement('div');popup.className='coach-popover';popup.id=`map-coach-${++sequence}`;popup.setAttribute('popover','auto');popup.setAttribute('role','dialog');popup.setAttribute('aria-label',title);
    trigger.setAttribute('aria-controls',popup.id);
    const heading=doc.createElement('strong');heading.textContent=title;
    const close=doc.createElement('button');close.type='button';close.className='coach-close';close.textContent='Tutup';
    const body=doc.createElement('div');popup.append(heading,close,body);doc.body.append(popup);
    if(anchor.tagName==='LABEL'){
      const wrapper=doc.createElement('div');wrapper.className='coach-field';anchor.before(wrapper);wrapper.append(anchor,trigger);
    }else if(['H2','H3','SUMMARY'].includes(anchor.tagName)){anchor.append(trigger);}
    else anchor.before(trigger);
    const native=typeof popup.showPopover==='function';if(!native)popup.hidden=true;
    const isOpen=()=>native?popup.matches(':popover-open'):!popup.hidden;
    const hide=()=>{if(native&&isOpen())popup.hidePopover();else popup.hidden=true;trigger.setAttribute('aria-expanded','false');};
    trigger.onclick=event=>{
      event.preventDefault();event.stopPropagation();
      if(isOpen()){hide();return;}
      if(native)popup.showPopover();else popup.hidden=false;
      const rect=trigger.getBoundingClientRect(),box=popup.getBoundingClientRect(),win=doc.defaultView;
      popup.style.left=Math.max(8,Math.min(rect.left,win.innerWidth-box.width-8))+'px';
      popup.style.top=Math.max(8,Math.min(rect.bottom+6,win.innerHeight-box.height-8))+'px';
      trigger.setAttribute('aria-expanded','true');close.focus({preventScroll:true});
    };
    close.onclick=()=>{hide();if(trigger.isConnected)trigger.focus({preventScroll:true});};
    trigger.addEventListener('keydown',e=>e.stopPropagation());
    popup.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();hide();if(trigger.isConnected)trigger.focus({preventScroll:true});}});
    popup.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(isOpen())));
    const record={anchor,trigger,popup,body};groups.set(anchor,record);records.add(record);return record;
  }
  function attach(source,anchor,title){
    if(!source||!anchor||handled.has(source))return;
    handled.add(source);group(anchor,title).body.append(source);
  }
  function headingFor(source){
    const previous=source.previousElementSibling;
    if(previous?.tagName==='LABEL')return previous;
    const scope=source.closest('details,section,.terrain-tools')??source.parentElement;
    return scope.querySelector(':scope>summary,:scope>h2,:scope>h3')??source;
  }
  function scan(){
    queued=false;
    for(const record of records)if(!record.trigger.isConnected){record.popup.remove();records.delete(record);groups.delete(record.anchor);}
    const name=doc.getElementById('objectName')?.closest('label');
    for(const id of ['objectNameHelp','objectNameCount'])attach(doc.getElementById(id),name,'Nama objek');
    const optim=doc.getElementById('assetOptimization');
    if(optim&&!handled.has(optim))attach(optim,doc.getElementById('file')?.closest('label'),'Hasil optimasi upload');
    for(const source of doc.querySelectorAll('main>aside p, main>aside small, .workspace>p.hint, #hint, .workspace>.legend')){
      if(handled.has(source)||source.closest('.coach-popover')||!source.textContent.trim())continue;
      if(source.matches('.warning,[role="alert"],#nothing,#libraryStatus,#autoFixSummary')||source.closest('#replacementBanner,#drawingTools,#testingTools'))continue;
      if(source.id==='textureBudget'){
        const row=doc.createElement('div');row.className='coach-budget-label';row.textContent='Anggaran gambar';source.before(row);attach(source,row,'Anggaran gambar');
        // attach places a generic trigger before the row; keep them in one row.
        const record=groups.get(row);row.append(record.trigger);continue;
      }
      const anchor=source.closest('.workspace')?doc.querySelector('.workspace .quick-tools')??source:headingFor(source);
      const title=controls[anchor.querySelector?.('input,select')?.id]??(anchor.matches('h2,h3,summary')?anchor.textContent.replaceAll('?','').trim():'Bantuan panel');
      attach(source,anchor,title);
    }
  }
  scan();
  const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(scan);}});observer.observe(doc.body,{subtree:true,childList:true,characterData:true});
  return ()=>{observer.disconnect();for(const r of records){r.trigger.remove();r.popup.remove();}records.clear();};
}
