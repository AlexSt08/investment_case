import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase, type InvestmentCase } from '../../lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()
  const [cases, setCases] = useState<InvestmentCase[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
    fetchAllCases()
  }, [])

  const checkAuth = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) router.push('/admin/login')
  }

  const fetchAllCases = async () => {
    const { data } = await supabase
      .from('investment_cases')
      .select('*, companies(ticker, name), sectors(name, color)')
      .order('created_at', { ascending: false })
    setCases(data ?? [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const togglePublish = async (c: InvestmentCase) => {
    const updates = {
      published: !c.published,
      published_at: !c.published ? new Date().toISOString() : null,
    }
    await supabase.from('investment_cases').update(updates).eq('id', c.id)
    fetchAllCases()
  }

  const deleteCase = async (id: string) => {
    if (!confirm('Supprimer cette analyse ?')) return
    await supabase.from('investment_cases').delete().eq('id', id)
    fetchAllCases()
  }

  const published = cases.filter(c => c.published)
  const drafts = cases.filter(c => !c.published)

  return (
    <>
      <Head><title>Admin Dashboard — AlphaBrief</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Admin nav */}
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{
            maxWidth: 1200, margin: '0 auto', padding: '0 24px',
            height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}>
                Alpha<span style={{ color: 'var(--accent)' }}>•</span>Brief
              </Link>
              <span style={{ color: 'var(--border)', fontSize: '1.2rem' }}>|</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--accent)' }}>ADMIN</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link href="/admin/societes" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                Sociétés
              </Link>
              <Link href="/admin/nouveau" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                + Nouvelle analyse
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
                Déconnexion
              </button>
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 40 }}>
            {[
              { label: 'Total', value: cases.length },
              { label: 'Publiées', value: published.length, color: 'var(--buy)' },
              { label: 'Brouillons', value: drafts.length, color: 'var(--hold)' },
              { label: 'BUY actifs', value: published.filter(c => c.rating === 'BUY').length, color: 'var(--accent)' },
            ].map(stat => (
              <div key={stat.label} style={{
                padding: '20px 24px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  {stat.label.toUpperCase()}
                </p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: stat.color || 'var(--text-primary)' }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Cases table */}
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>Chargement…</p>
          ) : (
            <>
              {[
                { title: 'Brouillons', items: drafts },
                { title: 'Publiées', items: published },
              ].map(group => group.items.length > 0 && (
                <div key={group.title} style={{ marginBottom: 40 }}>
                  <p className="section-label" style={{ marginBottom: 16 }}>{group.title} — {group.items.length}</p>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Titre', 'Ticker', 'Secteur', 'Rating', 'Date', 'Actions'].map(h => (
                            <th key={h} style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.65rem',
                              letterSpacing: '0.1em',
                              color: 'var(--text-muted)',
                              fontWeight: 500,
                            }}>{h.toUpperCase()}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((c, i) => (
                          <tr key={c.id} style={{
                            borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none',
                            transition: 'background 0.1s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <td style={{ padding: '14px 16px', fontSize: '0.88rem', color: 'var(--text-primary)', maxWidth: 320 }}>
                              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {c.title}
                              </span>
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {(c as any).companies ? (
                                <span className="badge-ticker" style={{ fontSize: '0.7rem' }}>
                                  {(c as any).companies.ticker}
                                </span>
                              ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                            </td>
                            <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: (c as any).sectors?.color || 'var(--text-secondary)' }}>
                              {(c as any).sectors?.name || '—'}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              {c.rating ? (
                                <span className={`badge-rating ${c.rating}`} style={{ fontSize: '0.65rem' }}>
                                  {c.rating}
                                </span>
                              ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                            </td>
                            <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {format(new Date(c.updated_at || c.created_at), 'd MMM yy', { locale: fr })}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <Link
                                  href={`/admin/editer/${c.id}`}
                                  className="btn btn-ghost"
                                  style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                >
                                  Éditer
                                </Link>
                                <button
                                  onClick={() => togglePublish(c)}
                                  className="btn"
                                  style={{
                                    padding: '4px 10px',
                                    fontSize: '0.72rem',
                                    background: c.published ? 'var(--hold-bg)' : 'var(--buy-bg)',
                                    color: c.published ? 'var(--hold)' : 'var(--buy)',
                                    border: `1px solid ${c.published ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
                                  }}
                                >
                                  {c.published ? 'Dépublier' : 'Publier'}
                                </button>
                                <button
                                  onClick={() => deleteCase(c.id)}
                                  className="btn btn-danger"
                                  style={{ padding: '4px 10px', fontSize: '0.72rem' }}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}
