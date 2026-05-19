import type { GetStaticProps } from 'next'
import Head from 'next/head'
import { useState } from 'react'
import Nav from '../components/Nav'
import CaseCard from '../components/CaseCard'
import { getPublishedCases, getAllSectors, type InvestmentCase, type Sector } from '../lib/supabase'

interface Props {
  cases: InvestmentCase[]
  sectors: Sector[]
}

const RATINGS = ['Tous', 'BUY', 'HOLD', 'SELL', 'WATCH']

export default function Analyses({ cases, sectors }: Props) {
  const [activeSector, setActiveSector] = useState<string>('all')
  const [activeRating, setActiveRating] = useState<string>('Tous')
  const [search, setSearch] = useState('')

  const filtered = cases.filter(c => {
    const caseCompanies = c.case_companies ?? []

    const sectorMatch = activeSector === 'all' ||
      c.sectors?.slug === activeSector

    const ratingMatch = activeRating === 'Tous' ||
      c.rating === activeRating ||
      caseCompanies.some(cc => cc.rating === activeRating)

    const searchMatch = !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      caseCompanies.some(cc =>
        cc.companies?.ticker.toLowerCase().includes(search.toLowerCase()) ||
        cc.companies?.name.toLowerCase().includes(search.toLowerCase())
      )

    return sectorMatch && ratingMatch && searchMatch
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
        <section style={{ padding: '20px 0', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 64, zIndex: 10 }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Search */}
              <input
                type="text"
                placeholder="Rechercher ticker, société..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '7px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  width: 220,
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              />

              {/* Sectors */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setActiveSector('all')}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 20,
                    border: `1px solid ${activeSector === 'all' ? 'var(--accent-border)' : 'var(--border)'}`,
                    background: activeSector === 'all' ? 'var(--accent-dim)' : 'transparent',
                    color: activeSector === 'all' ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Tous
                </button>
                {sectors.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSector(s.slug)}
                    style={{
                      padding: '5px 14px',
                      borderRadius: 20,
                      border: `1px solid ${activeSector === s.slug ? s.color + '50' : 'var(--border)'}`,
                      background: activeSector === s.slug ? s.color + '15' : 'transparent',
                      color: activeSector === s.slug ? s.color : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              {/* Ratings */}
              <div style={{ display: 'flex', gap: 6 }}>
                {RATINGS.map(r => (
                  <button
                    key={r}
                    onClick={() => setActiveRating(r)}
                    className={r !== 'Tous' && activeRating === r ? `badge-rating ${r}` : ''}
                    style={r === 'Tous' || activeRating !== r ? {
                      padding: '5px 10px',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      background: activeRating === r ? 'var(--bg-elevated)' : 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.06em',
                    } : { cursor: 'pointer' }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="container" style={{ padding: '48px 24px 80px' }}>
          {filtered.length > 0 ? (
            <div className="grid-cases">
              {filtered.map((c, i) => <CaseCard key={c.id} case_={c} delay={i % 6} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
                AUCUN RÉSULTAT
              </p>
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
    return { props: { cases, sectors }, revalidate: 60 }
  } catch {
    return { props: { cases: [], sectors: [] }, revalidate: 30 }
  }
}
