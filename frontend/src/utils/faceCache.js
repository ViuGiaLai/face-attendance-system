const CACHE_KEY = 'face_descriptor_cache';

export function getFaceCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToFaceCache(entries) {
  const cache = getFaceCache();
  for (const entry of entries) {
    const idx = cache.findIndex((e) => e.user_id === entry.user_id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...entry, cached_at: Date.now() };
    } else {
      cache.push({ ...entry, cached_at: Date.now() });
    }
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function findLocalMatch(descriptor, tolerance = 0.55) {
  const cache = getFaceCache();
  if (!cache.length || !descriptor) return null;
  let best = null;
  let bestDist = Infinity;
  for (const entry of cache) {
    if (!entry.descriptor) continue;
    let dist = 0;
    const d = descriptor;
    const ed = entry.descriptor;
    for (let i = 0; i < d.length; i++) {
      const diff = d[i] - ed[i];
      dist += diff * diff;
    }
    dist = Math.sqrt(dist);
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }
  if (best && bestDist <= tolerance) {
    return { user: best, distance: bestDist };
  }
  return null;
}
