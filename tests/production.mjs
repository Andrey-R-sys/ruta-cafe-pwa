import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const deployment=JSON.parse(await fs.readFile('docs/publicacion.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(deployment.pages);assert.equal(response.status(),200);
  await page.waitForSelector('.card');assert.equal(await page.locator('.card').count(),6);
  await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  const scope=await page.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).scope);assert.equal(scope,deployment.pages);
  await page.goto(deployment.pages+'ficha/lumbre/');await page.waitForSelector('[data-hydrated=true]');
  await context.setOffline(true);await page.reload();await page.waitForSelector('#review-form');
  await page.getByLabel('Tu nombre').fill('Prueba de publicación');await page.getByLabel('Tu reseña').fill('Reseña de prueba guardada únicamente en un perfil temporal.');await page.getByRole('button',{name:'Guardar reseña'}).click();
  await page.waitForFunction(async()=>(await RouteDB.all('outbox')).length===1);
  await page.goto(deployment.pages+'#/');await page.waitForSelector('.card');assert.equal(await page.locator('.card').count(),6);
  assert.deepEqual(errors,[]);
  await context.setOffline(false);
  const sw=await (await page.request.get(deployment.pages+'sw.js')).text();
  const version=/const VERSION = '([^']+)'/.exec(sw)[1];
  if(process.argv[2]) assert.equal(version,process.argv[2]);
  await fs.writeFile('docs/evidencias/pages-publico.json',JSON.stringify({testedAt:new Date().toISOString(),url:deployment.pages,httpStatus:200,version,scope,catalogCount:6,prerenderHydrated:true,offlineReload:true,offlineReviewQueued:true,javascriptErrors:errors,backend:'No desplegado en Pages; las reseñas permanecen locales hasta configurar API.'},null,2));
  console.log(`GitHub Pages verificado: HTTP 200, versión ${version}, scope correcto, CSR, hidratación, offline y reseña local.`);
}finally{await browser.close();}
