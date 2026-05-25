import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getStaticData, getStaticNrr } from '../../../lib/ticker-data'
import { getCacheLabel, needsMktCapRefresh } from '../../../lib/earnings-calendar'

// ── Supabase ──────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FMP_BASE = 'https://financialmodelingprep.com/stable'

// ── Types ─────────────────────────────────────────────────────────────────
export interface FinancialsResponse {
  ticker:           string
  companyName:      string
  revenueTTM:       number
  grossMargin:      number
  fcfMargin:        number
  mktCap:           number
  netCash:          number
  sbc:              number
  nrr:              number | null
  lastEarningsDate: string | null
  nextEarningsDate: string | null
  earningsQuality:  'confirmed' | 'estimated' | 'unknown'
  cacheStatus:      string
  cacheLabel:       string
  source:           'static' | 'cache' | 'fmp'
  period:           string
  mktCapRefreshed?: boolean
}

// ── FMP market cap uniquement ─────────────────────────────────────────────
async function fetchMktCapFromFMP(ticker: string, apiKey: string): Promise<number | null> {
  try {
    const r = await fetch(
      `${FMP_BASE}/market-capitalization?symbol=${ticker}&apikey=${apiKey}`
    )
    if (!r.ok) return null
    const data = await r.json()
    const item = Array.isArray(data) ? data[0] : data
    const raw  = item?.marketCap ?? item?.market_cap ?? null
    return raw ? parseFloat((raw / 1e9).toFixed(1)) : null
  } catch {
    return null
  }
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const ticker = ((req.query.ticker as string) ?? '').toUpperCase().trim()
  const force  = req.query.force === 'true'

  if (!ticker || !/^[A-Z]{1,6}$/.test(ticker)) {
    return res.status(400).json({ error: 'Ticker invalide (1-6 lettres majuscules)' })
  }

  // ── Layer 1 : données statiques ───────────────────────────────────────
  if (!force) {
    const staticData = getStaticData(ticker)
    if (staticData) {
      return res.status(200).json({
        ...staticData,
        lastEarningsDate: null,
        nextEarningsDate: null,
        earningsQuality:  'unknown' as const,
        cacheStatus:      'static',
        cacheLabel:       `Données validées manuellement · Màj ${staticData.lastUpdated}`,
        source:           'static' as const,
        period:           staticData.lastUpdated,
        mktCapRefreshed:  false,
      })
    }
  }

  // ── Layer 2 : cache Supabase ──────────────────────────────────────────
  const { data: cached } = await supabase
    .from('ticker_cache')
    .select('*')
    .eq('ticker', ticker)
    .single()

  // Ticker absent → 404 avec code spécifique pour l'UI
  if (!cached) {
    return res.status(404).json({
      error:     'NOT_IN_CACHE',
      ticker,
      message:   `${ticker} absent de la base — utiliser "Fonda Cohorte ${ticker}" dans Claude pour initialiser`,
    })
  }

  // Déterminer si on doit rafraîchir la market cap via FMP
  const shouldRefreshMktCap = force || needsMktCapRefresh({
    next_earnings_date:    cached.next_earnings_date,
    earnings_date_quality: cached.earnings_date_quality,
  })

  let mktCap: number        = cached.data?.mktCap ?? 0
  let mktCapRefreshed       = false
  let mktCapLabel           = ''

  if (shouldRefreshMktCap) {
    const apiKey = process.env.FMP_API_KEY
    if (apiKey) {
      const freshMktCap = await fetchMktCapFromFMP(ticker, apiKey)
      if (freshMktCap !== null) {
        mktCap          = freshMktCap
        mktCapRefreshed = true
        mktCapLabel     = ' · Mkt cap rafraîchie (FMP)'
        // Mettre à jour uniquement mktCap dans Supabase
        await supabase
          .from('ticker_cache')
          .update({
            data:       { ...cached.data, mktCap: freshMktCap },
            fetched_at: new Date().toISOString(),
          })
          .eq('ticker', ticker)
      }
    }
  }

  // Construire le label cache
  const nextDate = cached.next_earnings_date ? new Date(cached.next_earnings_date) : null
  const lastDate = cached.last_earnings_date ? new Date(cached.last_earnings_date) : null
  const label = getCacheLabel(
    {
      fetchedAt:        new Date(cached.fetched_at),
      lastEarningsDate: lastDate,
      nextEarningsDate: nextDate,
      earningsQuality:  cached.earnings_date_quality ?? 'unknown',
    },
    'fresh'
  ) + mktCapLabel

  return res.status(200).json({
    ...cached.data,
    mktCap,
    ticker,
    companyName:      cached.company_name,
    nrr:              cached.data?.nrr ?? getStaticNrr(ticker),
    lastEarningsDate: cached.last_earnings_date,
    nextEarningsDate: cached.next_earnings_date,
    earningsQuality:  cached.earnings_date_quality ?? 'unknown',
    cacheStatus:      mktCapRefreshed ? 'fmp' : 'fresh',
    cacheLabel:       label,
    source:           'cache' as const,
    mktCapRefreshed,
  })
}
