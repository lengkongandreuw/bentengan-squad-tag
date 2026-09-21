import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Visual-only adapter. Ground-space (x,y) remains the simulation's source of truth.
// The fixed 45 degree camera and stretched ground preserve the exact 2D projection.
export type KampungScene = {
  width?: number; height?: number;
  bases?: Record<string, { x: number; y: number }>;
  prisons: Record<string, { x: number; y: number; w: number; h: number }>;
  obstacles: Array<{ asset: string; x: number; y: number; w: number; h: number }>;
  decorations: Array<{ asset: string; x: number; y: number; w: number; h: number }>;
};
const ROOT2 = Math.SQRT2;
const point = (x: number, y: number, z = 0) => new THREE.Vector3(x, -y * ROOT2, z);

export class Kampung3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10000);
  private materials = new Map<string, THREE.MeshLambertMaterial>();
  private textures = new Set<THREE.Texture>();
  private geometry = new Set<THREE.BufferGeometry>();
  private actors = new Map<string, { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; texture: THREE.CanvasTexture; mesh: THREE.Mesh }>();
  private flags: THREE.Mesh[] = [];
  private up = new THREE.Vector3(0, Math.SQRT1_2, Math.SQRT1_2);
  private lost = false;
  private onLost = (event: Event) => { event.preventDefault(); this.lost = true; };
  private boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  private leafGeometry = new THREE.IcosahedronGeometry(1, 0);
  private cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 10);

  constructor(field: KampungScene, terrain: HTMLImageElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor('#263324');
    this.renderer.domElement.addEventListener('webglcontextlost', this.onLost);
    this.geometry.add(this.boxGeometry); this.geometry.add(this.leafGeometry); this.geometry.add(this.cylinderGeometry);
    this.camera.up.set(0, 0, 1);
    this.scene.add(new THREE.AmbientLight('#fff1d4', 1.35));
    const sun = new THREE.DirectionalLight('#fff0cd', 2.1);
    sun.position.set(-600, 400, 1200); this.scene.add(sun);
    const w = field.width!, h = field.height!;
    // Reuse the source ground texture; crop away the baked 2D flower border.
    // No source asset is overwritten and the original map remains untouched.
    const surface = document.createElement('canvas'); surface.width = terrain.naturalWidth; surface.height = terrain.naturalHeight;
    const c = surface.getContext('2d')!;
    const sw = surface.width, sh = surface.height, mx = Math.ceil(sw * .04), my = Math.ceil(sh * .065);
    c.drawImage(terrain, mx, my, sw - mx * 2, sh - my * 2, 0, 0, sw, sh);
    const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace; this.textures.add(texture);
    // Flat floor must not clip sprite foot rings/nameplates below their anchor.
    // Solid 3D scenery still writes depth and correctly occludes characters.
    const ground = new THREE.Mesh(this.track(new THREE.PlaneGeometry(w, h * ROOT2)), new THREE.MeshBasicMaterial({ map: texture, depthWrite: false }));
    ground.position.copy(point(w / 2, h / 2, -1)); this.scene.add(ground);
    for (const o of field.obstacles) this.object(o.asset, o.x, o.y, o.w, o.h);
    for (const o of field.decorations) this.object(o.asset, o.x, o.y + o.h * .65, o.w, o.h * .35);
    Object.entries(field.bases!).forEach(([team, b]) => this.fort(b.x, b.y, team === 'blue' ? '#df3829' : '#39a749'));
    Object.values(field.prisons).forEach(p => this.prison(p.x, p.y, p.w, p.h));
    this.margin(w, h);
    this.scene.updateMatrixWorld(true);
    // Batch static meshes by shared material: hundreds of flower/stone pieces
    // become a handful of draw calls, not hundreds of mobile GPU submissions.
    for (const material of this.materials.values()) {
      const meshes = this.scene.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && o.material === material && !this.flags.includes(o));
      if (meshes.length < 2) continue;
      const parts = meshes.map(m => (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrixWorld));
      const merged = mergeGeometries(parts, false);
      parts.forEach(p => p.dispose());
      if (merged) { meshes.forEach(m => this.scene.remove(m)); this.scene.add(new THREE.Mesh(this.track(merged), material)); }
    }
    this.scene.updateMatrixWorld(true);
    // Static geometry need not recalculate matrices every animation frame.
    this.scene.traverse(o => { if (o instanceof THREE.Mesh && !this.flags.includes(o)) o.matrixAutoUpdate = false; });
  }

  private track<T extends THREE.BufferGeometry>(g: T): T { this.geometry.add(g); return g; }
  private material(color: string) {
    let m = this.materials.get(color);
    if (!m) {
      // Deterministic hand-painted grain; color families follow the source art.
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const c = canvas.getContext('2d')!; c.fillStyle = color; c.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 180; i++) {
        c.fillStyle = i % 2 ? '#ffffff0c' : '#19150610';
        c.fillRect((i * 29) % 64, (i * 43) % 64, 1 + i % 3, 1);
      }
      const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; this.textures.add(t);
      m = new THREE.MeshLambertMaterial({ map: t, flatShading: true }); this.materials.set(color, m);
    }
    return m;
  }
  private mesh(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const m = new THREE.Mesh(g, this.material(color)); m.position.copy(point(x, y, z)); m.scale.set(sx, sy * ROOT2, sz); this.scene.add(m); return m;
  }
  private box(x: number, y: number, z: number, w: number, d: number, h: number, color: string) { return this.mesh(this.boxGeometry, color, x, y, z + h / 2, w, d, h); }
  private cylinder(x: number, y: number, z: number, r: number, height: number, color: string) {
    const m = new THREE.Mesh(this.cylinderGeometry, this.material(color)); m.rotation.x = Math.PI / 2;
    m.scale.set(r, height, r * ROOT2); m.position.copy(point(x, y, z + height / 2)); this.scene.add(m); return m;
  }
  private foliage(x: number, y: number, z: number, size: number, color = '#477334') { return this.mesh(this.leafGeometry, color, x, y, z, size, size * .6, size * .75); }
  private plant(x: number, y: number, size: number) {
    this.cylinder(x, y, 0, size * .42, size * .5, '#9d603e');
    for (let i = 0; i < 5; i++) this.foliage(x + Math.cos(i * 2.4) * size * .35, y + Math.sin(i * 2.4) * size * .22, size * .9, size * .6, i % 2 ? '#587c31' : '#344f26');
  }
  private tree(x: number, y: number, size: number) {
    this.cylinder(x, y, 0, size * .23, 7, '#777862');
    this.cylinder(x, y, 5, size * .10, size * .65, '#654425');
    for (let i = 0; i < 5; i++) this.foliage(x + Math.cos(i * 2.4) * size * .23, y + Math.sin(i * 2.4) * size * .16, size * (.7 + (i % 2) * .23), size * .46, i % 2 ? '#637c35' : '#3b612d');
  }
  private sign(x: number, y: number, z: number, width: number, label: string, color = '#5a3724') {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
    const c = canvas.getContext('2d')!; c.fillStyle = color; c.fillRect(0, 0, 256, 64);
    c.strokeStyle = '#dfc28c'; c.lineWidth = 5; c.strokeRect(3, 3, 250, 58);
    c.fillStyle = '#fff0c7'; c.textAlign = 'center'; c.font = 'bold 27px Arial'; c.fillText(label, 128, 43);
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; this.textures.add(t);
    const m = new THREE.Mesh(this.track(new THREE.PlaneGeometry(width, width / 4)), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    m.rotation.x = Math.PI / 2; m.position.copy(point(x, y, z)); this.scene.add(m);
  }
  private roof(x: number, y: number, z: number, w: number, d: number, color: string) {
    const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0); shape.lineTo(0, w * .22); shape.lineTo(w / 2, 0); shape.closePath();
    const g = this.track(new THREE.ExtrudeGeometry(shape, { depth: d * ROOT2, bevelEnabled: false }));
    const m = new THREE.Mesh(g, this.material(color)); m.rotation.x = Math.PI / 2; m.position.copy(point(x, y - d / 2, z)); this.scene.add(m);
    // Raised tile strips provide actual depth rather than a flat roof billboard.
    for (let i = -3; i <= 3; i++) {
      const xx = i * w / 8;
      this.box(x + xx, y, z + (w / 2 - Math.abs(xx)) * .44, 2, d + 2, 2, '#a66e39');
    }
    for (let row = 0; row < 5; row++) for (const side of [-1, 1]) {
      const ridge = this.box(x + side * w / 4, y - d / 2 + row * d / 4, z + w * .11, w * .55, 1.3, 1.8, color);
      ridge.rotation.y = side * .414;
    }
  }
  private building(asset: string, x: number, y: number, w: number, d: number) {
    this.box(x, y, 0, w, d, 6, '#79745c');
    const hall = asset === 'hall', open = asset === 'guardPost';
    if (!open) this.box(x, y - 3, 6, w - 12, Math.max(12, d - 8), 52, hall ? '#b8a579' : '#9e7850');
    for (const dx of [-1, 1]) for (const dy of [-1, 1]) this.box(x + dx * (w / 2 - 7), y + dy * (d / 2 - 4), 5, 7, 7, 65, '#654b2d');
    if (!open) {
      this.box(x, y + d / 2, 7, w * .18, 2, 38, '#302d24');
      for (const side of [-1, 1]) this.box(x + side * w * .3, y + d / 2, 27, w * .16, 3, 19, '#334b49');
    } else this.box(x, y, 12, w * .8, d * .7, 7, '#8c693e');
    this.roof(x, y, 66, w + 18, d + 16, hall ? '#495251' : '#88512e');
    this.sign(x, y + d / 2 + 3, 56, w * .65, hall ? 'BALAI DESA' : open ? 'POS RONDA' : 'WARUNG');
  }
  private object(asset: string, x: number, y: number, w: number, d: number) {
    const cx = x + w / 2, cy = y + d / 2;
    if (/Tree|tree/.test(asset)) { this.tree(cx, cy, Math.max(w, d) * 1.45); return; }
    if (['hall', 'warung', 'guardPost'].includes(asset)) { this.building(asset, cx, cy, w, d); return; }
    if (/Cart|Stall/.test(asset)) {
      this.box(cx, cy, 8, w, d, 28, '#a77b3e');
      for (const side of [-1, 1]) this.cylinder(cx + side * w * .4, cy, 0, 10, 12, '#333e3b');
      for (const side of [-1, 1]) this.box(cx + side * w * .43, cy, 32, 4, 4, 35, '#72502c');
      this.roof(cx, cy, 65, w + 12, d + 10, '#a4442e');
      for (let i = 0; i < 5; i++) this.box(x + w * (.12 + i * .18), cy, 37, w * .12, d * .7, 7, i % 2 ? '#b98933' : '#668739');
      return;
    }
    if (asset === 'plant' || asset === 'bush') { this.plant(cx, cy, Math.min(w, 38)); return; }
    if (asset === 'bunting') {
      for (const side of [-1, 1]) this.box(cx + side * w / 2, cy, 0, 5, 5, 70, '#665035');
      for (let i = 0; i < 12; i++) this.box(x + i * w / 12, cy, 58 - Math.sin(i / 11 * Math.PI) * 16, w / 13, 2, 11, i % 2 ? '#efe4c8' : '#ba3b2c');
      return;
    }
    // Both original drain/barrier footprints remain obstacles/parkour targets.
    this.box(cx, cy, 0, w, d, 12, '#5c6960');
    this.box(cx, cy, 12, w - 8, Math.max(4, d - 6), asset === 'drain' ? 3 : 9, '#3e4943');
    for (const side of [-1, 1]) this.box(cx + side * (w / 2 - 6), cy, 0, 11, d, 27, '#9b9679');
    if (asset === 'drain') for (let i = 1; i < 9; i++) this.box(x + i * w / 9, cy, 15, 3, d - 5, 2, '#999979');
    else this.box(cx, cy + d / 2 + .1, 11, w * .65, 1, 3, '#73b9bd');
  }
  private fort(x: number, y: number, color: string) {
    this.cylinder(x, y, 0, 65, 9, '#555e57'); this.cylinder(x, y, 9, 54, 15, '#a3a48e');
    this.cylinder(x, y, 24, 35, 29, '#465452'); this.cylinder(x, y, 53, 26, 7, '#a4a58d');
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, xx = x + Math.cos(a) * 46, yy = y + Math.sin(a) * 37;
      this.box(xx, yy, 15, 13, 12, 22, '#34413e'); this.box(xx, yy, 24, 9, 13, 9, color);
    }
    this.cylinder(x, y, 60, 3, 61, '#c8a452');
    const flag = this.box(x + 20, y, 96, 38, 2, 23, color); this.flags.push(flag);
    for (let i = 0; i < 4; i++) this.box(x, y + 45 + i * 5, 0, 28, 7, 17 - i * 4, '#8e9485');
  }
  private prison(x: number, y: number, w: number, h: number) {
    this.material('#777e77').depthWrite = false;
    this.material('#525d57').depthWrite = false;
    this.box(x + w / 2, y + h / 2, 0, w, h, 3, '#777e77');
    for (let i = 1; i < 5; i++) {
      this.box(x + i * w / 5, y + h / 2, 3, 1, h, .5, '#525d57');
      this.box(x + w / 2, y + i * h / 5, 3, w, 1, .5, '#525d57');
    }
    for (const xx of [x, x + w]) {
      this.box(xx, y + h / 2, 3, 5, h, 5, '#3e4c49');
      for (let i = 0; i <= 8; i++) this.box(xx, y + i * h / 8, 5, 3, 3, 23, '#71847e');
      this.box(xx, y + h / 2, 28, 4, h, 3, '#4b5e57');
    }
    for (const yy of [y, y + h]) for (const side of [-1, 1]) {
      const cx = x + w / 2 + side * w * .34;
      this.box(cx, yy, 5, w * .31, 4, 4, '#3e4c49');
      this.box(cx, yy, 27, w * .31, 4, 3, '#4b5e57');
      for (let i = 0; i < 5; i++) this.box(cx - w * .15 + i * w * .075, yy, 8, 3, 3, 19, '#71847e');
    }
    // Open middle gates on both sides preserve all rescue/return paths.
    for (const xx of [x, x + w]) for (const yy of [y, y + h]) { this.box(xx, yy, 0, 14, 14, 36, '#455650'); this.box(xx, yy, 32, 9, 9, 5, '#82c5bd'); }
    this.sign(x + w / 2, y, 33, w * .42, 'PENJARA', '#3f554c');
  }
  private margin(w: number, h: number) {
    // Reconstruct Kampung's actual flower-wall perimeter with the original
    // two side openings, corner gardens and separate buildings already above.
    const strip = (x: number, y: number, horizontal: boolean, length: number) => {
      this.box(x + (horizontal ? length / 2 : 0), y + (horizontal ? 0 : length / 2), 0, horizontal ? length : 15, horizontal ? 15 : length, 12, '#858974');
      this.box(x + (horizontal ? length / 2 : 0), y + (horizontal ? 0 : length / 2), 12, horizontal ? length : 18, horizontal ? 18 : length, 10, '#45652b');
      for (let i = 0; i < length; i += 30) {
        const xx = x + (horizontal ? i : 0), yy = y + (horizontal ? 0 : i);
        this.foliage(xx, yy, 19, 19, i % 60 ? '#45652b' : '#5e7834');
        for (let j = 0; j < 3; j++) this.foliage(xx + (j - 1) * 6, yy + j * 2, 31, 3.5, j === 0 ? '#e4c353' : j === 1 ? '#e8ddbc' : '#b6553a');
      }
    };
    strip(26, 30, true, w - 52); strip(26, h - 28, true, w - 52);
    for (const x of [24, w - 24]) { strip(x, 30, false, h * .37); strip(x, h * .60, false, h * .40 - 30); }
    for (const x of [42, w - 42]) for (const y of [48, h - 48]) this.plant(x, y, 32);
  }

  updateActor(id: string, x: number, y: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    let actor = this.actors.get(id);
    if (!actor) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter; this.textures.add(texture);
      const mesh = new THREE.Mesh(this.track(new THREE.PlaneGeometry(256, 256)), new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .05, depthWrite: true }));
      this.scene.add(mesh); actor = { canvas, ctx, texture, mesh }; this.actors.set(id, actor);
    }
    actor.ctx.setTransform(1, 0, 0, 1, 0, 0); actor.ctx.clearRect(0, 0, 512, 512);
    actor.ctx.setTransform(2, 0, 0, 2, 256 - x * 2, 384 - y * 2);
    paint(actor.ctx); actor.texture.needsUpdate = true;
    actor.mesh.quaternion.copy(this.camera.quaternion);
    actor.mesh.position.copy(point(x, y, 2)).addScaledVector(this.up, 64);
  }
  render(width: number, height: number, scale: number, x: number, y: number, now: number) {
    if (this.lost) throw new Error('Konteks grafis 3D terputus. Muat ulang atau pilih Kampung Merdeka asli.');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (this.renderer.domElement.width !== Math.round(width * dpr) || this.renderer.domElement.height !== Math.round(height * dpr)) {
      this.renderer.setPixelRatio(dpr); this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    }
    this.camera.left = -width / scale / 2; this.camera.right = width / scale / 2;
    this.camera.top = height / scale / 2; this.camera.bottom = -height / scale / 2;
    this.camera.position.copy(point(x, y)).add(new THREE.Vector3(0, -2200, 2200)); this.camera.lookAt(point(x, y)); this.camera.updateProjectionMatrix();
    this.actors.forEach(a => a.mesh.quaternion.copy(this.camera.quaternion));
    this.flags.forEach((f, i) => { f.rotation.z = Math.sin(now * .002 + i) * .08; });
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement;
  }
  async warmup() { this.render(640, 400, .3, 850, 600, 0); await this.renderer.compileAsync(this.scene, this.camera); }
  dispose() {
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onLost);
    const materials = new Set<THREE.Material>();
    this.scene.traverse(o => { if (o instanceof THREE.Mesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)); });
    materials.forEach(m => m.dispose()); this.geometry.forEach(g => g.dispose()); this.textures.forEach(t => t.dispose());
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.actors.clear(); this.scene.clear();
  }
}
