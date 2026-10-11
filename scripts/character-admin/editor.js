import { previewEntry, previewDefaults, previewStyle } from '/model.js';

const $ = id => document.getElementById(id);
let state, id, entry, dirty = false, working = false;
let uploads = {}, localUrls = {}, imageGeneration = 0;
let logoUpload = null, logoUrl = null, logoDirty = false;
let layerUploads = [], layerUrls = [];
function stopVoiceMix() {
  for (const audio of [$('voicePreview'), ...$('voiceLayers').querySelectorAll('audio')]) { audio.pause(); audio.currentTime = 0; }
}
function renderLayers() {
  stopVoiceMix(); $('voiceLayers').replaceChildren();
  entry.voiceLayers.forEach((layer, index) => {
    const row = document.createElement('section'); row.className = 'voice-layer';
    const title = document.createElement('h4'); title.textContent = `Layer ${index + 1}`; row.append(title);
    const file = document.createElement('input'); file.type = 'file'; file.accept = 'audio/mpeg,.mp3'; file.setAttribute('aria-label', `MP3 layer ${index + 1}`); row.append(file);
    const audio = document.createElement('audio'); audio.controls = true; audio.preload = 'metadata';
    const src = layerUrls[index] || (layer.file ? `/${layer.file}` : null);
    if (src) audio.src = src;
    audio.volume = layer.volume; audio.loop = layer.loop; row.append(audio);
    audio.onerror = () => message(`Suara layer ${index + 1} gagal dimuat. Pilih MP3 yang valid.`);
    const volumeLabel = document.createElement('label'); volumeLabel.textContent = `Volume layer ${index + 1}`;
    const volume = document.createElement('input'); volume.type = 'range'; volume.min = 0; volume.max = 1; volume.step = .05; volume.value = layer.volume;
    volume.oninput = () => { layer.volume = Number(volume.value); audio.volume = layer.volume; markDirty(); }; volumeLabel.append(volume); row.append(volumeLabel);
    for (const [key, text] of [['enabled', 'Aktif'], ['loop', 'Loop']]) {
      const label = document.createElement('label'), checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = layer[key];
      checkbox.onchange = () => { layer[key] = checkbox.checked; if (key === 'loop') audio.loop = layer.loop; else if (!layer.enabled) audio.pause(); markDirty(); };
      label.append(checkbox, ` ${text}`); row.append(label);
    }
    const remove = document.createElement('button'); remove.textContent = 'Hapus layer';
    remove.onclick = () => { stopVoiceMix(); if (layerUrls[index]) URL.revokeObjectURL(layerUrls[index]); entry.voiceLayers.splice(index, 1); layerUrls.splice(index, 1); layerUploads.splice(index, 1); renderLayers(); markDirty(); }; row.append(remove);
    file.onchange = async () => {
      const selected = file.files[0]; if (!selected) return;
      if (!selected.size || selected.size > 10 * 1024 * 1024) { file.value = ''; return message('MP3 layer maksimal 10 MB.'); }
      lock(true);
      try {
        const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(selected); });
        stopVoiceMix(); if (layerUrls[index]) URL.revokeObjectURL(layerUrls[index]);
        layerUrls[index] = URL.createObjectURL(selected); layerUploads[index] = data.split(',')[1]; renderLayers(); markDirty();
        message(`${selected.name}: layer ${index + 1} belum disimpan.`);
      } catch { message('MP3 layer tidak dapat dibaca.'); } finally { lock(false); }
    };
    $('voiceLayers').append(row);
  });
  $('addVoiceLayer').disabled = working || entry.voiceLayers.length >= 4;
}
$('addVoiceLayer').onclick = () => {
  if (entry.voiceLayers.length >= 4) return message('Maksimal 4 layer tambahan.');
  entry.voiceLayers.push({ file: null, volume: .35, enabled: true, loop: true }); layerUploads.push(null); layerUrls.push(null); renderLayers(); markDirty();
};
$('stopVoiceMix').onclick = stopVoiceMix;
$('previewVoiceMix').onclick = async () => {
  stopVoiceMix();
  const layers = [...$('voiceLayers').querySelectorAll('audio')].filter((audio, index) => entry.voiceLayers[index].enabled && audio.getAttribute('src'));
  const outcomes = await Promise.allSettled([$('voicePreview'), ...layers].map(audio => audio.play()));
  if (outcomes.some(outcome => outcome.status === 'rejected')) message('Sebagian suara gagal diputar. Periksa setiap file MP3.');
};
function renderLogo() { $('logoImage').src = logoUrl || (state.document.branding?.logo ? `/${state.document.branding.logo}` : '/brand/benteng-tag-logo.webp'); }
const message = text => { $('status').textContent = text; };
const original = () => `/ui-v2/portraits/${id}.webp`;
function markDirty() { dirty = true; message('Perubahan belum disimpan.'); }
// oxlint-disable-next-line typescript/unbound-method -- URL.revokeObjectURL is static, no this-binding
function clearUploads() { stopVoiceMix(); layerUrls.filter(Boolean).forEach(URL.revokeObjectURL); layerUploads = []; layerUrls = []; Object.values(localUrls).forEach(URL.revokeObjectURL); uploads = {}; localUrls = {}; for (const kind of ['animated', 'static', 'voice']) $(kind).value = ''; }
function renderVoice() {
  stopVoiceMix(); const player = $('voicePreview');
  player.src = localUrls.voice || (entry.voice ? `/${entry.voice}` : `/ui-v2/audio/characters/${id}.mp3`);
  player.volume = .85; player.loop = true; player.load();
  $('voiceStatus').textContent = localUrls.voice ? 'Preview pengganti — belum disimpan.' : entry.voice ? 'Suara pengganti tersimpan.' : 'Suara bawaan game.';
}
$('voicePreview').onerror = () => { $('voiceStatus').textContent = 'Suara gagal dimuat. Periksa file MP3 atau koneksi server.'; };
function controls() {
  for (const key of ['scale', 'x', 'y']) { $(key).value = entry[key]; $(`${key}Number`).value = entry[key]; }
  $('scaleValue').value = `${Math.round(entry.scale * 100)}%`;
}
function transform() {
  Object.assign($('activeImage').style, previewStyle(entry));
  Object.assign($('inactiveImage').style, previewStyle(previewDefaults(id)));
  controls();
}
function render() {
  const generation = ++imageGeneration;
  const still = localUrls.static || (entry.static ? `/${entry.static}` : original());
  const animated = localUrls.animated || (entry.animated ? `/${entry.animated}` : null);
  $('inactiveImage').src = still; $('activeImage').src = still;
  $('inactiveImage').onerror = () => { $('inactiveImage').onerror = null; $('inactiveImage').src = original(); message('Gambar statis gagal dimuat; memakai gambar asli.'); };
  if ($('motion').checked && animated) {
    const image = new Image();
    image.onload = () => { if (generation === imageGeneration) $('activeImage').src = animated; };
    image.onerror = () => { if (generation === imageGeneration) message('Animasi gagal dimuat. Gambar statis tetap ditampilkan.'); };
    image.src = animated;
  }
  transform();
}
function select(next) {
  clearUploads(); id = next; entry = previewEntry(state.document, id); dirty = false;
  const character = state.roster.find(item => item.id === id);
  $('character').value = id; $('team').textContent = character.team === 'red' ? 'Tim Merah' : 'Tim Hijau';
  $('title').textContent = character.name; render(); renderVoice(); renderLayers();
}
async function api(route, data) {
  const response = await fetch(route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': state.token }, body: JSON.stringify(data) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Permintaan gagal.'); return result;
}
function lock(value) { working = value; document.querySelectorAll('button, input, select').forEach(control => { control.disabled = value; }); $('addVoiceLayer').disabled = value || (entry?.voiceLayers.length ?? 0) >= 4; }
$('character').onchange = event => {
  if (dirty && !confirm('Pindah karakter dan buang perubahan yang belum disimpan?')) { $('character').value = id; return; }
  select(event.target.value); message('Konfigurasi tersimpan dimuat.');
};
for (const key of ['scale', 'x', 'y']) for (const element of [$(key), $(`${key}Number`)]) element.oninput = () => {
  const value = Number(element.value);
  if (!element.value || !Number.isFinite(value) || value < Number(element.min) || value > Number(element.max)) return;
  entry[key] = value; transform(); markDirty();
};
for (const kind of ['animated', 'static', 'voice']) $(kind).onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  const limit = kind === 'voice' ? 10 : 20;
  if (!file.size || file.size > limit * 1024 * 1024) { event.target.value = ''; return message(`File harus terisi dan maksimal ${limit} MB.`); }
  lock(true);
  try {
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    if (kind === 'voice') $('voicePreview').pause();
    if (localUrls[kind]) URL.revokeObjectURL(localUrls[kind]);
    uploads[kind] = data.split(',')[1]; localUrls[kind] = URL.createObjectURL(file);
    if (kind === 'voice') renderVoice(); else render();
    markDirty();
    message(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB). Belum disimpan; format diperiksa saat Simpan.`);
  } catch { message('File tidak dapat dibaca.'); } finally { event.target.value = ''; lock(false); }
};
for (const kind of ['animated', 'static', 'voice']) $(`remove${kind[0].toUpperCase() + kind.slice(1)}`).onclick = () => {
  if (kind === 'voice') $('voicePreview').pause();
  if (localUrls[kind]) URL.revokeObjectURL(localUrls[kind]); delete localUrls[kind]; delete uploads[kind]; entry[kind] = null; $(kind).value = '';
  if (kind === 'voice') renderVoice(); else render();
  markDirty();
};
$('reset').onclick = () => { const defaults = previewDefaults(id); Object.assign(entry, { x: 0, y: 0, scale: defaults.scale }); transform(); markDirty(); };
$('revert').onclick = () => { if (!dirty || confirm('Buang perubahan belum disimpan?')) { select(id); message('Kembali ke versi tersimpan.'); } };
$('light').onchange = event => document.body.classList.toggle('light', event.target.checked);
$('motion').onchange = render;
$('save').onclick = async () => {
  lock(true);
  try {
    const latest = await (await fetch('/api/state')).json();
    if (latest.capabilities?.voiceUploads !== 1) throw new Error('Backend studio masih versi lama. Draft tetap ada; jalankan ulang npm run admin:characters sebelum menyimpan.');
    if (latest.capabilities?.voiceLayers !== 1) throw new Error('Backend belum mendukung layer suara. Draft tetap ada. Gunakan studio versi terbaru.');
    if (latest.revision !== state.revision) throw new Error('Konfigurasi berubah di sesi lain. Draft belum dibuang; jangan timpa perubahan tersebut.');
    state.token = latest.token;
    const result = await api('/api/save', { revision: state.revision, id, entry, uploads: { ...uploads, voiceLayers: layerUploads } });
    if (uploads.voice && !result.document.characters[id]?.voice) throw new Error('Server tidak menyimpan suara. Draft tetap dipertahankan.');
    if (result.document.characters[id]?.voiceLayers?.length !== entry.voiceLayers.length) throw new Error('Server tidak menyimpan layer. Draft tetap dipertahankan.');
    Object.assign(state, result); select(id); message('Tersimpan ke proyek lokal. Buka/reload game lokal untuk melihat hasilnya. Belum dipublikasikan.');
  }
  catch (error) { message(error.message); } finally { lock(false); }
};
async function poll() {
  try {
    const response = await fetch('/api/job'); const job = await response.json(); message(job.message);
    if (job.status === 'running') setTimeout(poll, 1500); else lock(false);
  } catch { message('Koneksi panel terputus. Periksa terminal dan status Git sebelum mencoba publish ulang.'); lock(false); }
}
$('publish').onclick = async () => {
  if (dirty || logoDirty) return message('Simpan perubahan karakter dan logo dahulu sebelum publish.');
  if (!confirm('Periksa build, commit konfigurasi/aset preview, lalu push ke GitHub main?')) return;
  lock(true);
  try { await api('/api/publish', { revision: state.revision }); message('Publikasi dimulai…'); void poll(); }
  catch (error) { message(error.message); lock(false); }
};
let drag;
$('stage').onpointerdown = event => {
  if (working) return;
  drag = { px: event.clientX, py: event.clientY, x: entry.x, y: entry.y }; $('stage').setPointerCapture(event.pointerId);
};
$('stage').onpointermove = event => {
  if (!drag) return; const rect = $('stage').getBoundingClientRect();
  entry.x = Math.round(Math.max(-50, Math.min(50, drag.x + (event.clientX - drag.px) / rect.width * 100)) * 10) / 10;
  entry.y = Math.round(Math.max(-50, Math.min(50, drag.y + (event.clientY - drag.py) / rect.height * 100)) * 10) / 10;
  transform(); markDirty();
};
$('stage').onpointerup = $('stage').onpointercancel = () => { drag = null; };
$('stage').onkeydown = event => {
  if (working || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  event.preventDefault(); const key = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 'x' : 'y';
  entry[key] = Math.max(-50, Math.min(50, entry[key] + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1)));
  transform(); markDirty();
};
window.addEventListener('beforeunload', event => { if (dirty || logoDirty || working) { event.preventDefault(); } });
$('logoFile').onchange = async event => {
  const file = event.target.files[0]; if (!file) return;
  if (file.size > 20 * 1024 * 1024) { event.target.value = ''; return message('Logo melebihi 20 MB.'); }
  lock(true);
  try {
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoUpload = data.split(',')[1]; logoUrl = URL.createObjectURL(file); logoDirty = true; renderLogo();
    $('logoStatus').textContent = `${file.name}: belum disimpan.`;
  } catch { message('Logo tidak dapat dibaca.'); } finally { lock(false); }
};
async function saveLogo(upload) {
  lock(true);
  try {
    Object.assign(state, await api('/api/logo', { revision: state.revision, upload }));
    if (logoUrl) URL.revokeObjectURL(logoUrl);
    logoUrl = null; logoUpload = null; logoDirty = false; $('logoFile').value = ''; renderLogo();
    $('logoStatus').textContent = 'Logo tersimpan lokal. Publish untuk menerapkannya ke situs publik.';
    message('Logo tersimpan. Pengaturan karakter tetap dipertahankan.');
  } catch (error) { message(error.message); } finally { lock(false); }
}
$('saveLogo').onclick = () => { if (!logoDirty) return message('Pilih file logo terlebih dahulu.'); void saveLogo(logoUpload); };
$('resetLogo').onclick = () => { if (confirm('Kembalikan logo landing bawaan? Aset lama tetap tersimpan.')) void saveLogo(null); };
try {
  const response = await fetch('/api/state'); state = await response.json();
  if (!response.ok) throw new Error(state.error);
  for (const character of state.roster) { const option = new Option(character.name, character.id); $('character').add(option); }
  if (state.capabilities?.voiceUploads !== 1) throw new Error('Backend studio masih versi lama. Jalankan ulang npm run admin:characters.');
  if (state.capabilities?.voiceLayers !== 1) throw new Error('Backend masih versi satu suara. Buka studio terbaru untuk mengedit layer.');
  select(state.roster[0].id); renderLogo(); message('Siap. Pilih karakter lalu upload gambar, animasi, atau suara MP3.');
  if (state.job.status === 'running') { lock(true); void poll(); }
} catch (error) { message(`Panel gagal dimuat: ${error.message}`); lock(true); }
