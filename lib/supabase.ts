import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export type Rating = 'BUY' | 'HOLD' | 'SELL' | 'WATCH'

export interface Sector {
  id: string
  slug: string
  name: string
  description: string
  color: string
}

export interface Company {
  id: string
  ticker: string
  name: string
  sector_id: string
  exchange: string
  description: string
  logo_url?: string
  sectors?: Sector
}

export interface Tag {
  id: string
  slug: string
  name: string
}

export interface InvestmentCase {
  id: string
  slug: string
  title: string
  subtitle?: string
  company_id?: string
  sector_id?: string
  content: object
  excerpt?: string
  rating?: Rating
  target_horizon?: string
  published: boolean
  published_at?: string
  created_at: string
  updated_at: string
  companies?: Company
  sectors?: Sector
  tags?: Tag[]
}

// Queries
export async function getPublishedCases(): Promise<InvestmentCase[]> {
  const { data, error } = await supabase
    .from('investment_cases')
    .select(`
      *,
      companies(id, ticker, name, exchange, logo_url, sectors(id, slug, name, color)),
      sectors(id, slug, name, color),
      investment_case_tags(tags(id, slug, name))
    `)
    .eq('published', true)
    .order('published_at', { ascending: false })

  if (error) throw error
  return data?.map(normalizeCase) ?? []
}

export async function getCaseBySlug(slug: string): Promise<InvestmentCase | null> {
  const { data, error } = await supabase
    .from('investment_cases')
    .select(`
      *,
      companies(id, ticker, name, exchange, logo_url, sectors(id, slug, name, color)),
      sectors(id, slug, name, color),
      investment_case_tags(tags(id, slug, name))
    `)
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (error) return null
  return normalizeCase(data)
}

export async function getCasesBySector(sectorSlug: string): Promise<InvestmentCase[]> {
  const { data, error } = await supabase
    .from('investment_cases')
    .select(`
      *,
      companies(id, ticker, name, exchange, logo_url),
      sectors!inner(id, slug, name, color),
      investment_case_tags(tags(id, slug, name))
    `)
    .eq('sectors.slug', sectorSlug)
    .eq('published', true)
    .order('published_at', { ascending: false })

  if (error) throw error
  return data?.map(normalizeCase) ?? []
}

export async function getCasesByTicker(ticker: string): Promise<InvestmentCase[]> {
  const { data, error } = await supabase
    .from('investment_cases')
    .select(`
      *,
      companies!inner(id, ticker, name, exchange, logo_url, sectors(id, slug, name, color)),
      sectors(id, slug, name, color),
      investment_case_tags(tags(id, slug, name))
    `)
    .eq('companies.ticker', ticker.toUpperCase())
    .eq('published', true)
    .order('published_at', { ascending: false })

  if (error) throw error
  return data?.map(normalizeCase) ?? []
}

export async function getAllSectors(): Promise<Sector[]> {
  const { data, error } = await supabase
    .from('sectors')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function getAllCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*, sectors(id, slug, name, color)')
    .order('ticker')
  if (error) throw error
  return data ?? []
}

function normalizeCase(raw: any): InvestmentCase {
  return {
    ...raw,
    tags: raw.investment_case_tags?.map((ict: any) => ict.tags).filter(Boolean) ?? [],
  }
}
