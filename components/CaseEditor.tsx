import { useEffect, useState, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  supabase, getAllSectors, getAllCompanies, getCaseByIdAdmin, syncCaseCompanies,
  type Sector, type Company, type Rating, type CaseCompany, type Tag
} from '../lib/supabase'

interface Props { caseId?: string }

const RATINGS: Rating[] = ['BUY', 'HOLD', 'SELL', 'WATCH']
const HORIZONS = ['3-6 mois', '6-12 mois', '12-18 mois', '18-24 mois', '2-3 ans', '3-5 ans', 'Long terme']
const CHART_TYPES = ['Ligne', 'Barres']

function slugify(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

function tiptapToHtml(doc: any): string {
  if (typeof doc === 'string') {
    const t = doc.trim()
    if (t.startsWith('{') || t.startsWith('[')) {
      try { return tiptapToHtml(JSON.parse(t)) } catch { return doc }
    }
    return doc
  }
  if (typeof doc === 'object' && doc !== null) {
    if (doc.type === 'doc' && doc.content) return doc.content.map(nodeToHtml).join('')
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
    default: return inner()
  }
}

// ── Toolbar insert helper ─────────────────────────────────

function insertAtCursor(ta: HTMLTextAreaElement, before: string, after = '') {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const selected = ta.value.substring(start, end)
  const newVal = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end)
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(ta, newVal)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
  ta.focus()
  ta.selectionStart = start + before.length
  ta.selectionEnd = start + before.length + selected.length
}

// ── Chart Modal ───────────────────────────────────────────

function ChartModal({ onInsert, onClose }: { onInsert: (html: string) => void; onClose: () => void }) {
  const [chartType, setChartType] = useState('Ligne')
  const [title, setTitle] = useState('')
  const [labels, setLabels] = useState('2020,2021,2022,2023,2024E,2025E')
  const [s1Label, setS1Label] = useState('Revenus ($M)')
  const [s1Values, setS1Values] = useState('1200,1450,1680,2100,2600,3200')
  const [s2Label, setS2Label] = useState('')
  const [s2Values, setS2Values] = useState('')
  const [color1, setColor1] = useState('#c8a96e')
  const [color2, setColor2] = useState('#6366f1')

  const generate = () => {
    const id = `chart_${Date.now()}`
    const type = chartType === 'Ligne' ? 'line' : 'bar'
    const datasets: any[] = [{
      label: s1Label,
      data: s1Values.split(',').map(v => parseFloat(v.trim())),
      borderColor: color1,
      backgroundColor: type === 'line' ? color1 + '25' : color1 + '99',
      tension: 0.3, fill: type === 'line',
    }]
    if (s2Label && s2Values) datasets.push({
      label: s2Label,
      data: s2Values.split(',').map(v => parseFloat(v.trim())),
      borderColor: color2,
      backgroundColor: type === 'line' ? color2 + '25' : color2 + '99',
      tension: 0.3, fill: false,
    })
    const cfg = JSON.stringify({
      type,
      data: { labels: labels.split(',').map((l: string) => l.trim()), datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#8a8a9a' } },
          title: title ? { display: true, text: title, color: '#f0ede8', font: { size: 14 } } : undefined,
        },
        scales: {
          x: { ticks: { color: '#52525e' }, grid: { color: '#ffffff0a' } },
          y: { ticks: { color: '#52525e' }, grid: { color: '#ffffff0a' } },
        },
      },
    })
    const html = `<div class="chart-container" style="position:relative;background:#0f0f18;border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:20px;margin:28px 0;"><canvas id="${id}" style="max-height:320px;"></canvas><script>(function(){var c=document.getElementById('${id}');if(!c||c._done)return;c._done=true;function init(){new Chart(c,${cfg});}if(typeof Chart!=='undefined'){init();}else{var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js';s.onload=init;document.head.appendChild(s);}})();<\/script></div>`
    onInsert(html)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: 28, width: 500, maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>INSÉRER UN GRAPHIQUE</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        </div>
        <div className="form-group">
          <label className="form-label">Type</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {CHART_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setChartType(t)} style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${chartType === t ? 'var(--accent-border)' : 'var(--border)'}`, background: chartType === t ? 'var(--accent-dim)' : 'transparent', color: chartType === t ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>{t}</button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Titre</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Revenus annuels ($M)" />
        </div>
        <div className="form-group">
          <label className="form-label">Étiquettes (séparées par virgules)</label>
          <input className="form-input" value={labels} onChange={e => setLabels(e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px', gap: 8, marginBottom: 8 }}>
          <div><label className="form-label">Série 1 — Nom</label><input className="form-input" value={s1Label} onChange={e => setS1Label(e.target.value)} /></div>
          <div><label className="form-label">Color</label><input type="color" value={color1} onChange={e => setColor1(e.target.value)} style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 6, background: 'none', cursor: 'pointer' }} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Série 1 — Valeurs</label>
          <input className="form-input" value={s1Values} onChange={e => setS1Values(e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px', gap: 8, marginBottom: 8 }}>
          <div><label className="form-label">Série 2 — Nom (optionnel)</label><input className="form-input" value={s2Label} onChange={e => setS2Label(e.target.value)} placeholder="Marge EBITDA (%)" /></div>
          <div><label className="form-label">Color</label><input type="color" value={color2} onChange={e => setColor2(e.target.value)} style={{ width: '100%', height: 38, border: '1px solid var(--border)', borderRadius: 6, background: 'none', cursor: 'pointer' }} /></div>
        </div>
        <div className="form-group">
          <label className="form-label">Série 2 — Valeurs</label>
          <input className="form-input" value={s2Values} onChange={e => setS2Values(e.target.value)} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }} placeholder="32,35,38,41,44,47" />
        </div>
        <button type="button" onClick={generate} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>⊞ Insérer le graphique</button>
      </div>
    </div>
  )
}

// ── Company row ───────────────────────────────────────────

interface CompanyEntry { company_id: string; rating: Rating | ''; target_price: string; upside: string }

function CompanyRow({ entry, index, companies, onChange, onRemove }: {
  entry: CompanyEntry; index: number; companies: Company[]
  onChange: (i: number, f: keyof CompanyEntry, v: string) => void
  onRemove: (i: number) => void
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 80px 70px 32px', gap: 6, marginBottom: 8, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}>
      <select className="form-select" value={entry.company_id} onChange={e => onChange(index, 'company_id', e.target.value)} style={{ fontSize: '0.8rem' }}>
        <option value="">— Société —</option>
        {companies.map(c => <option key={c.id} value={c.id}>{c.ticker} — {c.name}</option>)}
      </select>
      <select className="form-select" value={entry.rating} onChange={e => onChange(index, 'rating', e.target.value)} style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)' }}>
        <option value="">—</option>
        {RATINGS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <input className="form-input" placeholder="$950" value={entry.target_price} onChange={e => onChange(index, 'target_price', e.target.value)} style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)' }} />
      <input className="form-input" placeholder="+34%" value={entry.upside} onChange={e => onChange(index, 'upside', e.target.value)} style={{ fontSize: '0.76rem', fontFamily: 'var(--font-mono)' }} />
      <button type="button" onClick={() => onRemove(index)} style={{ background: 'var(--sell-bg)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--sell)', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────

export default function CaseEditor({ caseId }: Props) {
  const router = useRouter()
  const isEdit = !!caseId
  const taRef = useRef<HTMLTextAreaElement>(null)

  const [sectors, setSectors] = useState<Sector[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [showChart, setShowChart] = useState(false)
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')

  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [excerpt, setExcerpt] = useState('')
  const [rating, setRating] = useState<Rating | ''>('')
  const [horizon, setHorizon] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [html, setHtml] = useState('')
  const [companyEntries, setCompanyEntries] = useState<CompanyEntry[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { checkAuth(); loadMetadata(); if (isEdit) loadCase(); else setLoaded(true) }, [caseId])
  useEffect(() => { if (!slugManual && title) setSlug(slugify(title)) }, [title, slugManual])

  const checkAuth = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) router.push('/admin/login')
  }

  const loadMetadata = async () => {
    const [s, c] = await Promise.all([getAllSectors(), getAllCompanies()])
    setSectors(s); setCompanies(c)
    const { data: tags } = await supabase.from('tags').select('*').order('name')
    setAllTags(tags ?? [])
  }

  const loadCase = async () => {
    if (!caseId) return
    const data = await getCaseByIdAdmin(caseId)
    if (!data) return
    setTitle(data.title)
    setSubtitle(data.subtitle ?? '')
    setSlug(data.slug)
    setSlugManual(true)
    setExcerpt(data.excerpt ?? '')
    setRating((data.rating as Rating) ?? '')
    setHorizon(data.target_horizon ?? '')
    setSectorId(data.sector_id ?? '')
    // Convert TipTap JSON or use HTML directly
    const raw = data.content as any
    setHtml(tiptapToHtml(raw))
    if (data.case_companies?.length) {
      setCompanyEntries(data.case_companies.map((cc: CaseCompany) => ({
        company_id: cc.company_id, rating: cc.rating ?? '',
        target_price: cc.target_price ?? '', upside: cc.upside ?? '',
      })))
    }
    const { data: ct } = await supabase.from('investment_case_tags').select('tag_id').eq('investment_case_id', caseId)
    setSelectedTags(ct?.map((t: any) => t.tag_id) ?? [])
    setLoaded(true)
  }

  const tb = (open: string, close = '') => { if (taRef.current) insertAtCursor(taRef.current, open, close) }

  const addCompanyRow = () => setCompanyEntries(p => [...p, { company_id: '', rating: '', target_price: '', upside: '' }])
  const updateEntry = (i: number, f: keyof CompanyEntry, v: string) => setCompanyEntries(p => p.map((e, idx) => idx === i ? { ...e, [f]: v } : e))
  const removeEntry = (i: number) => setCompanyEntries(p => p.filter((_, idx) => idx !== i))
  const toggleTag = (id: string) => setSelectedTags(p => p.includes(id) ? p.filter(t => t !== id) : [...p, id])

  const createTag = async () => {
    if (!newTagName.trim()) return
    const { data } = await supabase.from('tags').insert({ name: newTagName.trim(), slug: slugify(newTagName) }).select().single()
    if (data) { setAllTags(p => [...p, data]); setSelectedTags(p => [...p, data.id]); setNewTagName('') }
  }

  const handleSave = async (publish = false) => {
    if (!title.trim()) { setError('Le titre est obligatoire.'); return }
    setSaving(true); setError('')
    const payload = {
      title: title.trim(), subtitle: subtitle.trim() || null, slug: slug.trim(),
      excerpt: excerpt.trim() || null, rating: rating || null,
      target_horizon: horizon || null, sector_id: sectorId || null,
      content: html, updated_at: new Date().toISOString(),
      ...(publish ? { published: true, published_at: new Date().toISOString() } : {}),
    }
    let savedId = caseId
    if (isEdit) {
      const { error: err } = await supabase.from('investment_cases').update(payload).eq('id', caseId)
      if (err) { setError(err.message); setSaving(false); return }
    } else {
      const { data, error: err } = await supabase.from('investment_cases').insert({ ...payload, published: publish }).select('id').single()
      if (err) { setError(err.message); setSaving(false); return }
      savedId = data.id
    }
    await syncCaseCompanies(savedId!, companyEntries.filter(e => e.company_id).map(e => ({
      company_id: e.company_id, rating: (e.rating as Rating) || undefined,
      target_price: e.target_price || undefined, upside: e.upside || undefined,
    })))
    await supabase.from('investment_case_tags').delete().eq('investment_case_id', savedId)
    if (selectedTags.length > 0) await supabase.from('investment_case_tags').insert(selectedTags.map(tag_id => ({ investment_case_id: savedId, tag_id })))
    setSaved(true); setTimeout(() => setSaved(false), 2500)
    if (!isEdit && publish) router.push('/admin')
    setSaving(false)
  }

  if (!loaded) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>Chargement…</p>
    </div>
  )

  return (
    <>
      <Head><title>{isEdit ? 'Éditer' : 'Nouvelle analyse'} — Admin AlphaBrief</title></Head>
      {showChart && <ChartModal onInsert={h => setHtml(prev => prev + h)} onClose={() => setShowChart(false)} />}

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <nav style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link href="/admin" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.8rem' }}>← Dashboard</Link>
              <span style={{ color: 'var(--text-muted)' }}>›</span>
              <span style={{ fontSize: '0.85rem' }}>{isEdit ? 'Éditer' : 'Nouvelle analyse'}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {saved && <span style={{ fontSize: '0.78rem', color: 'var(--buy)', fontFamily: 'var(--font-mono)' }}>✓ Sauvegardé</span>}
              <button type="button" onClick={() => handleSave(false)} className="btn btn-ghost" disabled={saving} style={{ padding: '6px 14px', fontSize: '0.78rem' }}>{saving ? '…' : 'Brouillon'}</button>
              <button type="button" onClick={() => handleSave(true)} className="btn btn-primary" disabled={saving} style={{ padding: '6px 14px', fontSize: '0.78rem' }}>{saving ? '…' : '▲ Publier'}</button>
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
          {/* Main */}
          <div>
            {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--sell-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: 'var(--sell)', fontSize: '0.85rem' }}>{error}</div>}

            <div className="form-group">
              <label className="form-label">Titre *</label>
              <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: NVDA — Le supercycle de l'IA n'est pas terminé" style={{ fontSize: '1.05rem', padding: '12px 16px' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Sous-titre</label>
              <input type="text" className="form-input" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Résumé en une phrase de la thèse" />
            </div>
            <div className="form-group">
              <label className="form-label">Slug URL *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" className="form-input" value={slug} onChange={e => { setSlug(e.target.value); setSlugManual(true) }} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }} />
                <button type="button" onClick={() => { setSlugManual(false); setSlug(slugify(title)) }} className="btn btn-ghost" style={{ whiteSpace: 'nowrap', padding: '8px 14px', fontSize: '0.78rem' }}>Regénérer</button>
              </div>
              {slug && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>/analyse/{slug}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Résumé (cartes)</label>
              <textarea className="form-textarea" value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={3} placeholder="2-3 phrases résumant la thèse…" />
            </div>

            {/* Editor */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Contenu HTML</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={() => setShowChart(true)} className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: '0.72rem' }}>📈 Graphique</button>
                  <button type="button" onClick={() => setTab('edit')} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${tab === 'edit' ? 'var(--accent-border)' : 'var(--border)'}`, background: tab === 'edit' ? 'var(--accent-dim)' : 'transparent', color: tab === 'edit' ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>HTML</button>
                  <button type="button" onClick={() => setTab('preview')} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${tab === 'preview' ? 'var(--accent-border)' : 'var(--border)'}`, background: tab === 'preview' ? 'var(--accent-dim)' : 'transparent', color: tab === 'preview' ? 'var(--accent)' : 'var(--text-muted)', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Aperçu</button>
                </div>
              </div>

              {tab === 'edit' && (
                <>
                  <div className="admin-toolbar" style={{ borderRadius: '6px 6px 0 0' }}>
                    <button type="button" onClick={() => tb('<h2>', '</h2>')}>H2</button>
                    <button type="button" onClick={() => tb('<h3>', '</h3>')}>H3</button>
                    <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
                    <button type="button" onClick={() => tb('<strong>', '</strong>')}><strong>B</strong></button>
                    <button type="button" onClick={() => tb('<em>', '</em>')}><em>I</em></button>
                    <button type="button" onClick={() => tb('<u>', '</u>')}><u>U</u></button>
                    <button type="button" onClick={() => tb('<mark>', '</mark>')}>◈</button>
                    <button type="button" onClick={() => { const url = prompt('URL :'); if (url) tb(`<a href="${url}">`, '</a>') }}>🔗</button>
                    <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
                    <button type="button" onClick={() => tb('<p>', '</p>')}>¶</button>
                    <button type="button" onClick={() => tb('<ul>\n  <li>', '</li>\n</ul>')}>• List</button>
                    <button type="button" onClick={() => tb('<ol>\n  <li>', '</li>\n</ol>')}>1. List</button>
                    <button type="button" onClick={() => tb('<blockquote>', '</blockquote>')}>❝</button>
                    <button type="button" onClick={() => tb('<hr>', '')}>—</button>
                    <button type="button" onClick={() => tb('<table>\n  <thead>\n    <tr><th>Indicateur</th><th>2023A</th><th>2024E</th><th>2025E</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>Revenus ($M)</td><td></td><td></td><td></td></tr>\n    <tr><td>EBITDA ($M)</td><td></td><td></td><td></td></tr>\n    <tr><td>Marge EBITDA</td><td></td><td></td><td></td></tr>\n    <tr><td>EPS ($)</td><td></td><td></td><td></td></tr>\n    <tr><td>P/E</td><td></td><td></td><td></td></tr>\n  </tbody>\n</table>', '')}>⊞ Table</button>
                  </div>
                  <textarea
                    ref={taRef}
                    value={html}
                    onChange={e => setHtml(e.target.value)}
                    style={{
                      width: '100%', minHeight: 520, padding: '16px',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderTop: 'none', borderRadius: '0 0 6px 6px',
                      color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                      fontSize: '0.82rem', lineHeight: 1.7, resize: 'vertical', outline: 'none',
                    }}
                    placeholder={`<h2>Thèse d'investissement</h2>\n<p>...</p>\n\n<h2>Catalyseurs</h2>\n<ul>\n  <li>...</li>\n</ul>\n\n<h2>Risques</h2>\n<p>...</p>`}
                  />
                </>
              )}
              {tab === 'preview' && (
                <div className="prose" dangerouslySetInnerHTML={{ __html: html || '<p style="color:var(--text-muted)">Aucun contenu.</p>' }}
                  style={{ minHeight: 520, padding: '24px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, maxWidth: '100%' }} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Sociétés */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 4 }}>SOCIÉTÉS COUVERTES</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 14 }}>Ticker · Rating · Objectif · Upside</p>
              {companyEntries.map((e, i) => <CompanyRow key={i} entry={e} index={i} companies={companies} onChange={updateEntry} onRemove={removeEntry} />)}
              <button type="button" onClick={addCompanyRow} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: '0.78rem', padding: '7px' }}>+ Ajouter une société</button>
              <Link href="/admin/societes" style={{ display: 'block', marginTop: 8, fontSize: '0.7rem', color: 'var(--accent)', textDecoration: 'none', textAlign: 'center' }}>Gérer l'univers →</Link>
            </div>

            {/* Métadonnées */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 16 }}>MÉTADONNÉES</p>
              <div className="form-group">
                <label className="form-label">Rating global</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setRating('')} style={{ padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.7rem', background: rating === '' ? 'var(--bg-elevated)' : 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>—</button>
                  {RATINGS.map(r => <button key={r} type="button" onClick={() => setRating(r)} className={`badge-rating ${r}`} style={{ cursor: 'pointer', opacity: rating === r ? 1 : 0.35, padding: '4px 10px', fontSize: '0.68rem' }}>{r}</button>)}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Horizon</label>
                <select className="form-select" value={horizon} onChange={e => setHorizon(e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {HORIZONS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Secteur</label>
                <select className="form-select" value={sectorId} onChange={e => setSectorId(e.target.value)}>
                  <option value="">— Aucun —</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 14 }}>TAGS THÉMATIQUES</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {allTags.map(tag => (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)} style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', cursor: 'pointer',
                    background: selectedTags.includes(tag.id) ? 'var(--accent-dim)' : 'transparent',
                    border: `1px solid ${selectedTags.includes(tag.id) ? 'var(--accent-border)' : 'var(--border)'}`,
                    color: selectedTags.includes(tag.id) ? 'var(--accent)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}>{tag.name}</button>
                ))}
                {allTags.length === 0 && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Créez votre premier tag ci-dessous.</p>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input className="form-input" value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Nouveau tag…" style={{ fontSize: '0.8rem' }} onKeyDown={e => e.key === 'Enter' && createTag()} />
                <button type="button" onClick={createTag} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>+ Créer</button>
              </div>
            </div>

            {isEdit && slug && (
              <a href={`/analyse/${slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ justifyContent: 'center', fontSize: '0.78rem' }}>↗ Page publique</a>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
