import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Nav from '../../components/Nav'
import CaseCard from '../../components/CaseCard'
import { getAllSectors, getCasesBySector, type Sector, type InvestmentCase } from '../../lib/supabase'

interface Props {
  sector: Sector
  cases: InvestmentCase[]
  allSectors: Sector[]
}

export default function SectorPage({ sector, cases, allSectors }: Props) {
  const router = useRouter()

  if (router.isFallback || !sector) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>CHARGEMENT…</p>
    </div>
  )

  return (
    <>
      <Head>
        <title>{sector.name} — αAlex</title>
        <meta name="description" content={sector.description || sector.name} />
      </Head>
      <Nav />

      <main>
        <section style={{ padding: '48px 0 32px', borderBottom: '3px solid var(--ft-red)' }}>
          <div className="container">
            <Link href="/secteurs" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'block', marginBottom: 20 }}>
              ← Secteurs
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <div style={{ width: 4, height: 32, background: sector.color || 'var(--ft-red)', borderRadius: 2 }} />
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>
                {sector.name}
              </h1>
            </div>
            {sector.description && (
              <p style={{ color: 'var(--text-secondary)', maxWidth: 560, fontWeight: 300 }}>{sector.description}</p>
            )}
            <p style={{ marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              {cases.length} ANALYSE{cases.length !== 1 ? 'S' : ''}
            </p>
          </div>
        </section>

        {/* Other sectors */}
        <section style={{ padding: '12px 0', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-rule)' }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {(allSectors || []).filter(s => s.id !== sector.id).map(s => (
                <Link key={s.id} href={`/secteur/${s.slug}`} style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.7rem', letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: s.color || 'var(--text-muted)',
                  textDecoration: 'none', transition: 'opacity 0.15s',
                }}>
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="container" style={{ padding: '40px 24px 80px' }}>
          {cases.length > 0 ? (
            <div className="grid-cases">
              {cases.map((c, i) => <CaseCard key={c.id} case_={c} delay={i} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Aucune analyse dans ce secteur
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

export const getStaticPaths: GetStaticPaths = async () => {
  try {
    const sectors = await getAllSectors()
    return {
      paths: sectors.map(s => ({ params: { slug: s.slug } })),
      fallback: true,
    }
  } catch {
    return { paths: [], fallback: true }
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  try {
    const slug = params?.slug as string
    const allSectors = await getAllSectors()
    const sector = allSectors.find(s => s.slug === slug)
    if (!sector) return { notFound: true }
    const cases = await getCasesBySector(slug)
    return { props: { sector, cases, allSectors }, revalidate: 60 }
  } catch {
    return { notFound: true }
  }
}
