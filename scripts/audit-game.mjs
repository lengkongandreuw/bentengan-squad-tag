import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const failures = [];
const pass = message => console.log(`✓ ${message}`);
const assert = (condition, message) => condition ? pass(message) : failures.push(message);
const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));

const rules = await readJson('config/game-rules.json');
const manifest = await readJson('public/characters/manifest.json');
const spriteBaseline = await readJson('config/sprite-baseline.json');
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
assert(manifest.version === 6 && manifest.characters.length === 12, 'manifest sprite v6 memuat 12 karakter');
assert(manifest.atlas.columns === 7 && manifest.atlas.rows === 6 && manifest.atlas.padding === 8, 'atlas produksi adaptif konsisten 7×6');
assert(prototypeSource.includes('column * width / 7') && !prototypeSource.includes('column * width / 8'), 'runtime membaca tujuh kolom sumber tanpa memotong karakter');
assert(charactersSource.includes('?v=6') && !charactersSource.includes('?v=5'), 'cache key runtime menunjuk pipeline sprite v6');

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
const sprintDust = await sharp(path.join(root, 'public/vfx/sprint-dust.webp')).metadata();
assert(sprintDust.width === 1024 && sprintDust.height === 192 && sprintDust.hasAlpha, 'VFX sprint RPG memiliki empat frame transparan');

for (const id of ids) {
  const atlasPath = path.join(root, `public/characters/${id}/atlas.webp`);
  const portraitPath = path.join(root, `public/characters/${id}/portrait.webp`);
  const animation = await readJson(`public/characters/${id}/animations.json`);
  await stat(atlasPath); await stat(portraitPath);
  const atlasMeta = await sharp(atlasPath).metadata();
  assert(atlasMeta.width === animation.atlas.width && atlasMeta.height === animation.atlas.height && atlasMeta.hasAlpha, `${id}: dimensi atlas adaptif sinkron dan transparan`);
  assert(animation.version === 6 && animation.source.columns === 7 && animation.atlas.columns === 7 && animation.source.segmentation === 'row-separated-alpha-components', `${id}: metadata segmentasi v6 sinkron`);
  assert(animation.quality.frameCount === 42 && animation.source.frames.length === 42, `${id}: 42 frame sumber terlacak satu per satu`);

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
  const cellWidth = animation.atlas.cell.width;
  const cellHeight = animation.atlas.cell.height;
  const gutter = animation.atlas.gutter;
  let gutterLeaks = 0, weakFrames = 0, distortedFrames = 0, scaleMismatchFrames = 0;
  for (let row = 0; row < 6; row++) for (let column = 0; column < 7; column++) {
    const left = column * cellWidth, top = row * cellHeight;
    let frameOpaque = 0, minX = cellWidth, minY = cellHeight, maxX = -1, maxY = -1;
    for (let y = gutter; y < cellHeight - gutter; y++) for (let x = gutter; x < cellWidth - gutter; x++) {
      if (atlas[((top + y) * atlasInfo.width + left + x) * 4 + 3] <= 20) continue;
      frameOpaque++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    if (frameOpaque < 350) weakFrames++;
    const sourceFrame = animation.source.frames[row * 7 + column];
    if (maxX >= minX && maxY >= minY) {
      const scaleX = (maxX - minX + 1) / sourceFrame.width;
      const scaleY = (maxY - minY + 1) / sourceFrame.height;
      if (Math.abs(scaleX - scaleY) / animation.quality.scale > .14) distortedFrames++;
      if (Math.abs(scaleX - animation.quality.scale) / animation.quality.scale > .14 || Math.abs(scaleY - animation.quality.scale) / animation.quality.scale > .14) scaleMismatchFrames++;
    }
    for (let y = 0; y < gutter; y++) for (let x = 0; x < cellWidth; x++) {
      if (atlas[((top + y) * atlasInfo.width + left + x) * 4 + 3] > 20) gutterLeaks++;
      if (atlas[((top + cellHeight - 1 - y) * atlasInfo.width + left + x) * 4 + 3] > 20) gutterLeaks++;
    }
    for (let x = 0; x < gutter; x++) for (let y = 0; y < cellHeight; y++) {
      if (atlas[((top + y) * atlasInfo.width + left + x) * 4 + 3] > 20) gutterLeaks++;
      if (atlas[((top + y) * atlasInfo.width + left + cellWidth - 1 - x) * 4 + 3] > 20) gutterLeaks++;
    }
  }
  assert(weakFrames === 0, `${id}: seluruh frame berisi karakter utuh`);
  assert(gutterLeaks === 0, `${id}: 42 frame tidak menyentuh garis potong atlas`);
  assert(distortedFrames === 0, `${id}: rasio siluet sumber dan atlas tidak terdistorsi`);
  assert(scaleMismatchFrames === 0, `${id}: skala sumber-ke-atlas seragam pada seluruh pose`);

  const hashes = spriteBaseline.characters[id];
  const sha256 = async file => createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
  assert(hashes?.source === await sha256(`sprite-sources/${id}.png`), `${id}: sumber cocok dengan golden baseline`);
  assert(hashes?.atlas === await sha256(`public/characters/${id}/atlas.webp`), `${id}: atlas cocok dengan golden baseline tervalidasi`);
  assert(hashes?.portrait === await sha256(`public/characters/${id}/portrait.webp`), `${id}: portrait cocok dengan golden baseline tervalidasi`);
  assert(hashes?.animation === await sha256(`public/characters/${id}/animations.json`), `${id}: metadata cocok dengan golden baseline tervalidasi`);
}

if (failures.length) {
  console.error('\nAUDIT GAGAL');
  failures.forEach(message => console.error(`✗ ${message}`));
  process.exit(1);
}

console.log(`\nAUDIT LULUS · ${ids.length} karakter · 504 frame dibandingkan dengan sumber + golden baseline`);
