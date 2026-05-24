import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getStaticData, getStaticNrr } from '../../../lib/ticker-data'
import { getCacheStatus, shouldRefresh, getCacheLabel, type CacheEntry } from '../../../lib/earnings-calendar'

// ── Supabase admin client (server-side only) ──────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

function isFmpError(data: any): boolean {
  return !Array.isArray(data) || data.length === 0 ||
    (data[0] && typeof data[0] === 'object' && 'Error Message' in data[0])
}

function getFmpErrorMessage(data: any): string {
  if (Array.isArray(data) && data[0]?.['Error Message']) return data[0]['Error Message']
  if (data?.['Error Message']) return data['Error Message']
  return 'Données indisponibles'
}

async function fmpGet(path: string, apiKey: string): Promise<any> {
  const r = await fetch(`${FMP_BASE}${path}?apikey=${apiKey}`)
  if (!r.ok) throw new Error(`FMP HTTP ${r.status} sur ${path}`)
  return r.json()
}

async function fetchFromFMP(ticker: string, apiKey: string): Promise<FinancialsResponse> {
  const t = ticker.toUpperCase()

  // Étape 1 : profil — seul endpoint obligatoire pour valider le ticker
  const profile = await fmpGet(`/profile/${t}`, apiKey)

  if (isFmpError(profile)) {
    const msg = getFmpErrorMessage(profile)
    if (msg.toLowerCase().includes('limit')) {
      throw new Error(`Quota FMP atteint (250 req/jour sur le free tier). Réessayez demain ou passez en plan payant.`)
    }
    throw new Error(`Ticker "${t}" introuvable sur FMP`)
  }

  const p = profile[0]

  // Étape 2 : états financiers — en parallèle, avec fallback si indispo
  const [income, cashflow, balance, earnings] = await Promise.all([
    fmpGet(`/income-statement/${t}`, apiKey).catch(() => null),
    fmpGet(`/cash-flow-statement/${t}`, apiKey).catch(() => null),
    fmpGet(`/balance-sheet-statement/${t}`, apiKey).catch(() => null),
    fmpGet(`/earning_calendar/${t}`, apiKey).catch(() => null),
  ])

  const hasIncome   = !isFmpError(income)
  const hasCashflow = !isFmpError(cashflow)
  const hasBalance  = !isFmpError(balance)

  const i = hasIncome   ? income[0]   : null
  const c = hasCashflow ? cashflow[0] : null
  const b = hasBalance  ? balance[0]  : null

  const revenueTTM  = i?.revenue ? i.revenue / 1e9 : 0
  const grossMargin = i?.revenue ? (i.grossProfit ?? 0) / i.revenue : 0
  const fcfMargin   = i?.revenue && c?.freeCashFlow ? c.freeCashFlow / i.revenue : 0
  const mktCap      = (p.mktCap ?? 0) / 1e9
  const cash        = b?.cashAndCashEquivalents ?? 0
  const debt        = b?.totalDebt ?? 0
  const netCash     = (cash - debt) / 1e9
  const sbc         = c?.stockBasedCompensation ? Math.abs(c.stockBasedCompensation) / 1e9 : 0
  const nrr         = getStaticNrr(t)

  let lastEarningsDate: string | null = null
  let nextEarningsDate: string | null = null
  let earningsQuality: 'confirmed' | 'estimated' | 'unknown' = 'unknown'

  if (Array.isArray(earnings) && earnings.length > 0) {
    const now    = new Date()
    const past   = earnings.filter((e: any) => e.date && new Date(e.date) <= now)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const future = earnings.filter((e: any) => e.date && new Date(e.date) > now)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (past[0])   lastEarningsDate = past[0].date
    if (future[0]) {
      nextEarningsDate = future[0].date
      earningsQuality  = future[0].time === 'amc' || future[0].time === 'bmo' ? 'confirmed' : 'estimated'
    }
  }

  const partialNote = !hasIncome
    ? ' · États financiers indisponibles sur le free tier FMP (profil uniquement)'
    : ''

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
    cacheLabel:       partialNote,
    source:           'fmp',
    period:           i?.date ?? p.ipoDate ?? '',
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

  // Layer 1 : données statiques pré-validées
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

  // Layer 2 : cache Supabase
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

  // Layer 3 : appel FMP
  const apiKey = process.env.FMP_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'FMP_API_KEY manquante dans les variables d\'environnement' })
  }

  try {
    const fmpData = await fetchFromFMP(ticker, apiKey)

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
      cacheLabel: `Données FMP · ${new Date().toLocaleDateString('fr-FR')}${fmpData.cacheLabel}`,
    })
  } catch (err) {
    const msg = String(err).replace('Error: ', '')
    const isKnown = msg.includes('introuvable') || msg.includes('Quota') || msg.includes('HTTP')
    return res.status(isKnown ? 404 : 500).json({ error: msg })
  }
}
