export function distanceKm(a, b) {
  const rad = degrees => degrees * Math.PI / 180;
  const dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng);
  const h = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0,1-h)));
}
export function locate() {
  if (!navigator.geolocation) return Promise.reject(new Error('Este navegador no admite ubicación. Puedes explorar por colonia.'));
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
    ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
    error => reject(new Error(({ 1:'No diste permiso de ubicación. Puedes explorar el catálogo sin compartirla.', 2:'No pudimos obtener tu ubicación. Inténtalo en un lugar con mejor señal.', 3:'La ubicación tardó demasiado. Inténtalo otra vez.' })[error.code] || 'Ubicación no disponible.')),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  ));
}
export function vibrate() { navigator.vibrate?.(30); }
export async function share(cafe, url) {
  if (navigator.share) await navigator.share({ title: `${cafe.name} · Ruta Café`, text: cafe.description, url });
  else if (navigator.clipboard) await navigator.clipboard.writeText(url);
  else throw new Error('Copia el enlace desde la barra del navegador.');
}
