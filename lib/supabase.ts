import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── Types ──────────────────────────────────────────────────

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
  description: string
  logo_url?: string
  sectors?: Sector
}

export interface CaseCompany {
  id: string
  investment_case_id: string
  company_id: string
  rating?: Rating
  target_price?: string
  upside?: string
  companies?: Company
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
  sector_id?: string
  content: string
  excerpt?: string
  rating?: Rating
  target_horizon?: string
  published: boolean
  published_at?: string
  created_at: string
  updated_at: string
  sectors?: Sector
  tags?: Tag[]
  case_companies?: CaseCompany[]
}

// ── Queries publiques ──────────────────────────────────────

export async function getPublishedCases(): Promise<InvestmentCase[]> {
  const { data, error } = await supabase
    .from('investment_cases')
    .select(`
      *,
      sectors(id, slug, name, color),
      investment_case_tags(tags(id, slug, name)),
      investment_case_companies(
        id, company_id, rating, target_price, upside,
        companies(id, ticker, name, logo_url, sector_id)
      )
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
      sectors(id, slug, name, color),
      investment_case_tags(tags(id, slug, name)),
      investment_case_companies(
        id, company_id, rating, target_price, upside,
        companies(id, ticker, name, logo_url, sector_id)
      )
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
      sectors!inner(id, slug, name, color),
      investment_case_tags(tags(id, slug, name)),
      investment_case_companies(
        id, company_id, rating, target_price, upside,
        companies(id, ticker, name, logo_url)
      )
    `)
    .eq('sectors.slug', sectorSlug)
    .eq('published', true)
    .order('published_at', { ascending: false })

  if (error) throw error
  return data?.map(normalizeCase) ?? []
}

export async function getCasesByTicker(ticker: string): Promise<InvestmentCase[]> {
  // Join via investment_case_companies
  const { data: links } = await supabase
    .from('investment_case_companies')
    .select('investment_case_id, companies!inner(ticker)')
    .eq('companies.ticker', ticker.toUpperCase())

  if (!links || links.length === 0) return []
  const ids = links.map((l: any) => l.investment_case_id)

  const { data, error } = await supabase
    .from('investment_cases')
    .select(`
      *,
      sectors(id, slug, name, color),
      investment_case_companies(
        id, company_id, rating, target_price, upside,
        companies(id, ticker, name, logo_url)
      )
    `)
    .in('id', ids)
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

// ── Admin queries ──────────────────────────────────────────

export async function getAllCasesAdmin(): Promise<InvestmentCase[]> {
  const { data, error } = await supabase
    .from('investment_cases')
    .select(`
      *,
      sectors(id, slug, name, color),
      investment_case_companies(
        id, company_id, rating, target_price, upside,
        companies(id, ticker, name)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data?.map(normalizeCase) ?? []
}

export async function getCaseByIdAdmin(id: string): Promise<InvestmentCase | null> {
  const { data, error } = await supabase
    .from('investment_cases')
    .select(`
      *,
      sectors(id, slug, name, color),
      investment_case_tags(tags(id, slug, name)),
      investment_case_companies(
        id, company_id, rating, target_price, upside,
        companies(id, ticker, name, logo_url, sector_id)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return normalizeCase(data)
}

export async function syncCaseCompanies(
  caseId: string,
  entries: { company_id: string; rating?: Rating; target_price?: string; upside?: string }[]
) {
  await supabase.from('investment_case_companies').delete().eq('investment_case_id', caseId)
  if (entries.length === 0) return
  await supabase.from('investment_case_companies').insert(
    entries.map(e => ({ ...e, investment_case_id: caseId }))
  )
}

// ── Helpers ────────────────────────────────────────────────

function normalizeCase(raw: any): InvestmentCase {
  return {
    ...raw,
    content: typeof raw.content === 'string' ? raw.content : '',
    tags: raw.investment_case_tags?.map((ict: any) => ict.tags).filter(Boolean) ?? [],
    case_companies: raw.investment_case_companies ?? [],
  }
}
