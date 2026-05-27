import { useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────
const DIFF: Record<'A' | 'B', number> = { A: 1.9, B: 1.53 }
const DESAV = 25
const ELEC_COEFF = 0.75

type Hyp = 'A' | 'B'
type Geo = 'global' | 'europe'

function getCoeff(hyp: Hyp, geo: Geo) { return geo === 'europe' ? DIFF[hyp] - ELEC_COEFF : DIFF[hyp] }
function getNet(co2: number, hyp: Hyp, geo: Geo) { return getCoeff(hyp, geo) * co2 - DESAV }
function getBreakeven(hyp: Hyp, geo: Geo) { return DESAV / getCoeff(hyp, geo) }
function getElec(co2: number, geo: Geo) { return geo === 'europe' ? ELEC_COEFF * co2 : 0 }

// ── Slider ─────────────────────────────────────────────────────────────────
function SliderRow({ label, value, min, max, step, fmt, onChange, accent = false }: {
  label: string; value: number; min: number; max: number; step: number
  fmt: (v: number) => string; onChange: (v: number) => void; accent?: boolean
}) {
  return (
    <div style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, color: accent ? '#BF4E14' : 'var(--text-primary)' }}>
          {fmt(value)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: accent ? '#BF4E14' : '#0F4761' }} />
    </div>
  )
}

// ── KPI Card ───────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, positive }: {
  label: string; value: string; sub?: string; positive?: boolean
}) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 3, borderTop: '3px solid var(--ft-red)' }}>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'var(--text-muted)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.1, color: positive === true ? '#007a3d' : positive === false ? '#cc0000' : 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── Chart SVG ─────────────────────────────────────────────────────────────
function SensChart({ co2, hyp, geo }: { co2: number; hyp: Hyp; geo: Geo }) {
  const VW = 460, VH = 130
  const PL = 44, PR = 14, PT = 12, PB = 26
  const plotW = VW - PL - PR
  const plotH = VH - PT - PB
  const CO2_MAX = 150

  const pts = Array.from({ length: 31 }, (_, i) => i * 5)
  const vals = pts.map(p => getNet(p, hyp, geo))

  const yPad = 10
  const yLo = Math.min(...vals) - yPad
  const yHi = Math.max(...vals) + yPad

  const toX = (p: number) => PL + (p / CO2_MAX) * plotW
  const toY = (v: number) => PT + (1 - (v - yLo) / (yHi - yLo)) * plotH
  const y0 = Math.max(PT, Math.min(PT + plotH, toY(0)))

  const linePts = pts.map((p, i) => `${toX(p).toFixed(1)},${toY(vals[i]).toFixed(1)}`).join(' ')

  const abovePts = [
    `${toX(0)},${y0}`,
    ...pts.map((p, i) => `${toX(p).toFixed(1)},${Math.min(toY(vals[i]), y0).toFixed(1)}`),
    `${toX(CO2_MAX)},${y0}`,
  ].join(' ')

  const belowPts = [
    `${toX(0)},${y0}`,
    ...pts.map((p, i) => `${toX(p).toFixed(1)},${Math.max(toY(vals[i]), y0).toFixed(1)}`),
    `${toX(CO2_MAX)},${y0}`,
  ].join(' ')

  const be = getBreakeven(hyp, geo)
  const curNet = getNet(co2, hyp, geo)
  const curY = toY(curNet)
  const yTicks = [-25, 0, 50, 100, 150].filter(v => v >= yLo && v <= yHi)

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      {yTicks.map(v => (
        <line key={v} x1={PL} x2={VW - PR} y1={toY(v)} y2={toY(v)}
          stroke={v === 0 ? '#ccc0b3' : '#E0D8CC'}
          strokeWidth={v === 0 ? 1.5 : 0.5}
          strokeDasharray={v === 0 ? undefined : '2,3'} />
      ))}
      <polygon points={abovePts} fill="#007a3d" fillOpacity={0.09} />
      <polygon points={belowPts} fill="#cc0000" fillOpacity={0.09} />
      {be > 0 && be <= CO2_MAX && (
        <line x1={toX(be)} x2={toX(be)} y1={PT} y2={PT + plotH}
          stroke="#C8960A" strokeWidth={1} strokeDasharray="3,3" />
      )}
      <polyline points={linePts} fill="none" stroke="#0F4761" strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={toX(co2)} cy={curY} r={4.5} fill="#BF4E14" />
      <text x={toX(co2)} y={curY - 8} textAnchor="middle" fontSize={8}
        fill="#BF4E14" fontFamily="'Courier New',monospace" fontWeight="600">
        {curNet >= 0 ? '+' : ''}{curNet.toFixed(0)}
      </text>
      {yTicks.map(v => (
        <text key={v} x={PL - 4} y={toY(v) + 3.5} textAnchor="end"
          fontSize={7.5} fill={v === 0 ? '#888780' : '#aaa8a2'} fontFamily="'Courier New',monospace">
          {v > 0 ? '+' : ''}{v}
        </text>
      ))}
      {[0, 50, 100, 150].map(p => (
        <text key={p} x={toX(p)} y={VH - 5} textAnchor="middle"
          fontSize={7.5} fill="#aaa8a2" fontFamily="'Courier New',monospace">{p}</text>
      ))}
      {be > 0 && be <= CO2_MAX && (
        <text x={toX(be) + 4} y={PT + 9} fontSize={7} fill="#C8960A" fontFamily="'Courier New',monospace">
          {be.toFixed(1)} $/t
        </text>
      )}
      <line x1={PL} x2={PL} y1={PT} y2={VH - PB} stroke="#E0D8CC" strokeWidth={0.5} />
    </svg>
  )
}

// ── Toggle button helper ───────────────────────────────────────────────────
function Toggle({ label, active, accent, onClick }: {
  label: string; active: boolean; accent: 'navy' | 'orange'; onClick: () => void
}) {
  const c = accent === 'navy' ? '#0F4761' : '#BF4E14'
  return (
    <button onClick={onClick} style={{
      flex: 1, padding: '7px 6px', borderRadius: 2, cursor: 'pointer',
      border: `1px solid ${active ? c + '55' : 'var(--border)'}`,
      background: active ? c + '10' : 'transparent',
      color: active ? c : 'var(--text-secondary)',
      fontFamily: 'var(--font-sans)', fontSize: '0.72rem', transition: 'all 0.15s',
    }}>
      {label}
    </button>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function EAFSensitivityModel() {
  const [hyp, setHyp] = useState<Hyp>('A')
  const [geo, setGeo] = useState<Geo>('global')
  const [co2, setCo2] = useState(50)
  const [fxInt, setFxInt] = useState(110) // ×100 to avoid float slider drift

  const fx = fxInt / 100
  const netUSD = getNet(co2, hyp, geo)
  const netEUR = netUSD / fx
  const be = getBreakeven(hyp, geo)
  const beEUR = be / fx
  const gross = DIFF[hyp] * co2
  const elec = getElec(co2, geo)
  const pos = netUSD >= 0

  const bridgeRows = [
    { label: 'Économie carbone brute', value: gross, indent: 0, key: 'gross' },
    ...(geo === 'europe' ? [{ label: 'Surcoût électricité (ETS) ⚠', value: -elec, indent: 1, key: 'elec' }] : []),
    { label: 'Désavantage production initial ⚠', value: -DESAV, indent: 0, key: 'desav' },
    { label: 'AVANTAGE NET EAF', value: netUSD, indent: 0, key: 'total', total: true },
  ] as const

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
        <KPICard label="Avantage net EAF" value={`${netUSD >= 0 ? '+' : ''}${netUSD.toFixed(1)} $/t`} sub="acier produit" positive={pos} />
        <KPICard label="Avantage net EAF" value={`${netEUR >= 0 ? '+' : ''}${netEUR.toFixed(1)} €/t`} sub={`taux ${fx.toFixed(2)}`} positive={pos} />
        <KPICard label="Seuil de bascule" value={`${be.toFixed(1)} $/t`} sub={`≈ ${beEUR.toFixed(1)} €/t CO₂`} />
        <KPICard label="Statut vs BF-BOF" value={pos ? 'Avantage EAF' : 'Désavantage EAF'} sub={`à ${co2} $/t CO₂`} positive={pos} />
      </div>

      <div style={{ borderBottom: '1px solid var(--border-rule)', marginBottom: 24 }}>
        <span style={{ display: 'inline-block', padding: '8px 0', fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--ft-red)', marginBottom: -1 }}>
          Modèle interactif
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 28, alignItems: 'start' }}>

        {/* Controls */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '18px 20px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 14 }}>Paramètres</p>

          <SliderRow label="Prix carbone" value={co2} min={0} max={150} step={5}
            fmt={v => `${v} $/t CO₂`} onChange={setCo2} accent />
          <SliderRow label="Taux $/€" value={fxInt} min={85} max={130} step={1}
            fmt={v => (v / 100).toFixed(2)} onChange={setFxInt} />

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--ft-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 16 }}>Mix électrique EAF</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <Toggle label="Hyp. A — 0,3 t CO₂/t ✓" active={hyp === 'A'} accent="navy" onClick={() => setHyp('A')} />
            <Toggle label="Hyp. B — 0,67 t CO₂/t ⚠" active={hyp === 'B'} accent="navy" onClick={() => setHyp('B')} />
          </div>

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--ft-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 16 }}>Géographie</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <Toggle label="Global (sans ETS)" active={geo === 'global'} accent="orange" onClick={() => setGeo('global')} />
            <Toggle label="Europe (avec ETS)" active={geo === 'europe'} accent="orange" onClick={() => setGeo('europe')} />
          </div>

          <div style={{ marginTop: 18, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border-rule)', borderRadius: 2 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 7 }}>Hypothèses clés</p>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              <div>BF-BOF : 2,2 t CO₂/t acier ✓</div>
              <div>Désavantage initial : 25 $/t ⚠</div>
              {geo === 'europe' && <div style={{ color: '#BF4E14' }}>Surcoût élec. : 0,75 $/t par $/t CO₂ ⚠</div>}
              <div>Taux $/€ : {fx.toFixed(2)}</div>
            </div>
          </div>

          <button
            onClick={() => { setHyp('A'); setGeo('global'); setCo2(50); setFxInt(110) }}
            style={{ marginTop: 14, width: '100%', padding: '7px 0', fontFamily: 'var(--font-sans)', fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, cursor: 'pointer' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'var(--bg-elevated)'; (e.target as HTMLButtonElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = 'var(--text-muted)' }}
          >
            ↺ Réinitialiser
          </button>
        </div>

        {/* Right: chart + bridge */}
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, margin: 0 }}>
                Avantage net EAF ($/t acier)
              </p>
              <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: 'rgba(0,122,61,0.25)', display: 'inline-block' }} />Zone avantage
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 14, height: 1, borderTop: '1px dashed #C8960A', display: 'inline-block' }} />Seuil bascule
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#BF4E14', display: 'inline-block' }} />Prix actuel
                </span>
              </div>
            </div>
            <SensChart co2={co2} hyp={hyp} geo={geo} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 2 }}>
              <span>0</span><span>Prix CO₂ ($/t)</span><span>150</span>
            </div>
          </div>

          {/* Bridge */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' as const }}>
              Décomposition — {co2} $/t CO₂
            </div>
            {bridgeRows.map(row => (
              <div key={row.key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: `${(row as any).total ? 10 : 8}px ${20 + row.indent * 14}px`,
                borderBottom: '1px solid var(--border)',
                background: (row as any).total ? 'var(--bg-elevated)' : 'transparent',
                borderTop: (row as any).total ? '1px solid var(--border-strong)' : 'none',
              }}>
                <span style={{ fontFamily: (row as any).total ? 'var(--font-sans)' : 'var(--font-body)', fontSize: (row as any).total ? '0.78rem' : '0.82rem', fontWeight: (row as any).total ? 600 : 300, color: 'var(--text-secondary)', letterSpacing: (row as any).total ? '0.04em' : 0 }}>
                  {row.label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: (row as any).total ? '1rem' : '0.85rem', fontWeight: (row as any).total ? 700 : 400, color: row.value > 0 ? '#007a3d' : row.value < 0 ? '#cc0000' : 'var(--text-primary)' }}>
                  {row.value >= 0 ? '+' : ''}{row.value.toFixed(1)} $/t
                </span>
              </div>
            ))}
            <div style={{ padding: '14px 20px', background: pos ? 'rgba(0,122,61,0.05)' : 'rgba(204,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Équivalent euros</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: pos ? '#007a3d' : '#cc0000' }}>
                {netEUR >= 0 ? '+' : ''}{netEUR.toFixed(1)} €/t
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Context note */}
      <div style={{ marginTop: 24, padding: '14px 18px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderLeft: '4px solid var(--ft-red)', borderRadius: '0 4px 4px 0' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.05em', color: 'var(--ft-red)', marginBottom: 5, textTransform: 'uppercase' as const }}>
          Calibration — Teaching case EAF B-T v7 · 27/05/2026
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          {geo === 'europe'
            ? `Europe (corrélation ETS/électricité) — seuil de bascule ≈ ${be.toFixed(1)} $/t CO₂ (${beEUR.toFixed(1)} €/t). Surcoût électricité estimé à +0,75 $/t acier par +1 $/t CO₂ (hypothèse de travail ⚠ — DATA GAP #1, non disponible en source institutionnelle).`
            : `Contexte global sans corrélation ETS/électricité — seuil de bascule ≈ ${be.toFixed(1)} $/t CO₂.`
          }{' '}
          Hypothèse {hyp} : émissions EAF {hyp === 'A' ? '0,3 t CO₂/t (mix bas-carbone) ✓ [Global Energy Monitor, 2024]' : '0,67 t CO₂/t (mix carbo-intensif) ⚠ [Columbia Business School, 2023]'}.
          Désavantage production initial 25 $/t ⚠ [Columbia Business School, 2023].
        </p>
      </div>
    </div>
  )
}
