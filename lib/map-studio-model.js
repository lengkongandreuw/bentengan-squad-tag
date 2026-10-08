// Shared by the local visual editor, its test mode and the game. No DOM dependency.
import { polygonToRects } from '../modules/world/kanal-footprints.ts';
import { pointHitsExpandedRect } from '../modules/gameplay/collision-navigation.ts';
import {arenaRulesFor} from './map-arena-rules.js';
export const BEHAVIORS = [
  'decoration',
  'solid',
  'parkour',
  'water',
  'slow',
  'bridge',
];
export const LAYERS = ['background', 'world', 'foreground'];
export const BUILTIN_IDS = [
  'kampung',
  'pasar',
  'taman',
  'kanal',
  'kanal2',
  'kampung3d',
];
const num = (v, min, max, label) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max)
    throw new Error(`${label}: gunakan angka ${min}–${max}.`);
  return v;
};
const text = (v, max, label) => {
  if (typeof v !== 'string' || v.length > max)
    throw new Error(`${label} tidak valid.`);
  return v;
};
export function validateAsset(a) {
  if (a === null) return null;
  if (
    !a ||
    !/^((map-studio\/[a-f0-9]{64}\.webp)|(field\/(objects|grounds|animated|kampung-map|pasar-map|taman-map|kanal-map|kanal2-ground|kanal-object-atlas)\.webp)|(ui-v2\/fields\/(kampung|pasar|taman|kanal|kanal2)\.webp))$/.test(
      a.asset,
    )
  )
    throw new Error('Path aset map tidak valid.');
  const limit = a.asset.startsWith('field/') ? 8192 : 4096;
  const width = num(a.width, 1, limit, 'Lebar atlas'),
    height = num(a.height, 1, limit, 'Tinggi atlas');
  if (!Array.isArray(a.frames) || !a.frames.length || a.frames.length > 128)
    throw new Error('Jumlah frame 1–128.');
  const frames = a.frames.map((f) => {
    const x = num(f.x, 0, width, 'Frame X'),
      y = num(f.y, 0, height, 'Frame Y'),
      w = num(f.width, 1, width, 'Frame lebar'),
      h = num(f.height, 1, height, 'Frame tinggi');
    if (x + w > width || y + h > height)
      throw new Error('Frame di luar atlas.');
    return { x, y, width: w, height: h };
  });
  return {
    asset: a.asset,
    width,
    height,
    frames,
    fps: num(a.fps, 1, 60, 'FPS'),
  };
}
export function validateMap(m) {
  if (!m || !/^studio-[a-z0-9-]{1,60}$/.test(m.id))
    throw new Error(
      'ID map harus studio- diikuti huruf kecil/angka/tanda hubung.',
    );
  const width = num(m.width, 1000, 5000, 'Lebar map'),
    height = num(m.height, 800, 5000, 'Tinggi map');
  if (typeof m.enabled !== 'boolean')
    throw new Error('Status map tidak valid.');
  if (!Array.isArray(m.objects) || m.objects.length > 300)
    throw new Error('Maksimal 300 objek per map.');
  const ids = new Set();
  const objects = m.objects.map((o) => {
    if (
      !o ||
      typeof o.id !== 'string' ||
      !/^obj-[a-z0-9-]+$/.test(o.id) ||
      ids.has(o.id)
    )
      throw new Error('ID objek tidak valid/duplikat.');
    ids.add(o.id);
    if (
      !BEHAVIORS.includes(o.behavior) ||
      !LAYERS.includes(o.layer) ||
      !['rect', 'ellipse', 'polygon'].includes(o.shape)
    )
      throw new Error('Perilaku/layer/bentuk tidak valid.');
    if (!Array.isArray(o.points) || o.points.length < 3 || o.points.length > 64)
      throw new Error('Polygon memerlukan 3–64 titik.');
    return {
      id: o.id,
      name: text(o.name, 100, 'Nama objek'),
      asset: validateAsset(o.asset),
      x: num(o.x, 0, width, 'Objek X'),
      y: num(o.y, 0, height, 'Objek Y'),
      w: num(o.w, 1, width, 'Objek lebar'),
      h: num(o.h, 1, height, 'Objek tinggi'),
      rotation: num(o.rotation, -180, 180, 'Rotasi'),
      opacity: num(o.opacity, 0, 1, 'Opacity'),
      layer: o.layer,
      z: num(o.z, -1000, 1000, 'Urutan layer'),
      behavior: o.behavior,
      slow: num(o.slow, 0.1, 1, 'Pengali kecepatan'),
      shape: o.shape,
      points: o.points.map((p) => ({
        x: num(p.x, 0, 1, 'Titik X'),
        y: num(p.y, 0, 1, 'Titik Y'),
      })),
      visible: !!o.visible,
      locked: !!o.locked,
      mirror: !!o.mirror,
      ...([true,'rect','bands'].includes(o.nativeCollision) ? {nativeCollision: o.nativeCollision} : {}),
    };
  });
  const bases = {},
    prisons = {};
  for (const t of ['blue', 'red']) {
    const b = m.bases?.[t],
      p = m.prisons?.[t];
    if (!b || !p) throw new Error('Benteng dan penjara kedua tim wajib ada.');
    bases[t] = {
      x: num(b.x, 80, width - 80, 'Benteng X'),
      y: num(b.y, 100, height - 80, 'Benteng Y'),
    };
    prisons[t] = {
      x: num(p.x, 0, width - 200, 'Penjara X'),
      y: num(p.y, 0, height - 150, 'Penjara Y'),
      w: num(p.w, 60, 400, 'Penjara lebar'),
      h: num(p.h, 60, 300, 'Penjara tinggi'),
    };
  }
  if (m.terrainMode !== 'stretch' && m.terrainMode !== 'tile')
    throw new Error('Mode terrain tidak valid.');
  return {
    id: m.id,
    ...(m.replaces ? { replaces: builtinId(m.replaces) } : {}),
    ...(m.arenaRules ? {arenaRules: m.arenaRules === 'kanal2' ? 'kanal2' : (()=>{throw new Error('Aturan arena tidak valid.');})()} : {}),
    ...(m.rulesVersion !== undefined ? {rulesVersion: num(m.rulesVersion, 1, 1, 'Versi aturan map')} : {}),
    ...(m.archived ? { archived: true } : {}),
    ...(m.deleted ? { deleted: true } : {}),
    ...(m.waterMask ? { waterMask: validateWaterMask(m.waterMask) } : {}),
    name: text(m.name, 80, 'Nama map'),
    description: text(m.description, 300, 'Keterangan'),
    width,
    height,
    enabled: m.enabled,
    terrain: validateAsset(m.terrain),
    icon: validateAsset(m.icon),
    terrainMode: m.terrainMode,
    tileSize: num(m.tileSize, 32, 1024, 'Ukuran tile'),
    objects,
    bases,
    prisons,
  };
}
export function validateDocument(d) {
  if (d?.version !== 1 || !Array.isArray(d.maps) || d.maps.length > 24)
    throw new Error('Format map tidak valid (maksimal 24).');
  const maps = d.maps.map(validateMap);
  if (new Set(maps.map((m) => m.id)).size !== maps.length)
    throw new Error('ID map duplikat.');
  const replacements = maps.filter((m) => m.replaces).map((m) => m.replaces);
  if (new Set(replacements).size !== replacements.length)
    throw new Error(
      'Satu map bawaan hanya boleh memiliki satu versi pengganti.',
    );
  const builtinStates = {};
  for (const [id, status] of Object.entries(d.builtinStates ?? {})) {
    builtinId(id);
    if (!['active', 'archived', 'deleted'].includes(status))
      throw new Error('Status map bawaan tidak valid.');
    builtinStates[id] = status;
  }
  if (
    BUILTIN_IDS.every((id) =>
      ['archived', 'deleted'].includes(builtinStates[id]),
    ) &&
    !maps.some((m) => m.enabled && !m.archived && !m.deleted)
  )
    throw new Error('Minimal satu map harus tersedia untuk bermain.');
  return {
    version: 1,
    maps,
    ...(Object.keys(builtinStates).length ? { builtinStates } : {}),
  };
}
function builtinId(id) {
  if (!BUILTIN_IDS.includes(id)) throw new Error('ID map bawaan tidak valid.');
  return id;
}
function validateWaterMask(m) {
  const width = num(m.width, 1, 2048, 'Mask lebar'),
    height = num(m.height, 1, 2048, 'Mask tinggi');
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    !Array.isArray(m.rows) ||
    m.rows.length !== height
  )
    throw new Error('Mask air tidak valid.');
  const rows = m.rows.map((row) => {
    if (!Array.isArray(row) || row.length % 2 || row.length > width * 2)
      throw new Error('Baris mask tidak valid.');
    let last = -1;
    return row.map((v, i) => {
      num(v, 0, width, 'Mask X');
      if (!Number.isInteger(v) || v < last || (i % 2 === 1 && v === last))
        throw new Error('Rentang mask tidak valid.');
      last = v;
      return v;
    });
  });
  return { width, height, rows };
}
function local(o, x, y) {
  const a = (-o.rotation * Math.PI) / 180,
    dx = x - o.x - o.w / 2,
    dy = y - o.y - o.h / 2;
  return {
    x: (dx * Math.cos(a) - dy * Math.sin(a)) / o.w + 0.5,
    y: (dx * Math.sin(a) + dy * Math.cos(a)) / o.h + 0.5,
  };
}
export function contains(o, x, y) {
  const p = local(o, x, y);
  if (o.shape === 'ellipse')
    return ((p.x - 0.5) * 2) ** 2 + ((p.y - 0.5) * 2) ** 2 <= 1;
  if (o.shape === 'rect') return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
  let hit = false;
  const pts = o.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i],
      b = pts[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      hit = !hit;
  }
  return hit;
}
export function touches(o, x, y, r = 0) {
  const a = (o.rotation * Math.PI) / 180,
    bw = (Math.abs(Math.cos(a)) * o.w + Math.abs(Math.sin(a)) * o.h) / 2,
    bh = (Math.abs(Math.sin(a)) * o.w + Math.abs(Math.cos(a)) * o.h) / 2;
  if (
    Math.abs(x - o.x - o.w / 2) > bw + r ||
    Math.abs(y - o.y - o.h / 2) > bh + r
  )
    return false;
  if (contains(o, x, y)) return true;
  if (!r) return false;
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8;
    if (contains(o, x + Math.cos(a) * r, y + Math.sin(a) * r)) return true;
  }
  return false;
}
export function waterAt(m, x, y) {
  return (
    !m.objects.some((o) => o.behavior === 'bridge' && contains(o, x, y)) &&
    (m.objects.some((o) => o.behavior === 'water' && contains(o, x, y)) ||
      maskWaterAt(m, x, y))
  );
}
function maskWaterAt(m, x, y) {
  if (!m.waterMask || x < 0 || y < 0 || x >= m.width || y >= m.height)
    return false;
  const mask = m.waterMask,
    row =
      mask.rows[
        Math.min(mask.height - 1, arenaRulesFor(m)==='kanal2' ? Math.round(y/m.height*(mask.height-1)) : Math.floor((y / m.height) * mask.height))
      ],
    xx = arenaRulesFor(m)==='kanal2' ? Math.round(x/m.width*(mask.width-1)) : (x / m.width) * mask.width;
  for (let i = 0; i < row.length; i += 2)
    if (xx >= row[i] && xx < row[i + 1]) return true;
  return false;
}
export function solidAt(m, x, y, r = 13, jumping = false) {
  return m.objects.some(
    (o) =>
      (o.behavior === 'solid' || (!jumping && o.behavior === 'parkour')) &&
      collisionTouches(o, x, y, r),
  );
}
// The native Kanal silhouette uses overlapping rectangular bands. Retain exactly
// that edge/radius behavior after editor roundtrip; compile once per object.
const collisionCache = new WeakMap();
export function collisionTouches(o, x, y, r = 13) {
  if (!o.nativeCollision || o.shape !== 'polygon') return touches(o, x, y, r);
  return collisionRects(o).some(rect=>pointHitsExpandedRect(x,y,rect,r));
}
export function collisionRects(o) {
  let cached = collisionCache.get(o);
  const unchanged=cached&&cached.kind===o.nativeCollision&&cached.x===o.x&&cached.y===o.y&&cached.w===o.w&&cached.h===o.h&&cached.rotation===o.rotation&&
    cached.points.length===o.points.length&&o.points.every((p,i)=>p.x===cached.points[i].x&&p.y===cached.points[i].y);
  if (!unchanged) {
    const angle=o.rotation*Math.PI/180, cx=o.x+o.w/2, cy=o.y+o.h/2;
    const polygon=o.points.map(p=>{const dx=(p.x-.5)*o.w,dy=(p.y-.5)*o.h;
      return [cx+dx*Math.cos(angle)-dy*Math.sin(angle),cy+dx*Math.sin(angle)+dy*Math.cos(angle)];});
    const rects=o.nativeCollision==='rect'&&o.rotation===0 ? [{x:o.x,y:o.y,w:o.w,h:o.h}] : polygonToRects(polygon);
    cached={kind:o.nativeCollision,x:o.x,y:o.y,w:o.w,h:o.h,rotation:o.rotation,points:o.points.map(p=>({...p})),rects};collisionCache.set(o,cached);
  }
  return cached.rects;
}
export function flightSolidAt(m, x, y, r = 13) {
  return m.objects.some(o=>(o.behavior==='solid'||o.nativeCollision&&o.behavior==='parkour')&&collisionTouches(o,x,y,r));
}
export function speedAt(m, x, y) {
  return m.objects.reduce(
    (n, o) =>
      o.behavior === 'slow' && contains(o, x, y) ? Math.min(n, o.slow) : n,
    1,
  );
}
export function frameAt(a, ms) {
  return a.frames[Math.floor((ms * a.fps) / 1000) % a.frames.length];
}
export function mapIssues(m) {
  const issues = [];
  if (!m.name.trim()) issues.push({ message: 'Nama map wajib diisi.' });
  for (const o of m.objects) {
    if (o.x + o.w > m.width || o.y + o.h > m.height)
      issues.push({
        object: o.id,
        message: `${o.name}: objek melewati batas map.`,
      });
    if (o.shape === 'polygon') {
      const cross = (a, b, c) =>
        (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      let crossed = false;
      for (let i = 0; i < o.points.length; i++) {
        const a = o.points[i],
          b = o.points[(i + 1) % o.points.length];
        if (Math.hypot(a.x - b.x, a.y - b.y) < 0.000001) crossed = true;
        for (let j = i + 2; j < o.points.length; j++) {
          if (i === 0 && j === o.points.length - 1) continue;
          const c = o.points[j],
            d = o.points[(j + 1) % o.points.length];
          if (
            cross(a, b, c) * cross(a, b, d) < 0 &&
            cross(c, d, a) * cross(c, d, b) < 0
          )
            crossed = true;
        }
      }
      if (crossed)
        issues.push({
          object: o.id,
          message: `${o.name}: sisi polygon bersilangan/titik berulang. Geser atau hapus node yang ditandai.`,
        });
      const area = Math.abs(
        o.points.reduce((s, p, i) => {
          const q = o.points[(i + 1) % o.points.length];
          return s + p.x * q.y - q.x * p.y;
        }, 0),
      );
      if (area < 0.002)
        issues.push({
          object: o.id,
          message: `${o.name}: polygon terlalu tipis/kosong.`,
        });
    }
  }
  for (const t of ['blue', 'red']) {
    const b = m.bases[t],
      p = m.prisons[t];
    for (const [x, y] of [
      [b.x, b.y],
      [b.x + 50, b.y],
      [b.x - 50, b.y],
      [b.x, b.y + 50],
      [b.x, b.y - 50],
      [p.x + p.w / 2, p.y + p.h / 2],
      [p.x + p.w / 2, p.y + p.h + 24],
    ]) {
      if (solidAt(m, x, y, 20) || waterAt(m, x, y)) {
        issues.push({
          message: `Benteng/spawn/akses penjara ${t === 'blue' ? 'Merah' : 'Hijau'} tertutup collider atau air.`,
        });
        break;
      }
    }
  }
  // Conservative shared navigation raster: never claim a disconnected route is safe.
  const cell = 40,
    cols = Math.ceil(m.width / cell),
    rows = Math.ceil(m.height / cell),
    index = (x, y) => Math.floor(y / cell) * cols + Math.floor(x / cell),
    start = index(m.bases.blue.x, m.bases.blue.y),
    goal = index(m.bases.red.x, m.bases.red.y),
    queue = [start],
    seen = new Set(queue);
  let found = false;
  for (let i = 0; i < queue.length; i++) {
    const n = queue[i];
    if (n === goal) {
      found = true;
      break;
    }
    const cx = n % cols,
      cy = Math.floor(n / cols);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const xx = cx + dx,
        yy = cy + dy,
        k = yy * cols + xx;
      if (xx < 0 || yy < 0 || xx >= cols || yy >= rows || seen.has(k)) continue;
      const x = xx * cell + cell / 2,
        y = yy * cell + cell / 2;
      if (solidAt(m, x, y, 13) || waterAt(m, x, y)) continue;
      seen.add(k);
      queue.push(k);
    }
  }
  if (!found)
    issues.push({
      message:
        'Jalur berjalan antar benteng tidak ditemukan (grid 40 unit). Buka akses atau tambahkan jembatan.',
    });
  return issues;
}
