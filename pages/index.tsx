import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { supabase, getAllCasesAdmin, type InvestmentCase } from '../../lib/supabase'

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
    const data = await getAllCasesAdmin()
    setCases(data)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const togglePublish = async (c: InvestmentCase) => {
    await supabase.from('investment_cases').update({
      published: !c.published,
      published_at: !c.published ? new Date().toISOString() : null,
    }).eq('id', c.id)
    fetchAllCases()
  }

  const deleteCase = async (id: string) => {
    if (!confirm('Supprimer cette analyse définitivement ?')) return
    await supabase.from('investment_cases').delete().eq('id', id)
    fetchAllCases()
  }

  const published = cases.filter(c => c.published)
  const drafts = cases.filter(c => !c.published)

  return (
    <>
      <Head><title>Admin Dashboard — αAlex</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

        {/* Nav */}
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Link href="/" style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none' }}>
                α<span style={{ color: 'var(--ft-red)' }}>Alex</span>
              </Link>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.12em', color: 'var(--accent)' }}>ADMIN</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Link href="/admin/societes" className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>Sociétés</Link>
              <Link href="/admin/nouveau" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>+ Nouvelle analyse</Link>
              <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.78rem' }}>Déconnexion</button>
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 40 }}>
            {[
              { label: 'Total', value: cases.length, color: undefined },
              { label: 'Publiées', value: published.length, color: 'var(--buy)' },
              { label: 'Brouillons', value: drafts.length, color: 'var(--hold)' },
              { label: 'BUY actifs', value: published.filter(c => c.rating === 'BUY' || c.case_companies?.some(cc => cc.rating === 'BUY')).length, color: 'var(--accent)' },
            ].map(stat => (
              <div key={stat.label} style={{ padding: '20px 24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  {stat.label.toUpperCase()}
                </p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: stat.color || 'var(--text-primary)' }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

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
                          {['Titre', 'Sociétés', 'Secteur', 'Rating(s)', 'Date', 'Actions'].map(h => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 500 }}>
                              {h.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((c, i) => {
                          const caseCompanies = c.case_companies ?? []
                          return (
                            <tr
                              key={c.id}
                              style={{ borderBottom: i < group.items.length - 1 ? '1px solid var(--border)' : 'none' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td style={{ padding: '14px 16px', fontSize: '0.86rem', color: 'var(--text-primary)', maxWidth: 280 }}>
                                <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {c.title}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {caseCompanies.slice(0, 3).map(cc => cc.companies && (
                                    <span key={cc.id} className="badge-ticker" style={{ fontSize: '0.65rem' }}>
                                      {cc.companies.ticker}
                                    </span>
                                  ))}
                                  {caseCompanies.length > 3 && (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>+{caseCompanies.length - 3}</span>
                                  )}
                                  {caseCompanies.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: (c as any).sectors?.color || 'var(--text-secondary)' }}>
                                {(c as any).sectors?.name || '—'}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {caseCompanies.filter(cc => cc.rating).slice(0, 3).map(cc => (
                                    <span key={cc.id} className={`badge-rating ${cc.rating}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                                      {cc.rating}
                                    </span>
                                  ))}
                                  {caseCompanies.length === 0 && c.rating && (
                                    <span className={`badge-rating ${c.rating}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
                                      {c.rating}
                                    </span>
                                  )}
                                  {caseCompanies.length === 0 && !c.rating && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {format(new Date(c.updated_at || c.created_at), 'd MMM yy', { locale: fr })}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <Link href={`/admin/editer/${c.id}`} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                                    Éditer
                                  </Link>
                                  <button
                                    onClick={() => togglePublish(c)}
                                    className="btn"
                                    style={{
                                      padding: '4px 10px', fontSize: '0.72rem',
                                      background: c.published ? 'var(--hold-bg)' : 'var(--buy-bg)',
                                      color: c.published ? 'var(--hold)' : 'var(--buy)',
                                      border: `1px solid ${c.published ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
                                    }}
                                  >
                                    {c.published ? 'Dépublier' : 'Publier'}
                                  </button>
                                  <button onClick={() => deleteCase(c.id)} className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.72rem' }}>
                                    ✕
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {cases.length === 0 && (
                <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>AUCUNE ANALYSE</p>
                  <Link href="/admin/nouveau" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
                    + Créer la première analyse
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
