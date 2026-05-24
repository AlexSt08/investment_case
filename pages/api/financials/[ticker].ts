import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getStaticData, getStaticNrr } from '../../../lib/ticker-data'
import { getCacheLabel } from '../../../lib/earnings-calendar'

// ── Supabase admin client (server-side only) ──────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FMP_BASE  = 'https://financialmodelingprep.com/stable'
const WINDOW_MS = 5 * 24 * 60 * 60 * 1000
const TTL_24H   = 24 * 60 * 60 * 1000

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

interface EarningsDates {
  lastEarningsDate: string | null
  nextEarningsDate: string | null
  earningsQuality:  'confirmed' | 'estimated' | 'unknown'
}

// ── Type de refresh ───────────────────────────────────────────────────────
type RefreshType = 'none' | 'dates_only' | 'full'

function getRefreshType(cached: any | null): RefreshType {
  if (!cached) return 'full'
  const now          = Date.now()
  const fetchedAt    = new Date(cached.fetched_at).getTime()
  const nextEarnings = cached.next_earnings_date ? new Date(cached.next_earnings_date).getTime() : null
  const lastEarnings = cached.last_earnings_date ? new Date(cached.last_earnings_date).getTime() : null
  if (!nextEarnings) return 'full'
  const msToNext = nextEarnings - now
  const inWindow = Math.abs(msToNext) <= WINDOW_MS
  if (inWindow) return (now - fetchedAt) > TTL_24H ? 'full' : 'none'
  if (msToNext > WINDOW_MS) {
    return (!lastEarnings || fetchedAt > lastEarnings) ? 'none' : 'full'
  }
  return fetchedAt > nextEarnings ? 'dates_only' : 'full'
}

function hasValidFutureEarningsDate(cached: any | null): boolean {
  if (!cached?.next_earnings_date) return false
  return new Date(cached.next_earnings_date).getTime() > Date.now()
}

// ── FMP helpers ───────────────────────────────────────────────────────────
async function fmpGet(path: string, apiKey: string): Promise<any> {
  const sep = path.includes('?') ? '&' : '?'
  const r   = await fetch(`${FMP_BASE}${path}${sep}apikey=${apiKey}`)
  if (!r.ok) throw new Error(`FMP HTTP ${r.status} — ${path}`)
  return r.json()
}

function isFmpError(data: any): boolean {
  if (!data) return true
  if (Array.isArray(data)) return data.length === 0 || !!data[0]?.['Error Message']
  if (typeof data === 'object') return !!data['Error Message']
  return true
}

function firstItem(data: any): any {
  if (Array.isArray(data)) return data[0] ?? null
  if (typeof data === 'object' && !data['Error Message']) return data
  return null
}

// ── Parse earnings ────────────────────────────────────────────────────────
function parseEarnings(data: any[]): EarningsDates {
  if (!Array.isArray(data) || data.length === 0) {
    return { lastEarningsDate: null, nextEarningsDate: null, earningsQuality: 'unknown' }
  }
  const now    = new Date()
  const sorted = [...data].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  const next = sorted.find(e => e.epsActual === null && new Date(e.date) > now)
  const last = sorted.find(e => e.epsActual !== null && new Date(e.date) <= now)
  let earningsQuality: 'confirmed' | 'estimated' | 'unknown' = 'unknown'
  if (next?.lastUpdated) {
    const ageDays = (now.getTime() - new Date(next.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
    earningsQuality = ageDays < 30 ? 'confirmed' : 'estimated'
  }
  return {
    lastEarningsDate: last?.date ?? null,
    nextEarningsDate: next?.date ?? null,
    earningsQuality,
  }
}

// ── Fetch financières (5 appels parallèles, earnings exclu) ───────────────
async function fetchFinancialsOnly(ticker: string, apiKey: string) {
  const t = ticker.toUpperCase()

  const [profile, income, cashflow, balance, mktCapRaw] = await Promise.all([
    fmpGet(`/profile?symbol=${t}`,                   apiKey).catch(() => null),
    fmpGet(`/income-statement?symbol=${t}&limit=1`,  apiKey).catch(() => null),
    fmpGet(`/cash-flow-statement?symbol=${t}`,       apiKey).catch(() => null),
    fmpGet(`/balance-sheet-statement?symbol=${t}`,   apiKey).catch(() => null),
    // Market cap : endpoint dédié — retourne [{ marketCap }]
    fmpGet(`/market-capitalization?symbol=${t}`,     apiKey).catch(() => null),
  ])

  if (isFmpError(profile)) {
    const msg = firstItem(profile)?.['Error Message'] ?? ''
    if (msg.toLowerCase().includes('limit')) throw new Error('Quota FMP atteint (250 req/jour)')
    throw new Error(`Ticker "${t}" introuvable sur FMP`)
  }

  return {
    p:  firstItem(profile),
    i:  isFmpError(income)   ? null : firstItem(income),
    c:  isFmpError(cashflow)  ? null : firstItem(cashflow),
    b:  isFmpError(balance)   ? null : firstItem(balance),
    mc: isFmpError(mktCapRaw) ? null : firstItem(mktCapRaw),
  }
}

// ── Fetch earnings (1 appel) ──────────────────────────────────────────────
async function fetchEarningsOnly(ticker: string, apiKey: string): Promise<EarningsDates> {
  const raw = await fmpGet(`/earnings?symbol=${ticker}&limit=5`, apiKey)
  return parseEarnings(Array.isArray(raw) ? raw : [])
}

// ── Assemble FinancialsResponse ───────────────────────────────────────────
function buildResponse(
  ticker: string,
  { p, i, c, b, mc }: { p: any; i: any; c: any; b: any; mc: any },
  earnings: EarningsDates
): FinancialsResponse {

  // Revenus & marges (income statement)
  const revenueTTM  = i?.revenue ? i.revenue / 1e9 : 0
  const grossMargin = i?.revenue ? (i.grossProfit ?? 0) / i.revenue : 0
  const fcfMargin   = i?.revenue && c?.freeCashFlow ? c.freeCashFlow / i.revenue : 0

  // Market cap : endpoint dédié /market-capitalization → champ marketCap
  // Fallback : profile mktCap (v3 compat) ou marketCap (autre nommage stable)
  const rawMktCap = mc?.marketCap ?? p?.mktCap ?? p?.marketCap ?? 0
  const mktCap    = rawMktCap / 1e9

  // Net cash = trésorerie - dette totale
  // Trésorerie : bilan en priorité, fallback cashflow cashAtEndOfPeriod
  const cash    = b?.cashAndCashEquivalents
               ?? b?.cashAndShortTermInvestments
               ?? c?.cashAtEndOfPeriod
               ?? 0
  // Dette : totalDebt ou reconstitution long + court terme
  const debt    = b?.totalDebt
               ?? ((b?.longTermDebt ?? 0) + (b?.shortTermDebt ?? 0))
  const netCash = (cash - debt) / 1e9

  // SBC (cashflow)
  const sbc = c?.stockBasedCompensation ? Math.abs(c.stockBasedCompensation) / 1e9 : 0

  return {
    ticker,
    companyName:  p?.companyName ?? p?.name ?? ticker,
    revenueTTM:   parseFloat(revenueTTM.toFixed(2)),
    grossMargin:  parseFloat(grossMargin.toFixed(3)),
    fcfMargin:    parseFloat(Math.max(0, fcfMargin).toFixed(3)),
    mktCap:       parseFloat(mktCap.toFixed(1)),
    netCash:      parseFloat(netCash.toFixed(1)),
    sbc:          parseFloat(sbc.toFixed(1)),
    nrr:          getStaticNrr(ticker),
    ...earnings,
    cacheStatus:  'fmp',
    cacheLabel:   '',
    source:       'fmp',
    period:       i?.date ?? new Date().toISOString().split('T')[0],
  }
}

// ── Upsert Supabase ───────────────────────────────────────────────────────
async function upsertCache(ticker: string, data: FinancialsResponse) {
  await supabase.from('ticker_cache').upsert({
    ticker,
    company_name:          data.companyName,
    data: {
      revenueTTM:  data.revenueTTM,
      grossMargin: data.grossMargin,
      fcfMargin:   data.fcfMargin,
      mktCap:      data.mktCap,
      netCash:     data.netCash,
      sbc:         data.sbc,
      nrr:         data.nrr,
      period:      data.period,
    },
    fetched_at:            new Date().toISOString(),
    last_earnings_date:    data.lastEarningsDate,
    next_earnings_date:    data.nextEarningsDate,
    earnings_date_quality: data.earningsQuality,
    source:                'fmp',
  }, { onConflict: 'ticker' })
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
      })
    }
  }

  // ── Layer 2 : cache Supabase ──────────────────────────────────────────
  const { data: cached } = await supabase
    .from('ticker_cache').select('*').eq('ticker', ticker).single()

  const refreshType = force ? 'full' : getRefreshType(cached)

  // none → 0 appel FMP
  if (refreshType === 'none' && cached) {
    const nextDate = cached.next_earnings_date ? new Date(cached.next_earnings_date) : null
    const lastDate = cached.last_earnings_date ? new Date(cached.last_earnings_date) : null
    const label = getCacheLabel(
      { fetchedAt: new Date(cached.fetched_at), lastEarningsDate: lastDate, nextEarningsDate: nextDate, earningsQuality: cached.earnings_date_quality ?? 'unknown' },
      'fresh'
    )
    return res.status(200).json({
      ...cached.data,
      ticker,
      companyName:      cached.company_name,
      lastEarningsDate: cached.last_earnings_date,
      nextEarningsDate: cached.next_earnings_date,
      earningsQuality:  cached.earnings_date_quality,
      cacheStatus:      'fresh',
      cacheLabel:       label,
      source:           'cache' as const,
    })
  }

  // ── Layer 3 : appels FMP ──────────────────────────────────────────────
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: "FMP_API_KEY manquante dans les variables d'environnement" })
  }

  try {
    // dates_only → 1 appel earnings, finances inchangées
    if (refreshType === 'dates_only' && cached) {
      const dates = await fetchEarningsOnly(ticker, apiKey)
      await supabase.from('ticker_cache').update({
        last_earnings_date:    dates.lastEarningsDate,
        next_earnings_date:    dates.nextEarningsDate,
        earnings_date_quality: dates.earningsQuality,
        fetched_at:            new Date().toISOString(),
      }).eq('ticker', ticker)
      return res.status(200).json({
        ...cached.data,
        ticker,
        companyName:  cached.company_name,
        ...dates,
        cacheStatus:  'dates_refreshed',
        cacheLabel:   `Dates mises à jour · prochains résultats : ${dates.nextEarningsDate ?? 'inconnu'}`,
        source:       'cache' as const,
      })
    }

    // full → 5 appels financiers + earnings conditionnel
    const earningsDatesValid = !force && hasValidFutureEarningsDate(cached)
    const financials = await fetchFinancialsOnly(ticker, apiKey)
    const earnings: EarningsDates = earningsDatesValid
      ? {
          lastEarningsDate: cached.last_earnings_date,
          nextEarningsDate: cached.next_earnings_date,
          earningsQuality:  cached.earnings_date_quality ?? 'unknown',
        }
      : await fetchEarningsOnly(ticker, apiKey)

    const fmpData = buildResponse(ticker, financials, earnings)
    await upsertCache(ticker, fmpData)

    const daysToNext = fmpData.nextEarningsDate
      ? Math.round((new Date(fmpData.nextEarningsDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    return res.status(200).json({
      ...fmpData,
      cacheStatus: 'fmp',
      cacheLabel:  [
        `FMP · ${new Date().toLocaleDateString('fr-FR')}`,
        daysToNext !== null ? `Résultats dans ${daysToNext}j` : null,
        earningsDatesValid ? 'dates earnings inchangées' : null,
      ].filter(Boolean).join(' · '),
    })

  } catch (err) {
    const msg = String(err).replace('Error: ', '')
    return res.status(msg.includes('introuvable') || msg.includes('404') ? 404 : 500).json({ error: msg })
  }
}
