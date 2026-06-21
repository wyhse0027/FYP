// Simple localStorage-backed review store keyed by productId
const KEY = 'gc_reviews_v1';

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
};
const write = (db) => localStorage.setItem(KEY, JSON.stringify(db));

export function addReview(productId, review) {
  const db = read();
  db[productId] = db[productId] || [];
  // newest first
  db[productId].unshift({
    user: review.user || 'User',
    rating: Number(review.rating) || 0,
    text: review.text || '',
    date: review.date || new Date().toISOString(),
  });
  write(db);
}

export function getReviews(productId) {
  const db = read();
  return db[productId] || [];
}

export function getAverageRating(productId, base = []) {
  const all = [...base, ...getReviews(productId)];
  if (!all.length) return 0;
  return all.reduce((s, r) => s + (Number(r.rating) || 0), 0) / all.length;
}
