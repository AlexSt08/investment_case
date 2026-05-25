import { useState, useCallback, useEffect, useRef } from 'react'
import type { FinancialsResponse } from '../../pages/api/financials/[ticker]'
import type { TickerSuggestion } from '../../pages/api/tickers'

interface Params {
  revenueTTM: number; nrrInit: number; grossMargin: number; wacc: number
  horizon: number; nrrTerminal: number; fcfMargin: number; tvMultiple: number
  npvLogos: number; sbc: number; netCash: number; mktCap: number
}
interface CohortRow {
  year: number; nrr: number; revenue: number; grossProfit: number
  discountFactor: number; pvGP: number; ratio: number
}
interface Results {
  rows: CohortRow[]; sumPV: number; pvTV: number; tvGross: number
  revenueY10: number; evCohort: number; equityImplied: number; upside: number
}

function compute(p: Params): Results {
  const rows: CohortRow[] = []
  let curRev = p.revenueTTM, sumPV = 0
  for (let n = 1; n <= p.horizon; n++) {
    const progress = p.horizon > 1 ? (n - 1) / (p.horizon - 1) : 0
    const nrr = Math.max(p.nrrTerminal, p.nrrInit - (p.nrrInit - p.nrrTerminal) * progress)
    curRev = curRev * nrr
    const gp = curRev * p.grossMargin
    const df = Math.pow(1 + p.wacc, n)
    const pvGP = gp / df
    sumPV += pvGP
    rows.push({ year: n, nrr, revenue: curRev, grossProfit: gp, discountFactor: df, pvGP, ratio: nrr / (1 + p.wacc) })
  }
  const revenueY10 = curRev
  const tvGross = revenueY10 * p.fcfMargin * p.tvMultiple
  const pvTV = tvGross / Math.pow(1 + p.wacc, p.horizon)
  const evCohort = sumPV + pvTV + p.npvLogos
  const equityImplied = evCohort - p.sbc + p.netCash
  return { rows, sumPV, pvTV, tvGross, revenueY10, evCohort, equityImplied, upside: equityImplied / p.mktCap - 1 }
}

// ── NRR Chart ─────────────────────────────────────────────────────────────
function NRRChart({ rows, wacc, nrrInit }: { rows: CohortRow[]; wacc: number; nrrInit: number; nrrTerminal: number }) {
  if (rows.length === 0) return null
  const VW = 400, VH = 110, PL = 38, PR = 14, PT = 12, PB = 28
  const plotW = VW - PL - PR, plotH = VH - PT - PB
  const yMin = 100, yMax = Math.ceil(nrrInit * 100) + 4, yRange = yMax - yMin
  const waccThresh = (1 + wacc) * 100
  const toX = (i: number) => PL + (i / (rows.length - 1)) * plotW
  const toY = (pct: number) => PT + (1 - (pct - yMin) / yRange) * plotH
  const nrrPcts = rows.map(r => r.nrr * 100)
  const linePts = nrrPcts.map((v, i) => `${toX(i)},${toY(v)}`).join(' ')
  const threshY = toY(waccThresh)
  const areaAbovePts = [`${toX(0)},${threshY}`, ...nrrPcts.map((v, i) => `${toX(i)},${Math.min(toY(v), threshY)}`), `${toX(rows.length - 1)},${threshY}`].join(' ')
  const hasBelowZone = nrrPcts.some(v => v < waccThresh)
  const areaBelowPts = hasBelowZone ? [`${toX(0)},${threshY}`, ...nrrPcts.map((v, i) => `${toX(i)},${Math.max(toY(v), threshY)}`), `${toX(rows.length - 1)},${threshY}`].join(' ') : ''
  const yTicks = [100, Math.round((yMin + yMax) / 2), yMax].filter((v, i, a) => a.indexOf(v) === i)
  const midIdx = Math.floor((rows.length - 1) / 2)
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      {yTicks.map(v => <line key={v} x1={PL} x2={VW - PR} y1={toY(v)} y2={toY(v)} stroke="#E0D8CC" strokeWidth={0.5} strokeDasharray={v === 100 ? '0' : '2,3'} />)}
      <polygon points={areaAbovePts} fill="#007a3d" fillOpacity={0.07} />
      {hasBelowZone && areaBelowPts && <polygon points={areaBelowPts} fill="#cc0000" fillOpacity={0.07} />}
      <line x1={PL} x2={VW - PR} y1={threshY} y2={threshY} stroke="#b06000" strokeWidth={1} strokeDasharray="4,3" />
      <text x={VW - PR + 2} y={threshY + 3.5} fontSize={7} fill="#b06000" fontFamily="'Courier New', monospace">{waccThresh.toFixed(0)}%</text>
      <text x={PL + 3} y={threshY - 3} fontSize={6.5} fill="#b06000" fontFamily="'Courier New', monospace" opacity={0.8}>NRR = WACC</text>
      <polyline points={linePts} fill="none" stroke="#0d7680" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {[0, midIdx, rows.length - 1].map(i => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(nrrPcts[i])} r={3} fill="#0d7680" />
          <text x={toX(i)} y={toY(nrrPcts[i]) - 6} textAnchor="middle" fontSize={7.5} fontWeight="600" fill="#0d7680" fontFamily="'Courier New', monospace">{nrrPcts[i].toFixed(0)}%</text>
        </g>
      ))}
      {yTicks.map(v => <text key={v} x={PL - 3} y={toY(v) + 3.5} textAnchor="end" fontSize={7} fill={v === 100 ? '#aaa' : '#888'} fontFamily="'Courier New', monospace">{v}%</text>)}
      {[0, midIdx, rows.length - 1].map(i => <text key={i} x={toX(i)} y={VH - 4} textAnchor="middle" fontSize={7} fill="#999" fontFamily="'Courier New', monospace">{i === 0 ? 'Y1' : i === rows.length - 1 ? `Y${rows.length}` : `Y${i + 1}`}</text>)}
      <line x1={PL} x2={PL} y1={PT} y2={VH - PB} stroke="#E0D8CC" strokeWidth={0.5} />
    </svg>
  )
}

// ── SliderRow ─────────────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step, format, onChange, highlight = false, showZeroMark = false, warn = false }: {
  label: string; value: number; min: number; max: number; step: number
  format: (v: number) => string; onChange: (v: number) => void
  highlight?: boolean; showZeroMark?: boolean; warn?: boolean
}) {
  const zeroPos   = min < 0 && max > 0 ? ((0 - min) / (max - min)) * 100 : null
  const isNegative = showZeroMark && value < 0
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', background: highlight ? 'rgba(191,78,20,0.04)' : 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, minWidth: 60, textAlign: 'right' as const, color: highlight ? '#BF4E14' : isNegative ? '#cc0000' : warn ? '#b06000' : 'var(--text-primary)' }}>
          {format(value)}
          {isNegative && <span style={{ fontSize: '0.6rem', marginLeft: 4, opacity: 0.7, fontWeight: 400 }}>dette</span>}
          {warn && !isNegative && <span style={{ fontSize: '0.6rem', marginLeft: 4, opacity: 0.8, fontWeight: 400 }}>⚠ manuel</span>}
        </span>
      </div>
      <div style={{ position: 'relative' as const }}>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: isNegative ? '#cc0000' : warn ? '#b06000' : highlight ? '#BF4E14' : '#cc0000' }} />
        {zeroPos !== null && (
          <div style={{ position: 'absolute' as const, left: `calc(${zeroPos}% - 0.5px)`, top: '50%', transform: 'translateY(-50%)', width: 1, height: 10, background: isNegative ? '#cc000060' : '#0000001a', pointerEvents: 'none' as const }} />
        )}
        {zeroPos !== null && (
          <div style={{ position: 'absolute' as const, left: `${zeroPos}%`, top: '100%', transform: 'translateX(-50%)', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: isNegative ? '#cc000080' : '#00000030', marginTop: 1, pointerEvents: 'none' as const }}>0</div>
        )}
      </div>
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, highlight = false, positive }: {
  label: string; value: string; sub?: string; highlight?: boolean; positive?: boolean
}) {
  return (
    <div style={{ padding: '14px 16px', background: highlight ? 'var(--bg-elevated)' : 'var(--bg-card)', border: `1px solid ${highlight ? 'var(--border-strong)' : 'var(--border)'}`, borderRadius: 4, borderTop: highlight ? '3px solid var(--ft-red)' : '1px solid var(--border)' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: highlight ? '1.6rem' : '1.3rem', fontWeight: 700, color: positive === true ? '#007a3d' : positive === false ? '#cc0000' : 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Cache Badge ───────────────────────────────────────────────────────────
function CacheBadge({ status, label, quality }: { status: string; label: string; quality?: string }) {
  const cfg: Record<string, { bg: string; color: string; icon: string }> = {
    static:     { bg: 'rgba(0,122,61,0.08)',   color: '#007a3d', icon: '✓' },
    fresh:      { bg: 'rgba(0,122,61,0.08)',   color: '#007a3d', icon: '✓' },
    window_24h: { bg: 'rgba(176,96,0,0.08)',   color: '#b06000', icon: '◉' },
    cache:      { bg: 'rgba(13,118,128,0.08)', color: '#0d7680', icon: '⟳' },
    fmp:        { bg: 'rgba(15,71,97,0.08)',   color: '#0F4761', icon: '↓' },
  }
  const c = cfg[status] ?? cfg['cache']
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, padding: '5px 8px', background: c.bg, borderRadius: 2 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: c.color, flexShrink: 0 }}>{c.icon}</span>
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: c.color, lineHeight: 1.4 }}>
        {label}
        {quality === 'estimated' && <span style={{ marginLeft: 4, opacity: 0.7 }}>(date estimée)</span>}
      </span>
    </div>
  )
}

// ── DataAlerts ────────────────────────────────────────────────────────────
interface AlertsProps {
  ticker:         string
  notInCache:     boolean
  data:           FinancialsResponse | null
  nrrWasNull:     boolean
  fetchedAt?:     string
}

function DataAlerts({ ticker, notInCache, data, nrrWasNull, fetchedAt }: AlertsProps) {
  const [copied, setCopied] = useState(false)

  const copyCmd = () => {
    navigator.clipboard.writeText(`Fonda Cohorte ${ticker}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const alerts: { level: 'error' | 'warn' | 'info'; msg: string }[] = []

  // Niveau 2 — champs manquants (seulement si le ticker est dans le cache)
  if (!notInCache && data) {
    if (data.nrr === null || nrrWasNull)
      alerts.push({ level: 'warn', msg: 'NRR — non disponible via API, à renseigner manuellement' })
    if (data.sbc === 0)
      alerts.push({ level: 'warn', msg: 'SBC à 0 — vérifier si normal pour cette société' })
    if (data.netCash === 0)
      alerts.push({ level: 'warn', msg: 'Net Cash à 0 — vérifier si dette nette' })
    if (data.mktCap === 0)
      alerts.push({ level: 'warn', msg: 'Market Cap absente — données non initialisées' })
    if (data.revenueTTM === 0)
      alerts.push({ level: 'error', msg: 'Revenue TTM absent — données non initialisées' })
  }

  // Niveau 3 — données périmées (>180j)
  if (!notInCache && fetchedAt) {
    const ageDays = (Date.now() - new Date(fetchedAt).getTime()) / (1000 * 60 * 60 * 24)
    if (ageDays > 180)
      alerts.push({ level: 'info', msg: `Dernière mise à jour il y a ${Math.round(ageDays / 30)} mois — pensez à rafraîchir` })
  }

  if (!notInCache && alerts.length === 0) return null

  const fondaCmd = `Fonda Cohorte ${ticker}`

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' as const, gap: 6 }}>

      {/* Niveau 1 — ticker absent */}
      {notInCache && (
        <div style={{ padding: '10px 12px', background: 'rgba(191,78,20,0.07)', border: '1px solid rgba(191,78,20,0.25)', borderLeft: '3px solid #BF4E14', borderRadius: 2 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 600, color: '#BF4E14', marginBottom: 6 }}>
            ⚠ {ticker} absent de la base de données
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>
            Initialisez les données en tapant la commande suivante dans Claude :
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.72rem', background: 'var(--bg-elevated)', padding: '4px 8px', borderRadius: 2, color: '#BF4E14', letterSpacing: '0.04em' }}>
              {fondaCmd}
            </code>
            <button
              onClick={copyCmd}
              style={{ flexShrink: 0, padding: '4px 10px', fontFamily: 'var(--font-sans)', fontSize: '0.65rem', background: copied ? '#007a3d' : '#BF4E14', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', transition: 'background 0.2s' }}
            >
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          </div>
        </div>
      )}

      {/* Niveaux 2 & 3 — champs manquants / données périmées */}
      {alerts.length > 0 && (
        <div style={{
          padding: '8px 12px',
          background: alerts.some(a => a.level === 'error') ? 'rgba(204,0,0,0.05)' : alerts.some(a => a.level === 'warn') ? 'rgba(176,96,0,0.06)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${alerts.some(a => a.level === 'error') ? 'rgba(204,0,0,0.2)' : alerts.some(a => a.level === 'warn') ? 'rgba(176,96,0,0.2)' : 'var(--border)'}`,
          borderRadius: 2,
        }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 600, color: alerts.some(a => a.level === 'error') ? '#cc0000' : '#b06000', marginBottom: 5 }}>
            Données incomplètes détectées
          </div>
          {alerts.map((a, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-sans)', fontSize: '0.66rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: 'flex', gap: 5 }}>
              <span style={{ color: a.level === 'error' ? '#cc0000' : a.level === 'warn' ? '#b06000' : '#888', flexShrink: 0 }}>
                {a.level === 'error' ? '✗' : a.level === 'warn' ? '⚠' : 'ℹ'}
              </span>
              <span>{a.msg}</span>
            </div>
          ))}
          {!notInCache && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <code style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.68rem', background: 'var(--bg-elevated)', padding: '3px 7px', borderRadius: 2, color: 'var(--text-secondary)' }}>
                {fondaCmd}
              </code>
              <button
                onClick={copyCmd}
                style={{ flexShrink: 0, padding: '3px 8px', fontFamily: 'var(--font-sans)', fontSize: '0.62rem', background: copied ? '#007a3d' : 'var(--ft-slate)', color: '#fff', border: 'none', borderRadius: 2, cursor: 'pointer', transition: 'background 0.2s' }}
              >
                {copied ? '✓' : 'Copier'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── TickerInput ───────────────────────────────────────────────────────────
function TickerInput({ value, onChange, onSelect }: {
  value: string; onChange: (v: string) => void; onSelect: (ticker: string) => void
}) {
  const [suggestions, setSuggestions] = useState<TickerSuggestion[]>([])
  const [allTickers, setAllTickers]   = useState<TickerSuggestion[]>([])
  const [open, setOpen]               = useState(false)
  const [activeIdx, setActiveIdx]     = useState(-1)
  const wrapperRef                    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/tickers').then(r => r.json()).then((data: TickerSuggestion[]) => setAllTickers(data)).catch(() => {})
  }, [])

  useEffect(() => {
    const q = value.trim().toUpperCase()
    if (!q) { setSuggestions([]); setOpen(false); return }
    const filtered = allTickers.filter(d => d.ticker.startsWith(q) || d.companyName.toUpperCase().includes(q)).slice(0, 8)
    setSuggestions(filtered)
    setOpen(filtered.length > 0)
    setActiveIdx(-1)
  }, [value, allTickers])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === 'Enter') onSelect(value); return }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const t = activeIdx >= 0 ? suggestions[activeIdx]?.ticker : value
      if (t) { onChange(t); setOpen(false); onSelect(t) }
    } else if (e.key === 'Escape') { setOpen(false) }
  }

  const handleSelect = (ticker: string) => { onChange(ticker); setOpen(false); onSelect(ticker) }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' as const, flex: 1, minWidth: 0 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder="SNOW, DDOG, NET…"
        style={{ width: '100%', boxSizing: 'border-box' as const, padding: '6px 10px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', letterSpacing: '0.06em', background: 'var(--bg-card)', border: '1px solid var(--border-rule)', borderRadius: open ? '2px 2px 0 0' : 2, color: 'var(--text-primary)', outline: 'none', textTransform: 'uppercase' as const }}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, zIndex: 50, background: 'var(--bg-card)', border: '1px solid var(--border-rule)', borderTop: 'none', borderRadius: '0 0 2px 2px', boxShadow: '0 4px 12px rgba(0,0,0,0.10)', maxHeight: 220, overflowY: 'auto' as const }}>
          {suggestions.map((s, i) => (
            <div key={s.ticker} onMouseDown={() => handleSelect(s.ticker)}
              style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '7px 10px', cursor: 'pointer' as const, background: i === activeIdx ? 'var(--bg-elevated)' : 'transparent', borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={() => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(-1)}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', fontWeight: 600, color: s.source === 'static' ? 'var(--ft-teal)' : 'var(--text-primary)', flexShrink: 0, minWidth: 44 }}>{s.ticker}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }}>{s.companyName}</span>
              {s.source === 'static' && <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--ft-teal)', flexShrink: 0 }}>★</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Defaults ──────────────────────────────────────────────────────────────
const DEFAULT_PARAMS: Params = {
  revenueTTM: 4.47, nrrInit: 1.26, grossMargin: 0.75, wacc: 0.10,
  horizon: 10, nrrTerminal: 1.07, fcfMargin: 0.32, tvMultiple: 25,
  npvLogos: 13.0, sbc: 5.0, netCash: 3.5, mktCap: 57.0,
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function CohortDCFModel() {
  const [params, setParams]         = useState<Params>(DEFAULT_PARAMS)
  const [activeTab, setActiveTab]   = useState<'model' | 'table' | 'method'>('model')
  const [tickerInput, setTickerInput] = useState('SNOW')
  const [fetching, setFetching]     = useState(false)
  const [fetchedData, setFetchedData] = useState<FinancialsResponse | null>(null)
  const [notInCache, setNotInCache] = useState(false)
  const [nrrWasNull, setNrrWasNull] = useState(false)
  const [fetchedAt, setFetchedAt]   = useState<string | undefined>(undefined)
  const [companyName, setCompanyName] = useState('Snowflake (SNOW)')

  const res = compute(params)
  const set = useCallback((key: keyof Params) => (v: number) => setParams(p => ({ ...p, [key]: v })), [])

  const fetchTicker = async (ticker?: string, force = false) => {
    const t = (ticker ?? tickerInput).trim().toUpperCase()
    if (!t) return
    if (ticker) setTickerInput(ticker)
    setFetching(true); setNotInCache(false); setNrrWasNull(false)
    try {
      const r    = await fetch(`/api/financials/${t}${force ? '?force=true' : ''}`)
      const data = await r.json()

      // Ticker absent → afficher alerte, ne pas écraser les paramètres
      if (!r.ok && data?.error === 'NOT_IN_CACHE') {
        setNotInCache(true)
        setFetchedData(null)
        return
      }
      if (!r.ok) return

      const fData = data as FinancialsResponse
      setFetchedData(fData)
      setCompanyName(`${fData.companyName} (${t})`)
      setFetchedAt(fData.period)

      // Ne pas écraser si revenueTTM absent (données non initialisées)
      if (fData.revenueTTM > 0) {
        setNrrWasNull(fData.nrr === null)
        setParams(p => ({
          ...p,
          revenueTTM:  fData.revenueTTM,
          grossMargin: fData.grossMargin,
          fcfMargin:   Math.max(0.05, fData.fcfMargin),
          mktCap:      fData.mktCap,
          netCash:     fData.netCash,
          sbc:         fData.sbc,
          ...(fData.nrr ? { nrrInit: fData.nrr } : {}),
        }))
      }
    } catch { /* silencieux */ }
    finally { setFetching(false) }
  }

  const tabStyle = (tab: string) => ({
    padding: '8px 16px', fontFamily: 'var(--font-sans)', fontSize: '0.78rem',
    cursor: 'pointer' as const, border: 'none', background: 'transparent',
    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
    borderBottom: `2px solid ${activeTab === tab ? 'var(--ft-red)' : 'transparent'}`,
    marginBottom: -1, transition: 'color 0.15s',
  })

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 28 }}>
        <KPICard label="Equity implicite" value={`$${res.equityImplied.toFixed(1)}B`} sub={`vs $${params.mktCap}B marché`} highlight />
        <KPICard label="Upside / (Downside)" value={`${res.upside >= 0 ? '+' : ''}${(res.upside * 100).toFixed(0)}%`} sub="méthode cohort" positive={res.upside > 0.1} />
        <KPICard label="NPV base existante" value={`$${res.sumPV.toFixed(1)}B`} sub="Σ PV gross profit" />
        <KPICard label="PV Terminal Value" value={`$${res.pvTV.toFixed(1)}B`} sub={`${params.tvMultiple}x × FCF Y${params.horizon}`} />
        <KPICard label="NRR / WACC signal" value={`${(params.nrrInit / (1 + params.wacc)).toFixed(1)}x`}
          sub={res.rows[0]?.ratio > 1 ? '> 1 → série divergente ✓' : '< 1 → série convergente'}
          positive={params.nrrInit / (1 + params.wacc) > 1} />
      </div>

      <div style={{ borderBottom: '1px solid var(--border-rule)', marginBottom: 24, display: 'flex' }}>
        {[['model', 'Modèle interactif'], ['table', 'Table cohorte'], ['method', 'Méthodologie']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t as any)} style={tabStyle(t)}>{l}</button>
        ))}
      </div>

      {activeTab === 'model' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 28, alignItems: 'start' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '18px 20px' }}>

            {/* Auto-remplissage */}
            <div style={{ padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border-rule)', borderRadius: 4, marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 8 }}>Auto-remplissage</p>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
                <TickerInput value={tickerInput} onChange={setTickerInput} onSelect={t => fetchTicker(t)} />
                <button onClick={() => fetchTicker()} disabled={fetching}
                  style={{ flexShrink: 0, padding: '6px 12px', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', background: fetching ? 'var(--bg-elevated)' : 'var(--ft-slate)', color: fetching ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 2, cursor: fetching ? 'wait' : 'pointer', whiteSpace: 'nowrap' as const }}>
                  {fetching ? '…' : '↓ Charger'}
                </button>
              </div>
              {fetchedData && !notInCache && <CacheBadge status={fetchedData.cacheStatus} label={fetchedData.cacheLabel} quality={fetchedData.earningsQuality} />}
              <DataAlerts
                ticker={tickerInput.trim().toUpperCase() || 'TICKER'}
                notInCache={notInCache}
                data={fetchedData}
                nrrWasNull={nrrWasNull}
                fetchedAt={fetchedAt}
              />
            </div>

            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 14 }}>Hypothèses — {companyName}</p>

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--ft-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 8 }}>Société</p>
            <SliderRow label="Revenu TTM ($B)" value={params.revenueTTM} min={1} max={20} step={0.1} format={v => `$${v.toFixed(1)}B`} onChange={set('revenueTTM')} />
            <SliderRow label="Mkt Cap actuelle ($B)" value={params.mktCap} min={10} max={300} step={1} format={v => `$${v.toFixed(0)}B`} onChange={set('mktCap')} />
            <SliderRow label="Net Cash ($B)" value={params.netCash} min={-20} max={30} step={0.5} format={v => `$${v.toFixed(1)}B`} onChange={set('netCash')} showZeroMark />

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--ft-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 16 }}>Métriques clés</p>
            <SliderRow label="NRR initial" value={params.nrrInit} min={1.00} max={1.60} step={0.01} format={v => `${(v * 100).toFixed(0)}%`} onChange={set('nrrInit')} highlight warn={nrrWasNull} />
            <SliderRow label="Gross Margin" value={params.grossMargin} min={0.40} max={0.90} step={0.01} format={v => `${(v * 100).toFixed(0)}%`} onChange={set('grossMargin')} />
            <SliderRow label="FCF Margin (maturité)" value={params.fcfMargin} min={0.10} max={0.50} step={0.01} format={v => `${(v * 100).toFixed(0)}%`} onChange={set('fcfMargin')} />
            <SliderRow label="SBC ajustement ($B)" value={params.sbc} min={0} max={15} step={0.5} format={v => `$${v.toFixed(1)}B`} onChange={set('sbc')} />

            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--ft-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 16 }}>Paramètres modèle</p>
            <SliderRow label="WACC" value={params.wacc} min={0.06} max={0.18} step={0.005} format={v => `${(v * 100).toFixed(1)}%`} onChange={set('wacc')} highlight />
            <SliderRow label="Horizon (ans)" value={params.horizon} min={5} max={15} step={1} format={v => `${v} ans`} onChange={set('horizon')} />
            <SliderRow label="NRR terminal" value={params.nrrTerminal} min={1.00} max={1.20} step={0.01} format={v => `${(v * 100).toFixed(0)}%`} onChange={set('nrrTerminal')} />
            <SliderRow label="Multiple FCF terminal" value={params.tvMultiple} min={10} max={40} step={1} format={v => `${v}x`} onChange={set('tvMultiple')} />
            <SliderRow label="NPV nouveaux logos ($B)" value={params.npvLogos} min={0} max={30} step={0.5} format={v => `$${v.toFixed(1)}B`} onChange={set('npvLogos')} />

            <button
              onClick={() => { setParams(DEFAULT_PARAMS); setCompanyName('Snowflake (SNOW)'); setFetchedData(null); setTickerInput('SNOW'); setNotInCache(false); setNrrWasNull(false) }}
              style={{ marginTop: 16, width: '100%', padding: '7px 0', fontFamily: 'var(--font-sans)', fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
              ↺ Réinitialiser (SNOW base case)
            </button>
          </div>

          <div>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '18px 20px', marginBottom: 16 }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 14 }}>PV Gross Profit par année — base existante</p>
              <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', height: 140 }}>
                {res.rows.map((row, i) => {
                  const maxPV = Math.max(...res.rows.map(r => r.pvGP))
                  const h = Math.max(4, (row.pvGP / maxPV) * 120)
                  return (
                    <div key={i} title={`Y${row.year}: PV $${row.pvGP.toFixed(2)}B\nNRR ${(row.nrr * 100).toFixed(1)}%`}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', lineHeight: 1 }}>{row.pvGP.toFixed(1)}</div>
                      <div style={{ width: '80%', height: h, background: row.ratio < 1 ? '#cc000088' : `hsl(${210 - i * 8}, 70%, ${45 + i * 2}%)`, borderRadius: '2px 2px 0 0', transition: 'height 0.3s ease' }} />
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-muted)' }}>Y{row.year}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: '#3266ad', borderRadius: 1, display: 'inline-block' }} />NRR &gt; WACC</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: '#cc000088', borderRadius: 1, display: 'inline-block' }} />NRR &lt; WACC</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '18px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, margin: 0 }}>Trajectoire NRR — déclin vers maturité</p>
                <div style={{ display: 'flex', gap: 10, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 14, height: 1, borderTop: '1px dashed #b06000', display: 'inline-block' }} />NRR=WACC</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, background: 'rgba(0,122,61,0.12)', border: '1px solid #007a3d', display: 'inline-block' }} />Divergent</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, background: 'rgba(204,0,0,0.1)', border: '1px solid #cc0000', display: 'inline-block' }} />Convergent</span>
                </div>
              </div>
              <NRRChart rows={res.rows} wacc={params.wacc} nrrInit={params.nrrInit} nrrTerminal={params.nrrTerminal} />
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>Bridge Equity Value</div>
              {[
                { label: 'NPV Base existante',    value: res.sumPV,         indent: 0 },
                { label: 'PV Terminal Value',      value: res.pvTV,          indent: 0 },
                { label: 'NPV Nouveaux logos',     value: params.npvLogos,   indent: 0 },
                { label: 'EV Cohort totale',       value: res.evCohort,      indent: 0, total: true },
                { label: 'SBC dilution',            value: -params.sbc,       indent: 1 },
                { label: 'Net Cash',               value: params.netCash,    indent: 1 },
                { label: 'EQUITY VALUE IMPLICITE', value: res.equityImplied, indent: 0, total: true, accent: true },
                { label: 'Market Cap actuelle',    value: params.mktCap,     indent: 0, muted: true },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: `${(row as any).total ? 10 : 8}px ${20 + row.indent * 12}px`, borderBottom: '1px solid var(--border)', background: (row as any).accent ? 'var(--bg-elevated)' : (row as any).total ? 'rgba(0,0,0,0.02)' : 'transparent', borderTop: (row as any).total ? '1px solid var(--border-strong)' : 'none' }}>
                  <span style={{ fontFamily: (row as any).total ? 'var(--font-sans)' : 'var(--font-body)', fontSize: (row as any).total ? '0.78rem' : '0.82rem', fontWeight: (row as any).total ? 600 : 300, color: (row as any).muted ? 'var(--text-muted)' : 'var(--text-secondary)', letterSpacing: (row as any).total ? '0.04em' : '0' }}>{row.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: (row as any).total ? '1rem' : '0.85rem', fontWeight: (row as any).total ? 700 : 400, color: (row as any).accent ? (res.upside > 0 ? '#007a3d' : '#cc0000') : row.value < 0 ? '#cc0000' : 'var(--text-primary)' }}>
                    {row.value >= 0 ? '' : '('}${Math.abs(row.value).toFixed(1)}B{row.value < 0 ? ')' : ''}
                  </span>
                </div>
              ))}
              <div style={{ padding: '14px 20px', background: res.upside > 0.1 ? 'rgba(0,122,61,0.06)' : res.upside < -0.1 ? 'rgba(204,0,0,0.06)' : 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Upside / (Downside) implicite</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: res.upside > 0.1 ? '#007a3d' : res.upside < -0.1 ? '#cc0000' : 'var(--text-primary)' }}>
                  {res.upside >= 0 ? '+' : ''}{(res.upside * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'table' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-sans)', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Année','NRR effectif','Revenu ($B)','Gross Profit ($B)','Discount (×)','PV GP ($B)','NRR/WACC','Signal'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '2px solid var(--border-rule)', whiteSpace: 'nowrap' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {res.rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                  {[
                    { v: `Année ${row.year}`, right: false },
                    { v: `${(row.nrr * 100).toFixed(1)}%`, right: true },
                    { v: `$${row.revenue.toFixed(2)}B`, right: true },
                    { v: `$${row.grossProfit.toFixed(2)}B`, right: true },
                    { v: `${row.discountFactor.toFixed(3)}×`, right: true },
                    { v: `$${row.pvGP.toFixed(2)}B`, right: true },
                    { v: row.ratio.toFixed(3), right: true },
                    { v: row.ratio > 1 ? '↑ Divergente' : '↓ Convergente', right: true },
                  ].map((cell, j) => (
                    <td key={j} style={{ padding: '9px 14px', textAlign: cell.right ? 'right' : 'left', color: j === 7 ? (row.ratio > 1 ? '#007a3d' : '#cc0000') : 'var(--text-secondary)', borderBottom: '1px solid var(--border)', fontFamily: j > 0 ? 'var(--font-mono)' : 'var(--font-body)', fontSize: '0.82rem', fontWeight: j === 5 ? 500 : 300 }}>
                      {cell.v}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ background: 'var(--bg-elevated)' }}>
                <td colSpan={5} style={{ padding: '10px 14px', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>Σ NPV GROSS PROFIT BASE EXISTANTE</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>${res.sumPV.toFixed(1)}B</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'method' && (
        <div style={{ maxWidth: 680 }}>
          {[
            { title: 'Pourquoi le DCF par cohorte ?', body: "Un modèle SaaS classique valorise les revenus futurs à partir d'un multiple d'ARR. Il ignore que le NRR crée des séries géométriques de revenus croissantes — pas décroissantes. Dès lors que NRR > WACC, chaque cohorte client est une rente dont la valeur actualisée diverge." },
            { title: 'La formule clé : NRR/WACC', body: "Le ratio NRR/(1+WACC) est le test central. Si ratio > 1, la série est divergente. Si ratio < 1 (cas ServiceNow à NRR ~108%, WACC 10%), les deux méthodes convergent." },
            { title: "Composantes de l'EV", body: "(1) NPV Base existante — gross profit actualisé sur l'horizon. (2) PV Terminal Value — FCF normalisé × multiple. (3) NPV Nouveaux logos — valeur du moteur d'acquisition." },
            { title: 'Hypothèses critiques', body: 'NRR initial et WACC déterminent 80% de la valeur. Le NRR terminal conditionne la Terminal Value. Le multiple FCF terminal (22-28x pour un SaaS mature) détermine la seconde composante.' },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border-rule)' }}>{s.title}</h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.92rem', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
          <div style={{ padding: '14px 18px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '4px solid var(--ft-red)', borderRadius: '0 4px 4px 0' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--ft-red)', marginBottom: 4, textTransform: 'uppercase' as const }}>Calibration — SNOW vs NOW (mai 2026)</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Snowflake (NRR 126%, WACC 10%) : ratio = 1.145 → série divergente → equity implicite ~$115B vs $57B marché. ServiceNow (NRR ~108%, WACC 10%) : ratio = 0.982 → convergente → cohort ≈ SaaS ≈ $175B.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
