import { validateCatalog } from '/catalog.mjs';
import {
  closestEdge,
  polygonBounds,
  moveDummy,
  MAX_POLYGON_NODES,
} from '/editor-tools.js';
import {
  contains,
  solidAt,
  waterAt,
  frameAt,
  mapIssues,
  validateMap,
} from '/model.js';
const $ = (id) => document.getElementById(id),
  canvas = $('canvas'),
  ctx = canvas.getContext('2d'),
  colors = {
    decoration: '#c8d3c7',
    solid: '#ff7070',
    parkour: '#ffa74b',
    water: '#63caff',
    slow: '#ffe080',
    bridge: '#90ec93',
  },
  layers = ['background', 'world', 'foreground'];
let state,
  map,
  template,
  builtinTemplates = [],
  builtins = [],
  library = [],
  selected = '',
  dirty = false,
  history = [],
  future = [],
  drag = null,
  pointsMode = false,
  selectedNode = -1,
  drawing = null,
  pointer = null,
  falls = 0,
  dummyStatus = '',
  testing = false,
  player,
  last = 0,
  jumpUntil = 0,
  loading = false,
  uploadUrl,
  tileCache;
const keys = new Set(),
  cache = new Map(),
  uid = () => crypto.randomUUID().replaceAll('-', ''),
  zoom = () =>
    Math.min(+$('zoom').value / 100, 4096 / Math.max(map.width, map.height)),
  clamp = (n, a, b) => Math.max(a, Math.min(b, n)),
  snap = (n) => ($('grid').checked ? Math.round(n / 20) * 20 : n);
const notice = (s, error = false) => {
    $('status').textContent = s;
    $('status').className = error ? 'error' : '';
  },
  safe = (fn) => async () => {
    try {
      await fn();
    } catch (e) {
      notice(e.message, true);
    }
  };
async function api(route, data) {
  const r = await fetch(
      route,
      data
        ? {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Token': state.token,
            },
            body: JSON.stringify({ revision: state.revision, ...data }),
          }
        : undefined,
    ),
    v = await r.json();
  if (!r.ok) throw new Error(v.error ?? 'Permintaan gagal.');
  return v;
}
function remember() {
  history.push(structuredClone(map));
  if (history.length > 40) history.shift();
  future = [];
  dirty = true;
  publishSummary();
}
function publishSummary() {
  if (!map) return;
  $('saveState').textContent = dirty ? '● Belum disimpan' : '✓ Tersimpan lokal';
  $('saveState').className = dirty ? 'warning' : '';
  $('activationState').textContent =
    map.enabled && !map.archived && !map.deleted
      ? 'Aktif: versi ini akan tampil setelah deployment selesai.'
      : 'DRAFT NONAKTIF: perubahan ini tidak akan tampil di game. Centang Aktifkan, lalu Simpan.';
}
const object = () => map.objects.find((o) => o.id === selected),
  marker = () => {
    const [k, t] = selected.split(':');
    return k === 'base' ? map.bases[t] : k === 'prison' ? map.prisons[t] : null;
  };
const baseRadius = () =>
  builtins.find((b) => b.id === map.replaces)?.baseRadius ?? 118;
function image(a) {
  if (!a) return null;
  if (!cache.has(a.asset)) {
    const i = new Image();
    i.src = '/' + a.asset + '?v=' + encodeURIComponent(state.revision);
    i.onerror = () => notice('Gambar gagal dimuat: ' + a.asset, true);
    cache.set(a.asset, i);
  }
  return cache.get(a.asset);
}
function drawAsset(c, a, x, y, w, h, now = 0) {
  const i = image(a);
  if (!i?.complete || !i.naturalWidth) return;
  const f = frameAt(a, now);
  c.drawImage(i, f.x, f.y, f.width, f.height, x, y, w, h);
}
function propertyFields() {
  for (const input of $('properties').querySelectorAll('input,select'))
    input.setCustomValidity('');
  const o = object(),
    v = o ?? marker();
  $('nothing').hidden = !!v;
  $('properties').hidden = !v;
  $('objectOnly').hidden = !o;
  if (!v) return;
  $('objectName').disabled = !o;
  $('objectName').value = o?.name ?? selected;
  for (const k of ['x', 'y', 'w', 'h']) {
    $(k).value = v[k] ?? '';
    $(k).disabled = (k === 'w' || k === 'h') && !('w' in v);
    $(k).setCustomValidity('');
  }
  if (!o) return;
  for (const k of ['behavior', 'shape', 'layer', 'rotation', 'z'])
    $(k).value = o[k];
  for (const k of ['mirror', 'visible', 'locked']) $(k).checked = o[k];
  $('fps').value = o.asset?.fps ?? 12;
  $('fps').disabled = !o.asset;
  $('slow').value = o.slow * 100;
  $('opacity').value = o.opacity * 100;
  $('slowRow').hidden = o.behavior !== 'slow';
  $('editPoints').textContent = pointsMode
    ? 'Selesai edit titik'
    : 'Edit titik polygon';
  nodeFields();
}
function nodeFields() {
  const o = object();
  $('polygonTools').hidden = !pointsMode || !o;
  if (!pointsMode || !o) return;
  $('nodeCount').textContent =
    `${o.points.length} / ${MAX_POLYGON_NODES} titik`;
  $('deleteNode').disabled =
    selectedNode < 0 || o.points.length <= 3 || o.locked;
  $('addNode').disabled = o.points.length >= MAX_POLYGON_NODES || o.locked;
  $('nodes').replaceChildren();
  o.points.forEach((p, index) => {
    const b = document.createElement('button');
    b.textContent = String(index + 1);
    b.title = `Titik${index + 1}: ${Math.round(p.x * o.w)}, ${Math.round(p.y * o.h)}`;
    b.className = index === selectedNode ? 'selected' : '';
    b.onclick = () => {
      selectedNode = index;
      nodeFields();
    };
    $('nodes').append(b);
  });
}
function select(id) {
  selected = id;
  pointsMode = false;
  selectedNode = -1;
  $('polygonTools').hidden = true;
  propertyFields();
  list();
}
function list() {
  const root = $('objects');
  root.replaceChildren();
  const entries = [
    ['base:blue', '⚑ Benteng Merah'],
    ['base:red', '⚑ Benteng Hijau'],
    ['prison:blue', '▣ Penjara Merah'],
    ['prison:red', '▣ Penjara Hijau'],
    ...map.objects.map((o) => [
      o.id,
      `${o.locked ? '🔒 ' : ''}${o.name} · ${o.behavior}`,
    ]),
  ];
  for (const [id, name] of entries) {
    const b = document.createElement('button');
    b.textContent = name;
    b.className = selected === id ? 'selected' : '';
    b.onclick = () => select(id);
    root.append(b);
  }
}
function resize() {
  canvas.width = Math.round(map.width * zoom());
  canvas.height = Math.round(map.height * zoom());
  $('zoomLabel').textContent = Math.round(zoom() * 100) + '%';
}
function fit() {
  $('zoom').value = clamp(
    Math.floor((($('viewport').clientWidth - 22) / map.width) * 100),
    10,
    160,
  );
  resize();
}
function fields() {
  for (const [id, key] of [
    ['mapName', 'name'],
    ['description', 'description'],
    ['width', 'width'],
    ['height', 'height'],
    ['terrainMode', 'terrainMode'],
    ['tileSize', 'tileSize'],
  ]) {
    $(id).value = map[key];
    $(id).setCustomValidity('');
  }
  $('enabled').checked = map.enabled;
  $('unlockIdentity').textContent = map.replaces
    ? `Unlock tetap mengikuti arena asli (${map.replaces}). Edit map tidak menambah syarat baru.`
    : 'Mengedit map ini tidak mengubah ID atau syarat unlock yang sudah ada.';
  propertyFields();
  list();
  resize();
  publishSummary();
}
function blank() {
  return {
    id: 'studio-' + uid().slice(0, 12),
    name: 'Arena baru',
    description: '',
    width: 1800,
    height: 1200,
    enabled: false,
    terrain: null,
    icon: null,
    terrainMode: 'stretch',
    tileSize: 256,
    objects: [],
    bases: { blue: { x: 200, y: 600 }, red: { x: 1600, y: 600 } },
    prisons: {
      blue: { x: 130, y: 880, w: 240, h: 180 },
      red: { x: 1430, y: 140, w: 240, h: 180 },
    },
  };
}
function open(m) {
  if (loading) {
    notice('Tunggu upload selesai.', true);
    return;
  }
  if (
    (dirty || drawing?.length) &&
    !confirm('Tinggalkan perubahan map yang belum disimpan?')
  ) {
    mapChoices();
    return;
  }
  map = structuredClone(m);
  $('save').disabled = false;
  $('test').disabled = false;
  $('duplicateMap').disabled = false;
  document.querySelector('.workspace').inert = false;
  document.querySelector('main > aside:last-child').inert = false;
  for (const id of ['mapName', 'description', 'width', 'height', 'enabled'])
    $(id).disabled = false;
  dirty = !state.document.maps.some((v) => v.id === m.id);
  selected = '';
  history = [];
  future = [];
  testing = false;
  drawing = null;
  $('drawingTools').hidden = true;
  $('testingTools').hidden = true;
  keys.clear();
  $('test').textContent = '▶ Uji cepat';
  fields();
  fit();
  check();
  notice('Siap. Map asli tetap utuh.');
  mapChoices();
}
function add(asset, name = 'Area baru') {
  if (testing) return;
  remember();
  const f = asset?.frames[0],
    w = f ? Math.min(240, f.width) : 160,
    h = f ? (w * f.height) / f.width : 100,
    o = {
      id: 'obj-' + uid(),
      name,
      asset: asset ? structuredClone(asset) : null,
      x: Math.round(map.width / 2 - w / 2),
      y: Math.round(map.height / 2 - h / 2),
      w,
      h,
      rotation: 0,
      opacity: 1,
      layer: 'world',
      z: 0,
      behavior: 'decoration',
      slow: 0.5,
      shape: 'rect',
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      visible: true,
      locked: false,
      mirror: false,
    };
  map.objects.push(o);
  select(o.id);
  return o;
}
function check() {
  const issues = mapIssues(map);
  $('issues').replaceChildren();
  for (const i of issues) {
    const li = document.createElement('li');
    if (i.object) {
      const b = document.createElement('button');
      b.textContent = i.message;
      b.onclick = () => select(i.object);
      li.append(b);
    } else li.textContent = i.message;
    $('issues').append(li);
  }
  if (!issues.length) {
    const li = document.createElement('li');
    li.textContent =
      'Pemeriksaan batas/spawn/jalur lulus. Tetap uji pertandingan sebelum publish.';
    $('issues').append(li);
  }
  return issues;
}
const position = (e) => {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / zoom(), y: (e.clientY - r.top) / zoom() };
};
function local(o, p) {
  const a = (-o.rotation * Math.PI) / 180,
    dx = p.x - o.x - o.w / 2,
    dy = p.y - o.y - o.h / 2;
  return {
    x: (dx * Math.cos(a) - dy * Math.sin(a)) / o.w + 0.5,
    y: (dx * Math.sin(a) + dy * Math.cos(a)) / o.h + 0.5,
  };
}
function world(o, p) {
  const a = (o.rotation * Math.PI) / 180,
    dx = (p.x - 0.5) * o.w,
    dy = (p.y - 0.5) * o.h;
  return {
    x: o.x + o.w / 2 + dx * Math.cos(a) - dy * Math.sin(a),
    y: o.y + o.h / 2 + dx * Math.sin(a) + dy * Math.cos(a),
  };
}
function drawObject(o, now) {
  ctx.save();
  ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
  ctx.rotate((o.rotation * Math.PI) / 180);
  if (o.visible) {
    ctx.globalAlpha = o.opacity;
    if (o.mirror) ctx.scale(-1, 1);
    drawAsset(ctx, o.asset, -o.w / 2, -o.h / 2, o.w, o.h, now);
    if (o.mirror) ctx.scale(-1, 1);
    ctx.globalAlpha = 1;
  }
  if (!$('cleanPreview').checked && ($('bounds').checked || o.id === selected)) {
    ctx.fillStyle = colors[o.behavior] + '25';
    ctx.strokeStyle = o.id === selected ? '#dcffb5' : colors[o.behavior];
    ctx.lineWidth = 2 / zoom();
    ctx.beginPath();
    if (o.shape === 'ellipse')
      ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    else if (o.shape === 'polygon') {
      o.points.forEach((p, i) =>
        i
          ? ctx.lineTo((p.x - 0.5) * o.w, (p.y - 0.5) * o.h)
          : ctx.moveTo((p.x - 0.5) * o.w, (p.y - 0.5) * o.h),
      );
      ctx.closePath();
    } else ctx.rect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  if (o.id === selected && !testing)
    for (const [index, p] of (pointsMode
      ? o.points
      : [{ x: 1, y: 1 }]
    ).entries()) {
      const q = world(o, p);
      ctx.fillStyle =
        selectedNode === index && pointsMode ? '#fff08b' : '#bdff81';
      ctx.fillRect(
        q.x - 5 / zoom(),
        q.y - 5 / zoom(),
        10 / zoom(),
        10 / zoom(),
      );
      if (pointsMode) {
        ctx.font = `${12 / zoom()}px system-ui`;
        ctx.fillText(String(index + 1), q.x + 8 / zoom(), q.y - 7 / zoom());
        const next = o.points[(index + 1) % o.points.length],
          mid = world(o, { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 });
        if (o.points.length < MAX_POLYGON_NODES) {
          ctx.fillStyle = '#102519';
          ctx.beginPath();
          ctx.arc(mid.x, mid.y, 7 / zoom(), 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#b5ed82';
          ctx.font = `${16 / zoom()}px system-ui`;
          ctx.fillText('+', mid.x - 5 / zoom(), mid.y + 5 / zoom());
        }
      }
    }
}
function terrain(now) {
  ctx.fillStyle = '#344936';
  ctx.fillRect(0, 0, map.width, map.height);
  if (!map.terrain) return;
  if (map.terrainMode === 'stretch') {
    drawAsset(ctx, map.terrain, 0, 0, map.width, map.height, now);
    return;
  }
  const a = map.terrain,
    i = image(a);
  if (!i?.complete || !i.naturalWidth) return;
  const f = frameAt(a, now),
    key = [a.asset, f.x, f.y, map.tileSize].join('/');
  if (tileCache?.key !== key) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = map.tileSize;
    drawAsset(tile.getContext('2d'), a, 0, 0, map.tileSize, map.tileSize, now);
    tileCache = { key, pattern: ctx.createPattern(tile, 'repeat') };
  }
  ctx.fillStyle = tileCache.pattern;
  ctx.fillRect(0, 0, map.width, map.height);
}
function testStep(now, dt) {
  if (!testing) return;
  const dx =
      (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
      (keys.has('a') || keys.has('arrowleft') ? 1 : 0),
    dy =
      (keys.has('s') || keys.has('arrowdown') ? 1 : 0) -
      (keys.has('w') || keys.has('arrowup') ? 1 : 0),
    jumping = now < jumpUntil;
  const result = moveDummy(map, player, dx, dy, dt, jumping, keys.has(' '));
  player = {
    ...player,
    x: result.x,
    y: result.y,
    moving: !!(dx || dy),
    facing: dx || player.facing || 1,
  };
  if (result.fallen) {
    player = { ...map.bases.blue };
    falls++;
    notice(
      'Terjatuh! Kembali ke benteng Merah. Shift untuk lompat; jembatan aman.',
    );
  }
  const atBase = Object.entries(map.bases).find(
    ([, b]) => Math.hypot(player.x - b.x, player.y - b.y) < baseRadius(),
  );
  const atPrison = Object.entries(map.prisons).find(
    ([, p]) =>
      player.x >= p.x &&
      player.x <= p.x + p.w &&
      player.y >= p.y &&
      player.y <= p.y + p.h,
  );
  dummyStatus = result.fallen
    ? 'Jatuh → kembali ke benteng'
    : jumping
      ? 'Lompat / parkour'
      : result.blocked
        ? 'TERHALANG collider solid'
        : result.multiplier < 1
          ? `Lambat ×${result.multiplier}`
          : atPrison
            ? `Area penjara ${atPrison[0] === 'blue' ? 'Merah' : 'Hijau'}`
            : atBase
              ? `Area benteng ${atBase[0] === 'blue' ? 'Merah' : 'Hijau'}`
              : 'Berjalan / area aman';
  $('dummyStatus').textContent =
    `Dummy · ${dummyStatus} · X${Math.round(player.x)} Y${Math.round(player.y)} · jatuh${falls}`;
}
function drawDummy(now) {
  const x = player.x,
    y = player.y,
    lift = now < jumpUntil ? 25 : 0,
    stride = player.moving ? Math.sin(now / 85) * 6 : 0;
  ctx.save();
  ctx.fillStyle = '#0007';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y - lift);
  ctx.strokeStyle = '#edf5fa';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, -12);
  ctx.lineTo(-8 - stride, -1);
  ctx.moveTo(5, -12);
  ctx.lineTo(8 + stride, -1);
  ctx.stroke();
  ctx.fillStyle = '#52cbe2';
  ctx.fillRect(-11, -33, 22, 24);
  ctx.fillStyle = '#ffdaa6';
  ctx.beginPath();
  ctx.arc(0, -43, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#21313d';
  ctx.fillRect((player.facing || 1) * 4 - 2, -46, 4, 4);
  if ($('bounds').checked) {
    ctx.strokeStyle = '#fff08b';
    ctx.lineWidth = 2 / zoom();
    ctx.beginPath();
    ctx.arc(0, lift, 13, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.font = `${12 / zoom()}px system-ui`;
  ctx.fillText('DUMMY', -22 / zoom(), -62);
  ctx.restore();
}
function drawGameplayAssets(now, overlay = false) {
  if (!$('structures').checked) return;
  const native = builtins.find(b => b.id === map.replaces);
  // Authored Taman/Kanal backgrounds already contain the native structures.
  // Do not paint unrelated generic structures over the same pixels.
  if (native?.structuresInBackground && map.terrain?.asset === 'field/' + native.background) return;
  const scale = builtins.find((b) => b.id === map.replaces)?.objectScale ?? 1;
  for (const t of ['blue', 'red']) {
    const b = map.bases[t],
      p = map.prisons[t];
    const clip = (name) => library.find((a) => a.name === name)?.clip;
    if (!overlay)
      drawAsset(
        ctx,
        clip(t === 'blue' ? 'fortRed' : 'fortGreen'),
        b.x - 84 * scale,
        b.y - 130 * scale,
        168 * scale,
        188 * scale,
        now,
      );
    ctx.save();
    ctx.translate(p.x + (t === 'red' ? p.w : 0), p.y);
    if (t === 'red') ctx.scale(-1, 1);
    drawAsset(
      ctx,
      clip(overlay ? 'prisonOverlay' : 'prisonFloor'),
      0,
      0,
      p.w,
      p.h,
      now,
    );
    ctx.restore();
  }
}
function drawGuides() {
  if ($('cleanPreview').checked) return;
  for (const t of ['blue', 'red']) {
    const b = map.bases[t],
      p = map.prisons[t],
      color = t === 'blue' ? '#ff6b6b' : '#a0e76f';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = (selected.endsWith(':' + t) ? 4 : 2) / zoom();
    ctx.beginPath();
    ctx.arc(b.x, b.y, baseRadius(), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(p.x, p.y, p.w, p.h);
    ctx.font = `bold ${13 / zoom()}px system-ui`;
    ctx.fillText(
      '⚑ BENTENG ' + (t === 'blue' ? 'MERAH' : 'HIJAU'),
      b.x - 45,
      b.y + baseRadius() + 16,
    );
    ctx.fillText(
      '▣ PENJARA ' + (t === 'blue' ? 'MERAH' : 'HIJAU'),
      p.x,
      p.y - 8 / zoom(),
    );
  }
}
function animate(now) {
  requestAnimationFrame(animate);
  if (!map || document.hidden) {
    last = now;
    return;
  }
  const dt = clamp((now - last) / 1000, 0, 0.04);
  last = now;
  testStep(now, dt);
  ctx.setTransform(zoom(), 0, 0, zoom(), 0, 0);
  terrain(now);
  drawGameplayAssets(now);
  if ($('grid').checked) {
    ctx.strokeStyle = '#ffffff18';
    ctx.lineWidth = 1 / zoom();
    ctx.beginPath();
    for (let x = 0; x < map.width; x += 20) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.height);
    }
    for (let y = 0; y < map.height; y += 20) {
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
    }
    ctx.stroke();
  }
  const entries = map.objects
    .filter(
      (o) =>
        $('layerFilter').value === 'all' || o.layer === $('layerFilter').value,
    )
    .map((o) => ({
      layer: layers.indexOf(o.layer),
      y: o.y + o.h,
      z: o.z,
      draw: () => drawObject(o, now),
    }));
  entries.push({
    layer: 1,
    y: testing ? player.y : 0,
    z: 0,
    draw: () => {
      if (testing) drawDummy(now);
    },
  });
  entries
    .sort((a, b) => a.layer - b.layer || a.z - b.z || a.y - b.y)
    .forEach((e) => e.draw());
  drawGameplayAssets(now, true);
  drawGuides();
  if (drawing) {
    ctx.strokeStyle = '#e7ff93';
    ctx.fillStyle = '#e7ff9325';
    ctx.lineWidth = 2 / zoom();
    ctx.beginPath();
    drawing.forEach((p, i) =>
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
    );
    if (pointer) ctx.lineTo(pointer.x, pointer.y);
    ctx.stroke();
    drawing.forEach((p, i) => {
      ctx.fillStyle = '#e7ff93';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5 / zoom(), 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${13 / zoom()}px system-ui`;
      ctx.fillText(String(i + 1), p.x + 8 / zoom(), p.y);
    });
  }
  const ic = $('iconPreview').getContext('2d');
  ic.clearRect(0, 0, ic.canvas.width, ic.canvas.height);
  const artwork = map.icon ?? builtinTemplates.find(m => m.replaces === map.replaces)?.icon ??
    (map.terrain?.frames.length === 1 ? map.terrain : null);
  drawAsset(ic, artwork, 0, 0, ic.canvas.width, ic.canvas.height, now);
}
canvas.onpointerdown = (e) => {
  canvas.focus();
  const p = position(e);
  if (drawing) {
    if (drawing.length >= MAX_POLYGON_NODES)
      return notice('Maksimal64 titik. Klik Selesai.', true);
    drawing.push({
      x: clamp(snap(p.x), 0, map.width),
      y: clamp(snap(p.y), 0, map.height),
    });
    $('drawingCount').textContent = `${drawing.length} titik`;
    $('finishPolygon').disabled = drawing.length < 3;
    return;
  }
  if (testing) {
    if (!solidAt(map, p.x, p.y) && !waterAt(map, p.x, p.y)) player = p;
    return;
  }
  const o = object();
  if (o && !o.locked) {
    if (pointsMode) {
      const n = o.points.findIndex((v) => {
        const q = world(o, v);
        return Math.hypot(q.x - p.x, q.y - p.y) < 12 / zoom();
      });
      if (n >= 0) {
        selectedNode = n;
        remember();
        if (e.shiftKey && o.points.length > 3) {
          o.points.splice(n, 1);
          selectedNode = -1;
          nodeFields();
          return;
        }
        drag = { kind: 'point', index: n };
        canvas.setPointerCapture(e.pointerId);
        nodeFields();
        return;
      }
      if (o.points.length < MAX_POLYGON_NODES) {
        const edge = o.points.findIndex((a, index) => {
          const b = o.points[(index + 1) % o.points.length];
          const mid = world(o, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          return Math.hypot(mid.x - p.x, mid.y - p.y) < 12 / zoom();
        });
        if (edge >= 0) {
          remember();
          const a = o.points[edge],
            b = o.points[(edge + 1) % o.points.length];
          o.points.splice(edge + 1, 0, {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
          });
          selectedNode = edge + 1;
          nodeFields();
          return;
        }
      }
      return; // Node editing never starts an object drag or steals a gameplay marker.
    } else {
      const q = world(o, { x: 1, y: 1 });
      if (Math.hypot(q.x - p.x, q.y - p.y) < 14 / zoom()) {
        remember();
        drag = { kind: 'resize', initial: structuredClone(o) };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
    }
  }
  let id = '';
  for (const t of ['blue', 'red']) {
    const b = map.bases[t],
      pr = map.prisons[t];
    if (Math.hypot(p.x - b.x, p.y - b.y) < baseRadius()) id = 'base:' + t;
    else if (
      p.x >= pr.x &&
      p.x <= pr.x + pr.w &&
      p.y >= pr.y &&
      p.y <= pr.y + pr.h
    )
      id = 'prison:' + t;
  }
  if (!id)
    id =
      map.objects
        .filter(
          (v) =>
            (v.visible || $('bounds').checked) &&
            !v.locked &&
            ($('layerFilter').value === 'all' ||
              v.layer === $('layerFilter').value),
        )
        .sort(
          (a, b) =>
            layers.indexOf(b.layer) - layers.indexOf(a.layer) ||
            b.z - a.z ||
            b.y + b.h - (a.y + a.h),
        )
        .find((v) => contains({ ...v, shape: 'rect' }, p.x, p.y))?.id ?? '';
  if (id !== selected || !pointsMode) select(id);
  const v = object() ?? marker();
  if (v && !v.locked) {
    remember();
    drag = { kind: 'move', offset: { x: p.x - v.x, y: p.y - v.y } };
    canvas.setPointerCapture(e.pointerId);
  }
};
canvas.onpointermove = (e) => {
  if (drawing) {
    pointer = position(e);
    return;
  }
  if (!drag) return;
  const p = position(e),
    o = object(),
    v = o ?? marker();
  if (!v) return;
  if (drag.kind === 'point') {
    const q = local(o, p);
    o.points[drag.index] = { x: clamp(q.x, 0, 1), y: clamp(q.y, 0, 1) };
  } else if (drag.kind === 'resize') {
    const s = drag.initial,
      a = (s.rotation * Math.PI) / 180,
      anchor = world(s, { x: 0, y: 0 }),
      dx = p.x - anchor.x,
      dy = p.y - anchor.y;
    v.w = clamp(snap(dx * Math.cos(a) + dy * Math.sin(a)), 10, map.width);
    v.h = $('ratio').checked
      ? clamp((v.w * s.h) / s.w, 10, map.height)
      : clamp(snap(dy * Math.cos(a) - dx * Math.sin(a)), 10, map.height);
    v.x = clamp(
      anchor.x + (Math.cos(a) * v.w) / 2 - (Math.sin(a) * v.h) / 2 - v.w / 2,
      0,
      map.width - v.w,
    );
    v.y = clamp(
      anchor.y + (Math.sin(a) * v.w) / 2 + (Math.cos(a) * v.h) / 2 - v.h / 2,
      0,
      map.height - v.h,
    );
  } else {
    v.x = clamp(
      snap(p.x - drag.offset.x),
      selected.startsWith('base:') ? 80 : 0,
      map.width - (v.w ?? 80),
    );
    v.y = clamp(
      snap(p.y - drag.offset.y),
      selected.startsWith('base:') ? 100 : 0,
      map.height - (v.h ?? 80),
    );
  }
  propertyFields();
};
canvas.onpointerup = canvas.onpointercancel = () => {
  drag = null;
};
canvas.ondblclick = (e) => {
  const o = object();
  if (
    !o ||
    !pointsMode ||
    testing ||
    o.locked ||
    o.points.length >= MAX_POLYGON_NODES
  )
    return;
  const q = local(o, position(e));
  if (q.x < 0 || q.x > 1 || q.y < 0 || q.y > 1) return;
  remember();
  const edge = closestEdge(o.points, q, o.w, o.h);
  o.points.splice(edge + 1, 0, q);
  selectedNode = edge + 1;
  nodeFields();
};
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.key === 'Escape') {
    if (drawing) cancelDrawing();
    else if (pointsMode) {
      pointsMode = false;
      propertyFields();
    } else if (testing) $('test').click();
    return;
  }
  if (e.key === 'Enter' && drawing) {
    e.preventDefault();
    $('finishPolygon').click();
    return;
  }
  if (testing) {
    if (
      [
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
        ' ',
        'shift',
        'w',
        'a',
        's',
        'd',
      ].includes(e.key.toLowerCase())
    )
      e.preventDefault();
    if (e.key === 'Shift' && !e.repeat && performance.now() > jumpUntil + 400)
      jumpUntil = performance.now() + 450;
    keys.add(e.key.toLowerCase());
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    $('undo').click();
  } else if (e.key === 'Delete' && object())
    (pointsMode ? $('deleteNode') : $('delete')).click();
});
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('beforeunload', (e) => {
  if (dirty || drawing?.length) {
    e.preventDefault();
  }
});
function editField(el, mutate) {
  const candidate = structuredClone(map);
  try {
    mutate(candidate);
    validateMap(candidate);
    el.setCustomValidity('');
    remember();
    map = candidate;
  } catch (e) {
    el.setCustomValidity(e.message);
    notice(e.message, true);
  }
}
for (const [id, key] of [
  ['mapName', 'name'],
  ['description', 'description'],
  ['width', 'width'],
  ['height', 'height'],
  ['terrainMode', 'terrainMode'],
  ['tileSize', 'tileSize'],
]) {
  const el = $(id);
  el.oninput = () => {
    if (testing || loading) return;
    editField(el, (m) => {
      m[key] = ['width', 'height', 'tileSize'].includes(key)
        ? +el.value
        : el.value;
    });
    resize();
  };
  el.onchange = el.oninput;
}
$('enabled').onchange = () => {
  if (testing) return;
  remember();
  map.enabled = $('enabled').checked;
  check();
  publishSummary();
};
for (const k of [
  'x',
  'y',
  'w',
  'h',
  'rotation',
  'z',
  'objectName',
  'behavior',
  'shape',
  'layer',
  'fps',
  'slow',
  'opacity',
  'mirror',
  'visible',
  'locked',
]) {
  const el = $(k),
    handler = () => {
      if (testing || loading || (!object() && !marker())) return;
      editField(el, (m) => {
        const o = m.objects.find((v) => v.id === selected),
          [kind, t] = selected.split(':'),
          v = o ?? (kind === 'base' ? m.bases[t] : m.prisons[t]);
        if (k === 'fps' && o.asset) o.asset.fps = +el.value;
        else if (['mirror', 'visible', 'locked'].includes(k)) o[k] = el.checked;
        else if (k === 'objectName') o.name = el.value;
        else if (['slow', 'opacity'].includes(k)) o[k] = +el.value / 100;
        else if (['behavior', 'shape', 'layer'].includes(k)) o[k] = el.value;
        else v[k] = +el.value;
      });
      $('slowRow').hidden = object()?.behavior !== 'slow';
      list();
    };
  el.oninput = handler;
  el.onchange = handler;
}
$('editPoints').onclick = () => {
  const o = object();
  if (!o || testing || o.locked) return;
  remember();
  o.shape = 'polygon';
  pointsMode = !pointsMode;
  propertyFields();
};
$('addNode').onclick = () => {
  const o = object();
  if (!o || !pointsMode || o.locked || o.points.length >= MAX_POLYGON_NODES)
    return;
  remember();
  const edge = selectedNode < 0 ? o.points.length - 1 : selectedNode,
    a = o.points[edge],
    b = o.points[(edge + 1) % o.points.length];
  o.points.splice(edge + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  selectedNode = edge + 1;
  nodeFields();
};
$('deleteNode').onclick = () => {
  const o = object();
  if (!o || !pointsMode || o.locked || selectedNode < 0 || o.points.length <= 3)
    return;
  remember();
  o.points.splice(selectedNode, 1);
  selectedNode = -1;
  nodeFields();
};
function cancelDrawing() {
  drawing = null;
  pointer = null;
  $('drawingTools').hidden = true;
  notice('Gambar poligon dibatalkan; tidak ada objek dibuat.');
}
$('polygon').onclick = () => {
  if (testing || loading) return;
  select('');
  drawing = [];
  pointer = null;
  $('drawingTools').hidden = false;
  $('drawingCount').textContent = '0 titik';
  $('finishPolygon').disabled = true;
  canvas.focus();
  notice(
    'Klik canvas mengikuti batas collider, lalu klik Selesai / Enter. Esc membatalkan.',
  );
};
$('cancelPolygon').onclick = cancelDrawing;
$('finishPolygon').onclick = safe(() => {
  if (!drawing) return;
  const bounds = polygonBounds(drawing);
  const o = add(null, 'Collider poligon');
  Object.assign(o, bounds, { shape: 'polygon', behavior: 'solid' });
  drawing = null;
  pointer = null;
  $('drawingTools').hidden = true;
  $('bounds').checked = true;
  pointsMode = true;
  propertyFields();
  list();
  check();
  notice(
    'Collider poligon dibuat. Klik＋untuk menambah titik; seret titik untuk membentuk ulang.',
  );
});
$('solidArea').onclick = () => {
  if (testing || loading) return;
  const o = add(null, 'Collider kosong');
  o.behavior = 'solid';
  $('bounds').checked = true;
  propertyFields();
  list();
  check();
  notice(
    'Collider kosong dibuat. Pilih Edit titik polygon untuk bentuk bebas.',
  );
};
$('undo').onclick = () => {
  if (!history.length || testing) return;
  future.push(structuredClone(map));
  map = history.pop();
  dirty = true;
  fields();
};
$('redo').onclick = () => {
  if (!future.length || testing) return;
  history.push(structuredClone(map));
  map = future.pop();
  dirty = true;
  fields();
};
$('new').onclick = () => open(blank());
$('clone').onclick = () => {
  const m = structuredClone(template);
  m.id = 'studio-kampung-' + uid().slice(0, 8);
  open(m);
};
$('duplicateMap').onclick = () => {
  const m = structuredClone(map);
  delete m.replaces;
  delete m.archived;
  delete m.deleted;
  m.id = 'studio-copy-' + uid().slice(0, 8);
  m.name += ' — salinan';
  m.enabled = false;
  open(m);
};
$('maps').onchange = () => {
  const value = $('maps').value;
  if (value.startsWith('builtin:')) {
    const id = value.slice(8),
      saved = state.document.maps.find((m) => m.replaces === id),
      source = builtinTemplates.find((m) => m.replaces === id);
    if (source) open(saved ?? source);
    else {
      if (
        dirty &&
        !confirm('Tinggalkan draft yang belum disimpan untuk mengelola map 3D?')
      ) {
        mapChoices();
        return;
      }
      dirty = false;
      $('save').disabled = true;
      $('test').disabled = true;
      $('duplicateMap').disabled = true;
      document.querySelector('.workspace').inert = true;
      document.querySelector('main > aside:last-child').inert = true;
      for (const id of ['mapName', 'description', 'width', 'height', 'enabled'])
        $(id).disabled = true;
      $('mapOrigin').textContent =
        'Map 3D: hanya pengelolaan daftar (Arsip/Sampah/Pulihkan). Canvas sebelumnya bukan preview 3D.';
      notice(
        'Edit visual map 3D belum didukung. Anda bisa mengatur Arsip/Sampah dari tombol di kiri.',
      );
    }
  } else {
    const m = state.document.maps.find((m) => m.id === value);
    if (m) open(m);
  }
};
$('showArchived').onchange = mapChoices;
async function manageMap(action) {
  if (loading || testing)
    throw new Error('Selesaikan upload/uji cepat dahulu.');
  const value = $('maps').value;
  if (!value)
    throw new Error('Pilih map yang sudah tersimpan atau map bawaan dahulu.');
  if (dirty && !confirm('Perubahan belum disimpan akan ditinggalkan. Lanjut?'))
    return;
  if (
    ['delete', 'reset'].includes(action) &&
    !confirm(
      action === 'delete'
        ? 'Pindahkan map ke Sampah? Data dan aset tetap tersedia untuk dipulihkan.'
        : 'Pulihkan map bawaan asli? Versi editor akan dilepas dari daftar; backup tetap tersimpan.',
    )
  )
    return;
  const id = value.startsWith('builtin:') ? value.slice(8) : value,
    r = await api('/api/manage', { id, action });
  state.document = r.document;
  state.revision = r.revision;
  dirty = false;
  $('showArchived').checked = true;
  if (value.startsWith('builtin:')) {
    const m =
      r.document.maps.find((m) => m.replaces === id) ??
      builtinTemplates.find((m) => m.replaces === id);
    if (m) open(m);
  } else {
    const m = r.document.maps.find((m) => m.id === id);
    if (m) open(m);
  }
  dirty = false;
  mapChoices();
  publishSummary();
  if (id === 'kampung3d') $('maps').value = value;
  notice(
    action === 'archive'
      ? 'Map diarsipkan. Build/publish untuk menyembunyikannya di game.'
      : action === 'delete'
        ? 'Map dipindahkan ke Sampah, tidak menghapus aset. Build/publish untuk menerapkan.'
        : action === 'reset'
          ? 'Versi asli dipulihkan. Build/publish untuk menerapkan.'
          : 'Map dipulihkan sebagai draft; centang Aktifkan jika ingin memakai versi editor.',
  );
}
for (const [id, action] of [
  ['archiveMap', 'archive'],
  ['deleteMap', 'delete'],
  ['restoreMap', 'restore'],
  ['resetMap', 'reset'],
])
  $(id).onclick = safe(() => manageMap(action));
$('area').onclick = () => add(null);
$('duplicate').onclick = () => {
  const o = object();
  if (!o || testing) return;
  remember();
  const c = structuredClone(o);
  c.id = 'obj-' + uid();
  c.name += ' salinan';
  c.x = clamp(c.x + 20, 0, map.width - c.w);
  c.y = clamp(c.y + 20, 0, map.height - c.h);
  map.objects.push(c);
  select(c.id);
};
$('delete').onclick = () => {
  if (!object() || testing) return;
  remember();
  map.objects = map.objects.filter((o) => o.id !== selected);
  select('');
};
$('removeImage').onclick = () => {
  if (!object() || testing) return;
  remember();
  object().asset = null;
  propertyFields();
};
$('separateCollider').onclick = () => {
  const o = object();
  if (!o || testing) return;
  remember();
  const c = structuredClone(o);
  c.id = 'obj-' + uid();
  c.name = 'Batas ' + o.name;
  c.asset = null;
  c.behavior = o.behavior === 'decoration' ? 'solid' : o.behavior;
  o.behavior = 'decoration';
  c.visible = true;
  map.objects.push(c);
  select(c.id);
  notice('Batas terpisah dibuat. Atur batas tanpa mengubah gambar.');
};
for (const k of ['Terrain', 'Icon'])
  $('clear' + k).onclick = () => {
    remember();
    map[k.toLowerCase()] = null;
  };
$('zoom').oninput = resize;
$('clearWaterMask').onclick = () => {
  if (!map.waterMask) {
    notice('Map tidak memiliki mask air bawaan.');
    return;
  }
  if (
    !confirm(
      'Hapus mask sungai bawaan? Grafik air tetap di terrain; buat area air baru jika masih diperlukan.',
    )
  )
    return;
  remember();
  delete map.waterMask;
  notice(
    'Mask air bawaan dilepas. Anda dapat menggantinya dengan area air/polygon atau jembatan.',
  );
  check();
};
$('fit').onclick = fit;
$('validate').onclick = safe(() => {
  validateMap(map);
  check();
});
function mapChoices() {
  $('maps').replaceChildren(new Option('Pilih map…', ''));
  const show = $('showArchived').checked;
  const status = (m) =>
    m.deleted ? 'Sampah' : m.archived ? 'Arsip' : m.enabled ? 'Aktif' : 'Draft';
  for (const b of builtins) {
    const m = state.document.maps.find((m) => m.replaces === b.id),
      s = state.document.builtinStates?.[b.id] ?? 'active',
      hidden = s !== 'active';
    if (!show && hidden) continue;
    $('maps').add(
      new Option(
        `[Bawaan${m ? ' · versi editor' : ''}${hidden ? ' · ' + (s === 'deleted' ? 'Sampah' : 'Arsip') : ''}] ${m?.name ?? b.name}${b.editable ? '' : ' · 3D (daftar saja)'}`,
        'builtin:' + b.id,
      ),
    );
  }
  for (const m of state.document.maps)
    if (!m.replaces && (show || (!m.archived && !m.deleted)))
      $('maps').add(new Option(`[${status(m)}] ${m.name}`, m.id));
  $('maps').value = map.replaces ? 'builtin:' + map.replaces : map.id;
  $('resetMap').disabled = !map.replaces;
  $('mapOrigin').textContent = map.replaces
    ? `Versi pengganti ${map.replaces}. Simpan draft lalu Aktifkan untuk mengganti di game; Pulihkan versi asli untuk membatalkan. ${map.archived ? 'ARSIP. ' : ''}${map.deleted ? 'SAMPAH. ' : ''}Bangunan pada gambar terrain bawaan tetap menyatu di latar; gunakan Preview bersih untuk melihatnya tanpa garis collider.`
    : 'Map buatan editor. Arsip/Sampah tidak menghapus aset. Perubahan daftar berlaku setelah Build/publish.';
}
$('save').onclick = safe(async () => {
  if (loading) return;
  if (drawing)
    throw new Error('Klik Selesai poligon atau Batal sebelum menyimpan.');
  for (const el of document.querySelectorAll('input,textarea,select'))
    if (!el.disabled && !el.checkValidity()) {
      el.reportValidity();
      throw new Error('Perbaiki nilai field yang ditandai sebelum menyimpan.');
    }
  map = validateMap(map);
  if (map.archived || map.deleted) {
    map.enabled = false;
    throw new Error(
      'Pulihkan map dari Arsip/Sampah sebelum mengedit dan menyimpan.',
    );
  }
  check();
  const r = await api('/api/save', { map });
  state.document = r.document;
  state.revision = r.revision;
  dirty = false;
  mapChoices();
  notice(
    map.enabled
      ? 'Map disimpan dan aktif. Build/publish untuk menerapkan.'
      : 'Draft disimpan lokal; tidak muncul di game sebelum diaktifkan.',
  );
  publishSummary();
});
$('test').onclick = () => {
  if (loading || drawing)
    return notice('Selesaikan upload atau gambar poligon dahulu.', true);
  testing = !testing;
  pointsMode = false;
  $('polygonTools').hidden = true;
  propertyFields();
  keys.clear();
  player = { ...map.bases.blue };
  jumpUntil = 0;
  falls = 0;
  $('testingTools').hidden = !testing;
  for (const aside of document.querySelectorAll('main > aside'))
    aside.inert = testing;
  for (const id of [
    'undo',
    'redo',
    'save',
    'build',
    'publish',
    'polygon',
    'solidArea',
  ])
    $(id).disabled = testing;
  canvas.focus();
  $('test').textContent = testing ? '■ Selesai uji' : '▶ Uji cepat';
  $('hint').textContent = testing
    ? 'WASD/panah = jalan · Shift = lompat · Space = boost · klik area aman untuk titik mulai. Simulasi area, bukan pertandingan lengkap.'
    : 'Klik/seret objek; tarik sudut untuk ukuran. Koleksi aset dapat diseret ke canvas.';
  notice(
    testing
      ? 'Uji cepat aktif. Solid/parkour/air/lambat memakai model yang sama dengan game.'
      : 'Kembali ke editor.',
  );
};
$('spawnRed').onclick = () => {
  if (testing) {
    player = { ...map.bases.blue };
    jumpUntil = 0;
    keys.clear();
    canvas.focus();
  }
};
$('spawnGreen').onclick = () => {
  if (testing) {
    player = { ...map.bases.red };
    jumpUntil = 0;
    keys.clear();
    canvas.focus();
  }
};
$('jumpDummy').onclick = () => {
  if (testing && performance.now() > jumpUntil + 400)
    jumpUntil = performance.now() + 450;
  canvas.focus();
};
$('boostDummy').onclick = () => {
  if (!testing) return;
  keys.add(' ');
  setTimeout(() => keys.delete(' '), 800);
  canvas.focus();
};
for (const button of document.querySelectorAll('[data-move]')) {
  button.onpointerdown = (e) => {
    if (!testing) return;
    keys.add(button.dataset.move);
    button.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  button.onpointerup = button.onpointercancel = () =>
    keys.delete(button.dataset.move);
}
async function job(publish) {
  if (dirty)
    throw new Error(
      'Simpan map dahulu. Draft canvas belum ikut build/publish.',
    );
  if (drawing || testing) throw new Error('Selesaikan mode gambar/uji dahulu.');
  if (publish && !map.enabled)
    notice(
      'Perhatian: map ini masih draft nonaktif. Publish menyimpan data, bukan otomatis mengaktifkannya.',
    );
  for (const id of ['save', 'build', 'publish']) $(id).disabled = true;
  try {
    notice((await api(publish ? '/api/publish' : '/api/build', {})).message);
  } catch (e) {
    for (const id of ['save', 'build', 'publish']) $(id).disabled = false;
    throw e;
  }
  const timer = setInterval(async () => {
    try {
      const j = await api('/api/job');
      notice(j.message, j.status === 'error');
      if (j.status !== 'running') {
        clearInterval(timer);
        for (const id of ['save', 'build', 'publish']) $(id).disabled = false;
        if (j.url) {
          const a = document.createElement('a');
          a.href = j.url;
          a.target = '_blank';
          a.rel = 'noreferrer';
          a.textContent = ' Buka hasil ↗';
          $('status').append(a);
        }
      }
    } catch (e) {
      clearInterval(timer);
      for (const id of ['save', 'build', 'publish']) $(id).disabled = false;
      notice(e.message, true);
    }
  }, 2000);
}
$('build').onclick = safe(() => job(false));
$('publish').onclick = safe(() => job(true));
async function uploadFile(f, target) {
  if (loading || testing) throw new Error('Selesaikan upload/uji cepat dahulu.');
  if ($('maps').value === 'builtin:kampung3d')
    throw new Error('Pilih map 2D untuk upload/edit.');
  if (!f) return;
  if (f.size > 30 * 1024 * 1024)
    throw new Error('File ditolak: maksimal 30 MB.');
  const selectedBefore = selected;
  if (target === 'replace' && !object()) throw new Error('Pilih objek dahulu.');
  if (uploadUrl) URL.revokeObjectURL(uploadUrl);
  uploadUrl = URL.createObjectURL(f);
  $('uploadPreview').src = uploadUrl;
  $('uploadPreview').hidden = false;
  loading = true;
  $('save').disabled = true;
  notice('Preview sumber tampil. Memeriksa dan memproses file…');
  try {
    const data = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () =>
          typeof r.result === 'string'
            ? resolve(r.result.split(',')[1])
            : reject(new Error('File gagal dibaca sebagai gambar.'));
        r.onerror = () => reject(new Error('File gagal dibaca.'));
        r.readAsDataURL(f);
      }),
      result = await api('/api/upload', {
        kind: target,
        file: { name: f.name, data },
      });
    if (target === 'object') add(result.asset, f.name.replace(/\.[^.]+$/, ''));
    else {
      remember();
      if (target === 'terrain') map.terrain = result.asset;
      else if (target === 'icon') map.icon = result.asset;
      else {
        const o = map.objects.find((o) => o.id === selectedBefore);
        if (!o) throw new Error('Objek berubah. Upload ulang.');
        o.asset = result.asset;
      }
    }
    propertyFields();
    notice(
      `File diterima · ${result.asset.frames.length} frame. Simpan map setelah penempatan selesai.`,
    );
  } finally {
    loading = false;
    $('save').disabled = false;
  }
}
$('file').onchange = safe(() => uploadFile($('file').files[0], $('uploadKind').value));
$('chooseMapPreview').onclick = () => $('mapPreviewFile').click();
$('mapPreviewFile').onchange = safe(async () => {
  try { await uploadFile($('mapPreviewFile').files[0], 'icon'); }
  finally { $('mapPreviewFile').value = ''; }
});
function renderLibrary() {
  const q = $('search').value.toLowerCase();
  $('library').replaceChildren();
  for (const item of library.filter((i) => i.name.toLowerCase().includes(q))) {
    const b = document.createElement('button'),
      thumb = document.createElement('canvas');
    thumb.width = thumb.height = 48;
    const i = image(item.clip),
      paint = () => {
        const f = item.clip.frames[0],
          r = Math.min(46 / f.width, 46 / f.height);
        drawAsset(
          thumb.getContext('2d'),
          item.clip,
          (48 - f.width * r) / 2,
          (48 - f.height * r) / 2,
          f.width * r,
          f.height * r,
        );
      };
    if (i.complete) paint();
    else i.addEventListener('load', paint, { once: true });
    b.append(thumb, document.createTextNode(item.name));
    b.onclick = () => {
      if (!loading) add(item.clip, item.name);
    };
    b.draggable = true;
    b.ondragstart = (e) =>
      e.dataTransfer.setData('application/map-studio-asset', item.name);
    $('library').append(b);
  }
}
$('search').oninput = renderLibrary;
canvas.ondragover = (e) => e.preventDefault();
canvas.ondrop = (e) => {
  e.preventDefault();
  if (testing || loading) return;
  const i = library.find(
    (i) => i.name === e.dataTransfer.getData('application/map-studio-asset'),
  );
  if (!i) return;
  add(i.clip, i.name);
  const p = position(e),
    o = object();
  o.x = clamp(snap(p.x - o.w / 2), 0, map.width - o.w);
  o.y = clamp(snap(p.y - o.h / 2), 0, map.height - o.h);
  propertyFields();
};
document.querySelector('main').inert = true;
for (const b of document.querySelectorAll('nav button')) b.disabled = true;
void safe(async () => {
  state = await api('/api/state');
  const t = validateCatalog(await api('/api/templates'));
  template = t.template;
  builtinTemplates = t.builtinTemplates;
  builtins = t.builtins;
  library = t.library;
  map = state.document.maps.find((m) => !m.archived && !m.deleted) ?? blank();
  fields();
  fit();
  mapChoices();
  renderLibrary();
  check();
  document.querySelector('main').inert = false;
  for (const b of document.querySelectorAll('nav button')) b.disabled = false;
  notice(
    'Map Studio siap · lokal. Mulai dengan Map kosong atau Salin Kampung.',
  );
  requestAnimationFrame(animate);
})();
