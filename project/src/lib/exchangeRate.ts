/** Fallback rate used only when the live lookup fails (offline, API down). Roughly
 * accurate as of 2026 but should never be relied on for real transactions. */
const FALLBACK_USD_TO_CDF = 2800;
const CACHE_KEY = 'registreIntelligentUsdToCdfRate';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CachedRate {
  rate: number;
  fetchedAt: number;
}

function readCache(): CachedRate | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRate;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(rate: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, fetchedAt: Date.now() }));
  } catch {
    /* Storage unavailable — non-fatal, we just won't cache. */
  }
}

/** USD → Franc congolais rate, from a free public source with a cached/offline fallback. */
export async function getUsdToCdfRate(): Promise<{ rate: number; isLive: boolean }> {
  const cached = readCache();
  if (cached) return { rate: cached.rate, isLive: true };

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const json = await response.json() as { result?: string; rates?: Record<string, number> };
    const rate = json.rates?.CDF;
    if (json.result === 'success' && typeof rate === 'number' && rate > 0) {
      writeCache(rate);
      return { rate, isLive: true };
    }
  } catch {
    /* Fall through to the offline fallback below. */
  }
  return { rate: FALLBACK_USD_TO_CDF, isLive: false };
}

export function formatCdf(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FC`;
}
