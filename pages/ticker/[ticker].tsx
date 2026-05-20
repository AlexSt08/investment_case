import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Nav from '../../components/Nav'
import CaseCard from '../../components/CaseCard'
import { getAllCompanies, getCasesByTicker, type Company, type InvestmentCase } from '../../lib/supabase'

interface Props {
  company: Company
  cases: InvestmentCase[]
}

export default function TickerPage({ company, cases }: Props) {
  const sector = company.sectors

  return (
    <>
      <Head>
        <title>{company.ticker} · {company.name} — αAlex</title>
        <meta name="description" content={`Toutes les analyses publiées sur ${company.name} (${company.ticker})`} />
      </Head>
      <Nav />

      <main>
        {/* Header */}
        <section style={{ padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
          <div className="container">
            <Link href="/tickers" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'block', marginBottom: 24 }}>
              ← Tickers
            </Link>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
              {/* Logo placeholder */}
              <div style={{
                width: 64, height: 64,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {company.logo_url ? (
                  <img src={company.logo_url} alt={company.name} style={{ width: 44, height: 44, objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>
                    {company.ticker.slice(0, 3)}
                  </span>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span className="badge-ticker" style={{ fontSize: '0.85rem', padding: '5px 14px' }}>
                    {company.ticker}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  </span>
                  {sector && (
                    <Link href={`/secteur/${sector.slug}`} style={{
                      fontSize: '0.75rem', color: sector.color, textDecoration: 'none',
                      padding: '3px 10px', borderRadius: 20,
                      border: `1px solid ${sector.color}30`, background: `${sector.color}10`,
                    }}>
                      {sector.name}
                    </Link>
                  )}
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, marginBottom: 8 }}>
                  {company.name}
                </h1>
                {company.description && (
                  <p style={{ color: 'var(--text-secondary)', maxWidth: 560, fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {company.description}
                  </p>
                )}
              </div>
            </div>

            <p style={{ marginTop: 20, fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {cases.length} analyse{cases.length !== 1 ? 's' : ''} publiée{cases.length !== 1 ? 's' : ''}
            </p>
          </div>
        </section>

        <div className="container" style={{ padding: '48px 24px 80px' }}>
          {cases.length > 0 ? (
            <div className="grid-cases">
              {cases.map((c, i) => <CaseCard key={c.id} case_={c} delay={i} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>AUCUNE ANALYSE PUBLIÉE POUR CE TICKER</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const companies = await getAllCompanies()
  return {
    paths: companies.map(c => ({ params: { ticker: c.ticker } })),
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const ticker = (params?.ticker as string).toUpperCase()
  const companies = await getAllCompanies()
  const company = companies.find(c => c.ticker === ticker)
  if (!company) return { notFound: true }
  const cases = await getCasesByTicker(ticker)
  return { props: { company, cases }, revalidate: 60 }
}
