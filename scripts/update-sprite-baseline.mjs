import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(await readFile(path.join(root, 'public/characters/manifest.json'), 'utf8'));
const sha256 = async file => createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
const characters = {};

for (const character of manifest.characters) {
  characters[character.id] = {
    source: await sha256(`sprite-sources/${character.id}.png`),
    atlas: await sha256(`public/characters/${character.id}/atlas.webp`),
    portrait: await sha256(`public/characters/${character.id}/portrait.webp`),
    animation: await sha256(`public/characters/${character.id}/animations.json`),
  };
}

const baseline = {
  version: manifest.version,
  purpose: 'Golden hashes diperbarui hanya setelah audit visual seluruh karakter lulus.',
  characters,
};
await writeFile(path.join(root, 'config/sprite-baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
console.log(`Baseline sprite v${manifest.version} tersimpan untuk ${Object.keys(characters).length} karakter.`);
