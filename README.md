# Ruta Café ☕

PWA educativa en español para explorar seis cafeterías ficticias de CDMX. Construida por fases, con un commit por cada fase (0-13).

**Aplicación:** https://andrey-r-sys.github.io/ruta-cafe-pwa/  
**Repositorio:** https://github.com/Andrey-R-sys/ruta-cafe-pwa

## Iniciar

Requiere Node.js 22.14 o posterior, npm y Git.

```powershell
npm ci
npm run vapid
npm start
```

Abrir **http://localhost:3000**. `npm run vapid` crea `.env` sin sobrescribirlo; las claves privadas y los datos del servidor están excluidos de Git. En producción, definir las variables de `.env.example`, un origen HTTPS y un directorio de datos persistente.

## Qué puedes probar

- Explorar, buscar, filtrar, guardar favoritos y cambiar tema.
- Instalar desde Home o el menú del navegador. El splash del sistema depende de la plataforma; el interno usa el shell.
- Visitar con red una vez, esperar la instalación del service worker, desconectar y recargar.
- Escribir una reseña offline y verla pendiente; reconectar para enviarla al servidor.
- Ver una ficha SSR en `/ficha/lumbre/`, incluso sin JavaScript. Con JS se hidratan favoritos, reseñas y compartir.
- Usar Cerca de mí; la ubicación permanece en el navegador.
- Activar un aviso local o push desde Ajustes. Para enviar push real: `node --env-file=.env scripts/send-push.mjs`. Es necesario tener una suscripción real activa.

## Verificar

```powershell
npm test
npm run test:e2e
# Con el servidor local activo:
node tests/install.mjs
npm run build
```

Pruebas: 5 grupos API, 9 escenarios de navegador y una comprobación de instalación en perfil temporal. Se incluyen capturas y resultados en `docs/evidencias/`. Los límites y casos manuales están en [el reporte de pruebas](docs/PRUEBAS.md).

## GitHub Pages y servidor

GitHub Pages publica `dist/` mediante el workflow `pages.yml`. Las rutas usan hash y assets relativos para funcionar en `/nombre-del-repo/`. Las fichas en Pages son **prerenderizadas durante el build**, mientras que Node las genera en cada petición.

| Función | GitHub Pages | Servidor Node |
|---|---|---|
| Shell, instalación, catálogo, favoritos y offline | Sí | Sí |
| Reseñas locales y cola persistente | Sí | Sí |
| Recibir y compartir reseñas | Configurar API externa | Sí |
| Background Sync | Necesita API accesible | Sí, sujeto al navegador |
| Avisos locales | Sujeto al navegador y permiso | Sujeto al navegador y permiso |
| Push real | Necesita API HTTPS con VAPID | Implementado con VAPID |
| Fichas HTML | Prerenderizadas | SSR por petición + hidratación |

En Pages, las reseñas permanecen pendientes hasta configurar un servidor HTTPS en Ajustes. **El servidor Node no se ejecuta en GitHub Pages.** Para alojarlo: `npm ci --omit=dev`, variables de entorno, `npm start`, disco persistente para `DATA_DIR` y `ALLOWED_ORIGINS=https://andrey-r-sys.github.io`. No publiques `.env`, la clave VAPID privada ni `PUSH_ADMIN_KEY`.

## Publicar actualizaciones

```powershell
node scripts/release.mjs 1.0.2
npm test
npm run build
git add .
git commit -m "Actualizar PWA a 1.0.2"
git push origin main
```

GitHub Actions valida y publica. En la app, aceptar «Actualizar ahora» activa el nuevo worker. Se conservan IndexedDB y localStorage; se eliminan solo las cachés anteriores de este scope.

## Estructura

`public/`: shell, estilos, módulos de navegador, manifiesto y worker. `server/`: Express, SSR, API y almacenamiento durable. `scripts/`: build, claves, publicación y verificación por fase. `tests/`: API e integración con Chrome. `docs/`: reporte, tabla de pruebas y evidencias. `output/pdf/`: reporte final PDF.

La persistencia JSON es apropiada para una instancia de demostración. Para múltiples instancias, sustituirla por una base compartida. La app no incluye cuentas ni moderación; usa datos educativos. Background Sync, Web Share, vibración, instalación y push dependen de las capacidades y permisos del navegador.
