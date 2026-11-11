import { chromium } from '@playwright/test';
import express from 'express';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
const app=express();app.use('/ruta-cafe-pwa',express.static(path.resolve('dist')));
const server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));
const browser=await chromium.launch({channel:'chrome',headless:true});
const base=`http://localhost:${server.address().port}/ruta-cafe-pwa/`;
try {
  const context=await browser.newContext();const page=await context.newPage();
  await page.goto(base);await page.waitForSelector('.card');assert.equal(await page.locator('.card').count(),6);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
  const scope=await page.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).scope);assert.equal(scope,base);
  await page.goto(base+'ficha/lumbre/');await page.waitForSelector('[data-hydrated=true]');
  assert.equal(await page.locator('base').getAttribute('href'),'../../');
  await context.setOffline(true);await page.reload();await page.waitForSelector('#review-form');
  await page.goto(base+'#/');await page.waitForSelector('.card');assert.equal(await page.locator('.card').count(),6);
  await fs.writeFile('docs/evidencias/pages-local.json',JSON.stringify({testedAt:new Date().toISOString(),scope:'/<repositorio>/',cards:6,prerenderedHydrated:true,offlineSubpath:true},null,2));
  console.log('Build estático verificado bajo subcarpeta: catálogo, scope, ficha hidratada y recarga offline.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
