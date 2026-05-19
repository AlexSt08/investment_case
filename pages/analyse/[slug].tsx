import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import Script from 'next/script'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Nav from '../../components/Nav'
import { getPublishedCases, getCaseBySlug, type InvestmentCase, type CaseCompany } from '../../lib/supabase'

interface Props {
  case_: InvestmentCase
  htmlContent: string
}

const RATING_LABEL: Record<string, string> = {
  BUY: 'Achat', HOLD: 'Conserver', SELL: 'Vente', WATCH: 'Surveiller',
}
const RATING_ARROW: Record<string, string> = {
  BUY: '▲', HOLD: '◆', SELL: '▼', WATCH: '◉',
}

// Convert TipTap JSON → HTML (handles both string JSON and object)
function tiptapToHtml(doc: any): string {
  if (typeof doc === 'string') {
    const trimmed = doc.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return tiptapToHtml(JSON.parse(trimmed)) } catch { return doc }
    }
    return doc // already HTML
  }
  if (typeof doc === 'object' && doc !== null) {
    if (doc.type === 'doc' && doc.content) {
      return doc.content.map(nodeToHtml).join('')
    }
    if (Array.isArray(doc)) return doc.map(nodeToHtml).join('')
  }
  return String(doc ?? '')
}

function nodeToHtml(node: any): string {
  const inner = () => (node.content ?? []).map(nodeToHtml).join('')
  const applyMarks = (text: string, marks: any[] = []) =>
    marks.reduce((t, m) => {
      if (m.type === 'bold') return `<strong>${t}</strong>`
      if (m.type === 'italic') return `<em>${t}</em>`
      if (m.type === 'highlight') return `<mark>${t}</mark>`
      if (m.type === 'link') return `<a href="${m.attrs?.href}">${t}</a>`
      if (m.type === 'underline') return `<u>${t}</u>`
      if (m.type === 'strike') return `<s>${t}</s>`
      return t
    }, text)
  switch (node.type) {
    case 'text': return applyMarks(node.text ?? '', node.marks)
    case 'paragraph': return `<p>${inner() || '&nbsp;'}</p>`
    case 'heading': return `<h${node.attrs?.level ?? 2}>${inner()}</h${node.attrs?.level ?? 2}>`
    case 'bulletList': return `<ul>${inner()}</ul>`
    case 'orderedList': return `<ol>${inner()}</ol>`
    case 'listItem': return `<li>${inner()}</li>`
    case 'blockquote': return `<blockquote>${inner()}</blockquote>`
    case 'horizontalRule': return `<hr>`
    case 'hardBreak': return `<br>`
    case 'table': return `<table>${inner()}</table>`
    case 'tableRow': return `<tr>${inner()}</tr>`
    case 'tableHeader': return `<th>${inner()}</th>`
    case 'tableCell': return `<td>${inner()}</td>`
    case 'codeBlock': return `<pre><code>${inner()}</code></pre>`
    default: return inner()
  }
}

export default function AnalysePage({ case_, htmlContent }: Props) {
  const sector = case_.sectors
  const caseCompanies = case_.case_companies ?? []
  const hasCompanies = caseCompanies.length > 0
  const hasCharts = htmlContent.includes('chart-container') || htmlContent.includes('Chart(')

  return (
    <>
      <Head>
        <title>{case_.title} — AlphaBrief</title>
        <meta name="description" content={case_.excerpt || case_.title} />
      </Head>

      {/* Load Chart.js only if article contains charts */}
      {hasCharts && (
        <Script
          src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"
          strategy="afterInteractive"
        />
      )}

      <Nav />

      <article>
        {/* ── Header ── */}
        <header style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border)' }}>
          <div className="container" style={{ maxWidth: 900 }}>

            {/* Breadcrumb */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 28, fontSize: '0.75rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Accueil</Link>
              <span>›</span>
              <Link href="/analyses" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Analyses</Link>
              {sector && (
                <>
                  <span>›</span>
                  <Link href={`/secteur/${sector.slug}`} style={{ color: sector.color, textDecoration: 'none' }}>{sector.name}</Link>
                </>
              )}
              {caseCompanies.slice(0, 2).map(cc => cc.companies && (
                <span key={cc.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>›</span>
                  <Link href={`/ticker/${cc.companies.ticker}`} className="badge-ticker" style={{ fontSize: '0.68rem' }}>
                    {cc.companies.ticker}
                  </Link>
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.6rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: 14 }}>
              {case_.title}
            </h1>
            {case_.subtitle && (
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>{case_.subtitle}</p>
            )}

            {/* Companies ratings */}
            {hasCompanies && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
                {caseCompanies.map(cc => {
                  const comp = cc.companies
                  if (!comp) return null
                  return (
                    <Link key={cc.id} href={`/ticker/${comp.ticker}`} style={{
                      textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      borderRadius: 8, transition: 'border-color 0.2s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <span className="badge-ticker" style={{ fontSize: '0.8rem' }}>{comp.ticker}</span>
                      {cc.rating && (
                        <span className={`badge-rating ${cc.rating}`} style={{ fontSize: '0.7rem' }}>
                          {RATING_ARROW[cc.rating]} {RATING_LABEL[cc.rating]}
                        </span>
                      )}
                      {cc.target_price && <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>Obj. {cc.target_price}</span>}
                      {cc.upside && (
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: cc.upside.startsWith('+') ? 'var(--buy)' : cc.upside.startsWith('-') ? 'var(--sell)' : 'var(--text-muted)' }}>
                          {cc.upside}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Meta strip */}
            <div style={{ display: 'flex', gap: 28, alignItems: 'center', paddingTop: 20, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              {!hasCompanies && case_.rating && (
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4, letterSpacing: '0.1em' }}>RECOMMANDATION</span>
                  <span className={`badge-rating ${case_.rating}`} style={{ fontSize: '0.8rem', padding: '5px 14px' }}>
                    {RATING_ARROW[case_.rating]} {RATING_LABEL[case_.rating]}
                  </span>
                </div>
              )}
              {case_.target_horizon && (
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4, letterSpacing: '0.1em' }}>HORIZON</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{case_.target_horizon}</span>
                </div>
              )}
              {sector && (
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4, letterSpacing: '0.1em' }}>SECTEUR</span>
                  <Link href={`/secteur/${sector.slug}`} style={{ fontSize: '0.85rem', color: sector.color, textDecoration: 'none' }}>{sector.name}</Link>
                </div>
              )}
              {case_.published_at && (
                <div style={{ marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: 4, letterSpacing: '0.1em' }}>PUBLIÉ LE</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {format(new Date(case_.published_at), 'd MMMM yyyy', { locale: fr })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <div className="container" style={{ maxWidth: 900, padding: '48px 24px 80px' }}>
          <div className="prose" dangerouslySetInnerHTML={{ __html: htmlContent }} />

          {/* Tags */}
          {case_.tags && case_.tags.length > 0 && (
            <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginRight: 12 }}>THÈMES</span>
              {case_.tags.map(tag => (
                <Link key={tag.id} href={`/analyses`} style={{
                  display: 'inline-block', marginRight: 8, marginBottom: 8,
                  padding: '4px 12px', borderRadius: 20,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  fontSize: '0.78rem', color: 'var(--text-secondary)', textDecoration: 'none',
                }}>{tag.name}</Link>
              ))}
            </div>
          )}

          {/* Related tickers */}
          {hasCompanies && (
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginBottom: 12 }}>SOCIÉTÉS MENTIONNÉES</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {caseCompanies.map(cc => cc.companies && (
                  <Link key={cc.id} href={`/ticker/${cc.companies.ticker}`} className="badge-ticker">{cc.companies.ticker}</Link>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 48 }}>
            <Link href="/analyses" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.85rem' }}>← Toutes les analyses</Link>
          </div>
        </div>
      </article>

      <footer>
        <div className="footer-inner">
          <p className="footer-disclaimer">
            Cette analyse est fournie à titre informatif uniquement et ne constitue pas un conseil en investissement. Investir comporte des risques.
          </p>
        </div>
      </footer>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const cases = await getPublishedCases()
  return { paths: cases.map(c => ({ params: { slug: c.slug } })), fallback: 'blocking' }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = params?.slug as string
  const case_ = await getCaseBySlug(slug)
  if (!case_) return { notFound: true }

  // Convert content regardless of format (TipTap JSON or HTML)
  const htmlContent = tiptapToHtml(case_.content)

  return { props: { case_, htmlContent }, revalidate: 60 }
}
