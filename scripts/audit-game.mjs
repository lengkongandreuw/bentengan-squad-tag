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
const uiManifest = await readJson('public/ui-v2/manifest.json');
const charactersSource = await readFile(path.join(root, 'lib/characters.ts'), 'utf8');
const prototypeSource = await readFile(path.join(root, 'app/prototype.tsx'), 'utf8');
const globalStyles = await readFile(path.join(root, 'app/globals.css'), 'utf8');
const workshopSource = await readFile(path.join(root, 'components/character-workshop.tsx'), 'utf8');
const motion = await import('../lib/sprite-motion.js');
const characterAnimations = await import('../lib/character-animation.js');
const { fieldCycleDecision } = await import('../lib/field-cycle.js');
const { sweptContactDistance } = await import('../lib/tag-contact.js');
const { depenetrateFromRects, pointHitsExpandedRect, steerAroundRects } = await import('../lib/collision-navigation.js');
const { advanceTeamCombo, createTeamComboState, teamComboSpeedMultiplier } = await import('../lib/team-combo.js');
const ids = [...charactersSource.matchAll(/\{ id: '([a-z]+)', name:/g)].map(match => match[1]);
const teamIds = Object.values(rules.teams).flatMap(team => team.roster);

assert(rules.matchSize === 5, 'format pertandingan tetap 5v5');
assert(Object.keys(rules.teams).join(',') === 'red,green', 'hanya Tim Merah dan Tim Hijau yang tersedia');
assert(rules.teams.red.roster.join(',') === 'raja,robot,jago,lala,kumis,tui,bebe', 'roster Tim Merah sesuai spesifikasi');
assert(rules.teams.green.roster.join(',') === 'ciici,kaka,buto,maria,boke,lui,kodo', 'roster Tim Hijau sesuai spesifikasi');
assert(rules.reserveCount === 2, 'setiap tim memiliki dua karakter cadangan');
assert(new Set(teamIds).size === 14 && teamIds.length === 14, 'dua roster berisi 14 karakter tanpa duplikat');
assert(ids.length === 14 && ids.every(id => teamIds.includes(id)), 'definisi karakter dan roster tim sinkron');
assert(manifest.version === 9 && manifest.characters.length === 14, 'manifest sprite v9 memuat 14 karakter');
assert(manifest.atlas.columns === 7 && manifest.atlas.rows === 6 && manifest.atlas.padding === 8 && manifest.atlas.runtimeScale === .5, 'atlas master dan runtime 50% konsisten 7×6');
assert(prototypeSource.includes('(column * width) / 7') && !prototypeSource.includes('(column * width) / 8'), 'runtime membaca tujuh kolom sumber tanpa memotong karakter');
assert(charactersSource.includes('?v=9') && charactersSource.includes('atlas-runtime.webp'), 'cache key gameplay menunjuk atlas runtime sprite v9');
assert(uiManifest.version === 7 && uiManifest.files.length === 54, 'paket UI v7 memuat 14 ikon, full-body, banner Raja, video tim, dan delapan track audio');
const uiImageBytes = uiManifest.files.filter(entry => !entry.file.startsWith('videos/') && !entry.file.startsWith('audio/')).reduce((sum, entry) => sum + entry.bytes, 0);
const uiVideoBytes = uiManifest.files.filter(entry => entry.file.startsWith('videos/')).reduce((sum, entry) => sum + entry.bytes, 0);
const uiAudioBytes = uiManifest.files.filter(entry => entry.file.startsWith('audio/')).reduce((sum, entry) => sum + entry.bytes, 0);
assert(uiImageBytes <= 1700 * 1024, `gambar UI v7 ${(uiImageBytes / 1024).toFixed(0)} KiB berada dalam budget 1.700 KiB`);
assert(uiVideoBytes <= 6500 * 1024, `dua video seleksi tim ${(uiVideoBytes / 1024 / 1024).toFixed(2)} MiB berada dalam budget 6,5 MiB`);
assert(uiAudioBytes <= 8500 * 1024, `delapan track audio ${(uiAudioBytes / 1024 / 1024).toFixed(2)} MiB berada dalam budget 8,5 MiB`);
for (const id of ids) assert(uiManifest.files.some(entry => entry.file === `character-icons/${id}.webp`), `${id}: ikon preview karakter khusus tersedia`);
assert(prototypeSource.includes("type MenuStep = 'splash' | 'team' | 'character' | 'field'") && prototypeSource.includes("key === 'escape'") && prototypeSource.includes('cycleCharacter'), 'alur layar baru dan navigasi keyboard terpasang');
assert(prototypeSource.includes("ui-v2/${file}?v=7") && !prototypeSource.includes('asset-inbox/') && !prototypeSource.includes('Assets/pictures/'), 'runtime memakai paket UI v7 tanpa merujuk PNG sumber');
assert(charactersSource.includes('CHARACTER_PREVIEW_ICONS') && charactersSource.includes('characterPreviewIcon') && charactersSource.includes('characterFullBodyPortrait') && prototypeSource.includes('variant="full"'), 'seleksi karakter memakai full-body; UI ringkas tetap memakai ikon khusus');
assert(uiManifest.files.some(entry => entry.file === 'skills/raja-titah-halilintar.webp') && prototypeSource.includes('rajaUltimateBannerAsset()'), 'banner Titah Halilintar terpisah dari ikon Raja');
assert(uiManifest.files.some(entry => entry.file === 'videos/team-red.mp4') && uiManifest.files.some(entry => entry.file === 'videos/team-green.mp4') && /<video\s+className="roster-video"/.test(prototypeSource), 'seleksi karakter memakai tepat satu video tim aktif');
for (const id of ['kampung', 'pasar', 'taman', 'kanal']) assert(uiManifest.files.some(entry => entry.file === `fields/${id}.webp`), `${id}: kartu preview field WebP tersedia`);

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
const rajaAnimation = characterAnimations.characterAnimationMapping('raja');
const defaultAnimation = characterAnimations.characterAnimationMapping('robot');
assert(rajaAnimation.directionRows.south === 0 && rajaAnimation.directionRows.west === 1 && rajaAnimation.directionRows.east === 1 && rajaAnimation.directionRows.north === 2 && !rajaAnimation.dedicatedEast, 'override arah Raja memakai baris depan, sisi bercermin, dan belakang');
assert(/p\.characterId === 'raja'\s*\? direction === 'west'/.test(prototypeSource) && /mirror = direction === 'west'/.test(prototypeSource), 'Raja menghadap kanan tanpa mirror dan kiri dengan mirror saat berlari serta parkour');
assert(rajaAnimation.runColumns.join(',') === '1,2,3' && rajaAnimation.boostColumns.join(',') === '4,5,6' && rajaAnimation.ultimate.columns.join(',') === '0,1,2,3', 'override Raja memisahkan lari, boost, dan empat fase Ultimate');
assert(defaultAnimation === characterAnimations.DEFAULT_ANIMATION_MAPPING, 'karakter selain Raja tetap memakai mapping animasi default');
assert(prototypeSource.includes('ctx.rotate(sprintEffectRotation(direction))') && !prototypeSource.includes('if (p.vx > 0)'), 'renderer VFX memakai rotasi arah, bukan flip kanan yang terbalik');
assert(workshopSource.includes('animation === \'boost\'') && workshopSource.includes('BOOST_COLUMNS'), 'workshop mempratinjau boost directional yang sama dengan arena');
assert(!prototypeSource.includes('CHARACTERS.forEach(character => getSpriteImage') && prototypeSource.includes("image.decoding = 'async'") && prototypeSource.includes("if (mode === 'playing') {"), 'atlas dimuat lazy hanya saat pertandingan dan decode gambar tidak memblokir layar awal');
assert((prototypeSource.match(/Math\.min\(2, Math\.max\(1, window\.devicePixelRatio/g) ?? []).length >= 1 && workshopSource.includes('Math.min(2, Math.max(1, window.devicePixelRatio'), 'pixel ratio canvas dibatasi 2×');
assert(!prototypeSource.includes('ctx.filter = \'drop-shadow'), 'filter bayangan per pemain dihapus dari render loop');

assert(fieldManifest.version === 3 && Object.keys(fieldManifest.objects.assets).length === 64, 'manifest field v3 memuat 64 objek statis dan modular runtime');
assert(Object.keys(fieldManifest.animated.animations).join(',') === 'fountain,flag,vendor,boost25,boost40,boost75,boost100', 'tujuh animasi objek dan pickup terdaftar eksplisit');
for (const [id, animation] of Object.entries(fieldManifest.animated.animations)) assert(animation.frames.length === 6, `${id}: enam frame animasi terpotong lengkap`);
assert(Object.keys(fieldManifest.grounds.tiles).join(',') === 'grass,dirt,paving,concrete,kampungGround,parkGrass,parkPaving,canalGrass', 'delapan pola tanah lama dan baru dipotong tanpa label sumber');
const fieldObjectsPath = path.join(root, 'public/field/objects.webp');
const fieldAnimatedPath = path.join(root, 'public/field/animated.webp');
const fieldGroundsPath = path.join(root, 'public/field/grounds.webp');
const fieldObjects = await sharp(fieldObjectsPath).metadata();
const fieldAnimated = await sharp(fieldAnimatedPath).metadata();
const fieldGrounds = await sharp(fieldGroundsPath).metadata();
const fieldRuntimeBytes = (await stat(fieldObjectsPath)).size + (await stat(fieldAnimatedPath)).size + (await stat(fieldGroundsPath)).size;
const fieldDecodedBytes = (fieldObjects.width ?? 0) * (fieldObjects.height ?? 0) * 4 + (fieldAnimated.width ?? 0) * (fieldAnimated.height ?? 0) * 4 + (fieldGrounds.width ?? 0) * (fieldGrounds.height ?? 0) * 4;
assert(fieldObjects.width === 2048 && fieldObjects.height === 1664 && fieldObjects.hasAlpha, 'atlas objek statis v3 2048×1664 transparan dan terpotong rapat');
assert(fieldAnimated.width === 1024 && fieldAnimated.height === 384 && fieldAnimated.hasAlpha, 'atlas animasi 1024×384 transparan dan hemat memori');
assert(fieldGrounds.width === 1280 && fieldGrounds.height === 448 && !fieldGrounds.hasAlpha, 'atlas delapan pola tanah 1280×448 tanpa kanal alpha mubazir');
assert(fieldRuntimeBytes <= 1250 * 1024, `tiga atlas field ${(fieldRuntimeBytes / 1024).toFixed(0)} KiB berada dalam budget 1.250 KiB`);
assert(fieldDecodedBytes <= 18.5 * 1024 * 1024, `memori decode field ${(fieldDecodedBytes / 1024 / 1024).toFixed(1)} MiB berada dalam budget 18,5 MiB`);
assert(prototypeSource.includes('const staticLayer = document.createElement(\'canvas\')') && prototypeSource.includes('if (staticLayerContext && staticMapDirty)'), 'field statis diraster sekali dan di-cache di luar render loop');
assert(prototypeSource.includes("getFieldImage('objects.webp')") && prototypeSource.includes("getFieldImage('animated.webp')") && prototypeSource.includes("getFieldImage('grounds.webp')"), 'seluruh dekorasi memakai hanya tiga request atlas runtime');
assert(prototypeSource.includes("ground: 'dirt'") && prototypeSource.includes("ground: 'concrete'") && prototypeSource.includes("ground: 'grass'") && prototypeSource.includes("id: 'kanal'"), 'empat stage memiliki identitas arena yang terdaftar');
assert(prototypeSource.includes('const WORLD_SCALE = 2.5') && prototypeSource.includes('const W = world(1440)') && prototypeSource.includes('const H = world(800)'), 'semua arena memiliki luas 3600×2000, tepat 2× dimensi sebelumnya');
assert(prototypeSource.includes('const STATIC_MAP_SCALE = 0.5') && prototypeSource.includes('staticLayer.width = Math.round(W * STATIC_MAP_SCALE)'), 'cache visual arena 2× diraster setengah resolusi agar hemat memori');
assert(prototypeSource.includes('const NEAR_FIELD_DETAIL_RADIUS = 560') && prototypeSource.includes('drawNearbyFieldDetails(me, activeCamera)') && prototypeSource.includes("activeCamera === 'overview'"), 'objek dekat pemain digambar ulang tajam tanpa memperbesar cache atau mode overview');
assert(prototypeSource.includes('const GUIDE_FIELD_CONFIGS: FieldConfig[]') && prototypeSource.includes("'parkCornerNW'") && prototypeSource.includes("'canalBridgeDiag'"), 'empat arena v3 memakai konfigurasi panduan dan objek modular baru');
assert((prototypeSource.match(/guideObstacle\(/g) ?? []).length >= 55, 'konfigurasi panduan memiliki kepadatan halangan bermakna sebelum pola simetris diperluas');
assert(prototypeSource.includes('kepadatan arena 2× tidak mencukupi') && prototypeSource.includes('keluar batas arena') && prototypeSource.includes('masuk zona penjara') && prototypeSource.includes('menutup akses benteng'), 'validator geometri mencegah arena kosong, objek keluar batas, dan penjara terhalang');
const guideFieldSource = prototypeSource.match(/const GUIDE_FIELD_CONFIGS:[\s\S]*?const FIELD_CONFIGS:/)?.[0] ?? '';
assert((guideFieldSource.match(/difficulty: 'easy'/g) ?? []).length === 1 && (guideFieldSource.match(/difficulty: 'normal'/g) ?? []).length === 1 && (guideFieldSource.match(/difficulty: 'hard'/g) ?? []).length === 2, 'tingkat kesulitan arena tersusun Easy, Normal, Hard, Hard');
assert(prototypeSource.includes('DIFFICULTY_PROFILES[field.difficulty]') && prototypeSource.includes('aiProfile.prediction') && prototypeSource.includes('aiProfile.steerDistance') && prototypeSource.includes('aiProfile.rescueCutoff'), 'kesulitan mengubah prediksi target, navigasi, boost, dan keputusan rescue musuh');
const fieldOrder = ['kampung', 'pasar', 'taman', 'kanal'];
assert(fieldCycleDecision('kampung', 2, fieldOrder).fieldId === 'kampung' && fieldCycleDecision('kampung', 2, fieldOrder).wins === 2, 'field bertahan sebelum tiga kemenangan pertandingan');
assert(fieldCycleDecision('kampung', 3, fieldOrder).fieldId === 'pasar' && fieldCycleDecision('taman', 3, fieldOrder).fieldId === 'kanal' && fieldCycleDecision('kanal', 3, fieldOrder).fieldId === 'kampung', 'empat field berpindah dan berputar otomatis tepat setiap tiga kemenangan');
assert(prototypeSource.includes('const quit = () =>') && prototypeSource.includes('setMode(\'menu\')') && prototypeSource.includes('<LogOut size={17} /> Keluar ke menu'), 'menu jeda dapat mengembalikan pemain ke menu awal');
const crossingA = { lastX: 0, lastY: 0, x: 100, y: 0 };
const crossingB = { lastX: 100, lastY: 0, x: 0, y: 0 };
const parallelB = { lastX: 0, lastY: 40, x: 100, y: 40 };
assert(sweptContactDistance(crossingA, crossingB) < .001 && Math.abs(sweptContactDistance(crossingA, parallelB) - 40) < .001, 'swept contact menangkap lintasan silang tanpa false positive paralel');
assert(/Math\.min\(\s*distance\(a, b\),\s*sweptContactDistance\(a, b\),?\s*\)/.test(prototypeSource), 'runtime tag memakai swept contact agar tidak melewatkan tabrakan antar-frame');
const collisionRect = { x: 100, y: 100, w: 80, h: 60 };
const embeddedPlayer = { x: 125, y: 125 };
const recoveredPlayer = depenetrateFromRects(embeddedPlayer, [collisionRect], 13, { minX: 0, maxX: 400, minY: 0, maxY: 300 });
assert(pointHitsExpandedRect(embeddedPlayer.x, embeddedPlayer.y, collisionRect, 13) && !pointHitsExpandedRect(recoveredPlayer.x, recoveredPlayer.y, collisionRect, 13), 'player yang terdorong masuk collider selalu dikeluarkan ke sisi terdekat');
const detour = steerAroundRects({ x: 40, y: 130 }, { x: 200, y: 0 }, [collisionRect], 13, 100, 1);
assert(Math.abs(detour.y) > 1 && Math.abs(detour.x) > 1, 'navigasi AI membelok ketika jalur langsung terhalang');
assert(prototypeSource.includes('recoverFromObstacle(player, now)') && prototypeSource.includes('spacingPositionAllowed') && prototypeSource.includes('onPointerLeave: release') && prototypeSource.includes("window.addEventListener('blur', releaseAll)"), 'pemulihan collider, spacing aman, serta pelepasan input keyboard dan sentuh terpasang');
assert(prototypeSource.includes('BASE_REENTRY_COOLDOWN_MS = 1500') && prototypeSource.includes('p.lastExitAt = now'), 'jitter di tepi benteng tidak memicu keluar-masuk dan prioritas berulang');
assert(prototypeSource.includes('aiProfile.enemySpeed * field.aiIntensity') && prototypeSource.includes('steerAroundRects') && prototypeSource.includes('aPlayerBias = a.controlled ? -aiProfile.playerBias : 0'), 'AI lawan diskalakan per field, dapat menghindari halangan, dan memprioritaskan pemain');
let comboState = createTeamComboState();
comboState = advanceTeamCombo(comboState, 'ally1', 1000).state;
const repeatedActor = advanceTeamCombo(comboState, 'ally1', 1800);
assert(comboState.step === 1 && repeatedActor.outcome === 'ignored', 'aktor yang sama tidak dapat menaikkan combo aksi tim sendirian');
comboState = advanceTeamCombo(comboState, 'ally2', 2400).state;
const teamSurge = advanceTeamCombo(comboState, 'you', 3200);
assert(comboState.step === 2 && teamSurge.outcome === 'surge' && teamComboSpeedMultiplier(teamSurge.state, 4000) === 1.1, 'tiga aksi berantai dari rekan berbeda memicu Squad Surge +10%');
const expiredCombo = advanceTeamCombo(createTeamComboState(), 'ally1', 1000).state;
assert(advanceTeamCombo(expiredCombo, 'ally2', 8000).state.step === 1, 'rantai combo kedaluwarsa setelah jendela 6,5 detik');
assert(prototypeSource.includes("registerTeamAction(winner, 'TAG'") && prototypeSource.includes("registerTeamAction(rescuer, 'RESCUE'") && prototypeSource.includes('team-combo-hud') && globalStyles.includes('@keyframes combo-callout-in'), 'tag dan rescue terhubung ke HUD serta aset kode-native combo aksi tim');
assert(globalStyles.includes('.team-combo-hud{top:91px;right:8px;width:126px') && globalStyles.includes('@media(max-width:360px)') && prototypeSource.includes('aria-label="Status combo aksi tim"'), 'HUD combo tetap ringkas dan terbaca pada kontrol mobile sempit');
assert(prototypeSource.includes("prison.overlayAsset ?? 'prisonOverlay'") && prototypeSource.includes("prison.floorAsset ?? 'prisonFloor'"), 'setiap field dapat memakai lantai belakang dan pagar overlay penjara khusus');
assert(prototypeSource.includes('playUiTone(235') && prototypeSource.includes("'ui-back.mp3'") && prototypeSource.includes("'ui-select.mp3'") && prototypeSource.includes("document.addEventListener('pointerdown', onPointerDown)"), 'klik, tap, dan hover UI memakai sample lokal serta cue sintetis');
assert(prototypeSource.includes('RAJA_ULTIMATE_RECHARGE_SECONDS = 45') && prototypeSource.includes('RAJA_ULTIMATE_TAG_BONUS = 20') && prototypeSource.includes('RAJA_ULTIMATE_RESCUE_BONUS = 30'), 'meter Ultimate Raja mengisi pasif 45 detik dengan bonus tag +20 dan rescue +30');
assert(prototypeSource.includes('RAJA_ULTIMATE_SPEED_MULTIPLIER = 1.4') && prototypeSource.includes('RAJA_ULTIMATE_BUFF_MS = 5000') && prototypeSource.includes("me.state === 'ACTIVE'") && prototypeSource.includes("player.state === 'ACTIVE'"), 'Titah Halilintar memberi modifier +40% selama 5 detik hanya kepada anggota ACTIVE');
assert(prototypeSource.includes("keys.current.has('capslock')") && prototypeSource.includes('RAJA_ULTIMATE_CAST_MS = 3200') && prototypeSource.includes('oneShotColumn') && prototypeSource.includes('ultimate-meter-hud'), 'Caps Lock memicu Ultimate sekali-putar 3,2 detik dengan meter HUD yang jelas');
for (const file of ['opening-title.mp3', 'press-play.mp3', 'ingame-music.mp3', 'ingame-ambience.mp3', 'victory.mp3', 'defeat.mp3', 'ui-back.mp3', 'ui-select.mp3']) assert(uiManifest.files.some(entry => entry.file === `audio/${file}`), `${file}: track audio runtime tersedia`);
assert(prototypeSource.includes("mode === 'playing' ? 'ingame-music.mp3' : 'opening-title.mp3'") && prototypeSource.includes("'ingame-ambience.mp3'") && prototypeSource.includes('audioUnlocked'), 'musik menu dan pertandingan dimulai setelah interaksi pengguna');
assert(!prototypeSource.includes('sprite-sources/raja new sprites.png'), 'PNG sumber Raja tidak pernah dirujuk runtime');
assert(globalStyles.includes('align-items:start') && globalStyles.includes('.stage-card { height:min(79vh,900px)'), 'stage tidak meregang mengikuti panel misi dan kamera Overall tetap terpusat');

const sha256 = async file => createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
for (const [filename, hash] of Object.entries(fieldBaseline.sources)) assert(hash === await sha256(`field-sources/${filename}`), `${filename}: sumber field cocok golden baseline`);
for (const [filename, hash] of Object.entries(fieldBaseline.runtime)) assert(hash === await sha256(`public/field/${filename}`), `${filename}: runtime field cocok golden baseline`);

const logo = await sharp(path.join(root, 'asset-inbox/2026-09-01-ui-refresh-v3/brand/benteng-tag-logo.png')).metadata();
assert((logo.width ?? 0) >= 1900 && (logo.height ?? 0) >= 850 && logo.hasAlpha, 'master logo judul baru resolusi tinggi dan transparan');
const webLogoPath = path.join(root, 'public/brand/benteng-tag-logo.webp');
const webLogo = await sharp(webLogoPath).metadata();
assert((webLogo.width ?? 0) <= 1080 && (webLogo.height ?? 0) <= 500 && webLogo.hasAlpha && (await stat(webLogoPath)).size <= 160 * 1024, 'logo WebP baru transparan dan berada dalam budget 160 KiB');
const montagePath = path.join(root, 'public/characters.webp');
const montage = await sharp(montagePath).metadata();
assert(montage.width === 1920 && montage.height === 900 && (await stat(montagePath)).size <= 350 * 1024, 'montage WebP layar awal berada dalam budget 350 KiB');
assert(prototypeSource.includes('benteng-tag-logo.webp?v=9') && prototypeSource.includes('characters.webp?v=8'), 'UI memakai asset WebP ringan, bukan master PNG');
assert(prototypeSource.includes('active-objective') && prototypeSource.includes('action-dock') && prototypeSource.includes('pause-overlay') && globalStyles.includes('.playing-shell .stage-hud'), 'HUD imersif memiliki tujuan aktif, dock aksi, dan menu jeda responsif');
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
  assert(animation.version === 9 && animation.source.columns === 7 && animation.atlas.columns === 7 && animation.source.segmentation === 'row-separated-alpha-components', `${id}: metadata segmentasi v9 sinkron`);
  assert(animation.quality.frameCount === 42 && animation.source.frames.length === 42, `${id}: 42 frame sumber terlacak satu per satu`);
  const expectedBoostFrames = id === 'raja' ? 3 : 5;
  for (const direction of ['south', 'west', 'north']) assert(animation.directions[direction].boost.length === expectedBoostFrames, `${id}: boost ${direction} memakai ${expectedBoostFrames} frame`);
  if (animation.directions.east.mirror !== 'west') assert(animation.directions.east.boost.length === expectedBoostFrames, `${id}: boost east memakai ${expectedBoostFrames} frame`);

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
  const sourceName = manifest.characters.find(character => character.id === id)?.source ?? `${id}.png`;
  assert(hashes?.source === await sha256(`sprite-sources/${sourceName}`), `${id}: sumber cocok dengan golden baseline`);
  assert(hashes?.atlas === await sha256(`public/characters/${id}/atlas.webp`), `${id}: atlas cocok dengan golden baseline tervalidasi`);
  assert(hashes?.runtime === await sha256(`public/characters/${id}/atlas-runtime.webp`), `${id}: atlas runtime cocok dengan golden baseline tervalidasi`);
  assert(hashes?.portrait === await sha256(`public/characters/${id}/portrait.webp`), `${id}: portrait cocok dengan golden baseline tervalidasi`);
  assert(hashes?.animation === await sha256(`public/characters/${id}/animations.json`), `${id}: metadata cocok dengan golden baseline tervalidasi`);
}

assert(runtimeEncodedBytes <= 6 * 1024 * 1024, `total atlas gameplay ${(runtimeEncodedBytes / 1024 / 1024).toFixed(2)} MiB berada dalam budget 6 MiB`);
assert(runtimeDecodedBytes <= 58 * 1024 * 1024, `memori decode 14 atlas gameplay ${(runtimeDecodedBytes / 1024 / 1024).toFixed(1)} MiB berada dalam budget 58 MiB`);

if (failures.length) {
  console.error('\nAUDIT GAGAL');
  failures.forEach(message => console.error(`✗ ${message}`));
  process.exit(1);
}

console.log(`\nAUDIT LULUS · ${ids.length} karakter · 588 frame + ${Object.keys(fieldBaseline.sources).length} sumber field dibandingkan dengan golden baseline`);
