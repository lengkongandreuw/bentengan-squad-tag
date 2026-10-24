import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
void test('all game Back controls share the supplied red artwork, not legacy icons',async()=>{
 const shared=await readFile('modules/ui/back-button.tsx','utf8');
 assert.match(shared,/homeMenuArt\('back'\)/);assert(!shared.includes('back-inactive'));assert(!shared.includes('back-hover'));
 for(const file of ['mode-select-screen','developer-credits','pause-overlay','tutorial-entry','tutorial-finish','renderer-error-notice','asset-loading-screen','character-workshop/character-workshop']){
  const source=await readFile(`modules/ui/${file}.tsx`,'utf8');assert(source.includes('ArtworkBackButton'),file);
 }
});
void test('reveal is keyed visual-only CSS motion, bounded, cancellable and reduced-motion safe',async()=>{
 const source=await readFile('modules/ui/menu-reveal.tsx','utf8'),css=await readFile('app/home-menu.css','utf8'),app=await readFile('app/prototype.tsx','utf8');
 assert.match(source,/aria-hidden="true"/);assert(!/setTimeout|setInterval|addEventListener/.test(source));
 assert.match(app,/<MenuReveal key=\{menuStep\}/);assert.match(css,/\.menu-reveal[^}]*pointer-events:none/);
 assert.match(css,/@keyframes gaming-ink-sweep/);assert.match(css,/@keyframes gaming-title-hit/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\s*\{\s*\.menu-reveal \{display:none;/);
});
