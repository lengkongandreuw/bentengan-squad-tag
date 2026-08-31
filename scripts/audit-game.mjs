import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const failures = [];
const pass = message => console.log(`✓ ${message}`);
const assert = (condition, message) => condition ? pass(message) : failures.push(message);
const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const rules = await readJson('config/game-rules.json');
const manifest = await readJson('public/characters/manifest.json');
const charactersSource = await readFile(path.join(root, 'lib/characters.ts'), 'utf8');
const prototypeSource = await readFile(path.join(root, 'app/prototype.tsx'), 'utf8');
const ids = [...charactersSource.matchAll(/\{ id: '([a-z]+)', name:/g)].map(match => match[1]);
const teamIds = Object.values(rules.teams).flatMap(team => team.roster);

assert(rules.matchSize === 5, 'format pertandingan tetap 5v5');
assert(Object.keys(rules.teams).join(',') === 'red,green', 'hanya Tim Merah dan Tim Hijau yang tersedia');
assert(rules.teams.red.roster.join(',') === 'raja,robot,jago,lala,kumis,tui', 'roster Tim Merah sesuai spesifikasi');
assert(rules.teams.green.roster.join(',') === 'ciici,kaka,buto,maria,boke,lui', 'roster Tim Hijau sesuai spesifikasi');
assert(new Set(teamIds).size === 12 && teamIds.length === 12, 'dua roster berisi 12 karakter tanpa duplikat');
assert(ids.length === 12 && ids.every(id => teamIds.includes(id)), 'definisi karakter dan roster tim sinkron');
assert(manifest.version === 4 && manifest.characters.length === 12, 'manifest sprite v4 memuat 12 karakter');
assert(manifest.atlas.width === 1536 && manifest.atlas.height === 1344 && manifest.atlas.rows === 6, 'atlas produksi konsisten 8×6');

const offsets = rules.spawnOffsets;
let minimumSpawnDistance = Infinity;
for (let i = 0; i < offsets.length; i++) for (let j = i + 1; j < offsets.length; j++) {
  minimumSpawnDistance = Math.min(minimumSpawnDistance, Math.hypot(offsets[i].x - offsets[j].x, offsets[i].y - offsets[j].y));
}
assert(offsets.length === 5 && minimumSpawnDistance >= 42, `formasi spawn aman dari tumpukan (${minimumSpawnDistance.toFixed(1)} px)`);
assert(rules.boostKey === 'space' && rules.boostDurationMs >= 1000 && rules.boostDurationMs <= 2000, 'sprint Space memiliki durasi terbatas yang valid');
assert(rules.parkourKey === 'shift', 'parkour dipindahkan ke Shift');
assert(prototypeSource.includes("const boostKey = keys.current.has(' ')") && prototypeSource.includes("const parkourKey = keys.current.has('shift')"), 'implementasi kontrol mengikuti konfigurasi Space/Shift');
assert(!prototypeSource.includes('Shift untuk boost') && !prototypeSource.includes('Space di dekat rintangan'), 'tidak ada petunjuk kontrol lama yang tertinggal');

const logo = await sharp(path.join(root, 'public/brand/benteng-tag-logo.png')).metadata();
assert((logo.width ?? 0) >= 1200 && (logo.height ?? 0) >= 500 && logo.hasAlpha, 'logo judul resolusi tinggi dan transparan');

for (const id of ids) {
  const atlasPath = path.join(root, `public/characters/${id}/atlas.webp`);
  const portraitPath = path.join(root, `public/characters/${id}/portrait.webp`);
  await stat(atlasPath); await stat(portraitPath);
  const atlasMeta = await sharp(atlasPath).metadata();
  assert(atlasMeta.width === 1536 && atlasMeta.height === 1344 && atlasMeta.hasAlpha, `${id}: atlas 1536×1344 transparan`);

  const { data: portrait, info } = await sharp(portraitPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0, edgeOpaque = 0, edgePixels = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = portrait[(y * info.width + x) * 4 + 3];
    if (alpha > 16) opaque++;
    // Kaki memang di-anchor ke tepi bawah. Kebocoran dicegah pada atas dan kedua sisi.
    if (x < 5 || y < 5 || x >= info.width - 5) { edgePixels++; if (alpha > 16) edgeOpaque++; }
  }
  const coverage = opaque / (info.width * info.height);
  assert(coverage > .04 && coverage < .62, `${id}: coverage portrait ${(coverage * 100).toFixed(1)}%`);
  assert(edgeOpaque / edgePixels < .01, `${id}: tepi portrait bersih tanpa frame bocor`);

  const { data: atlas, info: atlasInfo } = await sharp(atlasPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let gutterLeaks = 0;
  for (let row = 0; row < 6; row++) for (let column = 0; column < 8; column++) {
    const left = column * 192, top = row * 224;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 192; x++) {
      if (atlas[((top + y) * atlasInfo.width + left + x) * 4 + 3] > 20) gutterLeaks++;
      if (atlas[((top + 221 + y) * atlasInfo.width + left + x) * 4 + 3] > 20) gutterLeaks++;
    }
    for (let x = 0; x < 3; x++) for (let y = 0; y < 224; y++) {
      if (atlas[((top + y) * atlasInfo.width + left + x) * 4 + 3] > 20) gutterLeaks++;
      if (atlas[((top + y) * atlasInfo.width + left + 189 + x) * 4 + 3] > 20) gutterLeaks++;
    }
  }
  assert(gutterLeaks === 0, `${id}: seluruh gutter atlas bebas kebocoran`);
}

if (failures.length) {
  console.error('\nAUDIT GAGAL');
  failures.forEach(message => console.error(`✗ ${message}`));
  process.exit(1);
}

console.log(`\nAUDIT LULUS · ${ids.length} karakter · 2 tim tetap · ${manifest.characters.length * 48} frame terjaga`);
