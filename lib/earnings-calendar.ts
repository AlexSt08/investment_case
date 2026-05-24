// ── Earnings Calendar — logique de cache ─────────────────────────────────
// Détermine si les données d'un ticker doivent être rafraîchies
// en fonction des dates de publications et de la fenêtre ±5 jours.

export type CacheStatus =
  | 'fresh'        // cache valide, hors fenêtre earnings, postérieur à last_earnings
  | 'stale'        // cache antérieur à la dernière publication → rafraîchir
  | 'window_24h'   // dans la fenêtre earnings ±5j → TTL 24h
  | 'expired_24h'  // dans la fenêtre earnings, cache > 24h → rafraîchir
  | 'missing'      // pas de cache

export interface CacheEntry {
  fetchedAt:          Date
  lastEarningsDate:   Date | null
  nextEarningsDate:   Date | null
  earningsQuality:    'confirmed' | 'estimated' | 'unknown'
}

const WINDOW_DAYS = 5      // ±5 jours autour de la publication
const TTL_WINDOW_MS = 24 * 60 * 60 * 1000  // 24h en millisecondes

function daysDiff(a: Date, b: Date): number {
  return Math.abs((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

export function getCacheStatus(entry: CacheEntry | null): CacheStatus {
  if (!entry) return 'missing'

  const now = new Date()
  const { fetchedAt, lastEarningsDate, nextEarningsDate } = entry

  // 1. Cache antérieur à la dernière publication → périmé
  if (lastEarningsDate && fetchedAt < lastEarningsDate) {
    return 'stale'
  }

  // 2. Dans la fenêtre de la prochaine publication (±5j)
  if (nextEarningsDate) {
    const daysToNext = (nextEarningsDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    const inWindow = daysToNext >= -WINDOW_DAYS && daysToNext <= WINDOW_DAYS

    if (inWindow) {
      const cacheAge = now.getTime() - fetchedAt.getTime()
      return cacheAge > TTL_WINDOW_MS ? 'expired_24h' : 'window_24h'
    }
  }

  // 3. Hors fenêtre, cache postérieur à last_earnings → valide indéfiniment
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
