export function builtinPreviews(maps=[]) {
  const result={boot:{label:'Memuat game…'},profile:{label:'Memuat profil pemain…'},multiplayer:{label:'Memuat panel multiplayer…'},'multiplayer-connection':{label:'Menghubungkan ke host…'}};
  for(const team of ['red','green'])result[`character-${team}`]={asset:`arena-ui/${team}-loading.webp`,kind:'image',fit:'cover',team,label:'MENYIAPKAN KARAKTER'};
  const arena=id=>({asset:`arena-ui/${id==='kanal2'?'kanal':id==='kampung3d'?'kampung':id}.webp`,video:`arena-ui/${id==='kanal2'?'kanal':id==='kampung3d'?'kampung':id}.mp4`,kind:'image',fit:'cover',label:'MENYIAPKAN PERTANDINGAN'});
  for(const id of ['pasar','taman','kanal','kanal2','kampung','kampung3d'])result[`match:${id}`]=arena(id);
  for(const m of maps){
    const asset=m.icon?.asset??(!m.replaces&&m.terrain?.frames?.length===1?m.terrain.asset:null)??`ui-v2/fields/${m.replaces??'kampung'}.webp`;
    result[`match:${m.id}`]={...arena('kampung'),asset};
  }
  return result;
}
