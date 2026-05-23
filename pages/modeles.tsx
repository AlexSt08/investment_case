import type { GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import Nav from '../components/Nav'
import { MODELS, CATEGORIES, COMPLEXITIES, type Model } from '../lib/models'

interface Props { models: Model[] }

const COMPLEXITY_COLOR: Record<string, { bg: string; color: string }> = {
  Fondamental:    { bg: 'rgba(0,122,61,0.08)',    color: '#007a3d' },
  Intermédiaire:  { bg: 'rgba(176,96,0,0.08)',    color: '#b06000' },
  Avancé:         { bg: 'rgba(191,78,20,0.12)',   color: '#BF4E14' },
}

const CATEGORY_COLOR: Record<string, string> = {
  Valorisation: '#0F4761',
  'SaaS Metrics': '#0d7680',
  Macro: '#6b4fbb',
  Credit: '#cc0000',
}

function ModelCard({ model, index }: { model: Model; index: number }) {
  const cx = COMPLEXITY_COLOR[model.complexity]
  const catColor = CATEGORY_COLOR[model.category] || '#0F4761'
  const isLive = model.status === 'live'

  return (
    <div
      className="model-card"
      style={{
        opacity: 0,
        animation: `fadeIn 0.45s ease forwards`,
        animationDelay: `${index * 80}ms`,
      }}
    >
      {/* Top stripe */}
      <div style={{ height: 3, background: isLive ? catColor : '#ccc', borderRadius: '4px 4px 0 0' }} />

      <div style={{ padding: '20px 22px 18px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.62rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: catColor,
              padding: '2px 8px',
              border: `1px solid ${catColor}30`,
              borderRadius: 2,
            }}>
              {model.category}
            </span>
            {model.ticker && (
              <span className="badge-ticker" style={{ fontSize: '0.65rem' }}>
                {model.ticker}
              </span>
            )}
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.62rem',
            color: cx.color,
            background: cx.bg,
            padding: '2px 8px',
            borderRadius: 2,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {model.complexity}
          </span>
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.08rem',
          fontWeight: 700,
          lineHeight: 1.2,
          color: 'var(--text-primary)',
          marginBottom: 5,
        }}>
          {model.title}
        </h2>
        <p style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.78rem',
          color: 'var(--ft-red)',
          letterSpacing: '0.01em',
          marginBottom: 10,
        }}>
          {model.subtitle}
        </p>

        {/* Description */}
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem',
          fontWeight: 300,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          marginBottom: 16,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden',
        }}>
          {model.description}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 18 }}>
          {model.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              background: 'var(--bg-elevated)',
              padding: '2px 7px',
              borderRadius: 2,
              border: '1px solid var(--border)',
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        {isLive ? (
          <Link
            href={`/modele/${model.slug}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-sans)',
              fontSize: '0.78rem',
              letterSpacing: '0.04em',
              color: 'var(--ft-red)',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(204,0,0,0.3)',
              paddingBottom: 1,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--ft-red)'
              e.currentTarget.style.color = '#990000'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(204,0,0,0.3)'
              e.currentTarget.style.color = 'var(--ft-red)'
            }}
          >
            Ouvrir le modèle →
          </Link>
        ) : (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem',
            letterSpacing: '0.1em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}>
            En préparation
          </span>
        )}
      </div>
    </div>
  )
}

export default function Modeles({ models }: Props) {
  const [activeCategory, setActiveCategory] = useState('Tous')
  const [activeComplexity, setActiveComplexity] = useState('Tous')
  const [search, setSearch] = useState('')

  const filtered = models.filter(m => {
    const catMatch = activeCategory === 'Tous' || m.category === activeCategory
    const cxMatch  = activeComplexity === 'Tous' || m.complexity === activeComplexity
    const srchMatch = !search || [m.title, m.subtitle, ...m.tags]
      .some(s => s.toLowerCase().includes(search.toLowerCase()))
    return catMatch && cxMatch && srchMatch
  })

  const liveCount = models.filter(m => m.status === 'live').length

  return (
    <>
      <Head>
        <title>Modèles Financiers — αAlex</title>
        <meta name="description" content="Frameworks de valorisation interactifs pour gérants buy-side." />
      </Head>

      <Nav />

      <main>
        {/* ── Hero ── */}
        <section style={{ padding: '56px 0 40px', borderBottom: '1px solid var(--border-rule)' }}>
          <div className="container">
            <p className="section-label">Boîte à outils quantitative</p>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              fontWeight: 700,
              lineHeight: 1.15,
              marginBottom: 12,
            }}>
              Modèles financiers
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '1rem',
              fontWeight: 300,
              color: 'var(--text-secondary)',
              maxWidth: 540,
              lineHeight: 1.65,
              marginBottom: 24,
            }}>
              Frameworks de valorisation interactifs calibrés sur des données réelles.
              Modifiez les hypothèses en temps réel — le modèle recalcule instantanément.
            </p>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { label: 'Modèles disponibles', value: liveCount },
                { label: 'En préparation', value: models.length - liveCount },
                { label: 'Catégories', value: 2 },
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: 'var(--ft-red)',
                    lineHeight: 1,
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: 4,
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Filters ── */}
        <section style={{
          padding: '14px 0',
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 52,
          zIndex: 10,
        }}>
          <div className="container">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <input
                type="text"
                placeholder="Rechercher un modèle…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  padding: '7px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border-rule)',
                  borderRadius: 2,
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  width: 220,
                  outline: 'none',
                  fontFamily: 'var(--font-body)',
                }}
              />

              {/* Categories */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '5px 13px',
                      borderRadius: 2,
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-sans)',
                      border: `1px solid ${activeCategory === cat ? (CATEGORY_COLOR[cat] || 'var(--ft-red)') + '50' : 'var(--border)'}`,
                      background: activeCategory === cat ? (CATEGORY_COLOR[cat] || 'var(--ft-red)') + '12' : 'transparent',
                      color: activeCategory === cat ? (CATEGORY_COLOR[cat] || 'var(--ft-red)') : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Complexity */}
              <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
                {COMPLEXITIES.map(cx => {
                  const cxColors = COMPLEXITY_COLOR[cx] || { bg: 'transparent', color: 'var(--text-muted)' }
                  return (
                    <button
                      key={cx}
                      onClick={() => setActiveComplexity(cx)}
                      style={{
                        padding: '4px 11px',
                        borderRadius: 2,
                        cursor: 'pointer',
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.06em',
                        border: `1px solid ${activeComplexity === cx ? 'var(--border-strong)' : 'var(--border)'}`,
                        background: activeComplexity === cx ? cxColors.bg : 'transparent',
                        color: activeComplexity === cx ? cxColors.color : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cx}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Grid ── */}
        <div className="container" style={{ padding: '40px 24px 80px' }}>
          {filtered.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 20,
            }}>
              {filtered.map((m, i) => (
                <ModelCard key={m.slug} model={m} index={i} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
                AUCUN MODÈLE CORRESPONDANT
              </p>
            </div>
          )}
        </div>
      </main>

      <footer>
        <div className="footer-inner">
          <p className="footer-disclaimer">
            Les modèles financiers publiés sur ce site sont fournis à titre analytique uniquement
            et ne constituent pas un conseil en investissement.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .model-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .model-card:hover {
          border-color: var(--border-strong);
          transform: translateY(-2px);
        }
      `}</style>
    </>
  )
}

export const getStaticProps: GetStaticProps = async () => ({
  props: { models: MODELS },
})
