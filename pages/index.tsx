import type { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Nav from '../components/Nav'
import CaseCard from '../components/CaseCard'
import { getPublishedCases, getAllSectors, type InvestmentCase, type Sector } from '../lib/supabase'

interface Props { cases: InvestmentCase[]; sectors: Sector[] }

const RATING_ARROW: Record<string, string> = { BUY: '▲', HOLD: '◆', SELL: '▼', WATCH: '◉' }
const RATING_LABEL: Record<string, string> = { BUY: 'Achat', HOLD: 'Conserver', SELL: 'Vente', WATCH: 'Surveiller' }

export default function Home({ cases, sectors }: Props) {
  const featured = cases[0]
  const secondary = cases.slice(1, 4)
  const recent = cases.slice(4, 10)

  return (
    <>
      <Head>
        <title>AlphaBrief — Analyses financières actions américaines</title>
        <meta name="description" content="Cas d'investissement et analyses fondamentales sur les actions américaines." />
      </Head>

      <Nav />

      {/* Masthead date + sectors bar */}
      <div style={{ background: '#262a33', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '8px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr }).toUpperCase()}
          </span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {sectors.map(s => (
              <Link key={s.id} href={`/secteur/${s.slug}`} style={{
                fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
                transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <main>
        <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

          {/* ── Top section: Featured + Secondary ── */}
          {(featured || secondary.length > 0) && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ borderTop: '3px solid var(--ft-red)', paddingTop: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className="section-label" style={{ marginBottom: 0 }}>Analyse à la une</span>
                <Link href="/analyses" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--ft-teal)', textDecoration: 'none', letterSpacing: '0.04em' }}>
                  Toutes les analyses →
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: featured && secondary.length > 0 ? '1.6fr 1fr' : '1fr', gap: '0 40px' }}>

                {/* Featured article — large format */}
                {featured && (
                  <div style={{ borderRight: secondary.length > 0 ? 'var(--col-rule)' : 'none', paddingRight: secondary.length > 0 ? 40 : 0 }}>
                    <Link href={`/analyse/${featured.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {/* Kicker */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                        {(featured.case_companies ?? []).slice(0, 2).map(cc => cc.companies && (
                          <span key={cc.id} className="badge-ticker">{cc.companies.ticker}</span>
                        ))}
                        {featured.sectors && (
                          <span className="ft-kicker">{featured.sectors.name}</span>
                        )}
                      </div>

                      {/* Headline */}
                      <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.6rem, 3vw, 2.4rem)',
                        fontWeight: 700,
                        lineHeight: 1.15,
                        marginBottom: 12,
                        color: 'var(--text-primary)',
                        transition: 'color 0.15s',
                      }}
                        className="card-title"
                      >
                        {featured.title}
                      </h1>

                      {/* Standfirst */}
                      {featured.excerpt && (
                        <p style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '1rem',
                          fontWeight: 300,
                          lineHeight: 1.65,
                          color: 'var(--text-secondary)',
                          marginBottom: 16,
                        }}>
                          {featured.excerpt}
                        </p>
                      )}

                      {/* Ratings strip */}
                      {(featured.case_companies ?? []).some(cc => cc.rating) && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                          {(featured.case_companies ?? []).map(cc => cc.rating && cc.companies && (
                            <span key={cc.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="badge-ticker" style={{ fontSize: '0.68rem' }}>{cc.companies.ticker}</span>
                              <span className={`badge-rating ${cc.rating}`}>{RATING_ARROW[cc.rating]} {RATING_LABEL[cc.rating]}</span>
                              {cc.target_price && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>obj. {cc.target_price}</span>}
                              {cc.upside && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 600, color: cc.upside.startsWith('+') ? 'var(--buy)' : 'var(--sell)' }}>{cc.upside}</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Byline */}
                      <div className="ft-dateline">
                        {featured.published_at && format(new Date(featured.published_at), 'd MMMM yyyy', { locale: fr })}
                        {featured.target_horizon && ` · Horizon : ${featured.target_horizon}`}
                      </div>
                    </Link>
                  </div>
                )}

                {/* Secondary articles */}
                {secondary.length > 0 && (
                  <div>
                    {secondary.map((c, i) => (
                      <div key={c.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-rule)', paddingTop: i === 0 ? 0 : 16, marginTop: i === 0 ? 0 : 16 }}>
                        <Link href={`/analyse/${c.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                            {(c.case_companies ?? []).slice(0, 1).map(cc => cc.companies && (
                              <span key={cc.id} className="badge-ticker" style={{ fontSize: '0.65rem' }}>{cc.companies.ticker}</span>
                            ))}
                            {c.sectors && <span className="ft-kicker" style={{ fontSize: '0.65rem' }}>{c.sectors.name}</span>}
                            {(c.case_companies ?? [])[0]?.rating && (
                              <span className={`badge-rating ${(c.case_companies ?? [])[0].rating}`} style={{ fontSize: '0.62rem' }}>
                                {RATING_ARROW[(c.case_companies ?? [])[0].rating!]} {(c.case_companies ?? [])[0].rating}
                              </span>
                            )}
                          </div>
                          <h3 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.05rem',
                            fontWeight: 600,
                            lineHeight: 1.25,
                            marginBottom: 6,
                            color: 'var(--text-primary)',
                          }} className="card-title">
                            {c.title}
                          </h3>
                          {c.excerpt && (
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {c.excerpt}
                            </p>
                          )}
                          <span className="ft-dateline">
                            {c.published_at && format(new Date(c.published_at), 'd MMM yyyy', { locale: fr })}
                          </span>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Divider ── */}
          {recent.length > 0 && (
            <>
              <div style={{ borderTop: '3px solid var(--ft-red)', paddingTop: 16, marginBottom: 24 }}>
                <span className="section-label" style={{ marginBottom: 0 }}>Analyses récentes</span>
              </div>
              <div className="grid-cases">
                {recent.map((c, i) => <CaseCard key={c.id} case_={c} delay={i} />)}
              </div>
            </>
          )}

          {cases.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Aucune analyse publiée
              </p>
            </div>
          )}
        </div>
      </main>

      <footer>
        <div className="footer-inner">
          <p className="footer-disclaimer">
            Les analyses publiées sur ce site sont fournies à titre informatif uniquement et ne constituent pas un conseil en investissement.
            Investir comporte des risques de perte en capital. Les performances passées ne préjugent pas des performances futures.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
              AlphaBrief © {new Date().getFullYear()}
            </span>
            <Link href="/admin/login" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', textDecoration: 'none', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
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
