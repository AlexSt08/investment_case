import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getStaticData, getStaticNrr } from '../../../lib/ticker-data'
import { getCacheStatus, shouldRefresh, getCacheLabel, type CacheEntry } from '../../../lib/earnings-calendar'

// ── Supabase admin client (server-side only) ──────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
  source:             'static' | 'cache' | 'yahoo'
  period:             string
}

// ── Yahoo Finance helpers ─────────────────────────────────────────────────
// Unofficial API — no key required, server-side only
const YF_BASE = 'https://query1.finance.yahoo.com'

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; investment-platform/1.0)',
  'Accept': 'application/json',
}

async function yfGet(path: string): Promise<any> {
  const r = await fetch(`${YF_BASE}${path}`, { headers: YF_HEADERS })
  if (!r.ok) throw new Error(`Yahoo Finance HTTP ${r.status} sur ${path}`)
  return r.json()
}

async function fetchFromYahoo(ticker: string): Promise<FinancialsResponse> {
  const t = ticker.toUpperCase()

  // Modules nécessaires en un seul appel
  const modules = [
    'financialData',        // revenue, margins, FCF, cash, debt
    'defaultKeyStatistics', // marketCap, SBC
    'summaryDetail',        // companyName, sector
    'calendarEvents',       // prochaine date earnings
    'earningsHistory',      // dates earnings passées
  ].join(',')

  const data = await yfGet(
    `/v10/finance/quoteSummary/${t}?modules=${modules}&corsDomain=finance.yahoo.com`
  )

  const result = data?.quoteSummary?.result?.[0]
  const error  = data?.quoteSummary?.error

  if (!result || error) {
    const msg = error?.description ?? 'Ticker introuvable'
    throw new Error(`"${t}" — ${msg}`)
  }

  const fin  = result.financialData        ?? {}
  const stat = result.defaultKeyStatistics ?? {}
  const sum  = result.summaryDetail        ?? {}
  const cal  = result.calendarEvents       ?? {}
  const hist = result.earningsHistory      ?? {}

  // ── Valeurs financières
  const revenueTTM  = (fin.totalRevenue?.raw          ?? 0) / 1e9
  const grossMargin = fin.grossMargins?.raw            ?? 0
  const fcfMargin   = fin.freeCashflow?.raw && fin.totalRevenue?.raw
                      ? fin.freeCashflow.raw / fin.totalRevenue.raw : 0
  const mktCap      = (stat.marketCap?.raw ?? sum.marketCap?.raw ?? 0) / 1e9
  const cash        = (fin.totalCash?.raw              ?? 0)
  const debt        = (fin.totalDebt?.raw              ?? 0)
  const netCash     = (cash - debt) / 1e9

  // SBC : non disponible dans quoteSummary — fallback depuis cashflow si besoin
  // Yahoo ne l'expose pas directement dans ces modules, on met 0 avec note
  const sbc = 0

  const nrr = getStaticNrr(t)

  // ── Earnings dates
  let lastEarningsDate: string | null = null
  let nextEarningsDate: string | null = null
  let earningsQuality: 'confirmed' | 'estimated' | 'unknown' = 'unknown'

  // Prochaine publication (calendarEvents)
  const nextEarningsTimestamp = cal.earnings?.earningsDate?.[0]?.raw
  if (nextEarningsTimestamp) {
    nextEarningsDate = new Date(nextEarningsTimestamp * 1000).toISOString().split('T')[0]
    earningsQuality  = 'confirmed'
  }

  // Dernière publication (earningsHistory)
  const history = hist.history ?? []
  if (history.length > 0) {
    const sorted = [...history].sort((a: any, b: any) =>
      (b.quarter?.raw ?? 0) - (a.quarter?.raw ?? 0)
    )
    const last = sorted[0]?.quarter?.raw
    if (last) {
      lastEarningsDate = new Date(last * 1000).toISOString().split('T')[0]
    }
  }

  const companyName = fin.companyOfficers?.[0]
    ? t
    : (result.price?.longName ?? result.price?.shortName ?? t)

  // Fallback companyName depuis summaryDetail
  const finalName = result.summaryProfile?.longBusinessSummary
    ? (result.quoteType?.longName ?? result.quoteType?.shortName ?? t)
    : t

  return {
    ticker:           t,
    companyName:      finalName,
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
    cacheStatus:      'yahoo',
    cacheLabel:       '',
    source:           'yahoo',
    period:           new Date().toISOString().split('T')[0],
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
        fetchedAt:        new Date(cached.fetched_at),
        lastEarningsDate: cached.last_earnings_date ? new Date(cached.last_earnings_date) : null,
        nextEarningsDate: cached.next_earnings_date ? new Date(cached.next_earnings_date) : null,
        earningsQuality:  cached.earnings_date_quality ?? 'unknown',
      }
      const status = getCacheStatus(entry)
      if (!shouldRefresh(status)) {
        return res.status(200).json({
          ...cached.data,
          ticker,
          companyName:      cached.company_name,
          lastEarningsDate: cached.last_earnings_date,
          nextEarningsDate: cached.next_earnings_date,
          earningsQuality:  cached.earnings_date_quality,
          cacheStatus:      status,
          cacheLabel:       getCacheLabel(entry, status),
          source:           'cache' as const,
        })
      }
    }
  }

  // ── Layer 3 : Yahoo Finance ───────────────────────────────────────────
  try {
    const yfData = await fetchFromYahoo(ticker)

    await supabase.from('ticker_cache').upsert({
      ticker,
      company_name:          yfData.companyName,
      data: {
        revenueTTM:  yfData.revenueTTM,
        grossMargin: yfData.grossMargin,
        fcfMargin:   yfData.fcfMargin,
        mktCap:      yfData.mktCap,
        netCash:     yfData.netCash,
        sbc:         yfData.sbc,
        nrr:         yfData.nrr,
        period:      yfData.period,
      },
      fetched_at:            new Date().toISOString(),
      last_earnings_date:    yfData.lastEarningsDate,
      next_earnings_date:    yfData.nextEarningsDate,
      earnings_date_quality: yfData.earningsQuality,
      source:                'yahoo',
    }, { onConflict: 'ticker' })

    return res.status(200).json({
      ...yfData,
      cacheLabel: `Yahoo Finance · ${new Date().toLocaleDateString('fr-FR')}`,
    })
  } catch (err) {
    const msg = String(err).replace('Error: ', '')
    return res.status(msg.includes('introuvable') ? 404 : 500).json({ error: msg })
  }
}
