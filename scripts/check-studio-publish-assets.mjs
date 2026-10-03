import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { validateSpriteDocument } from '../lib/sprite-studio-model.js';
import { validateDocument } from '../lib/map-studio-model.js';

// Read-only deployment preflight; never recompiles or changes Studio drafts.
const root = fileURLToPath(new URL('../', import.meta.url));
const json = async name => JSON.parse(await readFile(path.join(root, 'config', name), 'utf8'));
const sprites = await json('sprite-studio.json');
validateSpriteDocument(sprites, ['robot','ciici','kaka','buto','jago','raja','lala','maria','kumis','boke','tui','lui','bebe','kodo']);
const maps = validateDocument(await json('map-studio.json'));
const assets = new Map();
for (const clips of Object.values(sprites.characters)) for (const clip of Object.values(clips)) {
  const previous = assets.get(clip.asset);
  if (previous && (previous.width !== clip.width || previous.height !== clip.height))
    throw new Error(`Conflicting asset dimensions: ${clip.asset}`);
  assets.set(clip.asset, clip);
}
for (const map of maps.maps) for (const asset of [map.terrain, map.icon, ...map.objects.map(o => o.asset)]) {
  if (asset) assets.set(asset.asset, asset);
}
let bytes = 0;
for (const [asset, expected] of assets) {
  const file = path.resolve(root, 'public', asset);
  if (!file.startsWith(path.resolve(root, 'public') + path.sep)) throw new Error('Asset outside public');
  const metadata = await sharp(file).metadata();
  if (metadata.width !== expected.width || metadata.height !== expected.height)
    throw new Error(`Dimension mismatch: ${asset} (${metadata.width}x${metadata.height} vs ${expected.width}x${expected.height})`);
  bytes += (await stat(file)).size;
}
console.log(`Studio preflight PASS: ${assets.size} assets verified, ${(bytes / 1024 / 1024).toFixed(2)} MiB.`);
console.log(`Maps: ${maps.maps.map(m => `${m.name}: ${m.enabled && !m.archived && !m.deleted ? 'active' : 'draft/archived'}`).join('; ')}`);
console.log(`Builtin states: ${JSON.stringify(maps.builtinStates ?? {})}`);
