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
const fieldManifest = await readJson('public/field/manifest.json');
const fieldBaseline = await readJson('config/field-baseline.json');
const charactersSource = await readFile(path.join(root, 'lib/characters.ts'), 'utf8');
const prototypeSource = await readFile(path.join(root, 'app/prototype.tsx'), 'utf8');
const globalStyles = await readFile(path.join(root, 'app/globals.css'), 'utf8');
const workshopSource = await readFile(path.join(root, 'components/character-workshop.tsx'), 'utf8');
const motion = await import('../lib/sprite-motion.js');
const { fieldCycleDecision } = await import('../lib/field-cycle.js');
const { sweptContactDistance } = await import('../lib/tag-contact.js');
const ids = [...charactersSource.matchAll(/\{ id: '([a-z]+)', name:/g)].map(match => match[1]);
const teamIds = Object.values(rules.teams).flatMap(team => team.roster);

assert(rules.matchSize === 5, 'format pertandingan tetap 5v5');
assert(Object.keys(rules.teams).join(',') === 'red,green', 'hanya Tim Merah dan Tim Hijau yang tersedia');
assert(rules.teams.red.roster.join(',') === 'raja,robot,jago,lala,kumis,tui', 'roster Tim Merah sesuai spesifikasi');
assert(rules.teams.green.roster.join(',') === 'ciici,kaka,buto,maria,boke,lui', 'roster Tim Hijau sesuai spesifikasi');
assert(new Set(teamIds).size === 12 && teamIds.length === 12, 'dua roster berisi 12 karakter tanpa duplikat');
assert(ids.length === 12 && ids.every(id => teamIds.includes(id)), 'definisi karakter dan roster tim sinkron');
assert(manifest.version === 7 && manifest.characters.length === 12, 'manifest sprite v7 memuat 12 karakter');
assert(manifest.atlas.columns === 7 && manifest.atlas.rows === 6 && manifest.atlas.padding === 8 && manifest.atlas.runtimeScale === .5, 'atlas master dan runtime 50% konsisten 7×6');
assert(prototypeSource.includes('column * width / 7') && !prototypeSource.includes('column * width / 8'), 'runtime membaca tujuh kolom sumber tanpa memotong karakter');
assert(charactersSource.includes('?v=7') && charactersSource.includes('atlas-runtime.webp'), 'cache key gameplay menunjuk atlas runtime sprite v7');

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
assert(motion.directionFromVelocity(100, 0) === 'east' && motion.directionFromVelocity(-100, 0) === 'west' && motion.directionFromVelocity(0, -100) === 'north' && motion.directionFromVelocity(0, 100) === 'south', 'resolver arah gerak lulus untuk empat arah');
assert(motion.BOOST_COLUMNS === motion.RUN_COLUMNS && motion.BOOST_COLUMNS.join(',') === '1,2,3,4,5', 'boost memakai run cycle directional tanpa pose kolom 6 yang ambigu');
assert(motion.shouldMirrorSprite('east', false) && !motion.shouldMirrorSprite('west', false) && !motion.shouldMirrorSprite('east', true), 'mirror sprite hanya aktif untuk timur tanpa row khusus');
assert(motion.sprintEffectRotation('east') === 0 && motion.sprintEffectRotation('west') === Math.PI && motion.sprintEffectRotation('north') === -Math.PI / 2 && motion.sprintEffectRotation('south') === Math.PI / 2, 'jejak sprint diputar searah empat arah gerak');
assert(prototypeSource.includes('ctx.rotate(sprintEffectRotation(direction))') && !prototypeSource.includes('if (p.vx > 0)'), 'renderer VFX memakai rotasi arah, bukan flip kanan yang terbalik');
assert(workshopSource.includes('animation === \'boost\'') && workshopSource.includes('BOOST_COLUMNS'), 'workshop mempratinjau boost directional yang sama dengan arena');
assert(!prototypeSource.includes('CHARACTERS.forEach(character => getSpriteImage') && prototypeSource.includes("image.decoding = 'async'") && prototypeSource.includes("if (mode === 'playing') {"), 'atlas dimuat lazy hanya saat pertandingan dan decode gambar tidak memblokir layar awal');
assert((prototypeSource.match(/Math\.min\(2, Math\.max\(1, window\.devicePixelRatio/g) ?? []).length >= 1 && workshopSource.includes('Math.min(2, Math.max(1, window.devicePixelRatio'), 'pixel ratio canvas dibatasi 2×');
assert(!prototypeSource.includes('ctx.filter = \'drop-shadow'), 'filter bayangan per pemain dihapus dari render loop');

assert(fieldManifest.version === 2 && Object.keys(fieldManifest.objects.assets).length === 28, 'manifest field v2 memuat 28 objek statis runtime');
assert(Object.keys(fieldManifest.animated.animations).join(',') === 'fountain,flag,vendor,boost25,boost40,boost75,boost100', 'tujuh animasi objek dan pickup terdaftar eksplisit');
for (const [id, animation] of Object.entries(fieldManifest.animated.animations)) assert(animation.frames.length === 6, `${id}: enam frame animasi terpotong lengkap`);
assert(Object.keys(fieldManifest.grounds.tiles).join(',') === 'grass,dirt,paving,concrete', 'empat pola tanah dipotong tanpa label sumber');
const fieldObjectsPath = path.join(root, 'public/field/objects.webp');
const fieldAnimatedPath = path.join(root, 'public/field/animated.webp');
const fieldGroundsPath = path.join(root, 'public/field/grounds.webp');
const fieldObjects = await sharp(fieldObjectsPath).metadata();
const fieldAnimated = await sharp(fieldAnimatedPath).metadata();
const fieldGrounds = await sharp(fieldGroundsPath).metadata();
const fieldRuntimeBytes = (await stat(fieldObjectsPath)).size + (await stat(fieldAnimatedPath)).size + (await stat(fieldGroundsPath)).size;
const fieldDecodedBytes = (fieldObjects.width ?? 0) * (fieldObjects.height ?? 0) * 4 + (fieldAnimated.width ?? 0) * (fieldAnimated.height ?? 0) * 4 + (fieldGrounds.width ?? 0) * (fieldGrounds.height ?? 0) * 4;
assert(fieldObjects.width === 1536 && fieldObjects.height === 768 && fieldObjects.hasAlpha, 'atlas objek statis 1536×768 transparan dan terpotong rapat');
assert(fieldAnimated.width === 1024 && fieldAnimated.height === 384 && fieldAnimated.hasAlpha, 'atlas animasi 1024×384 transparan dan hemat memori');
assert(fieldGrounds.width === 768 && fieldGrounds.height === 512 && !fieldGrounds.hasAlpha, 'atlas pola tanah 768×512 tanpa kanal alpha mubazir');
assert(fieldRuntimeBytes <= 900 * 1024, `tiga atlas field ${(fieldRuntimeBytes / 1024).toFixed(0)} KiB berada dalam budget 900 KiB`);
assert(fieldDecodedBytes <= 8.5 * 1024 * 1024, `memori decode field ${(fieldDecodedBytes / 1024 / 1024).toFixed(1)} MiB berada dalam budget 8,5 MiB`);
assert(prototypeSource.includes('const staticLayer = document.createElement(\'canvas\')') && prototypeSource.includes('if (staticLayerContext && staticMapDirty)'), 'field statis diraster sekali dan di-cache di luar render loop');
assert(prototypeSource.includes("getFieldImage('objects.webp')") && prototypeSource.includes("getFieldImage('animated.webp')") && prototypeSource.includes("getFieldImage('grounds.webp')"), 'seluruh dekorasi memakai hanya tiga request atlas runtime');
assert(prototypeSource.includes("ground: 'dirt'") && prototypeSource.includes("ground: 'concrete'") && prototypeSource.includes("ground: 'grass'"), 'tiga stage memiliki identitas pola tanah berbeda');
assert(prototypeSource.includes('const WORLD_SCALE = 1.25') && prototypeSource.includes('const W = world(1440)') && prototypeSource.includes('const H = world(800)'), 'semua dimensi dunia diperluas tepat 25%');
const fieldOrder = ['kampung', 'pasar', 'taman'];
assert(fieldCycleDecision('kampung', 2, fieldOrder).fieldId === 'kampung' && fieldCycleDecision('kampung', 2, fieldOrder).wins === 2, 'field bertahan sebelum tiga kemenangan pertandingan');
assert(fieldCycleDecision('kampung', 3, fieldOrder).fieldId === 'pasar' && fieldCycleDecision('taman', 3, fieldOrder).fieldId === 'kampung' && fieldCycleDecision('taman', 3, fieldOrder).wins === 0, 'field berpindah dan berputar otomatis tepat setiap tiga kemenangan');
assert(prototypeSource.includes('const quit = () =>') && prototypeSource.includes('setMode(\'menu\')') && prototypeSource.includes('<LogOut size={15} /> Quit'), 'tombol Quit mengembalikan pemain ke menu awal');
const crossingA = { lastX: 0, lastY: 0, x: 100, y: 0 };
const crossingB = { lastX: 100, lastY: 0, x: 0, y: 0 };
const parallelB = { lastX: 0, lastY: 40, x: 100, y: 40 };
assert(sweptContactDistance(crossingA, crossingB) < .001 && Math.abs(sweptContactDistance(crossingA, parallelB) - 40) < .001, 'swept contact menangkap lintasan silang tanpa false positive paralel');
assert(prototypeSource.includes('Math.min(distance(a, b), sweptContactDistance(a, b))'), 'runtime tag memakai swept contact agar tidak melewatkan tabrakan antar-frame');
assert(prototypeSource.includes("drawFieldAsset(ctx, 'prisonOverlay'") && prototypeSource.includes("drawFieldAsset(target, 'prisonFloor'"), 'penjara memakai lantai belakang dan pagar overlay terpisah');
assert(globalStyles.includes('align-items:start') && globalStyles.includes('.stage-card { height:min(79vh,900px)'), 'stage tidak meregang mengikuti panel misi dan kamera Overall tetap terpusat');

const sha256 = async file => createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
for (const [filename, hash] of Object.entries(fieldBaseline.sources)) assert(hash === await sha256(`field-sources/${filename}`), `${filename}: sumber field cocok golden baseline`);
for (const [filename, hash] of Object.entries(fieldBaseline.runtime)) assert(hash === await sha256(`public/field/${filename}`), `${filename}: runtime field cocok golden baseline`);

const logo = await sharp(path.join(root, 'public/brand/benteng-tag-logo.png')).metadata();
assert((logo.width ?? 0) >= 1200 && (logo.height ?? 0) >= 500 && logo.hasAlpha, 'logo judul resolusi tinggi dan transparan');
const webLogoPath = path.join(root, 'public/brand/benteng-tag-logo.webp');
const webLogo = await sharp(webLogoPath).metadata();
assert(webLogo.width === logo.width && webLogo.height === logo.height && webLogo.hasAlpha && (await stat(webLogoPath)).size <= 650 * 1024, 'logo WebP mempertahankan dimensi dalam budget 650 KiB');
const montagePath = path.join(root, 'public/characters.webp');
const montage = await sharp(montagePath).metadata();
assert(montage.width === 1920 && montage.height === 900 && (await stat(montagePath)).size <= 350 * 1024, 'montage WebP layar awal berada dalam budget 350 KiB');
assert(prototypeSource.includes('benteng-tag-logo.webp?v=7') && prototypeSource.includes('characters.webp?v=7'), 'UI memakai asset WebP ringan, bukan master PNG');
const sprintDust = await sharp(path.join(root, 'public/vfx/sprint-dust.webp')).metadata();
assert(sprintDust.width === 1024 && sprintDust.height === 192 && sprintDust.hasAlpha, 'VFX sprint RPG memiliki empat frame transparan');

let runtimeEncodedBytes = 0;
let runtimeDecodedBytes = 0;
for (const id of ids) {
  const atlasPath = path.join(root, `public/characters/${id}/atlas.webp`);
  const runtimePath = path.join(root, `public/characters/${id}/atlas-runtime.webp`);
  const portraitPath = path.join(root, `public/characters/${id}/portrait.webp`);
  const animation = await readJson(`public/characters/${id}/animations.json`);
  await stat(atlasPath); await stat(portraitPath);
  const atlasMeta = await sharp(atlasPath).metadata();
  const runtimeStat = await stat(runtimePath);
  const runtimeMeta = await sharp(runtimePath).metadata();
  runtimeEncodedBytes += runtimeStat.size;
  runtimeDecodedBytes += (runtimeMeta.width ?? 0) * (runtimeMeta.height ?? 0) * 4;
  assert(atlasMeta.width === animation.atlas.width && atlasMeta.height === animation.atlas.height && atlasMeta.hasAlpha, `${id}: dimensi atlas adaptif sinkron dan transparan`);
  assert(runtimeMeta.width === atlasMeta.width / 2 && runtimeMeta.height === atlasMeta.height / 2 && runtimeMeta.hasAlpha, `${id}: atlas runtime tepat 50% dan transparan`);
  assert(animation.version === 7 && animation.source.columns === 7 && animation.atlas.columns === 7 && animation.source.segmentation === 'row-separated-alpha-components', `${id}: metadata segmentasi v7 sinkron`);
  assert(animation.quality.frameCount === 42 && animation.source.frames.length === 42, `${id}: 42 frame sumber terlacak satu per satu`);
  for (const direction of ['south', 'west', 'north']) assert(animation.directions[direction].boost.length === 5, `${id}: boost ${direction} memakai lima frame halus`);
  if (animation.directions.east.mirror !== 'west') assert(animation.directions.east.boost.length === 5, `${id}: boost east memakai lima frame halus`);

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
  assert(hashes?.source === await sha256(`sprite-sources/${id}.png`), `${id}: sumber cocok dengan golden baseline`);
  assert(hashes?.atlas === await sha256(`public/characters/${id}/atlas.webp`), `${id}: atlas cocok dengan golden baseline tervalidasi`);
  assert(hashes?.runtime === await sha256(`public/characters/${id}/atlas-runtime.webp`), `${id}: atlas runtime cocok dengan golden baseline tervalidasi`);
  assert(hashes?.portrait === await sha256(`public/characters/${id}/portrait.webp`), `${id}: portrait cocok dengan golden baseline tervalidasi`);
  assert(hashes?.animation === await sha256(`public/characters/${id}/animations.json`), `${id}: metadata cocok dengan golden baseline tervalidasi`);
}

assert(runtimeEncodedBytes <= 5.5 * 1024 * 1024, `total atlas gameplay ${(runtimeEncodedBytes / 1024 / 1024).toFixed(2)} MiB berada dalam budget 5.50 MiB`);
assert(runtimeDecodedBytes <= 48 * 1024 * 1024, `memori decode 12 atlas gameplay ${(runtimeDecodedBytes / 1024 / 1024).toFixed(1)} MiB berada dalam budget 48 MiB`);

if (failures.length) {
  console.error('\nAUDIT GAGAL');
  failures.forEach(message => console.error(`✗ ${message}`));
  process.exit(1);
}

console.log(`\nAUDIT LULUS · ${ids.length} karakter · 504 frame + ${Object.keys(fieldBaseline.sources).length} sumber field dibandingkan dengan golden baseline`);
