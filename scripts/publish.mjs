import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { api } from './github.mjs';
const command=process.argv[2]||'status';
const file='docs/publicacion.json';
const metadata=JSON.parse(await fs.readFile(file,'utf8').catch(()=>'null'));
function git(args){const result=spawnSync('git',args,{encoding:'utf8',windowsHide:true});if(result.status!==0)throw new Error(result.stderr);console.log(result.stdout.trim()||'Git: operación completada.');}
if(command==='create'){
  if(metadata)throw new Error('Ya existe registro de publicación; reutiliza el repositorio.');
  const user=await api('/user');
  const repos=await api('/user/repos?per_page=100&sort=created');
  let name='ruta-cafe-pwa';if(repos.some(r=>r.name===name))name='ruta-cafe-pwa-'+Date.now();
  const repo=await api('/user/repos',{method:'POST',body:JSON.stringify({name,description:'Proyecto educativo PWA por fases: offline, IndexedDB, SSR, Background Sync y Web Push.',private:false,auto_init:false})});
  const info={owner:user.login,name:repo.name,repository:repo.html_url,pages:`https://${user.login.toLowerCase()}.github.io/${repo.name}/`,createdAt:new Date().toISOString()};
  await fs.writeFile(file,JSON.stringify(info,null,2)+'\n');
  git(['remote','add','origin',repo.clone_url]);console.log(JSON.stringify(info));
}else{
  if(!metadata)throw new Error('Primero ejecuta create.');
  const prefix=`/repos/${metadata.owner}/${metadata.name}`;
  if(command==='enable'){
    let pages;
    try{pages=await api(prefix+'/pages');}catch(error){if(!error.message.includes('404'))throw error;pages=await api(prefix+'/pages',{method:'POST',body:JSON.stringify({build_type:'workflow'})});}
    await api(prefix,{method:'PATCH',body:JSON.stringify({homepage:metadata.pages})});
    console.log(JSON.stringify({html_url:pages.html_url,build_type:pages.build_type}));
  }else if(command==='dispatch'){
    await api(prefix+'/actions/workflows/pages.yml/dispatches',{method:'POST',body:JSON.stringify({ref:'main'})});console.log('Publicación solicitada.');
  }else{
    const runs=await api(prefix+'/actions/runs?per_page=5');
    console.log(JSON.stringify(runs.workflow_runs.map(r=>({id:r.id,status:r.status,conclusion:r.conclusion,url:r.html_url,sha:r.head_sha}))));
  }
}
