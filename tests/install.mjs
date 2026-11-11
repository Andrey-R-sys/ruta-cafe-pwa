// Verifica instalación en un perfil temporal y la elimina al terminar.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const profile = await fs.mkdtemp(path.join(os.tmpdir(),'ruta-install-'));
const context = await chromium.launchPersistentContext(profile,{channel:'chrome',headless:true});
const manifestId='http://localhost:3000/';
let cdp, installed=false;
try {
  const page=context.pages()[0];await page.goto(manifestId);await page.evaluate(()=>navigator.serviceWorker.ready);
  cdp=await context.newCDPSession(page);
  const eligibility=await cdp.send('Page.getInstallabilityErrors');
  assert.equal(eligibility.installabilityErrors.length,0);
  await cdp.send('PWA.install',{manifestId,installUrlOrBundleUrl:manifestId});installed=true;
  await cdp.send('PWA.changeAppUserSettings',{manifestId,displayMode:'standalone'});
  const state=await cdp.send('PWA.getOsAppState',{manifestId});
  const evidence={testedAt:new Date().toISOString(),browser:context.browser()?.version(),profile:'temporal, eliminado al terminar',eligibility,installed:true,state};
  await fs.mkdir('docs/evidencias',{recursive:true});await fs.writeFile('docs/evidencias/instalacion.json',JSON.stringify(evidence,null,2));
  console.log('PWA instalada y reconocida por Chrome en perfil temporal.');
} finally {
  if(installed) await cdp.send('PWA.uninstall',{manifestId}).catch(()=>{});
  await context.close();
  const resolved=path.resolve(profile);assert(resolved.startsWith(path.resolve(os.tmpdir())+path.sep));
  await fs.rm(resolved,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
