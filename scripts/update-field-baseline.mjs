import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const hash = async file => createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
const sourceNames = (await readdir(path.join(root, 'field-sources'))).filter(name => name.endsWith('.png')).sort();
const runtimeNames = ['animated.webp', 'grounds.webp', 'manifest.json', 'objects.webp'];
const sources = Object.fromEntries(await Promise.all(sourceNames.map(async name => [name, await hash(`field-sources/${name}`)])));
const runtime = Object.fromEntries(await Promise.all(runtimeNames.map(async name => [name, await hash(`public/field/${name}`)])));

await writeFile(path.join(root, 'config', 'field-baseline.json'), `${JSON.stringify({ version: 2, sources, runtime }, null, 2)}\n`);
console.log(`Field baseline v2 updated: ${sourceNames.length} sources + ${runtimeNames.length} runtime files.`);
