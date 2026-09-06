import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const chunkDirectory = path.resolve('dist/server/ssr/_next/static');
const chunks = await readdir(chunkDirectory);
const prototypeChunk = chunks.find(
  (file) => file.startsWith('prototype-') && file.endsWith('.js'),
);

if (!prototypeChunk) {
  throw new Error('Chunk runtime prototype tidak ditemukan setelah build.');
}

try {
  await import(pathToFileURL(path.join(chunkDirectory, prototypeChunk)).href);
  console.log(`Runtime arena valid: ${prototypeChunk}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Runtime arena tidak valid: ${message}`);
  process.exitCode = 1;
}
