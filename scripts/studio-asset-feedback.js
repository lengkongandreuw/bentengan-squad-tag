const mib=n=>`${(n/1048576).toFixed(2)} MiB`;
export function showOptimization(host,report){
  host.replaceChildren();if(!report)return;
  const title=document.createElement('strong');title.textContent='Upload terakhir · otomatis dioptimalkan';host.append(title);
  const summary=document.createElement('p');summary.textContent=`${report.sourceFrame.width} × ${report.sourceFrame.height} → ${report.outputFrame.width} × ${report.outputFrame.height} px per frame · ${report.frames} frame tetap utuh.`;host.append(summary);
  const memory=document.createElement('p');memory.textContent=`Perkiraan tekstur RGBA: ${mib(report.beforeRGBA)} → ${mib(report.afterRGBA)}. File hasil: ${mib(report.outputBytes)}.`;host.append(memory);
  const details=document.createElement('details'),label=document.createElement('summary');label.textContent='Detail & lokasi file asli';details.append(label);
  const note=document.createElement('p');note.textContent=`${report.profile}. ${report.resized?'Resolusi disesuaikan; periksa ketajaman pada preview.':'Resolusi tidak diturunkan.'} Hasil menyertakan padding transparan untuk sampling. WebP lossless; pengaturan FPS tidak diubah oleh optimasi. ${report.uniqueFrames} gambar unik; frame berulang berbagi tekstur. MiB adalah estimasi RGBA, bukan pengukuran RAM/FPS perangkat.`;details.append(note);
  for(const source of report.sources??[]){const p=document.createElement('p');p.textContent=`Asli lokal: ${source.name} · ${source.path}`;details.append(p);}
  for(const warning of report.warnings??[]){const p=document.createElement('p');p.textContent=warning;details.append(p);}
  host.append(details);host.className='asset-optimization-report';
}
export function showTextureBudget(host,assets,limits){
  const unique=new Map(assets.filter(Boolean).map(a=>[a.asset,a])),bytes=[...unique.values()].reduce((n,a)=>n+a.width*a.height*4,0);
  const level=bytes>limits.limit?'over':bytes>limits.warning?'warning':'ok';
  host.dataset.level=level;
  host.textContent=`${level==='ok'?'Anggaran gambar':'Perlu perhatian'} · ${unique.size} tekstur unik · ~${mib(bytes)} RGBA. ${level==='over'?'Di atas batas; penambahan beban baru akan ditolak saat Simpan.':level==='warning'?'Mendekati batas. Gunakan kembali aset yang sama bila memungkinkan.':'Masih dalam anggaran.'} Estimasi aset custom, bukan seluruh memori game.`;
}
