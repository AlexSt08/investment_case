import type { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Nav from '../components/Nav'
import CaseCard from '../components/CaseCard'
import { getPublishedCases, getAllSectors, type InvestmentCase, type Sector } from '../lib/supabase'

interface Props {
  cases: InvestmentCase[]
  sectors: Sector[]
}

export default function Home({ cases, sectors }: Props) {
  const featured = cases.slice(0, 1)[0]
  const recent = cases.slice(1, 7)

  return (
    <>
      <Head>
        <title>AlphaBrief — Cas d'investissement actions américaines</title>
        <meta name="description" content="Analyses fondamentales et cas d'investissement sur les actions américaines." />
      </Head>

      <Nav />

      <main>
        {/* Hero */}
        <section style={{ padding: '80px 0 60px', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <p className="section-label animate-in">Recherche indépendante</p>
            <h1 className="animate-in" style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 700,
              marginBottom: 20,
              animationDelay: '0.1s',
              opacity: 0,
            }}>
              Cas d'investissement<br />
              <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>actions américaines</em>
            </h1>
            <p className="animate-in" style={{
              color: 'var(--text-secondary)',
              maxWidth: 520,
              fontSize: '1.05rem',
              lineHeight: 1.7,
              animationDelay: '0.2s',
              opacity: 0,
            }}>
              Analyses fondamentales sell-side sur les entreprises cotées aux États-Unis.
              Thèses structurées, risques non-consensuels, horizons de détention clairs.
            </p>
          </div>
        </section>

        {/* Sectors bar */}
        <section style={{ padding: '20px 0', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginRight: 4 }}>
                SECTEURS
              </span>
              {sectors.map(s => (
                <Link key={s.id} href={`/secteur/${s.slug}`} style={{
                  fontSize: '0.8rem', color: s.color, textDecoration: 'none',
                  padding: '4px 12px', borderRadius: 20,
                  border: `1px solid ${s.color}30`, background: `${s.color}10`,
                  transition: 'background 0.2s',
                }}>
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="container" style={{ padding: '60px 24px' }}>

          {/* Featured */}
          {featured && (
            <div style={{ marginBottom: 64 }}>
              <p className="section-label">Analyse à la une</p>
              <Link href={`/analyse/${featured.slug}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '40px', cursor: 'pointer', transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                    {(featured.case_companies ?? []).slice(0, 3).map(cc => cc.companies && (
                      <span key={cc.id} className="badge-ticker">{cc.companies.ticker}</span>
                    ))}
                    {featured.rating && (
                      <span className={`badge-rating ${featured.rating}`}>{featured.rating}</span>
                    )}
                    {!(featured.case_companies ?? []).some(cc => cc.rating) && featured.rating && null}
                    {featured.sectors && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {featured.sectors.name}
                      </span>
                    )}
                  </div>

                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.4rem, 3vw, 2rem)',
                    fontWeight: 700, lineHeight: 1.25, marginBottom: 16,
                    color: 'var(--text-primary)',
                  }}>
                    {featured.title}
                  </h2>

                  {/* Company ratings strip */}
                  {(featured.case_companies ?? []).length > 0 && (
                    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                      {(featured.case_companies ?? []).map(cc => cc.rating && cc.companies && (
                        <span key={cc.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="badge-ticker" style={{ fontSize: '0.72rem' }}>{cc.companies.ticker}</span>
                          <span className={`badge-rating ${cc.rating}`} style={{ fontSize: '0.68rem' }}>{cc.rating}</span>
                          {cc.target_price && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{cc.target_price}</span>}
                          {cc.upside && <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: cc.upside.startsWith('+') ? 'var(--buy)' : 'var(--sell)' }}>{cc.upside}</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {featured.excerpt && (
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 680, fontSize: '0.95rem' }}>
                      {featured.excerpt}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          )}

          {/* Recent */}
          {recent.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
                <p className="section-label" style={{ marginBottom: 0 }}>Analyses récentes</p>
                <Link href="/analyses" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>
                  Toutes les analyses →
                </Link>
              </div>
              <div className="grid-cases">
                {recent.map((c, i) => <CaseCard key={c.id} case_={c} delay={i + 1} />)}
              </div>
            </div>
          )}

          {cases.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
                AUCUNE ANALYSE PUBLIÉE
              </p>
            </div>
          )}
        </div>
      </main>

      <footer>
        <div className="footer-inner">
          <p className="footer-disclaimer">
            Les analyses publiées sur ce site sont fournies à titre informatif uniquement et ne constituent pas un conseil en investissement.
            Investir comporte des risques. Les performances passées ne préjugent pas des performances futures.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              AlphaBrief © {new Date().getFullYear()}
            </p>
            <Link
              href="/admin/login"
              style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textDecoration: 'none', opacity: 0.3, letterSpacing: '0.08em', transition: 'opacity 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}
            >⚙</Link>
          </div>
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
