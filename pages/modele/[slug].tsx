import type { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import dynamic from 'next/dynamic'
import Nav from '../../components/Nav'
import { MODELS, getModel, type Model } from '../../lib/models'

// ── Lazy-load model components ────────────────────────────────────────────
const MODEL_COMPONENTS: Record<string, React.ComponentType> = {
  'cohort-dcf': dynamic(() => import('../../components/models/CohortDCF'), { ssr: false }),
  'eaf-sensitivity': dynamic(() => import('../../components/models/EAFSensitivity'), { ssr: false }),
}

interface Props { model: Model }

const COMPLEXITY_COLOR: Record<string, string> = {
  Fondamental:   '#007a3d',
  Intermédiaire: '#b06000',
  Avancé:        '#BF4E14',
}

const CATEGORY_COLOR: Record<string, string> = {
  Valorisation:  '#0F4761',
  'SaaS Metrics': '#0d7680',
  Macro:         '#6b4fbb',
  Credit:        '#cc0000',
}

export default function ModelePage({ model }: Props) {
  const router = useRouter()
  if (router.isFallback) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>CHARGEMENT…</p>
      </div>
    )
  }

  const ModelComponent = MODEL_COMPONENTS[model.slug]
  const catColor = CATEGORY_COLOR[model.category] || '#0F4761'
  const cxColor  = COMPLEXITY_COLOR[model.complexity] || '#0F4761'

  return (
    <>
      <Head>
        <title>{model.title} — Modèles αAlex</title>
        <meta name="description" content={model.description} />
      </Head>

      <Nav />

      <article>
        {/* ── Header ── */}
        <header style={{ padding: '48px 0 36px', borderBottom: '1px solid var(--border-rule)' }}>
          <div className="container" style={{ maxWidth: 1100 }}>

            {/* Breadcrumb */}
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              marginBottom: 24,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
            }}>
              <Link href="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Accueil</Link>
              <span>›</span>
              <Link href="/modeles" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Modèles</Link>
              <span>›</span>
              <span style={{ color: catColor }}>{model.category}</span>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.65rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: catColor,
                padding: '3px 10px',
                border: `1px solid ${catColor}40`,
                borderRadius: 2,
              }}>
                {model.category}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                letterSpacing: '0.08em',
                color: cxColor,
                background: cxColor + '14',
                padding: '3px 10px',
                borderRadius: 2,
              }}>
                {model.complexity}
              </span>
              {model.ticker && (
                <span className="badge-ticker">{model.ticker}</span>
              )}
              {model.publishedAt && (
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  marginLeft: 'auto',
                }}>
                  {format(new Date(model.publishedAt), 'd MMM yyyy', { locale: fr })}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: 10,
            }}>
              {model.title}
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1.05rem',
              fontWeight: 300,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              maxWidth: 680,
              marginBottom: 20,
            }}>
              {model.description}
            </p>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {model.tags.map(tag => (
                <span key={tag} style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.62rem',
                  letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-elevated)',
                  padding: '3px 9px',
                  borderRadius: 2,
                  border: '1px solid var(--border)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </header>

        {/* ── Model Content ── */}
        <div className="container" style={{ maxWidth: 1100, padding: '36px 24px 80px' }}>
          {ModelComponent ? (
            <ModelComponent />
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '80px 0',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
            }}>
              MODÈLE EN COURS DE DÉVELOPPEMENT
            </div>
          )}
        </div>

        {/* ── Related models ── */}
        {MODELS.filter(m => m.slug !== model.slug && m.status === 'live').length > 0 && (
          <div style={{ borderTop: '3px solid var(--ft-red)', padding: '32px 0 60px' }}>
            <div className="container" style={{ maxWidth: 1100 }}>
              <p className="section-label" style={{ marginBottom: 20 }}>Autres modèles disponibles</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {MODELS
                  .filter(m => m.slug !== model.slug && m.status === 'live')
                  .map(m => (
                    <Link key={m.slug} href={`/modele/${m.slug}`} style={{
                      textDecoration: 'none',
                      padding: '10px 16px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      transition: 'border-color 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {m.title}
                      </div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {m.category} · {m.complexity}
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          </div>
        )}
      </article>

      <footer>
        <div className="footer-inner">
          <p className="footer-disclaimer">
            Les modèles financiers publiés sur ce site sont fournis à titre analytique uniquement
            et ne constituent pas un conseil en investissement. Les résultats dépendent des hypothèses renseignées.
          </p>
        </div>
      </footer>
    </>
  )
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: MODELS.filter(m => m.status === 'live').map(m => ({ params: { slug: m.slug } })),
  fallback: true,
})

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const model = getModel(params?.slug as string)
  if (!model) return { notFound: true }
  return { props: { model } }
}
