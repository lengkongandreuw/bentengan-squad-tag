/** Organize existing controls without replacing their IDs, handlers or draft model. */
export function createWorkbench({getContext,onReviewAll}){
  const $=id=>document.getElementById(id),inspector=document.querySelector('.sprite-inspector'),advanced=$('advanced'),settings=$('settings');
  inspector.insertBefore(settings,advanced);settings.after($('bulkEditor'));advanced.open=false;advanced.querySelector('summary').textContent='File, crop numerik & alat lanjutan';
  const hint=document.createElement('p');hint.className='inspector-hint';hint.textContent='Atur tampilan di sini. Perubahan menjadi draft, bukan langsung masuk game. Collider dan kemampuan tidak berubah.';inspector.prepend(hint);
  const gallery=document.querySelector('.sprite-workspace>.compare-link');gallery.hidden=true;
  const shortcuts=document.querySelector('.view-tools>small');const keyboardHelp=document.createElement('p');keyboardHelp.textContent=shortcuts.textContent+' · Ctrl/Cmd+S: simpan arah · Ctrl/Cmd+Shift+S: simpan pilihan.';advanced.append(keyboardHelp);shortcuts.hidden=true;
  const preview=$('preview'),timeline=preview.nextElementSibling,playbackHint=timeline.nextElementSibling;
  if(playbackHint?.tagName==='P'){playbackHint.hidden=true;$('quickFps').title=playbackHint.textContent;}
  const fpsLabel=$('quickFps').closest('label');fpsLabel.firstChild.textContent='FPS ';fpsLabel.classList.add('quick-fps-label');
  const viewport=document.createElement('div');viewport.className='preview-viewport';preview.before(viewport);viewport.append(preview);
  const scaleLabel=$('scale').closest('label');scaleLabel.classList.add('scale-property');
  const slider=document.createElement('input');slider.type='range';slider.id='scaleRange';slider.min='.1';slider.max='4';slider.step='.01';slider.setAttribute('aria-label','Slider skala arah aktif');scaleLabel.append(slider);
  const nudges=document.createElement('div');nudges.className='scale-nudges';
  for(const [id,label,factor]of [['scaleDown','−5%',.95],['scaleUp','+5%',1.05],['scaleReset','Reset 1×',0]]){const button=document.createElement('button');button.id=id;button.type='button';button.textContent=label;button.onclick=()=>{const value=factor?Number($('scale').value)*factor:1;$('scale').value=String(Math.min(4,Math.max(.1,Math.round(value*10000)/10000)));$('scale').dispatchEvent(new Event('input',{bubbles:true}));};nudges.append(button);}scaleLabel.append(nudges);
  slider.oninput=()=>{$('scale').value=slider.value;$('scale').dispatchEvent(new Event('input',{bubbles:true}));};
  const upload=document.createElement('details');upload.id='uploadOptions';const summary=document.createElement('summary');summary.textContent='Ganti file sprite / upload';upload.append(summary);
  const fileLabel=$('files').closest('label'),first=fileLabel.previousElementSibling,nodes=[];for(let n=first;n;){const next=n.nextElementSibling;nodes.push(n);if(n===$('compile'))break;n=next;}first.before(upload);upload.append(...nodes);
  $('compile').textContent='Proses file → preview';$('save').textContent='Pilih draft arah ini untuk disimpan';$('applyCurrent').textContent='Simpan arah aktif';$('saveCharacter').textContent='Simpan draft terpilih';
  $('settings').querySelector('legend').textContent='Tampilan arah aktif';
  const batch=$('batchList').parentElement;batch.querySelector('h2').textContent='Draft belum disimpan';batch.insertBefore($('save'),$('batchSummary'));
  const batchHint=batch.querySelector(':scope>p:last-child');if(batchHint)batchHint.textContent='Centang hanya draft yang ingin disimpan. Karakter lain tidak ikut berubah.';
  const bulkHint=$('bulkEditor').querySelector('p');bulkHint.textContent='Pilih target dan properti. Sprite/frame tidak diganti. Hasil masuk draft terpilih; simpan melalui bilah bawah.';
  const choices=document.createElement('div');choices.className='draft-select-tools';for(const [id,label,value]of [['reviewAllDrafts','Pilih semua draft',true],['clearDraftReview','Lepas pilihan',false]]){const button=document.createElement('button');button.type='button';button.id=id;button.textContent=label;button.onclick=()=>onReviewAll(value);choices.append(button);}batch.insertBefore(choices,$('batchList'));
  const release=document.createElement('details');release.id='releaseTools';const rs=document.createElement('summary');rs.textContent='Build & publikasi (opsional)';release.append(rs,$('build'),$('publish'));advanced.append(release);
  const footer=document.createElement('footer');footer.className='studio-savebar';const status=document.createElement('p');status.id='draftSaveState';status.setAttribute('role','status');status.setAttribute('aria-live','polite');const actions=document.createElement('div');actions.className='studio-save-actions';actions.append($('applyCurrent'),$('saveCharacter'));footer.append(status,actions);document.body.append(footer);
  document.querySelector('body>header p').textContent='1 Pilih sprite   →   2 Atur & bandingkan   →   3 Simpan draft';
  const link=document.querySelector('body>header>a');link.href='/comparison';link.textContent='Galeri animasi tersimpan ↗';
  document.addEventListener('keydown',e=>{if(e.defaultPrevented||e.isComposing||e.altKey||document.hidden||getContext().active===false||!(e.ctrlKey||e.metaKey)||e.key.toLowerCase()!=='s')return;e.preventDefault();const button=e.shiftKey?$('saveCharacter'):$('applyCurrent');if(!e.repeat&&!button.disabled)button.click();});
  function refresh(){const c=getContext();if(!c.character)return;const entries=Object.entries(c.drafts[c.character]??{}),selected=entries.filter(([s,v])=>v.reviewed&&!(c.pending&&s===c.slot)).length;
    const other=Object.entries(c.drafts).filter(([id])=>id!==c.character).reduce((n,[,d])=>n+Object.keys(d).length,0);
    const text=c.processing?'Memproses… tunggu sampai selesai.':c.pending?'Upload/crop belum diproses. Klik Proses file sebelum menyimpan.':entries.length?`${c.name}: ${entries.length} draft belum disimpan · ${selected} terpilih${other?` · ${other} draft di karakter lain`:''}.`:`${c.name}: tidak ada draft. Perubahan tersimpan hanya berlaku di game lokal.`;
    if(status.textContent!==text)status.textContent=text;footer.dataset.state=c.pending?'upload':entries.length?'draft':'saved';
    $('saveCharacter').textContent=`Simpan ${selected} draft terpilih`;$('saveCharacter').classList.toggle('primary',selected>0);$('applyCurrent').classList.toggle('primary',selected===0);
    slider.disabled=c.processing||!c.clip;for(const button of nudges.children)button.disabled=slider.disabled;
    if(c.clip&&Number.isFinite(c.clip.scale))slider.value=String(c.clip.scale);
    $('compile').disabled=c.processing||!c.canCompile;for(const b of choices.children)b.disabled=c.processing||!entries.length;
  }
  return {refresh,onView(view){if(view==='source'){upload.open=true;advanced.open=true;}},openUpload(){upload.open=true;}};
}
