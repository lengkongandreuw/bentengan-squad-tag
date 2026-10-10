import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {mapSelectionTheme,mapSelectionFiles} from '../modules/ui/map-selection-assets.ts';
import {uiAsset} from '../modules/ui/ui-assets.ts';

void test('map selection uses native faction artwork and only seven required active/shared assets',async()=>{
  assert.equal(mapSelectionTheme(null),'purple');assert.equal(mapSelectionTheme('red'),'red');
  assert.equal(mapSelectionTheme('green'),'green');
  const names=new Set();
  for(const theme of [null,'red','green']) {
    const files=mapSelectionFiles(theme);assert.equal(Object.values(files).length,7);
    for(const file of Object.values(files)) {
      names.add(file);const metadata=await sharp(await readFile(`public/ui-v2/${file}`)).metadata();
      assert(metadata.hasAlpha && metadata.width>0 && metadata.height>0);
      assert(!file.includes('CONTOH')&&!file.includes('.psd'));
    }
  }
  assert.equal(names.size,15);
});
void test('custom map previews still use artwork resolver and native fallback without changing IDs',()=>{
  const sources={mapArtwork:id=>id==='studio-qa'?'custom.webp':null,publicAsset:file=>`/base/${file}`};
  assert.equal(uiAsset('fields/studio-qa.webp',sources),'custom.webp');
  assert.equal(uiAsset('fields/studio-missing.webp',sources),'/base/ui-v2/fields/kampung.webp');
  assert.match(uiAsset(mapSelectionFiles('red').frame,sources),/map-frame-red.png/);
});
void test('design remains presentation-only and locks start rather than blocking arena inspection',async()=>{
  const screen=await readFile('modules/ui/field-select-screen.tsx','utf8');
  assert.match(screen,/onClick=\{\(\) => onSelect\(field.id\)\}/);
  assert.match(screen,/disabled=\{!unlocked\}/);
  assert.match(screen,/if \(unlocked\) onStart\(\)/);
  assert.doesNotMatch(screen,/localStorage|progressionRules|field-card-row|field-card-preview/);
});
