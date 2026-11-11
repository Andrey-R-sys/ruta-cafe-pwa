import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { root } from '../server/app.js';
import { renderDocument } from '../server/ssr.js';
const destination = path.resolve(root,'dist');
assert.equal(destination,path.join(root,'dist'));
await fs.rm(destination,{recursive:true,force:true});
await fs.cp(path.join(root,'public'),destination,{recursive:true});
const catalog=JSON.parse(await fs.readFile(path.join(root,'public/data/catalog.json'),'utf8'));
for(const cafe of catalog){
  const directory=path.join(destination,'ficha',cafe.id);await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,'index.html'),await renderDocument(cafe,'../../'));
}
await fs.writeFile(path.join(destination,'.nojekyll'),'');
await fs.copyFile(path.join(root,'public/offline.html'),path.join(destination,'404.html'));
try { await fs.copyFile(path.join(root,'output/pdf/reporte-ruta-cafe.pdf'),path.join(destination,'reporte.pdf')); } catch(error) { if(error.code!=='ENOENT')throw error; }
console.log('dist listo: shell, assets y seis fichas prerenderizadas. No incluye secretos ni servidor.');
