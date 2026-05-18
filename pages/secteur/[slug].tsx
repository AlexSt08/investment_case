import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Nav from '../../components/Nav'
import CaseCard from '../../components/CaseCard'
import { getAllSectors, getCasesBySector, type Sector, type InvestmentCase } from '../../lib/supabase'

interface Props {
  sector: Sector
  cases: InvestmentCase[]
  allSectors: Sector[]
}

export default function SectorPage({ sector, cases, allSectors }: Props) {
  return (
    <>
      <Head>
        <title>{sector.name} — AlphaBrief</title>
        <meta name="description" content={sector.description} />
      </Head>
      <Nav />

      <main>
        {/* Header */}
        <section style={{ padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <Link href="/secteurs" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
              ← Secteurs
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{
                width: 12,
                height: 32,
                background: sector.color,
                borderRadius: 2,
              }} />
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>
                {sector.name}
              </h1>
            </div>
            {sector.description && (
              <p style={{ color: 'var(--text-secondary)', maxWidth: 560 }}>{sector.description}</p>
            )}
            <p style={{ marginTop: 12, fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {cases.length} analyse{cases.length !== 1 ? 's' : ''} publiée{cases.length !== 1 ? 's' : ''}
            </p>
          </div>
        </section>

        {/* Other sectors */}
        <section style={{ padding: '16px 0', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {allSectors.filter(s => s.id !== sector.id).map(s => (
                <Link key={s.id} href={`/secteur/${s.slug}`} style={{
                  fontSize: '0.78rem', color: s.color, textDecoration: 'none',
                  padding: '4px 12px', borderRadius: 20,
                  border: `1px solid ${s.color}30`, background: `${s.color}10`,
                }}>
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="container" style={{ padding: '48px 24px 80px' }}>
          {cases.length > 0 ? (
            <div className="grid-cases">
              {cases.map((c, i) => <CaseCard key={c.id} case_={c} delay={i} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>AUCUNE ANALYSE DANS CE SECTEUR</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const sectors = await getAllSectors()
  return {
    paths: sectors.map(s => ({ params: { slug: s.slug } })),
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string
  const allSectors = await getAllSectors()
  const sector = allSectors.find(s => s.slug === slug)
  if (!sector) return { notFound: true }
  const cases = await getCasesBySector(slug)
  return { props: { sector, cases, allSectors }, revalidate: 60 }
}
