export const LOADING_SLOTS = Object.freeze({boot:'Awal game', 'character-red':'Karakter · Tim Merah', 'character-green':'Karakter · Tim Hijau', match:'Pertandingan · default semua map', multiplayer:'Panel multiplayer', 'multiplayer-connection':'Multiplayer · koneksi / konfirmasi host', profile:'Panel profil'});
export const mediaPath = value => typeof value==='string' && /^loading-media\/[a-f0-9]{64}\.(png|jpg|gif|webp|avif|mp4|webm|ogv)$/.test(value);
export const validSlot = value => Object.hasOwn(LOADING_SLOTS,value) || typeof value==='string' && /^match:[a-z0-9-]{1,100}$/.test(value);
export function validateLoadingMedia(value) {
  if(!value || value.version!==1 || !value.slots || typeof value.slots!=='object' || Array.isArray(value.slots))throw new Error('Konfigurasi loading tidak valid.');
  const slots={};
  for(const [key,entry] of Object.entries(value.slots)) {
    if(!validSlot(key) || !entry || !mediaPath(entry.asset) || !['image','video'].includes(entry.kind) || !['contain','cover'].includes(entry.fit))throw new Error('Slot/media loading tidak valid.');
    if((entry.kind==='video')!==/\.(mp4|webm|ogv)$/.test(entry.asset))throw new Error('Jenis media tidak cocok.');
    if(entry.preserveProgress!==undefined&&typeof entry.preserveProgress!=='boolean')throw new Error('Mode wallpaper tidak valid.');
    slots[key]={asset:entry.asset,kind:entry.kind,fit:entry.fit,...(entry.preserveProgress!==undefined?{preserveProgress:entry.preserveProgress}:{})};
  }
  return {version:1,slots};
}
export function resolveLoadingMedia(document,slot,arenaId) {
  return (slot==='match' && arenaId && document.slots[`match:${arenaId}`]) || document.slots[slot] || null;
}
export function usesBuiltinProgress(media) { return !media || media.preserveProgress===true; }
export function loadingBootHtml(html,document) {
  const media=validateLoadingMedia(document).slots.boot;
  if(!media)return html;
  const src=`/bentengan-squad-tag/${media.asset}`;
  const element=media.kind==='video'?`<video src="${src}" autoplay muted loop playsinline preload="metadata"></video>`:`<img src="${src}" alt="" />`;
  return html.replace('<div id="root"></div>',`<div id="root"><div role="status" aria-busy="true" style="position:fixed;inset:0;background:#101812;color:white;display:grid;place-items:center"><div aria-hidden="true" style="position:absolute;inset:0">${element}</div><p style="position:relative;background:#101812cc;padding:16px">Memuat game…</p></div></div><style>#root>div[aria-busy] img,#root>div[aria-busy] video{width:100%;height:100%;object-fit:${media.fit}}</style>`);
}
