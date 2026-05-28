import { useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────
const PRESET_A = { eafCO2: 0.30, label: 'Hyp. A — Mix bas-carbone' }
const PRESET_B = { eafCO2: 0.67, label: 'Hyp. B — Mix carbo-intensif' }
const PRESET_BF = 2.20

function getNet(
  co2: number,
  eafCO2: number,
  bfCO2: number,
  elecPrice: number,
  elecConsumption: number,
  desav: number
) {
  const carbonSaving = (bfCO2 - eafCO2) * co2
  const elecCost = elecPrice * elecConsumption
  return carbonSaving - desav - elecCost
}

function getBreakeven(
  eafCO2: number,
  bfCO2: number,
  elecPrice: number,
  elecConsumption: number,
  desav: number
) {
  const diff = bfCO2 - eafCO2
  if (diff <= 0) return null
  return (desav + elecPrice * elecConsumption) / diff
}

// ── Tooltip ──────────────────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', marginLeft: 5 }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, borderRadius: '50%',
          background: 'var(--bg-elevated)', border: '1px solid var(--border-rule)',
          fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)',
          cursor: 'help', lineHeight: 1,
        }}
      >?</span>
      {show && (
        <div style={{
          position: 'absolute', left: '50%', bottom: '120%', transform: 'translateX(-50%)',
          width: 220, padding: '8px 10px', background: 'var(--ft-slate)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, zIndex: 99,
          fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.55, pointerEvents: 'none',
        }}>
          {text}
        </div>
      )}
    </span>
  )
}

// ── Slider ─────────────────────────────────────────────────────────────────
function SliderRow({ label, tooltip, value, min, max, step, fmt, onChange, accent = false }: {
  label: string; tooltip?: string; value: number; min: number; max: number; step: number
  fmt: (v: number) => string; onChange: (v: number) => void; accent?: boolean
}) {
  return (
    <div style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          {label}{tooltip && <InfoTooltip text={tooltip} />}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, color: accent ? '#BF4E14' : 'var(--text-primary)' }}>
          {fmt(value)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: accent ? '#BF4E14' : '#0F4761' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2 }}>
        <span>{fmt(min)}</span><span>{fmt(max)}</span>
      </div>
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
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.1, color: positive === true ? '#007a3d' : positive === false ? '#cc0000' : 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── Chart SVG ─────────────────────────────────────────────────────────────
function SensChart({ params }: { params: ReturnType<typeof buildParams> }) {
  const { co2, eafCO2, bfCO2, elecPrice, elecConsumption, desav } = params
  const VW = 460, VH = 140
  const PL = 48, PR = 14, PT = 14, PB = 28
  const plotW = VW - PL - PR
  const plotH = VH - PT - PB
  const CO2_MAX = 150

  const pts = Array.from({ length: 31 }, (_, i) => i * 5)
  const vals = pts.map(p => getNet(p, eafCO2, bfCO2, elecPrice, elecConsumption, desav))

  const yPad = 12
  const yLo = Math.min(...vals) - yPad
  const yHi = Math.max(...vals) + yPad

  const toX = (p: number) => PL + (p / CO2_MAX) * plotW
  const toY = (v: number) => PT + (1 - (v - yLo) / (yHi - yLo)) * plotH
  const y0 = Math.max(PT, Math.min(PT + plotH, toY(0)))

  const linePts = pts.map((p, i) => `${toX(p).toFixed(1)},${toY(vals[i]).toFixed(1)}`).join(' ')
  const abovePts = [`${toX(0)},${y0}`, ...pts.map((p, i) => `${toX(p).toFixed(1)},${Math.min(toY(vals[i]), y0).toFixed(1)}`), `${toX(CO2_MAX)},${y0}`].join(' ')
  const belowPts = [`${toX(0)},${y0}`, ...pts.map((p, i) => `${toX(p).toFixed(1)},${Math.max(toY(vals[i]), y0).toFixed(1)}`), `${toX(CO2_MAX)},${y0}`].join(' ')

  const be = getBreakeven(eafCO2, bfCO2, elecPrice, elecConsumption, desav)
  const curNet = getNet(co2, eafCO2, bfCO2, elecPrice, elecConsumption, desav)
  const curY = toY(curNet)

  const rawYTicks = [-50, -25, 0, 50, 100, 150, 200]
  const yTicks = rawYTicks.filter(v => v >= yLo && v <= yHi)

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
      {be !== null && be > 0 && be <= CO2_MAX && (
        <>
          <line x1={toX(be)} x2={toX(be)} y1={PT} y2={PT + plotH} stroke="#C8960A" strokeWidth={1} strokeDasharray="3,3" />
          <text x={toX(be) + 4} y={PT + 9} fontSize={7} fill="#C8960A" fontFamily="'Courier New',monospace">{be.toFixed(1)}</text>
        </>
      )}
      <polyline points={linePts} fill="none" stroke="#0F4761" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={toX(co2)} cy={curY} r={4.5} fill="#BF4E14" />
      <text x={toX(co2)} y={curY - 9} textAnchor="middle" fontSize={8} fill="#BF4E14" fontFamily="'Courier New',monospace" fontWeight="600">
        {curNet >= 0 ? '+' : ''}{curNet.toFixed(0)}
      </text>
      {yTicks.map(v => (
        <text key={v} x={PL - 4} y={toY(v) + 3.5} textAnchor="end" fontSize={7.5} fill={v === 0 ? '#888780' : '#aaa8a2'} fontFamily="'Courier New',monospace">
          {v > 0 ? '+' : ''}{v}
        </text>
      ))}
      {[0, 50, 100, 150].map(p => (
        <text key={p} x={toX(p)} y={VH - 5} textAnchor="middle" fontSize={7.5} fill="#aaa8a2" fontFamily="'Courier New',monospace">{p}</text>
      ))}
      <line x1={PL} x2={PL} y1={PT} y2={VH - PB} stroke="#E0D8CC" strokeWidth={0.5} />
    </svg>
  )
}

// ── Preset button ──────────────────────────────────────────────────────────────
function PresetBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', borderRadius: 2, cursor: 'pointer', fontSize: '0.68rem',
      fontFamily: 'var(--font-sans)',
      border: `1px solid ${active ? 'rgba(13,118,128,0.4)' : 'var(--border)'}`,
      background: active ? 'rgba(13,118,128,0.08)' : 'transparent',
      color: active ? 'var(--ft-teal)' : 'var(--text-muted)',
      transition: 'all 0.15s',
    }}>
      {label}
    </button>
  )
}

// ── Build computed params ──────────────────────────────────────────────────
function buildParams(state: {
  co2: number; fxInt: number; eafCO2: number; bfCO2: number
  elecPrice: number; elecConsumption: number; desav: number
}) {
  return { ...state, fx: state.fxInt / 100 }
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function EAFSensitivityModel() {
  const [co2, setCo2] = useState(50)
  const [fxInt, setFxInt] = useState(110)
  const [eafCO2, setEafCO2] = useState(PRESET_A.eafCO2)
  const [bfCO2, setBfCO2] = useState(PRESET_BF)
  const [elecPrice, setElecPrice] = useState(0)
  const [elecConsumption, setElecConsumption] = useState(2.5)
  const [desav, setDesav] = useState(25)

  const params = buildParams({ co2, fxInt, eafCO2, bfCO2, elecPrice, elecConsumption, desav })
  const { fx } = params

  const netUSD = getNet(co2, eafCO2, bfCO2, elecPrice, elecConsumption, desav)
  const netEUR = netUSD / fx
  const be = getBreakeven(eafCO2, bfCO2, elecPrice, elecConsumption, desav)
  const beEUR = be !== null ? be / fx : null
  const gross = (bfCO2 - eafCO2) * co2
  const elecCost = elecPrice * elecConsumption
  const pos = netUSD >= 0

  const isPresetA = Math.abs(eafCO2 - PRESET_A.eafCO2) < 0.01
  const isPresetB = Math.abs(eafCO2 - PRESET_B.eafCO2) < 0.01
  const isPresetBF = Math.abs(bfCO2 - PRESET_BF) < 0.01

  const bridgeRows = [
    { label: 'Économie carbone brute', value: gross, indent: 0, key: 'gross' },
    ...(elecCost > 0 ? [{ label: 'Coût électricité EAF', value: -elecCost, indent: 1, key: 'elec' }] : []),
    { label: 'Désavantage production initial', value: -desav, indent: 0, key: 'desav' },
    { label: 'AVANTAGE NET EAF', value: netUSD, indent: 0, key: 'total', total: true },
  ] as const

  const reset = () => {
    setCo2(50); setFxInt(110); setEafCO2(PRESET_A.eafCO2)
    setBfCO2(PRESET_BF); setElecPrice(0); setElecConsumption(2.5); setDesav(25)
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)' }}>

      {/* ── Lien retour note ── */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <a
          href="https://investment-case-tau.vercel.app/analyse/eaf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '7px 14px', borderRadius: 2,
            background: 'var(--bg-card)', border: '1px solid var(--border-rule)',
            fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--ft-teal)',
            textDecoration: 'none', transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--ft-teal)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-rule)')}
        >
          ← Note d’investissement EAF
        </a>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          Modèle de sensibilité · 27/05/2026
        </span>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
        <KPICard label="Avantage net EAF" value={`${netUSD >= 0 ? '+' : ''}${netUSD.toFixed(1)} $/t`} sub="acier produit" positive={pos} />
        <KPICard label="Avantage net EAF" value={`${netEUR >= 0 ? '+' : ''}${netEUR.toFixed(1)} €/t`} sub={`taux ${fx.toFixed(2)}`} positive={pos} />
        <KPICard
          label="Seuil de bascule"
          value={be !== null ? `${be.toFixed(1)} $/t` : 'N/A'}
          sub={beEUR !== null ? `≈ ${beEUR.toFixed(1)} €/t CO₂` : 'différentiel nul'}
        />
        <KPICard label="Statut vs BF-BOF" value={pos ? 'Avantage EAF' : 'Désavantage EAF'} sub={`à ${co2} $/t CO₂`} positive={pos} />
      </div>

      <div style={{ borderBottom: '1px solid var(--border-rule)', marginBottom: 24 }}>
        <span style={{ display: 'inline-block', padding: '8px 0', fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--ft-red)', marginBottom: -1 }}>
          Modèle interactif
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 28, alignItems: 'start' }}>

        {/* ── Controls ── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '18px 20px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, marginBottom: 14 }}>Paramètres</p>

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--ft-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>Marché carbone</p>
          <SliderRow
            label="Prix CO₂"
            tooltip="Prix d’une tonne de CO₂ sur le marché carbone (EUA en Europe, ou équivalent). C’est la variable pivot qui transforme l’avantage environnemental de l’EAF en avantage économique."
            value={co2} min={0} max={150} step={5}
            fmt={v => `${v} $/t`} onChange={setCo2} accent
          />
          <SliderRow
            label="Taux $/€"
            tooltip="Taux de change dollar/euro. Utilisé uniquement pour convertir les résultats en euros. N’affecte pas les calculs en dollars."
            value={fxInt} min={85} max={130} step={1}
            fmt={v => (v / 100).toFixed(2)} onChange={setFxInt}
          />

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--ft-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4, marginTop: 16 }}>Intensités CO₂</p>

          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                Émissions EAF (scope 1+2)
                <InfoTooltip text="Tonnes de CO₂ émises par tonne d’acier produit par la route EAF. Dépend principalement du mix électrique du réseau (scope 2). Hyp. A = mix bas-carbone (réseau nucléaire/renouvelable). Hyp. B = mix carbo-intensif (réseau charbon/gaz)." />
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{eafCO2.toFixed(2)} t/t</span>
            </div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
              <PresetBtn label="Hyp. A — 0,30 t" active={isPresetA} onClick={() => setEafCO2(PRESET_A.eafCO2)} />
              <PresetBtn label="Hyp. B — 0,67 t" active={isPresetB} onClick={() => setEafCO2(PRESET_B.eafCO2)} />
            </div>
            <input type="range" min={0.10} max={1.50} step={0.01} value={eafCO2}
              onChange={e => setEafCO2(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#0F4761' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2 }}>
              <span>0,10</span><span>1,50 t/t</span>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                Émissions BF-BOF (scope 1+2)
                <InfoTooltip text="Tonnes de CO₂ émises par tonne d’acier produit par la route haut-fourneau. La moyenne mondiale est de 2,2 t/t. La plage 1,5–3,0 couvre des usines modernes optimisées (bas) jusqu’aux installations vieillissantes avec CHP inclus (haut)." />
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{bfCO2.toFixed(2)} t/t</span>
            </div>
            <div style={{ display: 'flex', gap: 5, marginBottom: 6 }}>
              <PresetBtn label="Standard — 2,20 t" active={isPresetBF} onClick={() => setBfCO2(PRESET_BF)} />
            </div>
            <input type="range" min={1.50} max={3.00} step={0.05} value={bfCO2}
              onChange={e => setBfCO2(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: '#0F4761' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 2 }}>
              <span>1,50</span><span>3,00 t/t</span>
            </div>
          </div>

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--ft-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4, marginTop: 16 }}>Électricité</p>
          <SliderRow
            label="Prix de l’électricité"
            tooltip="Prix industriel de l’électricité payé par l’opérateur EAF, en $/MWh. Ce coût est constant — il n’est pas lié au prix CO₂ dans ce modèle. USA : ~50 $/MWh. Europe : 80–120 $/MWh. Moyen-Orient : ~30–40 $/MWh."
            value={elecPrice} min={0} max={150} step={5}
            fmt={v => `${v} $/MWh`} onChange={setElecPrice}
          />
          <SliderRow
            label="Consommation EAF"
            tooltip="Énergie électrique consommée par tonne d’acier produit. Moyenne mondiale : 2,5 MWh/t (9 GJ/t). EAF Ultra High Power modernes : jusqu’à 1,8 MWh/t. Installations vieillissantes : >3 MWh/t."
            value={elecConsumption} min={1.5} max={3.5} step={0.1}
            fmt={v => `${v.toFixed(1)} MWh/t`} onChange={setElecConsumption}
          />

          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--ft-teal)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4, marginTop: 16 }}>Coûts hors carbone</p>
          <SliderRow
            label="Désavantage initial EAF"
            tooltip="Écart de coût de production EAF vs BF-BOF hors carbone. Columbia Business School (2023) : EAF ~415 $/t vs BF-BOF ~390 $/t, soit 25 $/t. Variable selon la géographie et le cycle du scrap (10–40 $/t sur 2019–2024)."
            value={desav} min={0} max={80} step={5}
            fmt={v => `${v} $/t`} onChange={setDesav}
          />

          <button
            onClick={reset}
            style={{ marginTop: 14, width: '100%', padding: '7px 0', fontFamily: 'var(--font-sans)', fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 2, cursor: 'pointer' }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'var(--bg-elevated)'; (e.target as HTMLButtonElement).style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'transparent'; (e.target as HTMLButtonElement).style.color = 'var(--text-muted)' }}
          >↺ Réinitialiser</button>
        </div>

        {/* ── Right: chart + bridge ── */}
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--text-muted)', textTransform: 'uppercase' as const, margin: 0 }}>
                Avantage net EAF vs BF-BOF ($/t acier)
              </p>
              <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'rgba(0,122,61,0.25)', display: 'inline-block' }} />Avantage</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 14, height: 1, borderTop: '1px dashed #C8960A', display: 'inline-block' }} />Seuil</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#BF4E14', display: 'inline-block' }} />Prix actuel</span>
              </div>
            </div>
            <SensChart params={params} />
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
                padding: `${(row as any).total ? 10 : 8}px ${20 + row.indent * 16}px`,
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
            <div style={{ padding: '12px 20px', background: pos ? 'rgba(0,122,61,0.05)' : 'rgba(204,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Équivalent euros</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: pos ? '#007a3d' : '#cc0000' }}>
                {netEUR >= 0 ? '+' : ''}{netEUR.toFixed(1)} €/t
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── À propos du modèle ── */}
      <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <div style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--ft-teal)', textTransform: 'uppercase' as const, marginBottom: 12 }}>Hypothèses A et B — émissions EAF</p>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderLeft: '3px solid #0F4761', borderRadius: '0 2px 2px 0' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 600, color: '#0F4761', marginBottom: 4 }}>Hypothèse A — 0,30 t CO₂/t acier</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Mix électrique bas-carbone : réseau alimenté majoritairement par le nucléaire ou les renouvelables (France, Suède, Québec). Le scope 1 de l’EAF (arc électrique direct) est quasi nul ; les émissions proviennent essentiellement de la production d’électricité (scope 2). Référence : Global Energy Monitor, 2024.
              </p>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderLeft: '3px solid #BF4E14', borderRadius: '0 2px 2px 0' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 600, color: '#BF4E14', marginBottom: 4 }}>Hypothèse B — 0,67 t CO₂/t acier</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Mix électrique carbo-intensif : réseau dominant charbon ou gaz (Inde, Pologne, Corée, Chine). Les émissions scope 2 de l’EAF montent fortement — l’avantage vs BF-BOF subsiste mais se réduit. Référence : Columbia Business School, 2023 (périmètre scope 1+2, mix mondial moyen).
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4 }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', letterSpacing: '0.12em', color: 'var(--ft-teal)', textTransform: 'uppercase' as const, marginBottom: 12 }}>Le désavantage initial — pourquoi 25 $/t ?</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 10 }}>
            En dehors de tout mécanisme carbone, la route EAF scrap coûte légèrement plus cher à opérer que le BF-BOF. Columbia Business School (2023) estime les coûts complets à <strong>~415 $/t</strong> pour l’EAF contre <strong>~390 $/t</strong> pour le BF-BOF à l’échelle mondiale — soit un écart de 25 $/t défavorable à l’EAF.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 10 }}>
            Cet écart s’explique principalement par le prix du scrap ferraillé, sensible aux cycles industriels et parfois plus coûteux que le minerai de fer + coke du BF-BOF. Il est partiellement compensé par un CAPEX inférieur (pas de haut-fourneau ni de cokerie).
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 300, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Ce désavantage est variable : scrap abondant fin 2025 → &lt;10 $/t. Tension sur le scrap 2021–2022 → &gt;50 $/t. Ajustez le slider selon votre contexte.
          </p>
          <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--bg)', border: '1px solid var(--border-rule)', borderRadius: 2 }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-muted)', lineHeight: 1.55 }}>
              Seuil = (désavantage + coût élec.) ÷ différentiel CO₂<br />
              Défaut : 25 ÷ (2,2 − 0,3) = 13,2 $/t CO₂
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
