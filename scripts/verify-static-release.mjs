import {readdir,readFile,lstat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export function releasePathProblem(relative){
  const name=relative.replaceAll('\\','/');
  if(name.split('/').some(part=>part.startsWith('.')))return 'hidden/internal file';
  if(/(^|\/)(scripts|config|app|lib|modules|node_modules|docs|outputs|work|source-imports)(\/|$)/i.test(name))return 'source or internal directory';
  if(/(^|\/)(package(?:-lock)?\.json|tsconfig[^/]*\.json|vite\.[^/]*|wrangler\.[^/]*|CODEOWNERS|server\.(?:js|mjs|cjs)|editor\.(?:js|css|html)|coachmarks\.js)$/i.test(name))return 'development/admin file';
  if(/\.(map|tsx?|mts|cts|mjs|cjs|jsx|py|ps1|sh|ya?ml|pem|key|pfx|p12|sqlite|db|zip|psd|psb|kra|aseprite|blend)$/i.test(name))return 'source map, source, archive or private source asset';
  return null;
}
export function releaseTextProblem(text){
  if(/(?:\/\/[#@]|\/\*[#@])\s*sourceMappingURL\s*=/.test(text))return 'source map reference';
  if(/-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/.test(text))return 'private key material';
  return null;
}
export async function verifyStaticRelease(directory){
  const root=path.resolve(directory),problems=[];let files=0;
  const visit=async folder=>{
    for(const item of await readdir(folder,{withFileTypes:true})){
      const file=path.join(folder,item.name),relative=path.relative(root,file).replaceAll('\\','/');
      const issue=releasePathProblem(relative);
      if(item.isSymbolicLink()){problems.push({path:relative,issue:'symbolic link'});continue;}
      if(issue){problems.push({path:relative,issue});continue;}
      if(item.isDirectory()){await visit(file);continue;}
      if(!item.isFile()){problems.push({path:relative,issue:'non-regular file'});continue;}
      files++;
      if(/\.(js|css|html|json|txt)$/i.test(item.name)){
        const issue=releaseTextProblem(await readFile(file,'utf8'));
        if(issue)problems.push({path:relative,issue});
      }
    }
  };
  if(!(await lstat(root)).isDirectory())throw Error('Static release must be a real directory.');
  await visit(root);
  for(const required of ['index.html','LICENSE.txt'])if(!(await lstat(path.join(root,required)).catch(()=>null))?.isFile())problems.push({path:required,issue:'required release file missing'});
  if(!files)throw Error('Static release is empty.');
  if(problems.length)throw Error('Public artifact rejected:\n'+problems.map(p=>`${p.path}: ${p.issue}`).join('\n'));
  return {files};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{const result=await verifyStaticRelease(process.argv[2]??'dist-pages');console.log(`Public artifact verified: ${result.files} files; no editor source/source maps or private-key markers detected. Browser-delivered code/assets remain public.`);}
  catch(error){console.error(error instanceof Error?error.message:String(error));process.exitCode=1;}
}
