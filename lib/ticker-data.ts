// ── Univers de couverture statique ───────────────────────────────────────
// Données pré-validées pour les sociétés de l'univers αAlex.
// Priorité absolue : ces valeurs ne déclenchent aucun appel API.
// Mettre à jour manuellement après chaque publication de résultats.

export interface StaticTickerData {
  ticker:            string
  companyName:       string
  revenueTTM:        number   // $B
  grossMargin:       number   // ex: 0.75
  fcfMargin:         number   // non-GAAP trailing
  mktCap:            number   // $B (approximatif — mis à jour manuellement)
  netCash:           number   // $B
  sbc:               number   // $B annualisé
  nrr:               number | null  // null = non publié / inconnu
  lastUpdated:       string   // YYYY-MM-DD
  fiscalYearEnd:     string   // ex: '31-Jan', '31-Dec'
  source:            'manual'
}

export const STATIC_UNIVERSE: StaticTickerData[] = [
  {
    ticker:        'SNOW',
    companyName:   'Snowflake Inc.',
    revenueTTM:    4.68,
    grossMargin:   0.75,
    fcfMargin:     0.26,
    mktCap:        57.0,
    netCash:       3.5,
    sbc:           5.0,
    nrr:           1.26,
    lastUpdated:   '2026-05-20',
    fiscalYearEnd: '31-Jan',
    source:        'manual',
  },
  {
    ticker:        'NOW',
    companyName:   'ServiceNow Inc.',
    revenueTTM:    13.1,
    grossMargin:   0.82,
    fcfMargin:     0.32,
    mktCap:        175.0,
    netCash:       1.0,
    sbc:           3.2,
    nrr:           1.08,
    lastUpdated:   '2026-05-20',
    fiscalYearEnd: '31-Dec',
    source:        'manual',
  },
  {
    ticker:        'DDOG',
    companyName:   'Datadog Inc.',
    revenueTTM:    2.68,
    grossMargin:   0.81,
    fcfMargin:     0.28,
    mktCap:        38.0,
    netCash:       2.8,
    sbc:           1.4,
    nrr:           1.19,
    lastUpdated:   '2026-05-20',
    fiscalYearEnd: '31-Dec',
    source:        'manual',
  },
  {
    ticker:        'NET',
    companyName:   'Cloudflare Inc.',
    revenueTTM:    1.74,
    grossMargin:   0.79,
    fcfMargin:     0.14,
    mktCap:        35.0,
    netCash:       1.6,
    sbc:           1.0,
    nrr:           1.17,
    lastUpdated:   '2026-05-20',
    fiscalYearEnd: '31-Dec',
    source:        'manual',
  },
  {
    ticker:        'MDB',
    companyName:   'MongoDB Inc.',
    revenueTTM:    2.01,
    grossMargin:   0.74,
    fcfMargin:     0.18,
    mktCap:        20.0,
    netCash:       1.5,
    sbc:           0.6,
    nrr:           1.20,
    lastUpdated:   '2026-05-20',
    fiscalYearEnd: '31-Jan',
    source:        'manual',
  },
  {
    ticker:        'CFLT',
    companyName:   'Confluent Inc.',
    revenueTTM:    0.98,
    grossMargin:   0.76,
    fcfMargin:     0.08,
    mktCap:        8.5,
    netCash:       1.2,
    sbc:           0.5,
    nrr:           1.25,
    lastUpdated:   '2026-05-20',
    fiscalYearEnd: '31-Dec',
    source:        'manual',
  },
  {
    ticker:        'ZS',
    companyName:   'Zscaler Inc.',
    revenueTTM:    2.45,
    grossMargin:   0.79,
    fcfMargin:     0.22,
    mktCap:        30.0,
    netCash:       2.1,
    sbc:           0.9,
    nrr:           1.19,
    lastUpdated:   '2026-05-20',
    fiscalYearEnd: '31-Jul',
    source:        'manual',
  },
  {
    ticker:        'CRM',
    companyName:   'Salesforce Inc.',
    revenueTTM:    37.9,
    grossMargin:   0.77,
    fcfMargin:     0.31,
    mktCap:        255.0,
    netCash:       5.0,
    sbc:           4.2,
    nrr:           1.10,
    lastUpdated:   '2026-05-20',
    fiscalYearEnd: '31-Jan',
    source:        'manual',
  },
]

// NRR lookup pour les tickers hors univers statique
export const NRR_LOOKUP: Record<string, number> = {
  SNOW: 1.26, DDOG: 1.19, NET:  1.17, MDB:  1.20,
  BILL: 1.08, ZS:   1.19, CFLT: 1.25, GTLB: 1.24,
  NOW:  1.08, CRM:  1.10, WDAY: 1.09, HUBS: 1.11,
  ESTC: 1.13, NCNO: 1.09, BRZE: 1.14, PCTY: 1.12,
}

export function getStaticData(ticker: string): StaticTickerData | null {
  return STATIC_UNIVERSE.find(d => d.ticker === ticker.toUpperCase()) ?? null
}

export function getStaticNrr(ticker: string): number | null {
  return NRR_LOOKUP[ticker.toUpperCase()] ?? null
}
