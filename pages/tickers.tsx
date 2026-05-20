import type { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Nav from '../components/Nav'
import { getAllCompanies, getAllSectors, type Company, type Sector } from '../lib/supabase'

interface Props {
  companies: Company[]
  sectors: Sector[]
}

export default function Tickers({ companies, sectors }: Props) {
  // Group by sector
  const bySector: Record<string, Company[]> = {}
  const unsectored: Company[] = []

  companies.forEach(c => {
    const sectorName = c.sectors?.name
    if (sectorName) {
      if (!bySector[sectorName]) bySector[sectorName] = []
      bySector[sectorName].push(c)
    } else {
      unsectored.push(c)
    }
  })

  return (
    <>
      <Head>
        <title>Tickers — αAlex</title>
        <meta name="description" content="Index des sociétés et tickers couverts." />
      </Head>
      <Nav />

      <main>
        <section style={{ padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <p className="section-label">Univers de couverture</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: 8 }}>
              Tickers couverts
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {companies.length} société{companies.length !== 1 ? 's' : ''} dans l'univers de couverture
            </p>
          </div>
        </section>

        <div className="container" style={{ padding: '48px 24px 80px' }}>
          {Object.entries(bySector).map(([sectorName, comps]) => {
            const sector = sectors.find(s => s.name === sectorName)
            return (
              <div key={sectorName} style={{ marginBottom: 52 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 3, height: 20, background: sector?.color || 'var(--accent)', borderRadius: 2 }} />
                  <Link
                    href={`/secteur/${sector?.slug || '#'}`}
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: sector?.color || 'var(--text-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {sectorName}
                  </Link>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {comps.length} société{comps.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {comps.map(c => (
                    <Link key={c.id} href={`/ticker/${c.ticker}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '10px 16px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        transition: 'border-color 0.15s, transform 0.15s',
                        cursor: 'pointer',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-border)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
                      >
                        <div className="badge-ticker" style={{ marginBottom: 4, display: 'inline-block' }}>
                          {c.ticker}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {c.name}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}

          {unsectored.length > 0 && (
            <div style={{ marginBottom: 52 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.1em', marginBottom: 16 }}>
                AUTRES
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {unsectored.map(c => (
                  <Link key={c.id} href={`/ticker/${c.ticker}`} className="badge-ticker">
                    {c.ticker}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {companies.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>AUCUNE SOCIÉTÉ ENREGISTRÉE</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const [companies, sectors] = await Promise.all([getAllCompanies(), getAllSectors()])
    return { props: { companies, sectors }, revalidate: 300 }
  } catch {
    return { props: { companies: [], sectors: [] }, revalidate: 60 }
  }
}
