import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { supabase, getAllSectors, getAllCompanies, type Sector, type Company, type Rating } from '../lib/supabase'

// Load editor client-side only (TipTap doesn't support SSR)
const RichEditor = dynamic(() => import('../components/RichEditor'), { ssr: false })

interface Props {
  caseId?: string  // if set → edit mode
}

const RATINGS: Rating[] = ['BUY', 'HOLD', 'SELL', 'WATCH']
const HORIZONS = ['3-6 mois', '6-12 mois', '12-18 mois', '18-24 mois', '2-3 ans', '3-5 ans', 'Long terme']

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function CaseEditor({ caseId }: Props) {
  const router = useRouter()
  const isEdit = !!caseId

  const [sectors, setSectors] = useState<Sector[]>([])
  const [companies, setCompanies] = useState<Company[]>([])

  // Form state
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [rating, setRating] = useState<Rating | ''>('')
  const [horizon, setHorizon] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [content, setContent] = useState<object>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuth()
    loadMetadata()
    if (isEdit) loadCase()
  }, [caseId])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(slugify(title))
    }
  }, [title, slugManual])

  const checkAuth = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) router.push('/admin/login')
  }

  const loadMetadata = async () => {
    const [s, c] = await Promise.all([getAllSectors(), getAllCompanies()])
    setSectors(s)
    setCompanies(c)
  }

  const loadCase = async () => {
    const { data } = await supabase
      .from('investment_cases')
      .select('*')
      .eq('id', caseId)
      .single()
    if (!data) return
    setTitle(data.title)
    setSubtitle(data.subtitle || '')
    setSlug(data.slug)
    setSlugManual(true)
    setExcerpt(data.excerpt || '')
    setRating((data.rating as Rating) || '')
    setHorizon(data.target_horizon || '')
    setCompanyId(data.company_id || '')
    setSectorId(data.sector_id || '')
    setContent(data.content)
  }

  const handleSave = async (publish = false) => {
    if (!title.trim()) { setError('Le titre est obligatoire.'); return }
    if (!slug.trim()) { setError('Le slug est obligatoire.'); return }
    setSaving(true)
    setError('')

    const payload = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      rating: rating || null,
      target_horizon: horizon || null,
      company_id: companyId || null,
      sector_id: sectorId || null,
      content,
      updated_at: new Date().toISOString(),
      ...(publish ? { published: true, published_at: new Date().toISOString() } : {}),
    }

    let result
    if (isEdit) {
      result = await supabase.from('investment_cases').update(payload).eq('id', caseId)
    } else {
      result = await supabase.from('investment_cases').insert({ ...payload, published: publish })
    }

    if (result.error) {
      setError(result.error.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      if (!isEdit && publish) router.push('/admin')
    }
    setSaving(false)
  }

  const selectedCompany = companies.find(c => c.id === companyId)

  return (
    <>
      <Head>
        <title>{isEdit ? 'Éditer' : 'Nouvelle analyse'} — Admin AlphaBrief</title>
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Admin top bar */}
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>
                ← Dashboard
              </Link>
              <span style={{ color: 'var(--text-muted)' }}>›</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {isEdit ? 'Éditer l\'analyse' : 'Nouvelle analyse'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {saved && (
                <span style={{ fontSize: '0.78rem', color: 'var(--buy)', fontFamily: 'var(--font-mono)' }}>
                  ✓ Sauvegardé
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="btn btn-ghost"
                disabled={saving}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                {saving ? '…' : 'Sauvegarder brouillon'}
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="btn btn-primary"
                disabled={saving}
                style={{ padding: '6px 14px', fontSize: '0.78rem' }}
              >
                {saving ? '…' : '▲ Publier'}
              </button>
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>

          {/* Main editor column */}
          <div>
            {error && (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--sell-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: 'var(--sell)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            {/* Title */}
            <div className="form-group">
              <label className="form-label">Titre de l'analyse *</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="ex: NVDA — Le supercycle de l'IA n'est pas terminé"
                style={{ fontSize: '1.05rem', padding: '12px 16px' }}
              />
            </div>

            {/* Subtitle */}
            <div className="form-group">
              <label className="form-label">Sous-titre / accroche</label>
              <input
                type="text"
                className="form-input"
                value={subtitle}
                onChange={e => setSubtitle(e.target.value)}
                placeholder="Résumé en une phrase de la thèse"
              />
            </div>

            {/* Slug */}
            <div className="form-group">
              <label className="form-label">Slug URL *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  value={slug}
                  onChange={e => { setSlug(e.target.value); setSlugManual(true) }}
                  placeholder="nvda-supercycle-ia"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  onClick={() => { setSlugManual(false); setSlug(slugify(title)) }}
                  className="btn btn-ghost"
                  style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '0.78rem' }}
                >
                  Regénérer
                </button>
              </div>
              {slug && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                  /analyse/{slug}
                </p>
              )}
            </div>

            {/* Excerpt */}
            <div className="form-group">
              <label className="form-label">Résumé (affiché sur les cartes)</label>
              <textarea
                className="form-textarea"
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                rows={3}
                placeholder="2-3 phrases résumant la thèse d'investissement…"
              />
            </div>

            {/* Rich editor */}
            <div className="form-group">
              <label className="form-label">Contenu de l'analyse</label>
              <RichEditor content={isEdit ? content : undefined} onChange={setContent} />
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ position: 'sticky', top: 80, height: 'fit-content' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 24, marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 20 }}>
                MÉTADONNÉES
              </p>

              {/* Rating */}
              <div className="form-group">
                <label className="form-label">Recommandation</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setRating('')}
                    style={{
                      padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.72rem',
                      background: rating === '' ? 'var(--bg-elevated)' : 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >—</button>
                  {RATINGS.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRating(r)}
                      className={`badge-rating ${r}`}
                      style={{
                        cursor: 'pointer',
                        opacity: rating === r ? 1 : 0.4,
                        transition: 'opacity 0.15s',
                        padding: '5px 10px',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horizon */}
              <div className="form-group">
                <label className="form-label">Horizon de détention</label>
                <select
                  className="form-select"
                  value={horizon}
                  onChange={e => setHorizon(e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {HORIZONS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Company */}
              <div className="form-group">
                <label className="form-label">Société / Ticker</label>
                <select
                  className="form-select"
                  value={companyId}
                  onChange={e => {
                    setCompanyId(e.target.value)
                    // Auto-fill sector from company
                    const comp = companies.find(c => c.id === e.target.value)
                    if (comp?.sector_id) setSectorId(comp.sector_id)
                  }}
                >
                  <option value="">— Aucune société —</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.ticker} — {c.name}</option>
                  ))}
                </select>
                <Link href="/admin/societes" style={{ fontSize: '0.72rem', color: 'var(--accent)', display: 'block', marginTop: 6, textDecoration: 'none' }}>
                  + Ajouter une société
                </Link>
              </div>

              {/* Sector */}
              <div className="form-group">
                <label className="form-label">Secteur</label>
                <select
                  className="form-select"
                  value={sectorId}
                  onChange={e => setSectorId(e.target.value)}
                >
                  <option value="">— Aucun secteur —</option>
                  {sectors.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview link (edit mode only) */}
            {isEdit && slug && (
              <a
                href={`/analyse/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem' }}
              >
                ↗ Voir la page publique
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
