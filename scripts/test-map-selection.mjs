import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {mapSelectionTheme,mapSelectionFiles,orderArenaSelection} from '../modules/ui/map-selection-assets.ts';
import {uiAsset} from '../modules/ui/ui-assets.ts';
void test('arena selection sorts easy to hard and editor replacements keep canonical Kampung first without mutating inputs',()=>{
  const fields=[{id:'kanal',difficulty:'hard'}, {id:'custom-normal',difficulty:'normal'},
    {id:'studio-pasar-new-id',difficulty:'normal'}, {id:'taman',difficulty:'hard'},
    {id:'studio-kampung-new-id',difficulty:'easy',name:'Renamed village'},
    {id:'kanal2',difficulty:'hard'}, {id:'custom-easy',difficulty:'easy'}];
  const before=JSON.stringify(fields),aliases={'studio-pasar-new-id':'pasar','studio-kampung-new-id':'kampung'};
  const expected=['studio-kampung-new-id','custom-easy','studio-pasar-new-id','custom-normal','taman','kanal','kanal2'];
  assert.deepEqual(orderArenaSelection(fields,id=>aliases[id]??id).map(f=>f.id),expected);
  assert.equal(JSON.stringify(fields),before);
  const originals=fields.map(f=>({...f,id:aliases[f.id]??f.id}));
  assert.deepEqual(orderArenaSelection(originals).map(f=>f.id),expected.map(id=>aliases[id]??id));
  assert.deepEqual(orderArenaSelection([]),[]);
  assert.deepEqual(orderArenaSelection([{id:'custom-a',difficulty:'hard'},{id:'custom-b',difficulty:'hard'}]).map(f=>f.id),['custom-a','custom-b']);
});

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
