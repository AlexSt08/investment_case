import type { GetStaticProps } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import Nav from '../components/Nav'
import CaseCard from '../components/CaseCard'
import { getPublishedCases, getAllSectors, type InvestmentCase, type Sector, type Tag } from '../lib/supabase'
import { supabase } from '../lib/supabase'

interface Props {
  cases: InvestmentCase[]
  sectors: Sector[]
  tags: Tag[]
}

const RATINGS = ['Tous', 'BUY', 'HOLD', 'SELL', 'WATCH']

export default function Analyses({ cases, sectors, tags }: Props) {
  const [activeSector, setActiveSector] = useState<string>('all')
  const [activeRating, setActiveRating] = useState<string>('Tous')
  const [activeTag, setActiveTag] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = cases.filter(c => {
    const caseCompanies = c.case_companies ?? []

    const sectorMatch = activeSector === 'all' || c.sectors?.slug === activeSector

    const ratingMatch = activeRating === 'Tous' ||
      c.rating === activeRating ||
      caseCompanies.some(cc => cc.rating === activeRating)

    const tagMatch = activeTag === 'all' ||
      (c.tags ?? []).some(t => t.id === activeTag)

    const searchMatch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.subtitle ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.excerpt ?? '').toLowerCase().includes(search.toLowerCase()) ||
      caseCompanies.some(cc =>
        cc.companies?.ticker.toLowerCase().includes(search.toLowerCase()) ||
        cc.companies?.name.toLowerCase().includes(search.toLowerCase())
      ) ||
      (c.tags ?? []).some(t => t.name.toLowerCase().includes(search.toLowerCase()))

    return sectorMatch && ratingMatch && tagMatch && searchMatch
  })

  return (
    <>
      <Head>
        <title>Analyses — AlphaBrief</title>
        <meta name="description" content="Toutes les analyses et cas d'investissement actions américaines." />
      </Head>
      <Nav />

      <main>
        <section style={{ padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <p className="section-label">Bibliothèque</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, marginBottom: 8 }}>
              Toutes les analyses
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>{cases.length} cas d'investissement publiés</p>
          </div>
        </section>

        {/* Filters */}
        <section style={{ padding: '16px 0', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 64, zIndex: 10 }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Search */}
              <input
                type="text"
                placeholder="Ticker, société, mot-clé…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '7px 14px', background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.85rem', width: 220,
                  outline: 'none', fontFamily: 'var(--font-body)',
                }}
              />

              {/* Sectors */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={() => setActiveSector('all')} style={{
                  padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: '0.78rem',
                  border: `1px solid ${activeSector === 'all' ? 'var(--accent-border)' : 'var(--border)'}`,
                  background: activeSector === 'all' ? 'var(--accent-dim)' : 'transparent',
                  color: activeSector === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-body)',
                }}>Tous</button>
                {sectors.map(s => (
                  <button key={s.id} onClick={() => setActiveSector(s.slug)} style={{
                    padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: '0.78rem',
                    border: `1px solid ${activeSector === s.slug ? s.color + '50' : 'var(--border)'}`,
                    background: activeSector === s.slug ? s.color + '15' : 'transparent',
                    color: activeSector === s.slug ? s.color : 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}>{s.name}</button>
                ))}
              </div>

              {/* Ratings */}
              <div style={{ display: 'flex', gap: 5 }}>
                {RATINGS.map(r => (
                  <button key={r} onClick={() => setActiveRating(r)}
                    className={r !== 'Tous' && activeRating === r ? `badge-rating ${r}` : ''}
                    style={activeRating !== r || r === 'Tous' ? {
                      padding: '5px 10px', borderRadius: 4, border: '1px solid var(--border)',
                      background: activeRating === r ? 'var(--bg-elevated)' : 'transparent',
                      color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
                    } : { cursor: 'pointer' }}
                  >{r}</button>
                ))}
              </div>
            </div>

            {/* Tags row */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', alignSelf: 'center', marginRight: 4 }}>THÈMES</span>
                <button onClick={() => setActiveTag('all')} style={{
                  padding: '3px 12px', borderRadius: 20, cursor: 'pointer', fontSize: '0.75rem',
                  border: `1px solid ${activeTag === 'all' ? 'var(--accent-border)' : 'var(--border)'}`,
                  background: activeTag === 'all' ? 'var(--accent-dim)' : 'transparent',
                  color: activeTag === 'all' ? 'var(--accent)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                }}>Tous</button>
                {tags.map(tag => (
                  <button key={tag.id} onClick={() => setActiveTag(tag.id)} style={{
                    padding: '3px 12px', borderRadius: 20, cursor: 'pointer', fontSize: '0.75rem',
                    border: `1px solid ${activeTag === tag.id ? 'var(--accent-border)' : 'var(--border)'}`,
                    background: activeTag === tag.id ? 'var(--accent-dim)' : 'transparent',
                    color: activeTag === tag.id ? 'var(--accent)' : 'var(--text-muted)',
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}>{tag.name}</button>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="container" style={{ padding: '48px 24px 80px' }}>
          {filtered.length > 0 ? (
            <div className="grid-cases">
              {filtered.map((c, i) => <CaseCard key={c.id} case_={c} delay={i % 6} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>AUCUN RÉSULTAT</p>
              {search && <p style={{ fontSize: '0.82rem', marginTop: 8 }}>Essayez un autre mot-clé</p>}
            </div>
          )}
        </div>
      </main>

      <footer>
        <div className="footer-inner">
          <p className="footer-disclaimer">
            Les analyses publiées sur ce site sont fournies à titre informatif uniquement et ne constituent pas un conseil en investissement.
          </p>
        </div>
      </footer>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const [cases, sectors] = await Promise.all([getPublishedCases(), getAllSectors()])
    const { data: tags } = await supabase.from('tags').select('*').order('name')
    return { props: { cases, sectors, tags: tags ?? [] }, revalidate: 60 }
  } catch {
    return { props: { cases: [], sectors: [], tags: [] }, revalidate: 30 }
  }
}
