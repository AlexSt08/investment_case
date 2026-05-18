import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase, getAllSectors, type Sector, type Company } from '../../lib/supabase'

export default function AdminSocietes() {
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)

  // New company form
  const [ticker, setTicker] = useState('')
  const [name, setName] = useState('')
  const [exchange, setExchange] = useState('NASDAQ')
  const [description, setDescription] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    checkAuth()
    loadData()
  }, [])

  const checkAuth = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) router.push('/admin/login')
  }

  const loadData = async () => {
    const [{ data: comps }, secs] = await Promise.all([
      supabase.from('companies').select('*, sectors(id, slug, name, color)').order('ticker'),
      getAllSectors(),
    ])
    setCompanies(comps ?? [])
    setSectors(secs)
    setLoading(false)
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker || !name) return
    setSaving(true)
    const { error } = await supabase.from('companies').insert({
      ticker: ticker.trim().toUpperCase(),
      name: name.trim(),
      exchange,
      description: description.trim() || null,
      sector_id: sectorId || null,
    })
    if (error) {
      setMsg('Erreur : ' + (error.message.includes('unique') ? 'ce ticker existe déjà.' : error.message))
    } else {
      setTicker(''); setName(''); setDescription(''); setSectorId(''); setExchange('NASDAQ')
      setMsg('✓ Société ajoutée.')
      loadData()
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette société ? Les analyses liées ne seront pas supprimées.')) return
    await supabase.from('companies').delete().eq('id', id)
    loadData()
  }

  return (
    <>
      <Head><title>Sociétés — Admin AlphaBrief</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>← Dashboard</Link>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
            <span style={{ fontSize: '0.85rem' }}>Sociétés & Tickers</span>
          </div>
        </nav>

        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>
          {/* Add form */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 28, marginBottom: 40 }}>
            <p className="section-label" style={{ marginBottom: 20 }}>Ajouter une société</p>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 140px', gap: 12, marginBottom: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Ticker *</label>
                  <input
                    className="form-input"
                    value={ticker}
                    onChange={e => setTicker(e.target.value.toUpperCase())}
                    placeholder="NVDA"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nom *</label>
                  <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="NVIDIA Corporation" required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Bourse</label>
                  <select className="form-select" value={exchange} onChange={e => setExchange(e.target.value)}>
                    {['NASDAQ', 'NYSE', 'AMEX', 'OTC'].map(ex => <option key={ex}>{ex}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description courte</label>
                  <input className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Concepteur de GPU pour IA et gaming…" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Secteur</label>
                  <select className="form-select" value={sectorId} onChange={e => setSectorId(e.target.value)}>
                    <option value="">— Secteur —</option>
                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '8px 20px' }}>
                  {saving ? '…' : '+ Ajouter'}
                </button>
                {msg && <span style={{ fontSize: '0.82rem', color: msg.startsWith('✓') ? 'var(--buy)' : 'var(--sell)' }}>{msg}</span>}
              </div>
            </form>
          </div>

          {/* Companies list */}
          <p className="section-label">{companies.length} société{companies.length !== 1 ? 's' : ''} enregistrée{companies.length !== 1 ? 's' : ''}</p>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>Chargement…</p>
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Ticker', 'Société', 'Bourse', 'Secteur', ''].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {h.toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c, i) => (
                    <tr key={c.id}
                      style={{ borderBottom: i < companies.length - 1 ? '1px solid var(--border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge-ticker">{c.ticker}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{c.exchange}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: (c as any).sectors?.color || 'var(--text-secondary)' }}>
                        {(c as any).sectors?.name || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => handleDelete(c.id)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '2px 8px' }}
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
