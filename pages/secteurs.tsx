import type { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Nav from '../components/Nav'
import { getAllSectors, getPublishedCases, type Sector } from '../lib/supabase'

interface SectorWithCount extends Sector {
  count: number
}

interface Props {
  sectors: SectorWithCount[]
}

export default function Secteurs({ sectors }: Props) {
  return (
    <>
      <Head>
        <title>Secteurs — AlphaBrief</title>
        <meta name="description" content="Analyses par secteur et industrie." />
      </Head>
      <Nav />

      <main>
        <section style={{ padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <p className="section-label">Navigation sectorielle</p>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>
              Secteurs & industries
            </h1>
          </div>
        </section>

        <div className="container" style={{ padding: '48px 24px 80px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {sectors.map((sector, i) => (
              <Link key={sector.id} href={`/secteur/${sector.slug}`} style={{ textDecoration: 'none' }}>
                <div
                  className={`animate-in animate-in-delay-${Math.min(i + 1, 3)}`}
                  style={{
                    padding: '28px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    transition: 'border-color 0.2s, transform 0.2s',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = sector.color + '60'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  {/* Color bar */}
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 3,
                    background: sector.color,
                  }} />

                  <h2 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: sector.color,
                    marginBottom: 10,
                    marginTop: 8,
                  }}>
                    {sector.name}
                  </h2>

                  {sector.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
                      {sector.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {sector.count} analyse{sector.count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: sector.color }}>Voir →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => {
  try {
    const [sectors, cases] = await Promise.all([getAllSectors(), getPublishedCases()])
    const sectorsWithCount: SectorWithCount[] = sectors.map(s => ({
      ...s,
      count: cases.filter(c =>
        c.sector_id === s.id
      ).length,
    }))
    return { props: { sectors: sectorsWithCount }, revalidate: 300 }
  } catch {
    return { props: { sectors: [] }, revalidate: 60 }
  }
}
