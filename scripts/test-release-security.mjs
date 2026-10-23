import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {releasePathProblem,releaseTextProblem,verifyStaticRelease} from './verify-static-release.mjs';

await test('public artifact path guard rejects source/editor/secret paths and allows runtime assets',()=>{
  for(const file of ['.git/config','.env','scripts/map-studio/server.mjs','config/map-studio.json','app/prototype.tsx','assets/app.js.map','assets/key.pem','backup.zip','public/editor.js','file.psd','a\\.preview-admin\\source.json'])assert(releasePathProblem(file),file);
  for(const file of ['index.html','LICENSE.txt','assets/app-123.js','assets/index-123.css','map-studio/abc.webp','sprite-runtime/abc.webp','audio/raja.mp3','fonts/SIL OPEN FONT LICENSE.txt','build-info.json'])assert.equal(releasePathProblem(file),null,file);
});
await test('private key and inline/external source map references fail without printing contents',()=>{
  assert(releaseTextProblem('//# sourceMappingURL=app.js.map'));
  assert(releaseTextProblem('/*# sourceMappingURL=data:application/json;base64,xyz */'));
  assert(releaseTextProblem('-----BEGIN PRIVATE KEY-----'));
  assert.equal(releaseTextProblem('const publicGame = true;'),null);
});
await test('artifact traversal accepts built files and rejects hidden source additions',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'benteng-release-'));
  await writeFile(path.join(root,'index.html'),'<!doctype html><html></html>');await writeFile(path.join(root,'LICENSE.txt'),'Copyright test');
  await mkdir(path.join(root,'assets'));await writeFile(path.join(root,'assets/app.js'),'console.log("Game");');
  assert.equal((await verifyStaticRelease(root)).files,3);
  await mkdir(path.join(root,'.preview-admin'));await writeFile(path.join(root,'.preview-admin/project.json'),'{}');
  await assert.rejects(verifyStaticRelease(root),/hidden\/internal/);
});
await test('copyright is visible on splash and license retains third-party exceptions',async()=>{
  const branding=await readFile('lib/branding.ts','utf8'),splash=await readFile('modules/ui/splash-screen.tsx','utf8'),license=await readFile('LICENSE','utf8');
  assert.match(branding,/© 2026 Big Dade Interactive \(PT Kawanua Virtual Teknologi\)/);
  assert.match(splash,/<footer className="splash-copyright">\{PRODUCT_COPYRIGHT\}<\/footer>/);
  assert.match(license,/Big Dade Interactive \(PT Kawanua Virtual Teknologi\)/);assert.match(license,/Materi pihak ketiga/);
});
