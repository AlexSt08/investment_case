import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Nav from '../../components/Nav'
import { getPublishedCases, getCaseBySlug, type InvestmentCase } from '../lib/supabase'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Highlight from '@tiptap/extension-highlight'

interface Props {
  case_: InvestmentCase
  relatedCases: InvestmentCase[]
  htmlContent: string
}

const RATING_LABEL: Record<string, string> = {
  BUY: 'Achat',
  HOLD: 'Conserver',
  SELL: 'Vente',
  WATCH: 'Surveiller',
}

export default function AnalysePage({ case_, htmlContent }: Props) {
  const company = case_.companies
  const sector = case_.sectors || case_.companies?.sectors

  return (
    <>
      <Head>
        <title>{case_.title} — AlphaBrief</title>
        <meta name="description" content={case_.excerpt || case_.title} />
      </Head>

      <Nav />

      <article>
        {/* Article header */}
        <header style={{ padding: '60px 0 40px', borderBottom: '1px solid var(--border)' }}>
          <div className="container" style={{ maxWidth: 860 }}>
            {/* Breadcrumb */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 28, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Accueil</Link>
              <span>›</span>
              <Link href="/analyses" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Analyses</Link>
              {sector && (
                <>
                  <span>›</span>
                  <Link href={`/secteur/${sector.slug}`} style={{ color: sector.color, textDecoration: 'none' }}>
                    {sector.name}
                  </Link>
                </>
              )}
              {company && (
                <>
                  <span>›</span>
                  <Link href={`/ticker/${company.ticker}`} className="badge-ticker" style={{ fontSize: '0.7rem' }}>
                    {company.ticker}
                  </Link>
                </>
              )}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.6rem, 4vw, 2.5rem)',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: 16,
              color: 'var(--text-primary)',
            }}>
              {case_.title}
            </h1>

            {case_.subtitle && (
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
                {case_.subtitle}
              </p>
            )}

            {/* Meta strip */}
            <div style={{
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              paddingTop: 20,
              borderTop: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}>
              {case_.rating && (
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4, letterSpacing: '0.1em' }}>
                    RECOMMANDATION
                  </span>
                  <span className={`badge-rating ${case_.rating}`} style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
                    {RATING_LABEL[case_.rating] ?? case_.rating}
                  </span>
                </div>
              )}
              {case_.target_horizon && (
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4, letterSpacing: '0.1em' }}>
                    HORIZON
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{case_.target_horizon}</span>
                </div>
              )}
              {company && (
                <div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4, letterSpacing: '0.1em' }}>
                    TICKER
                  </span>
                  <Link href={`/ticker/${company.ticker}`} className="badge-ticker">
                    {company.ticker} · {company.exchange}
                  </Link>
                </div>
              )}
              {case_.published_at && (
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4, letterSpacing: '0.1em' }}>
                    PUBLIÉ LE
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {format(new Date(case_.published_at), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="container" style={{ maxWidth: 860, padding: '48px 24px 80px' }}>
          <div
            className="prose"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Tags */}
          {case_.tags && case_.tags.length > 0 && (
            <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginRight: 12 }}>
                THÈMES
              </span>
              {case_.tags.map(tag => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  style={{
                    display: 'inline-block',
                    marginRight: 8,
                    marginBottom: 8,
                    padding: '4px 12px',
                    borderRadius: 20,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                  }}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}

          {/* Back */}
          <div style={{ marginTop: 48 }}>
            <Link href="/analyses" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.85rem' }}>
              ← Toutes les analyses
            </Link>
          </div>
        </div>
      </article>

      <footer>
        <div className="footer-inner">
          <p className="footer-disclaimer">
            Cette analyse est fournie à titre informatif uniquement et ne constitue pas un conseil en investissement.
            Investir comporte des risques. Les performances passées ne préjugent pas des performances futures.
          </p>
        </div>
      </footer>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const cases = await getPublishedCases()
  return {
    paths: cases.map(c => ({ params: { slug: c.slug } })),
    fallback: 'blocking',
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string
  const case_ = await getCaseBySlug(slug)
  if (!case_) return { notFound: true }

  // Convert TipTap JSON to HTML server-side
  let htmlContent = ''
  try {
    htmlContent = generateHTML(case_.content as any, [
      StarterKit,
      Heading,
      Table,
      TableRow,
      TableCell,
      TableHeader,
      Highlight,
    ])
  } catch {
    htmlContent = '<p>Contenu non disponible.</p>'
  }

  return { props: { case_, htmlContent }, revalidate: 60 }
}
