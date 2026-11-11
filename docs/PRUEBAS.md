# Fase 12 · Reporte de pruebas

Fecha: 10 de noviembre de 2026. Entorno: Windows, Node 22.14, npm 10.9 y Google Chrome mediante Playwright. Casos automatizados con datos temporales, sin modificar reseñas de la app local. Los permisos concedidos por la automatización solo afectan a perfiles de prueba.

## Herramientas y ejecución

```powershell
npm ci
npm test
npm run test:e2e
# Con npm start ejecutándose en otra terminal:
node tests/install.mjs
```

La suite usa Chrome instalado. Si no está disponible: `npx playwright install chrome`. Playwright inicia y cierra su servidor de prueba en el puerto 3100. El servidor del proyecto utiliza el puerto 3000.

## Tabla de casos de prueba

| ID | Caso y precondición | Procedimiento | Resultado esperado | Resultado obtenido | Estado / evidencia |
|---|---|---|---|---|---|
| CP01 | Servidor y catálogo | Iniciar servidor; GET /api/catalog | 200; seis lugares | Seis registros válidos | Aprobado; api.tap |
| CP02 | App shell y CSR | Buscar Lumbre; filtrar Panadería; volver a Todos | 1, 2 y 6 resultados respectivamente | Conteos correctos, sin errores JS | Aprobado; home.png |
| CP03 | Manifiesto e íconos | Consultar manifiesto en CDP y dimensiones PNG | Sin errores del manifiesto; PNG 192 y 512; maskable | Formato y dimensiones correctos | Aprobado; suite API y navegador |
| CP04 | Instalación | Perfil temporal persistente; PWA.install de Chrome | Chrome registra la app instalada | Instalación confirmada; desinstalación al terminar | Aprobado; instalacion.json |
| CP05 | Favoritos y tema | Guardar favorito; tema oscuro; recargar | Se conservan preferencias | Persisten ambos valores | Aprobado; Playwright |
| CP06 | Navegación offline | Esperar SW; desconectar contexto; recargar ficha | Shell y ficha CSR disponibles | Ficha y formulario operativos | Aprobado; offline.png |
| CP07 | Respaldo IndexedDB | Borrar solo caché de datos; desconectar; recargar | Recuperar seis lugares desde IndexedDB | Seis tarjetas renderizadas | Aprobado; Playwright |
| CP08 | Fallback offline | Sin red; abrir URL no visitada | Página offline; enlace al catálogo | Página y salida al catálogo operativas | Aprobado; Playwright |
| CP09 | Reseña local primero | Sin red; escribir y recargar | Una reseña pendiente sobrevive | Cola y reseña conservadas | Aprobado; offline.png |
| CP10 | Recuperar red | Reconectar después de CP09 | Cola vacía; una reseña en servidor | Un registro, sin duplicados | Aprobado; Playwright |
| CP11 | Background Sync | Insertar reseña pendiente; disparar sync vía CDP | El SW envía y confirma la reseña | Cola vacía | Aprobado; evento real de Chromium inducido por CDP |
| CP12 | Idempotencia y persistencia | Cuatro POST simultáneos con el mismo UUID | Una creación; tres confirmaciones; un registro durable | 201, 200, 200, 200; un registro al reabrir el almacenamiento | Aprobado; api.tap |
| CP13 | Actualización | Cambiar versión servida; aceptar aviso | Nuevo worker controla; favorito conservado; caché antigua eliminada | Comportamiento confirmado | Aprobado; Playwright |
| CP14 | Notificación local | Permiso concedido en perfil de prueba; pulsar aviso | Notificación visible para el registro | Notificación creada | Aprobado; Playwright |
| CP15 | Recepción push | Entregar mensaje al SW mediante CDP | Evento push muestra aviso; bloquea URL externa | Aviso creado; destino limitado a la app | Aprobado en recepción simulada; no prueba al proveedor push |
| CP16 | Servidor push | Alta duplicada, envío con/sin clave, error 410 | Deduplicar; 401 sin clave; borrar suscripción expirada | Resultados correctos | Aprobado con transportador sustituido; api.tap |
| CP17 | SSR e hidratación | Abrir ficha sin JS y después con JS | Contenido sin JS; formulario y favorito al hidratar | Ficha legible y luego interactiva | Aprobado; ssr.png |
| CP18 | Geolocalización | Coordenadas simuladas de Lumbre; luego denegar | Orden por distancia; error comprensible | 0.0 km primero; mensaje de permiso denegado | Aprobado; Playwright |
| CP19 | Diseño móvil | Viewport 390 x 844 | Sin desplazamiento horizontal | Sin desborde | Aprobado; mobile.png |
| CP20 | Validación y CORS | JSON roto, datos inválidos y origen ajeno | Rechazar con 400 o 403 | Códigos esperados | Aprobado; api.tap |
| CP21 | Push real completo | HTTPS; servidor y VAPID; dispositivo compatible | Suscribir navegador; enviar push administrativo; recibir con app cerrada | Requiere servidor accesible y permiso real | Pendiente de validación en dispositivo; procedimiento abajo |
| CP22 | Splash del sistema | Instalar y abrir en Android compatible | Splash construido con nombre, ícono y colores del manifiesto | Configuración implementada; no se emuló Android | Pendiente de validación en dispositivo |

## Pruebas manuales pendientes

**CP21:** iniciar el servidor con `npm run vapid` y `npm start`, o alojarlo en HTTPS con disco persistente y las variables de `.env.example`. En la app, abrir Ajustes, configurar su origen HTTPS si corresponde y pulsar Activar push. Conceder permiso. En el servidor, enviar el mensaje mediante `node --env-file=.env scripts/send-push.mjs`. Cerrar las ventanas de la PWA y confirmar recepción del aviso; al pulsarlo debe abrir Ruta Café. Mantener el navegador habilitado para recibir notificaciones. En iOS compatible, usar la PWA agregada a inicio.

**CP22:** instalar desde Chrome Android, cerrar y abrir desde el ícono. Verificar nombre, ícono centrado y fondo verde. El navegador y el sistema operativo deciden cómo se presenta el splash del sistema; no se dibuja con HTML.

**Compatibilidad adicional:** repetir CP06, CP09, CP10, CP14 y CP21 en un dispositivo físico. Background Sync no está en todos los navegadores y su ejecución no es inmediata ni garantizada por el sistema. Si no está disponible, la app reintenta al recuperar red, volver a primer plano o pulsar Sincronizar ahora.

Las pruebas automatizadas certifican el comportamiento del código en Chrome. La entrega push desde Internet, el splash Android, vibración física y Web Share nativo requieren la validación de dispositivo descrita. No se presenta una simulación como entrega real de un proveedor.
