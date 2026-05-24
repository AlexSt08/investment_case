import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { STATIC_UNIVERSE } from '../../lib/ticker-data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface TickerSuggestion {
  ticker:      string
  companyName: string
  source:      'static' | 'cache'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Univers statique — disponible immédiatement
  const staticList: TickerSuggestion[] = STATIC_UNIVERSE.map(d => ({
    ticker:      d.ticker,
    companyName: d.companyName,
    source:      'static',
  }))

  // Tickers déjà fetchés en cache Supabase
  const { data: cached } = await supabase
    .from('ticker_cache')
    .select('ticker, company_name')
    .order('ticker')

  const staticTickers = new Set(staticList.map(d => d.ticker))

  const cacheList: TickerSuggestion[] = (cached ?? [])
    .filter(row => !staticTickers.has(row.ticker))   // déduplique
    .map(row => ({
      ticker:      row.ticker,
      companyName: row.company_name,
      source:      'cache' as const,
    }))

  const result = [...staticList, ...cacheList]
    .sort((a, b) => a.ticker.localeCompare(b.ticker))

  // Cache 5 min côté CDN/browser
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=60')
  res.status(200).json(result)
}
