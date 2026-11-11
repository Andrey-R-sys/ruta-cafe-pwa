export function reviewRoutes(app, store, catalog) {
  app.get('/api/reviews', async (req, res) => {
    const { reviews } = await store.read();
    res.set('Cache-Control', 'no-store').json(reviews.filter(review => review.cafeId === req.query.cafeId).slice(-100));
  });
  app.post('/api/reviews', async (req, res) => {
    const { id, cafeId, name, text, rating } = req.body || {};
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || !catalog.some(c => c.id === cafeId) || typeof name !== 'string' || name.trim().length < 2 || name.length > 60 || typeof text !== 'string' || text.trim().length < 10 || text.length > 1000 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Revisa el lugar, nombre (2-60), reseña (10-1000) y calificación (1-5).' });
    }
    const review = { id, cafeId, name: name.trim(), text: text.trim(), rating, createdAt: new Date().toISOString() };
    const saved = await store.write(state => {
      const existing = state.reviews.find(item => item.id === id);
      if (existing) return { duplicate: true, review: existing };
      if (state.reviews.length >= 10000) return { full: true };
      state.reviews.push(review);
      return { duplicate: false, review };
    });
    if (saved.full) return res.status(507).json({ error: 'El almacenamiento de demostración está lleno.' });
    res.status(saved.duplicate ? 200 : 201).json(saved.review);
  });
}
