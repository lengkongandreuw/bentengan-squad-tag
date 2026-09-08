import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const legacyEntryFiles = [
  'assets/index-CcIgRf6v.js',
  'assets/index-DxcjTxRu.js',
];
const legacyStyleFiles = ['assets/index-BoUDbTB1.css'];

const githubPagesCacheCompatibility: Plugin = {
  name: 'github-pages-cache-compatibility',
  generateBundle(_options, bundle) {
    const entry = Object.values(bundle).find(
      (output) => output.type === 'chunk' && output.isEntry,
    );
    const style = Object.entries(bundle).find(
      ([fileName, output]) =>
        output.type === 'asset' && fileName.endsWith('.css'),
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
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
