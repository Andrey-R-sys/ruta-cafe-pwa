// Compartido por la ventana y el service worker. Resuelve al completar la transacción.
(() => {
  let database;
  function open() {
    return database ||= new Promise((resolve, reject) => {
      const request = indexedDB.open('ruta-cafe', 1);
      request.onupgradeneeded = () => {
        for (const store of ['catalog', 'reviews', 'outbox', 'settings']) request.result.createObjectStore(store, { keyPath: 'id' });
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); database = null; };
        resolve(db);
      };
      request.onerror = () => { database = null; reject(request.error); };
      request.onblocked = () => console.warn('Cierra otras pestañas para actualizar la base de datos.');
    });
  }
  async function operation(store, mode, callback) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const request = callback(tx.objectStore(store));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error('No se pudo guardar en este dispositivo.'));
    });
  }
  globalThis.RouteDB = {
    open,
    get: (store, id) => operation(store, 'readonly', value => value.get(id)),
    all: store => operation(store, 'readonly', value => value.getAll()),
    put: (store, record) => operation(store, 'readwrite', value => value.put(record)),
    remove: (store, id) => operation(store, 'readwrite', value => value.delete(id)),
    async queueReview(review) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['reviews', 'outbox'], 'readwrite');
        tx.objectStore('reviews').put(review);
        tx.objectStore('outbox').put(review);
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    },
    async acknowledge(review) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(['reviews', 'outbox'], 'readwrite');
        tx.objectStore('reviews').put({ ...review, status: 'sent' });
        tx.objectStore('outbox').delete(review.id);
        tx.oncomplete = resolve;
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    }
  };
})();
