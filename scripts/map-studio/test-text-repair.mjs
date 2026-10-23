import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repairMapText,editorText,validateMap,mapIssues} from '../../lib/map-studio-model.js';
import {templates} from './templates.mjs';
const {template}=await templates(process.cwd());
void test('text repair is detached/idempotent and preserves every gameplay/asset field',()=>{
  const map=structuredClone(template);map.name='';map.description='d'.repeat(350);map.objects[0].name='x'.repeat(140);map.objects[1].name=null;
  const source=structuredClone(map),result=repairMapText(map);assert.deepEqual(map,source);assert.equal(result.fixes.length,4);
  assert.equal(result.map.name,'Map tanpa nama');assert.equal(result.map.description.length,300);assert.equal(result.map.objects[0].name.length,100);assert.equal(result.map.objects[1].name,'Objek 2');
  const strip=value=>{const copy=structuredClone(value);delete copy.name;delete copy.description;for(const o of copy.objects)delete o.name;return copy;};
  assert.deepEqual(strip(result.map),strip(source));assert.doesNotThrow(()=>validateMap(result.map));assert.equal(repairMapText(result.map).fixes.length,0);
  assert(mapIssues(map).some(issue=>issue.object===map.objects[0].id&&issue.field==='objectName'));
});
void test('shortening labels never splits surrogate pairs and cannot mask unsafe geometry',()=>{
  const label=editorText('😀'.repeat(60),99,'Objek');assert.equal(label.length,98);assert.equal(Array.from(label).length,49);
  assert.equal(editorText('  Ground   patch \n  grass ',100),'Ground patch grass');
  const map=structuredClone(template);map.objects[0].name='x'.repeat(110);map.objects[0].x=-400;
  assert.throws(()=>validateMap(repairMapText(map).map),/Objek X/);assert.equal(repairMapText(map).map.objects[0].x,-400);
});
