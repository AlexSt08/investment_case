// ── Earnings Calendar — logique de cache ─────────────────────────────────

export type CacheStatus =
  | 'fresh'
  | 'stale'
  | 'window_24h'
  | 'expired_24h'
  | 'missing'

export interface CacheEntry {
  fetchedAt:          Date
  lastEarningsDate:   Date | null
  nextEarningsDate:   Date | null
  earningsQuality:    'confirmed' | 'estimated' | 'unknown'
}

const WINDOW_DAYS    = 5
const TTL_WINDOW_MS  = 24 * 60 * 60 * 1000

function daysDiff(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

export function getCacheStatus(entry: CacheEntry | null): CacheStatus {
  if (!entry) return 'missing'
  const now = new Date()
  const { fetchedAt, lastEarningsDate, nextEarningsDate } = entry
  if (lastEarningsDate && fetchedAt < lastEarningsDate) return 'stale'
  if (nextEarningsDate) {
    const daysToNext = (nextEarningsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysToNext >= -WINDOW_DAYS && daysToNext <= WINDOW_DAYS) {
      const cacheAge = now.getTime() - fetchedAt.getTime()
      return cacheAge > TTL_WINDOW_MS ? 'expired_24h' : 'window_24h'
    }
  }
  return 'fresh'
}

export function shouldRefresh(status: CacheStatus): boolean {
  return status === 'stale' || status === 'expired_24h' || status === 'missing'
}

export function getCacheLabel(entry: CacheEntry, status: CacheStatus): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  switch (status) {
    case 'fresh':
      return `Données du ${fmt(entry.fetchedAt)}${
        entry.lastEarningsDate ? ` · Résultats du ${fmt(entry.lastEarningsDate)}` : ''
      }`
    case 'window_24h': {
      const q = entry.earningsQuality === 'estimated' ? ' (date estimée)' : ''
      return `Fenêtre earnings${q} · Mise à jour < 24h`
    }
    case 'stale':
      return `Cache obsolète — publication postérieure au ${fmt(entry.fetchedAt)}`
    case 'expired_24h':
      return `Fenêtre earnings · Cache > 24h → rafraîchi`
    default:
      return ''
  }
}

// ── Détermine si la market cap doit être rafraîchie via FMP ──────────────
// confirmed : fenêtre ±1 jour (date de publication fiable)
// estimated : fenêtre ±10 jours (date calculée à partir du last earning)
// unknown   : jamais (pas de date, on garde le cache)
export function needsMktCapRefresh(cached: {
  next_earnings_date:   string | null
  earnings_date_quality: string | null
}): boolean {
  const quality  = cached.earnings_date_quality
  const nextDate = cached.next_earnings_date
  if (!nextDate || quality === 'unknown' || !quality) return false
  const windowDays = quality === 'confirmed' ? 1 : 10
  const windowMs   = windowDays * 24 * 60 * 60 * 1000
  const msToNext   = new Date(nextDate).getTime() - Date.now()
  return Math.abs(msToNext) <= windowMs
}
