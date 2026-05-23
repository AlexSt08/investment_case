import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────
interface Params {
  revenueTTM: number     // $B
  nrrInit: number        // e.g. 1.26
  grossMargin: number    // e.g. 0.75
  wacc: number           // e.g. 0.10
  horizon: number        // years (int)
  nrrTerminal: number    // e.g. 1.07
  fcfMargin: number      // e.g. 0.32
  tvMultiple: number     // e.g. 25
  npvLogos: number       // $B
  sbc: number            // $B
  netCash: number        // $B
  mktCap: number         // $B current
}

interface CohortRow {
  year: number
  nrr: number
  revenue: number
  grossProfit: number
  discountFactor: number
  pvGP: number
  ratio: number          // NRR/WACC_adj
}

interface Results {
  rows: CohortRow[]
  sumPV: number
  pvTV: number
  tvGross: number
  revenueY10: number
  evCohort: number
  equityImplied: number
  upside: number
}

// ── Calculation ───────────────────────────────────────────────────────────
function compute(p: Params): Results {
  const rows: CohortRow[] = []
  let curRev = p.revenueTTM
  let sumPV = 0

  for (let n = 1; n <= p.horizon; n++) {
    const progress = p.horizon > 1 ? (n - 1) / (p.horizon - 1) : 0
    const nrr = Math.max(
      p.nrrTerminal,
      p.nrrInit - (p.nrrInit - p.nrrTerminal) * progress
    )
    curRev = curRev * nrr
    const gp = curRev * p.grossMargin
    const df = Math.pow(1 + p.wacc, n)
    const pvGP = gp / df
    sumPV += pvGP
    rows.push({
      year: n, nrr, revenue: curRev, grossProfit: gp,
      discountFactor: df, pvGP, ratio: nrr / (1 + p.wacc),
    })
  }

  const revenueY10 = curRev
  const fcfTerm = revenueY10 * p.fcfMargin
  const tvGross = fcfTerm * p.tvMultiple
  const pvTV = tvGross / Math.pow(1 + p.wacc, p.horizon)
  const evCohort = sumPV + pvTV + p.npvLogos
  const equityImplied = evCohort - p.sbc + p.netCash
  const upside = equityImplied / p.mktCap - 1

  return { rows, sumPV, pvTV, tvGross, revenueY10, evCohort, equityImplied, upside }
}

// ── Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const W = 200; const H = 40; const PAD = 4
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - (v - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2}
        strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={`${PAD},${H} ${pts} ${W - PAD},${H}`}
        fill={color} fillOpacity={0.08} stroke="none" />
    </svg>
  )
}

// ── Slider row ───────────────────────────────────────────────────────────
function SliderRow({
  label, value, min, max, step, format, onChange, highlight = false,
}: {
  label: string; value: number; min: number; max: number; step: number
  format: (v: number) => string; onChange: (v: number) => void; highlight?: boolean
}) {
  return (
    <div style={{
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
      background: highlight ? 'rgba(191,78,20,0.04)' : 'transparent',
      transition: 'background 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: highlight ? '#BF4E14' : 'var(--text-primary)',
          minWidth: 60,
          textAlign: 'right',
        }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: highlight ? '#BF4E14' : '#cc0000' }}
      />
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────
function KPICard({
  label, value, sub, highlight = false, positive,
}: {
  label: string; value: string; sub?: string; highlight?: boolean; positive?: boolean
}) {
  return (
    <div style={{
      padding: '14px 16px',
      background: highlight ? 'var(--bg-elevated)' : 'var(--bg-card)',
      border: `1px solid ${highlight ? 'var(--border-strong)' : 'var(--border)'}`,
      borderRadius: 4,
      borderTop: highlight ? '3px solid var(--ft-red)' : '1px solid var(--border)',
    }}>
      <div style={{
        fontFamily: 'var(--font-sans)',
        fontSize: '0.62rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: highlight ? '1.6rem' : '1.3rem',
        fontWeight: 700,
        color: positive === true ? '#007a3d' : positive === false ? '#cc0000' : 'var(--text-primary)',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: 'var(--text-muted)',
          marginTop: 4,
        }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────
const DEFAULT_PARAMS: Params = {
  revenueTTM: 4.47,
  nrrInit: 1.26,
  grossMargin: 0.75,
  wacc: 0.10,
  horizon: 10,
  nrrTerminal: 1.07,
  fcfMargin: 0.32,
  tvMultiple: 25,
  npvLogos: 13.0,
  sbc: 5.0,
  netCash: 3.5,
  mktCap: 57.0,
}

function fmt$B(v: number) { return `$${v.toFixed(1)}B` }
function fmtPct(v: number) { return `${(v * 100).toFixed(1)}%` }
function fmtX(v: number) { return `${v.toFixed(1)}x` }
function fmtInt(v: number) { return v.toFixed(0) }

export default function CohortDCFModel() {
  const [params, setParams] = useState<Params>(DEFAULT_PARAMS)
  const [activeTab, setActiveTab] = useState<'model' | 'table' | 'method'>('model')
  const res = compute(params)

  const set = useCallback((key: keyof Params) => (v: number) =>
    setParams(p => ({ ...p, [key]: v })), [])

  const tabStyle = (tab: string) => ({
    padding: '8px 16px',
    fontFamily: 'var(--font-sans)',
    fontSize: '0.78rem',
    cursor: 'pointer' as const,
    border: 'none',
    background: 'transparent',
    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
    borderBottom: `2px solid ${activeTab === tab ? 'var(--ft-red)' : 'transparent'}`,
    marginBottom: -1,
    transition: 'color 0.15s',
  })

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── KPI Strip ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 10,
        marginBottom: 28,
      }}>
        <KPICard
          label="Equity implicite"
          value={fmt$B(res.equityImplied)}
          sub={`vs $${params.mktCap}B marché`}
          highlight
        />
        <KPICard
          label="Upside / (Downside)"
          value={`${res.upside >= 0 ? '+' : ''}${(res.upside * 100).toFixed(0)}%`}
          sub="méthode cohort"
          positive={res.upside > 0.1}
        />
        <KPICard
          label="NPV base existante"
          value={fmt$B(res.sumPV)}
          sub="Σ PV gross profit"
        />
        <KPICard
          label="PV Terminal Value"
          value={fmt$B(res.pvTV)}
          sub={`${params.tvMultiple}x × FCF Y${params.horizon}`}
        />
        <KPICard
          label="NRR / WACC signal"
          value={fmtX(params.nrrInit / (1 + params.wacc))}
          sub={res.rows[0]?.ratio > 1 ? '> 1 → série divergente ✓' : '< 1 → série convergente'}
          positive={params.nrrInit / (1 + params.wacc) > 1}
        />
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: '1px solid var(--border-rule)', marginBottom: 24, display: 'flex' }}>
        {[['model', 'Modèle interactif'], ['table', 'Table cohorte'], ['method', 'Méthodologie']].map(([t, l]) => (
          <button key={t} onClick={() => setActiveTab(t as any)} style={tabStyle(t)}>{l}</button>
        ))}
      </div>

      {/* ── TAB: Model ── */}
      {activeTab === 'model' && (
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 28, alignItems: 'start' }}>

          {/* Controls */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '18px 20px',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              Hypothèses — Snowflake (SNOW)
            </p>

            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.68rem',
              color: 'var(--ft-teal)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}>Société</p>
            <SliderRow label="Revenu TTM ($B)" value={params.revenueTTM} min={1} max={20} step={0.1}
              format={v => `$${v.toFixed(1)}B`} onChange={set('revenueTTM')} />
            <SliderRow label="Mkt Cap actuelle ($B)" value={params.mktCap} min={10} max={300} step={1}
              format={v => `$${v.toFixed(0)}B`} onChange={set('mktCap')} />
            <SliderRow label="Net Cash ($B)" value={params.netCash} min={-10} max={20} step={0.5}
              format={v => `$${v.toFixed(1)}B`} onChange={set('netCash')} />

            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.68rem',
              color: 'var(--ft-teal)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 8,
              marginTop: 16,
            }}>Métriques clés</p>
            <SliderRow label="NRR initial" value={params.nrrInit} min={1.00} max={1.60} step={0.01}
              format={v => `${(v * 100).toFixed(0)}%`} onChange={set('nrrInit')} highlight />
            <SliderRow label="Gross Margin" value={params.grossMargin} min={0.40} max={0.90} step={0.01}
              format={v => `${(v * 100).toFixed(0)}%`} onChange={set('grossMargin')} />
            <SliderRow label="FCF Margin (maturité)" value={params.fcfMargin} min={0.10} max={0.50} step={0.01}
              format={v => `${(v * 100).toFixed(0)}%`} onChange={set('fcfMargin')} />
            <SliderRow label="SBC ajustement ($B)" value={params.sbc} min={0} max={15} step={0.5}
              format={v => `$${v.toFixed(1)}B`} onChange={set('sbc')} />

            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.68rem',
              color: 'var(--ft-teal)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: 8,
              marginTop: 16,
            }}>Paramètres modèle</p>
            <SliderRow label="WACC" value={params.wacc} min={0.06} max={0.18} step={0.005}
              format={v => `${(v * 100).toFixed(1)}%`} onChange={set('wacc')} highlight />
            <SliderRow label="Horizon (ans)" value={params.horizon} min={5} max={15} step={1}
              format={v => `${v} ans`} onChange={set('horizon')} />
            <SliderRow label="NRR terminal" value={params.nrrTerminal} min={1.00} max={1.20} step={0.01}
              format={v => `${(v * 100).toFixed(0)}%`} onChange={set('nrrTerminal')} />
            <SliderRow label="Multiple FCF terminal" value={params.tvMultiple} min={10} max={40} step={1}
              format={v => `${v}x`} onChange={set('tvMultiple')} />
            <SliderRow label="NPV nouveaux logos ($B)" value={params.npvLogos} min={0} max={30} step={0.5}
              format={v => `$${v.toFixed(1)}B`} onChange={set('npvLogos')} />

            {/* Reset */}
            <button
              onClick={() => setParams(DEFAULT_PARAMS)}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '7px 0',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.72rem',
                letterSpacing: '0.06em',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-elevated)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              ↺ Réinitialiser (SNOW base case)
            </button>
          </div>

          {/* Charts + Bridge */}
          <div>
            {/* PV Chart */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '18px 20px',
              marginBottom: 16,
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.68rem',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}>
                PV Gross Profit par année — base existante
              </p>
              <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', height: 140 }}>
                {res.rows.map((row, i) => {
                  const maxPV = Math.max(...res.rows.map(r => r.pvGP))
                  const h = Math.max(4, (row.pvGP / maxPV) * 120)
                  const isRatioBelowOne = row.ratio < 1
                  return (
                    <div
                      key={i}
                      title={`Y${row.year}: PV $${row.pvGP.toFixed(2)}B\nNRR ${(row.nrr * 100).toFixed(1)}%`}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column' as const,
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'default',
                      }}
                    >
                      <div style={{
                        fontSize: '0.55rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-muted)',
                        lineHeight: 1,
                      }}>
                        {row.pvGP.toFixed(1)}
                      </div>
                      <div
                        style={{
                          width: '80%',
                          height: h,
                          background: isRatioBelowOne
                            ? '#cc000088'
                            : `hsl(${210 - i * 8}, 70%, ${45 + i * 2}%)`,
                          borderRadius: '2px 2px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.55rem',
                        color: 'var(--text-muted)',
                      }}>
                        Y{row.year}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{
                display: 'flex',
                gap: 16,
                marginTop: 10,
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                color: 'var(--text-muted)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: '#3266ad', borderRadius: 1, display: 'inline-block' }} />
                  NRR &gt; WACC (série divergente)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, background: '#cc000088', borderRadius: 1, display: 'inline-block' }} />
                  NRR &lt; WACC (convergente)
                </span>
              </div>
            </div>

            {/* NRR decay chart */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '18px 20px',
              marginBottom: 16,
            }}>
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.68rem',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}>
                Trajectoire NRR — déclin linéaire vers maturité
              </p>
              <Sparkline values={res.rows.map(r => r.nrr * 100)} color="#0d7680" />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.62rem',
                color: 'var(--text-muted)',
                marginTop: 4,
              }}>
                <span>Y1: {(params.nrrInit * 100).toFixed(0)}%</span>
                <span>Y{params.horizon}: {(params.nrrTerminal * 100).toFixed(0)}%</span>
              </div>
            </div>

            {/* EV Bridge */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '12px 20px',
                borderBottom: '1px solid var(--border)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.68rem',
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}>
                Bridge Equity Value
              </div>
              {[
                { label: 'NPV Base existante', value: res.sumPV, indent: 0 },
                { label: 'PV Terminal Value', value: res.pvTV, indent: 0 },
                { label: 'NPV Nouveaux logos', value: params.npvLogos, indent: 0 },
                { label: 'EV Cohort totale', value: res.evCohort, indent: 0, total: true },
                { label: 'SBC dilution', value: -params.sbc, indent: 1 },
                { label: 'Net Cash', value: params.netCash, indent: 1 },
                { label: 'EQUITY VALUE IMPLICITE', value: res.equityImplied, indent: 0, total: true, accent: true },
                { label: 'Market Cap actuelle', value: params.mktCap, indent: 0, muted: true },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: `${row.total ? 10 : 8}px ${20 + row.indent * 12}px`,
                  borderBottom: '1px solid var(--border)',
                  background: row.accent ? 'var(--bg-elevated)' : row.total ? 'rgba(0,0,0,0.02)' : 'transparent',
                  borderTop: row.total ? '1px solid var(--border-strong)' : 'none',
                }}>
                  <span style={{
                    fontFamily: row.total ? 'var(--font-sans)' : 'var(--font-body)',
                    fontSize: row.total ? '0.78rem' : '0.82rem',
                    fontWeight: row.total ? 600 : 300,
                    color: row.muted ? 'var(--text-muted)' : 'var(--text-secondary)',
                    letterSpacing: row.total ? '0.04em' : '0',
                  }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: row.total ? '1rem' : '0.85rem',
                    fontWeight: row.total ? 700 : 400,
                    color: row.accent
                      ? (res.upside > 0 ? '#007a3d' : '#cc0000')
                      : row.value < 0 ? '#cc0000' : 'var(--text-primary)',
                  }}>
                    {row.value >= 0 ? '' : '('}${Math.abs(row.value).toFixed(1)}B{row.value < 0 ? ')' : ''}
                  </span>
                </div>
              ))}
              <div style={{
                padding: '14px 20px',
                background: res.upside > 0.1 ? 'rgba(0,122,61,0.06)' : res.upside < -0.1 ? 'rgba(204,0,0,0.06)' : 'var(--bg-elevated)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                  Upside / (Downside) implicite
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: res.upside > 0.1 ? '#007a3d' : res.upside < -0.1 ? '#cc0000' : 'var(--text-primary)',
                }}>
                  {res.upside >= 0 ? '+' : ''}{(res.upside * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Table ── */}
      {activeTab === 'table' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.82rem',
          }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Année', 'NRR effectif', 'Revenu ($B)', 'Gross Profit ($B)', 'Discount (×)', 'PV GP ($B)', 'NRR/WACC', 'Signal'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px',
                    textAlign: 'right',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.62rem',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    borderBottom: '2px solid var(--border-rule)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
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
                    <td key={j} style={{
                      padding: '9px 14px',
                      textAlign: cell.right ? 'right' : 'left',
                      color: j === 7
                        ? row.ratio > 1 ? '#007a3d' : '#cc0000'
                        : 'var(--text-secondary)',
                      borderBottom: '1px solid var(--border)',
                      fontFamily: j > 0 ? 'var(--font-mono)' : 'var(--font-body)',
                      fontSize: '0.82rem',
                      fontWeight: j === 5 ? 500 : 300,
                    }}>
                      {cell.v}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{ background: 'var(--bg-elevated)', fontWeight: 600 }}>
                <td colSpan={5} style={{
                  padding: '10px 14px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.06em',
                  color: 'var(--text-secondary)',
                }}>
                  Σ NPV GROSS PROFIT BASE EXISTANTE
                </td>
                <td style={{
                  padding: '10px 14px',
                  textAlign: 'right',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                }}>
                  ${res.sumPV.toFixed(1)}B
                </td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB: Method ── */}
      {activeTab === 'method' && (
        <div style={{ maxWidth: 680 }}>
          {[
            {
              title: 'Pourquoi le DCF par cohorte ?',
              body: 'Un modèle SaaS classique valorise les revenus futurs à partir d\'un multiple d\'ARR. Il ignore que le NRR crée des séries géométriques de revenus croissantes — pas décroissantes. Dès lors que NRR > WACC, chaque cohorte client est une rente dont la valeur actualisée diverge, et le modèle standard sous-estime structurellement l\'equity value.',
            },
            {
              title: 'La formule clé : NRR/WACC',
              body: 'Le ratio NRR/(1+WACC) est le test central. Si ratio > 1 (NRR > WACC), la série est divergente — la valeur de chaque cohorte croît sans borne en horizon infini. On borne à un horizon de 5-15 ans et on ajoute une Terminal Value normalisée. Si ratio < 1 (cas ServiceNow à NRR ~108%, WACC 10%), les deux méthodes convergent.',
            },
            {
              title: 'Composantes de l\'EV',
              body: 'L\'Enterprise Value se décompose en trois parties : (1) NPV Base existante — la valeur des cohortes en vie, grossrofit actualisé sur l\'horizon. (2) PV Terminal Value — FCF normalisé en fin de projection × multiple. (3) NPV Nouveaux logos — valeur du moteur d\'acquisition, actualisée séparément. La somme moins la dilution SBC plus le cash donne l\'Equity Value.',
            },
            {
              title: 'Hypothèses critiques',
              body: 'Le NRR initial et le WACC sont les deux variables qui déterminent 80% de la valeur. Le NRR terminal (niveau de maturité) conditionne la Terminal Value. Le multiple FCF terminal (22-28x pour un SaaS mature profitable) détermine la second composante. Les "NPV nouveaux logos" sont la variable la moins précise — calibrer sur CAC/LTV historique.',
            },
          ].map((section, i) => (
            <div key={i} style={{ marginBottom: 28 }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.05rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: '1px solid var(--border-rule)',
              }}>
                {section.title}
              </h3>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.92rem',
                fontWeight: 300,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
              }}>
                {section.body}
              </p>
            </div>
          ))}

          <div style={{
            padding: '14px 18px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: '4px solid var(--ft-red)',
            borderRadius: '0 4px 4px 0',
          }}>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.72rem',
              letterSpacing: '0.06em',
              color: 'var(--ft-red)',
              marginBottom: 4,
              textTransform: 'uppercase',
            }}>
              Calibration — SNOW vs NOW (mai 2026)
            </p>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              fontWeight: 300,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              Snowflake (NRR 126%, WACC 10%) : ratio = 1.145 → série divergente → equity implicite ~$115B vs $57B marché.
              ServiceNow (NRR ~108%, WACC 10%) : ratio = 0.982 → série convergente → méthode cohort ≈ méthode SaaS ≈ $175B.
              L'écart de valorisation marché (NOW = 3.1× SNOW) est théoriquement infondé — le framework cohort implique un ratio de ~1.5×.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
