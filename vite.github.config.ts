import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';

const legacyEntryFiles = [
  'assets/index-CcIgRf6v.js',
  'assets/index-DxcjTxRu.js',
  'assets/app.js',
];
const legacyStyleFiles = ['assets/index-BoUDbTB1.css', 'assets/index.css'];

// Hash source bytes, not HEAD/date: local uncommitted builds must also differ.
function treeHash(roots:string[],sourceOnly=false) {
  const hash=createHash('sha256'),files:string[]=[];
  const visit=(dir:string)=>{for(const item of readdirSync(dir,{withFileTypes:true})){const path=join(dir,item.name);
    if(item.isDirectory())visit(path);else if(!sourceOnly||/\.(tsx?|js|json)$/.test(path))files.push(path);}};
  roots.forEach(visit);
  for(const file of files.sort())hash.update(relative(process.cwd(),file).replaceAll('\\','/')).update('\0').update(readFileSync(file)).update('\0');
  return hash.digest('hex');
}
const contentManifest={buildVersion:treeHash(['app','lib','config'],true),mapAssetsRevision:treeHash(['public/field','public/map-studio','public/map-runtime'])};

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
  define:{__BENTENG_CONTENT__:JSON.stringify(contentManifest)},
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
