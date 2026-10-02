import {
  contains,
  solidAt,
  waterAt,
  speedAt,
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
  library = [],
  selected = '',
  dirty = false,
  history = [],
  future = [],
  drag = null,
  pointsMode = false,
  testing = false,
  player,
  last = 0,
  jumpUntil = 0,
  keys = new Set(),
  loading = false,
  uploadUrl,
  tileCache;
const cache = new Map(),
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
}
const object = () => map.objects.find((o) => o.id === selected),
  marker = () => {
    const [k, t] = selected.split(':');
    return k === 'base' ? map.bases[t] : k === 'prison' ? map.prisons[t] : null;
  };
function image(a) {
  if (!a) return null;
  if (!cache.has(a.asset)) {
    const i = new Image();
    i.src = '/' + a.asset;
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
}
function select(id) {
  selected = id;
  pointsMode = false;
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
  propertyFields();
  list();
  resize();
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
  if (dirty && !confirm('Tinggalkan perubahan map yang belum disimpan?'))
    return;
  map = structuredClone(m);
  dirty = !state.document.maps.some((v) => v.id === m.id);
  selected = '';
  history = [];
  future = [];
  testing = false;
  keys.clear();
  $('test').textContent = '▶ Uji cepat';
  fields();
  fit();
  check();
  notice('Siap. Map asli tetap utuh.');
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
  if ($('bounds').checked || o.id === selected) {
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
    for (const p of pointsMode ? o.points : [{ x: 1, y: 1 }]) {
      const q = world(o, p);
      ctx.fillStyle = '#bdff81';
      ctx.fillRect(
        q.x - 5 / zoom(),
        q.y - 5 / zoom(),
        10 / zoom(),
        10 / zoom(),
      );
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
    len = Math.hypot(dx, dy) || 1,
    speed = 210 * speedAt(map, player.x, player.y) * (keys.has(' ') ? 1.7 : 1),
    jumping = now < jumpUntil;
  for (let n = 0; n < 4; n++) {
    const x = clamp(
        player.x + ((dx / len) * speed * dt) / 4,
        20,
        map.width - 20,
      ),
      y = clamp(player.y + ((dy / len) * speed * dt) / 4, 20, map.height - 20);
    if (!solidAt(map, x, player.y, 13, jumping)) player.x = x;
    if (!solidAt(map, player.x, y, 13, jumping)) player.y = y;
  }
  if (!jumping && waterAt(map, player.x, player.y)) {
    player = { ...map.bases.blue };
    notice(
      'Terjatuh! Kembali ke benteng Merah. Shift untuk lompat; jembatan aman.',
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
      for (const t of ['blue', 'red']) {
        const b = map.bases[t],
          p = map.prisons[t];
        ctx.fillStyle = t === 'blue' ? '#ef5c5c' : '#86dd76';
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 3 / zoom();
        ctx.beginPath();
        ctx.arc(b.x, b.y, 65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeRect(p.x, p.y, p.w, p.h);
        ctx.font = `${14 / zoom()}px system-ui`;
        ctx.fillText(t === 'blue' ? '⚑ MERAH' : '⚑ HIJAU', b.x - 30, b.y);
        ctx.fillText('PENJARA', p.x + 10, p.y + 25);
      }
      if (testing) {
        ctx.fillStyle = '#fff7b9';
        ctx.beginPath();
        ctx.arc(
          player.x,
          player.y - (now < jumpUntil ? 15 : 0),
          13,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    },
  });
  entries
    .sort((a, b) => a.layer - b.layer || a.z - b.z || a.y - b.y)
    .forEach((e) => e.draw());
  const ic = $('iconPreview').getContext('2d');
  ic.clearRect(0, 0, 160, 90);
  drawAsset(ic, map.icon, 0, 0, 160, 90, now);
}
canvas.onpointerdown = (e) => {
  canvas.focus();
  const p = position(e);
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
        remember();
        if (e.shiftKey && o.points.length > 3) {
          o.points.splice(n, 1);
          return;
        }
        drag = { kind: 'point', index: n };
        canvas.setPointerCapture(e.pointerId);
        return;
      }
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
    if (Math.hypot(p.x - b.x, p.y - b.y) < 65) id = 'base:' + t;
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
  if (!o || !pointsMode || testing || o.locked || o.points.length >= 64) return;
  const q = local(o, position(e));
  if (q.x < 0 || q.x > 1 || q.y < 0 || q.y > 1) return;
  remember();
  let edge = 0,
    best = Infinity;
  for (let i = 0; i < o.points.length; i++) {
    const a = o.points[i],
      b = o.points[(i + 1) % o.points.length],
      vx = b.x - a.x,
      vy = b.y - a.y,
      t = clamp(
        ((q.x - a.x) * vx + (q.y - a.y) * vy) / (vx * vx + vy * vy || 1),
        0,
        1,
      ),
      d = Math.hypot(q.x - a.x - t * vx, q.y - a.y - t * vy);
    if (d < best) {
      best = d;
      edge = i;
    }
  }
  o.points.splice(edge + 1, 0, q);
};
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
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
  } else if (e.key === 'Delete' && object()) $('delete').click();
});
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
window.addEventListener('beforeunload', (e) => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
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
  remember();
  map.enabled = $('enabled').checked;
  check();
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
  if (!o || testing) return;
  remember();
  o.shape = 'polygon';
  pointsMode = !pointsMode;
  propertyFields();
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
  m.id = 'studio-copy-' + uid().slice(0, 8);
  m.name += ' — salinan';
  m.enabled = false;
  open(m);
};
$('maps').onchange = () => {
  const m = state.document.maps.find((m) => m.id === $('maps').value);
  if (m) open(m);
};
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
$('fit').onclick = fit;
$('validate').onclick = safe(() => {
  validateMap(map);
  check();
});
function mapChoices() {
  $('maps').replaceChildren(new Option('Pilih map…', ''));
  for (const m of state.document.maps)
    $('maps').add(new Option(`${m.enabled ? '●' : '○'} ${m.name}`, m.id));
  $('maps').value = map.id;
}
$('save').onclick = safe(async () => {
  if (loading) return;
  for (const el of document.querySelectorAll('input,textarea,select'))
    if (!el.disabled && !el.checkValidity()) {
      el.reportValidity();
      throw new Error('Perbaiki nilai field yang ditandai sebelum menyimpan.');
    }
  map = validateMap(map);
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
});
$('test').onclick = () => {
  testing = !testing;
  keys.clear();
  player = { ...map.bases.blue };
  jumpUntil = 0;
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
async function job(publish) {
  if (dirty)
    throw new Error(
      'Simpan map dahulu. Draft canvas belum ikut build/publish.',
    );
  notice((await api(publish ? '/api/publish' : '/api/build', {})).message);
  const timer = setInterval(async () => {
    try {
      const j = await api('/api/job');
      notice(j.message, j.status === 'error');
      if (j.status !== 'running') {
        clearInterval(timer);
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
      notice(e.message, true);
    }
  }, 2000);
}
$('build').onclick = safe(() => job(false));
$('publish').onclick = safe(() => job(true));
$('file').onchange = safe(async () => {
  const f = $('file').files[0];
  if (!f) return;
  if (f.size > 30 * 1024 * 1024)
    throw new Error('File ditolak: maksimal 30 MB.');
  const target = $('uploadKind').value,
    selectedBefore = selected;
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
        r.onload = () => resolve(String(r.result).split(',')[1]);
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
safe(async () => {
  state = await api('/api/state');
  const t = await api('/api/templates');
  template = t.template;
  library = t.library;
  map = state.document.maps[0] ?? blank();
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
