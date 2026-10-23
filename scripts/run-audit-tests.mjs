// Read-only discovery; each API test owns its isolated temporary project.
import {readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const suites=['scripts','scripts/benteng-engine','scripts/map-studio','scripts/sprite-studio','scripts/character-admin','scripts/loading-admin'];
const files=[];
for(const directory of suites){
  for(const entry of await readdir(path.join(root,directory),{withFileTypes:true})){
    if(entry.isFile()&&/^test(?:-|\.)/.test(entry.name)&&entry.name.endsWith('.mjs')&&!entry.name.includes('browser'))files.push(path.join(directory,entry.name));
  }
}
console.log(`Auditing ${files.length} non-browser suites. Browser/gameplay checks are separate; this does not publish or rebuild assets.`);
const child=spawn(process.execPath,['--experimental-strip-types','--test','--test-concurrency=2',...files.sort()],{cwd:root,stdio:'inherit',windowsHide:true});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
