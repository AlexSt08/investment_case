import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getStaticData, getStaticNrr } from '../../../lib/ticker-data'
import { getCacheStatus, shouldRefresh, getCacheLabel, type CacheEntry } from '../../../lib/earnings-calendar'

// ── Supabase admin client (service role — server-side only) ───────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // clé service role, pas anon
)

const FMP_BASE = 'https://financialmodelingprep.com/api/v3'

// ── Types ─────────────────────────────────────────────────────────────────
export interface FinancialsResponse {
  ticker:             string
  companyName:        string
  revenueTTM:         number
  grossMargin:        number
  fcfMargin:          number
  mktCap:             number
  netCash:            number
  sbc:                number
  nrr:                number | null
  lastEarningsDate:   string | null
  nextEarningsDate:   string | null
  earningsQuality:    'confirmed' | 'estimated' | 'unknown'
  cacheStatus:        string
  cacheLabel:         string
  source:             'static' | 'cache' | 'fmp'
  period:             string
}

// ── FMP helpers ───────────────────────────────────────────────────────────
async function fetchFromFMP(ticker: string, apiKey: string): Promise<FinancialsResponse> {
  const t = ticker.toUpperCase()

  const [profile, income, cashflow, balance, earnings] = await Promise.all([
    fetch(`${FMP_BASE}/profile/${t}?apikey=${apiKey}`).then(r => r.json()),
    fetch(`${FMP_BASE}/income-statement/${t}?period=annual&limit=1&apikey=${apiKey}`).then(r => r.json()),
    fetch(`${FMP_BASE}/cash-flow-statement/${t}?period=annual&limit=1&apikey=${apiKey}`).then(r => r.json()),
    fetch(`${FMP_BASE}/balance-sheet-statement/${t}?period=annual&limit=1&apikey=${apiKey}`).then(r => r.json()),
    fetch(`${FMP_BASE}/historical/earning_calendar/${t}?apikey=${apiKey}`).then(r => r.json()),
  ])

  if (!profile?.[0] || !income?.[0]) {
    throw new Error(`Ticker "${t}" introuvable sur FMP`)
  }

  const p = profile[0]
  const i = income[0]
  const c = cashflow[0]
  const b = balance[0]

  // Earnings dates
  let lastEarningsDate: string | null = null
  let nextEarningsDate: string | null = null
  let earningsQuality: 'confirmed' | 'estimated' | 'unknown' = 'unknown'

  if (Array.isArray(earnings) && earnings.length > 0) {
    const now = new Date()
    const past   = earnings.filter((e: any) => new Date(e.date) <= now).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const future = earnings.filter((e: any) => new Date(e.date) >  now).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

    if (past[0])   lastEarningsDate = past[0].date
    if (future[0]) {
      nextEarningsDate = future[0].date
      earningsQuality  = future[0].time === 'amc' || future[0].time === 'bmo' ? 'confirmed' : 'estimated'
    }
  }

  const revenueTTM  = (i.revenue ?? 0) / 1e9
  const grossMargin = i.revenue ? (i.grossProfit ?? 0) / i.revenue : 0
  const fcfMargin   = i.revenue ? (c.freeCashFlow ?? 0) / i.revenue : 0
  const mktCap      = (p.mktCap ?? 0) / 1e9
  const cash        = (b.cashAndCashEquivalents ?? 0)
  const debt        = (b.totalDebt ?? 0)
  const netCash     = (cash - debt) / 1e9
  const sbc         = Math.abs((c.stockBasedCompensation ?? 0)) / 1e9
  const nrr         = getStaticNrr(t)

  return {
    ticker:           t,
    companyName:      p.companyName ?? t,
    revenueTTM:       parseFloat(revenueTTM.toFixed(2)),
    grossMargin:      parseFloat(grossMargin.toFixed(3)),
    fcfMargin:        parseFloat(Math.max(0, fcfMargin).toFixed(3)),
    mktCap:           parseFloat(mktCap.toFixed(1)),
    netCash:          parseFloat(netCash.toFixed(1)),
    sbc:              parseFloat(sbc.toFixed(1)),
    nrr,
    lastEarningsDate,
    nextEarningsDate,
    earningsQuality,
    cacheStatus:      'fmp',
    cacheLabel:       '',
    source:           'fmp',
    period:           i.date ?? '',
  }
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const ticker  = ((req.query.ticker as string) ?? '').toUpperCase().trim()
  const force   = req.query.force === 'true'   // ?force=true pour forcer le refresh

  if (!ticker || !/^[A-Z]{1,5}$/.test(ticker)) {
    return res.status(400).json({ error: 'Ticker invalide' })
  }

  // ── Layer 1 : données statiques pré-validées ──────────────────────────
  if (!force) {
    const staticData = getStaticData(ticker)
    if (staticData) {
      return res.status(200).json({
        ...staticData,
        lastEarningsDate:  null,
        nextEarningsDate:  null,
        earningsQuality:   'unknown' as const,
        cacheStatus:       'static',
        cacheLabel:        `Données validées manuellement · Màj ${staticData.lastUpdated}`,
        source:            'static' as const,
        period:            staticData.lastUpdated,
      })
    }
  }

  // ── Layer 2 : cache Supabase ──────────────────────────────────────────
  if (!force) {
    const { data: cached } = await supabase
      .from('ticker_cache')
      .select('*')
      .eq('ticker', ticker)
      .single()

    if (cached) {
      const entry: CacheEntry = {
        fetchedAt:         new Date(cached.fetched_at),
        lastEarningsDate:  cached.last_earnings_date ? new Date(cached.last_earnings_date) : null,
        nextEarningsDate:  cached.next_earnings_date ? new Date(cached.next_earnings_date) : null,
        earningsQuality:   cached.earnings_date_quality ?? 'unknown',
      }
      const status = getCacheStatus(entry)

      if (!shouldRefresh(status)) {
        const label = getCacheLabel(entry, status)
        return res.status(200).json({
          ...cached.data,
          ticker,
          companyName:      cached.company_name,
          lastEarningsDate: cached.last_earnings_date,
          nextEarningsDate: cached.next_earnings_date,
          earningsQuality:  cached.earnings_date_quality,
          cacheStatus:      status,
          cacheLabel:       label,
          source:           'cache' as const,
        })
      }
      // shouldRefresh = true → on passe au layer 3
    }
  }

  // ── Layer 3 : appel FMP ───────────────────────────────────────────────
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'FMP_API_KEY manquante dans les variables d\'environnement' })
  }

  try {
    const fmpData = await fetchFromFMP(ticker, apiKey)

    // Upsert dans Supabase
    await supabase.from('ticker_cache').upsert({
      ticker,
      company_name:          fmpData.companyName,
      data: {
        revenueTTM:  fmpData.revenueTTM,
        grossMargin: fmpData.grossMargin,
        fcfMargin:   fmpData.fcfMargin,
        mktCap:      fmpData.mktCap,
        netCash:     fmpData.netCash,
        sbc:         fmpData.sbc,
        nrr:         fmpData.nrr,
        period:      fmpData.period,
      },
      fetched_at:            new Date().toISOString(),
      last_earnings_date:    fmpData.lastEarningsDate,
      next_earnings_date:    fmpData.nextEarningsDate,
      earnings_date_quality: fmpData.earningsQuality,
      source:                'fmp',
    }, { onConflict: 'ticker' })

    return res.status(200).json({
      ...fmpData,
      cacheLabel: `Données fraîches FMP · ${new Date().toLocaleDateString('fr-FR')}`,
    })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
