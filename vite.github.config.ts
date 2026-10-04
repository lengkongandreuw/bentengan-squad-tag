import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const legacyEntryFiles = [
  'assets/index-CcIgRf6v.js',
  'assets/index-DxcjTxRu.js',
  'assets/app.js',
];
const legacyStyleFiles = ['assets/index-BoUDbTB1.css', 'assets/index.css'];

const githubPagesCacheCompatibility: Plugin = {
  name: 'github-pages-cache-compatibility',
  generateBundle(_options, bundle) {
    let commit = process.env.GITHUB_SHA ?? '';
    if (!commit) {
      try {
        commit = execFileSync('git', ['rev-parse', 'HEAD'], {
          encoding: 'utf8',
          windowsHide: true,
        }).trim();
      } catch {
        commit = 'local';
      }
    }
    const mapRevision = createHash('sha256')
      .update(
        JSON.stringify(
          JSON.parse(
            readFileSync(
              new URL('./config/map-studio.json', import.meta.url),
              'utf8',
            ),
          ),
        ),
      )
      .digest('hex');
    this.emitFile({
      type: 'asset',
      fileName: 'build-info.json',
      source: JSON.stringify({
        commit,
        mapRevision,
        builtAt: new Date().toISOString(),
      }),
    });
    const entry = Object.values(bundle).find(
      (output) => output.type === 'chunk' && output.isEntry,
    );
    const style = Object.entries(bundle).find(
      ([fileName, output]) =>
        output.type === 'asset' && /^assets\/index-[^/]+\.css$/.test(fileName),
    )?.[1];
    if (entry?.type === 'chunk')
      legacyEntryFiles.forEach((fileName) =>
        this.emitFile({ type: 'asset', fileName, source: entry.code }),
      );
    if (style?.type === 'asset')
      legacyStyleFiles.forEach((fileName) =>
        this.emitFile({ type: 'asset', fileName, source: style.source }),
      );
  },
};

export default defineConfig({
  base: '/bentengan-squad-tag/',
  plugins: [react(), githubPagesCacheCompatibility],
  build: {
    outDir: 'dist-pages',
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/app-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
