import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
async function ready(page) {
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(6);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
}
test.beforeAll(async()=>fs.mkdir('docs/evidencias',{recursive:true}));
test('CSR: catálogo, filtros, búsqueda, favoritos y preferencias persistentes', async ({ page }) => {
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await ready(page);
  await page.locator('#splash').waitFor({state:'hidden'});
  await page.screenshot({path:'docs/evidencias/home.png',fullPage:true});
  await page.getByRole('button',{name:'Panadería',exact:true}).click();
  await expect(page.locator('.card')).toHaveCount(2);
  await page.getByRole('button',{name:'Todos',exact:true}).click();
  await page.getByRole('searchbox').fill('Lumbre'); await expect(page.locator('.card')).toHaveCount(1);
  await page.getByRole('button',{name:'Guardar Lumbre Café',exact:true}).click();
  await page.getByRole('button',{name:'Activar tema oscuro',exact:true}).click();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('link',{name:'Mis favoritos'}).click(); await expect(page.locator('.card')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('Offline: recarga del shell, ficha CSR, reseña persistente y envío al recuperar red', async ({page,context})=>{
  await ready(page); await page.goto('/#/cafe/lumbre');
  await expect(page.locator('#review-form')).toBeVisible();
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#connection')).toHaveText('Sin conexión');
  await page.getByLabel('Tu nombre').fill('Prueba offline');
  await page.getByLabel('Tu reseña').fill('La reseña se escribió sin conexión a internet.');
  await page.getByRole('button',{name:'Guardar reseña'}).click();
  await expect(page.locator('#review-list')).toContainText('Pendiente de sincronizar');
  expect(await page.evaluate(async()=> (await RouteDB.all('outbox')).length)).toBe(1);
  await page.reload(); await expect(page.locator('#review-list')).toContainText('Prueba offline');
  await page.screenshot({path:'docs/evidencias/offline.png',fullPage:true});
  await context.setOffline(false);
  await expect.poll(()=>page.evaluate(async()=> (await RouteDB.all('outbox')).length)).toBe(0);
  const remote=await page.request.get('/api/reviews?cafeId=lumbre');
  expect((await remote.json()).filter(r=>r.name==='Prueba offline')).toHaveLength(1);
});
test('Background Sync: evento real de Chromium vacía una cola persistida',async({page,context})=>{
  await ready(page);
  await page.evaluate(async()=>RouteDB.queueReview({id:crypto.randomUUID(),cafeId:'miga',name:'Sync CDP',text:'Enviada por el evento sync del service worker.',rating:4,createdAt:new Date().toISOString(),status:'pending',apiBase:location.origin}));
  const cdp=await context.newCDPSession(page); const registrations=[];
  cdp.on('ServiceWorker.workerRegistrationUpdated',event=>registrations.push(...event.registrations));
  await cdp.send('ServiceWorker.enable');
  await expect.poll(()=>registrations.length).toBeGreaterThan(0);
  const registration=registrations.find(r=>r.scopeURL==='http://localhost:3100/');
  await cdp.send('ServiceWorker.dispatchSyncEvent',{origin:'http://localhost:3100',registrationId:registration.registrationId,tag:'sync-reviews',lastChance:false});
  await expect.poll(()=>page.evaluate(async()=> (await RouteDB.all('outbox')).length)).toBe(0);
});
test('IndexedDB recupera el catálogo sin caché de datos y la página offline tiene salida',async({page,context})=>{
  await ready(page);
  await page.evaluate(async()=>{
    for(const name of await caches.keys()) { const cache=await caches.open(name); for(const request of await cache.keys()) if (/api\/catalog|data\/catalog\.json/.test(request.url)) await cache.delete(request); }
  });
  await context.setOffline(true); await page.reload(); await expect(page.locator('.card')).toHaveCount(6);
  await page.goto('/pagina-no-visitada'); await expect(page.getByRole('heading',{name:'Sin conexión. Tu pausa sigue.'})).toBeVisible();
  await page.getByRole('link',{name:'Abrir el catálogo guardado'}).click(); await expect(page.locator('.card')).toHaveCount(6);
});
test('SSR sin JavaScript y posterior hidratación',async({browser,page})=>{
  const context=await browser.newContext({javaScriptEnabled:false}); const staticPage=await context.newPage();
  await staticPage.goto('http://localhost:3100/ficha/lumbre/'); await expect(staticPage.getByRole('heading',{name:'Lumbre Café',exact:true})).toBeVisible();
  await expect(staticPage.locator('[data-ssr]')).toContainText('Una barra pequeña'); await context.close();
  await page.goto('/ficha/lumbre/'); await expect(page.locator('[data-hydrated=true]')).toBeVisible();
  await page.getByRole('button',{name:'Guardar favorito'}).click();
  await expect(page.locator('.page [data-favorite]')).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'docs/evidencias/ssr.png',fullPage:true});
});
test('Dispositivo: ubicación concedida y denegada',async({page,context})=>{
  await context.grantPermissions(['geolocation']); await context.setGeolocation({latitude:19.4194,longitude:-99.1594});
  await ready(page); await page.getByRole('link',{name:'Cerca de mí',exact:true}).click();
  await page.getByRole('button',{name:'Usar mi ubicación'}).click();
  await expect(page.locator('#near-grid .card')).toHaveCount(6); await expect(page.locator('.distance').first()).toHaveText('0.0 km de ti');
  await context.clearPermissions(); await page.evaluate(()=>navigator.geolocation.getCurrentPosition=(_ok,error)=>error({code:1}));
  await page.getByRole('button',{name:'Usar mi ubicación'}).click(); await expect(page.locator('#location-status')).toContainText('No diste permiso');
});
test('Service worker: actualización aceptada, recarga y datos conservados',async({page})=>{
  await ready(page); await page.getByRole('button',{name:'Guardar Lumbre Café',exact:true}).click();
  await page.request.get('/__test/update');
  await page.evaluate(async()=> (await navigator.serviceWorker.getRegistration()).update());
  await expect(page.getByRole('button',{name:'Actualizar ahora'})).toBeVisible();
  await page.getByRole('button',{name:'Actualizar ahora'}).click();
  await expect(page.getByRole('button',{name:'Quitar Lumbre Café',exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(async()=> (await caches.keys()).filter(k=>k.includes('shell-')).length)).toBe(1);
});
test('Aviso local y recepción push en el worker (entrega CDP, sin proveedor externo)',async({page,context})=>{
  await context.grantPermissions(['notifications']); await ready(page);
  await page.goto('/#/settings'); await page.getByRole('button',{name:'Probar aviso local'}).click();
  await expect.poll(()=>page.evaluate(async()=> (await (await navigator.serviceWorker.getRegistration()).getNotifications()).length)).toBe(1);
  const cdp=await context.newCDPSession(page);const registrations=[];
  cdp.on('ServiceWorker.workerRegistrationUpdated',event=>registrations.push(...event.registrations));await cdp.send('ServiceWorker.enable');
  await expect.poll(()=>registrations.length).toBeGreaterThan(0);
  await cdp.send('ServiceWorker.deliverPushMessage',{origin:'http://localhost:3100',registrationId:registrations[0].registrationId,data:JSON.stringify({title:'Push de prueba',body:'Mensaje entregado al service worker',url:'https://untrusted.example'})});
  await expect.poll(()=>page.evaluate(async()=> (await (await navigator.serviceWorker.getRegistration()).getNotifications()).map(n=>n.title))).toContain('Push de prueba');
  const safe=await page.evaluate(async()=> (await (await navigator.serviceWorker.getRegistration()).getNotifications()).find(n=>n.title==='Push de prueba').data.url);
  expect(safe).toBe('http://localhost:3100/#/');
});
test('Manifiesto reconocido, PNG instalables y diseño móvil sin desborde',async({page,context})=>{
  await ready(page); const cdp=await context.newCDPSession(page); const manifest=await cdp.send('Page.getAppManifest');
  expect(manifest.errors).toHaveLength(0);expect(JSON.parse(manifest.data).display).toBe('standalone');
  // Los contextos aislados de Playwright son incógnitos; Chromium impide instalar en ellos.
  const errors=(await cdp.send('Page.getInstallabilityErrors')).installabilityErrors;
  expect(errors.filter(error=>error.errorId!=='in-incognito')).toHaveLength(0);
  await page.setViewportSize({width:390,height:844});await page.locator('#splash').waitFor({state:'hidden'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'docs/evidencias/mobile.png',fullPage:true});
});
