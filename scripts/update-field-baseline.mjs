import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const hash = async file => createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
const pngFiles = async (directory, prefix = '') => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await pngFiles(path.join(directory, entry.name), relative));
    else if (entry.name.endsWith('.png')) files.push(relative);
  }
  return files.sort();
};
const sourceNames = (await readdir(path.join(root, 'field-sources'))).filter(name => name.endsWith('.png')).sort();
const mapSourceNames = await pngFiles(path.join(root, 'Assets', 'map'));
const runtimeNames = ['animated.webp', 'grounds.webp', 'kampung-map.webp', 'pasar-map.webp', 'manifest.json', 'objects.webp'];
const sources = Object.fromEntries(await Promise.all(sourceNames.map(async name => [name, await hash(`field-sources/${name}`)])));
const mapSources = Object.fromEntries(await Promise.all(mapSourceNames.map(async name => [name, await hash(`Assets/map/${name}`)])));
const runtime = Object.fromEntries(await Promise.all(runtimeNames.map(async name => [name, await hash(`public/field/${name}`)])));

await writeFile(path.join(root, 'config', 'field-baseline.json'), `${JSON.stringify({ version: 5, sources, mapSources, runtime }, null, 2)}\n`);
console.log(`Field baseline v5 updated: ${sourceNames.length} object sources + ${mapSourceNames.length} map cuts + ${runtimeNames.length} runtime files.`);
