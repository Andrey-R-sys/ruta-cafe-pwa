const endpoint = `${process.env.API_BASE || `http://localhost:${process.env.PORT || 3000}`}/api/push/send`;
if (!process.env.PUSH_ADMIN_KEY) throw new Error('Carga .env: node --env-file=.env scripts/send-push.mjs');
const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${process.env.PUSH_ADMIN_KEY}` }, body: JSON.stringify({ title:'Una nueva pausa te espera ☕',body:'Descubre un rincón de Ruta Café.',url:'./#/' }) });
const result = await response.json();
if (!response.ok) throw new Error(`No se pudo enviar: ${response.status} ${result.error}`);
console.log(JSON.stringify(result));
