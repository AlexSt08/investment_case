// ── Model Registry ────────────────────────────────────────────────────────
// Add new models here — the page auto-generates from this list.

export interface Model {
  slug: string
  title: string
  subtitle: string
  description: string
  category: 'Valorisation' | 'SaaS Metrics' | 'Macro' | 'Credit'
  tags: string[]
  complexity: 'Fondamental' | 'Intermédiaire' | 'Avancé'
  ticker?: string        // Example company used in the model
  status: 'live' | 'soon'
  publishedAt?: string
}

export const MODELS: Model[] = [
  {
    slug: 'cohort-dcf',
    title: 'Cohort DCF — API Companies',
    subtitle: 'Valorisation par cohorte vs méthode SaaS classique',
    description:
      'Framework complet de valorisation pour les entreprises à modèle API/consommation. ' +
      'Décompose la valeur en NPV base existante, Terminal Value, et moteur d\'acquisition. ' +
      'Démontre pourquoi NRR > WACC crée une série divergente — et pourquoi le multiple EV/Rev standard sous-valorise ces businesses.',
    category: 'Valorisation',
    tags: ['NRR', 'Cohort', 'DCF', 'SaaS', 'API', 'Consommation'],
    complexity: 'Avancé',
    ticker: 'SNOW',
    status: 'live',
    publishedAt: '2026-05-23',
  },
  {
    slug: 'eaf-sensitivity',
    title: 'EAF vs BF-BOF — Sensibilité carbone',
    subtitle: 'Avantage compétitif EAF selon prix CO₂, mix électrique et géographie',
    description:
      'Calcule l\'avantage net de la route EAF scrap vs BF-BOF en fonction du prix carbone, ' +
      'du mix électrique (hypothèse A bas-carbone / B carbo-intensif) et du contexte géographique ' +
      '(global vs Europe avec corrélation ETS/électricité). Issu du teaching case EAF B-T v7.',
    category: 'Macro',
    tags: ['EAF', 'BF-BOF', 'Carbone', 'Décarbonation', 'CBAM', 'Acier'],
    complexity: 'Intermédiaire',
    status: 'live',
    publishedAt: '2026-05-28',
  },
  {
    slug: 'ltv-cac',
    title: 'LTV / CAC — Framework étendu',
    subtitle: 'Unit economics avec ajustement expansion revenue',
    description:
      'Modèle LTV/CAC adapté aux API companies. Intègre le net expansion rate dans le calcul du LTV, ' +
      'démontre pourquoi le LTV classique sous-estime la valeur, et calibre le payback period ajusté.',
    category: 'SaaS Metrics',
    tags: ['LTV', 'CAC', 'Unit Economics', 'Churn', 'Expansion'],
    complexity: 'Intermédiaire',
    ticker: 'DDOG',
    status: 'soon',
  },
  {
    slug: 'saas-rule-of-40',
    title: 'Rule of 40 — Anatomie',
    subtitle: 'Décomposition et re-pondération qualité-revenue',
    description:
      'Déconstruction du Rule of 40 standard. Version améliorée pondérant l\'expansion revenue ' +
      '1.5x vs la croissance en nouveaux logos, avec scoring comparatif sur l\'univers SaaS coté.',
    category: 'SaaS Metrics',
    tags: ['Rule of 40', 'FCF', 'Growth', 'NRR'],
    complexity: 'Fondamental',
    status: 'soon',
  },
  {
    slug: 'spinoff-valuation',
    title: 'Spinoff — Analyse pré/post séparation',
    subtitle: 'Framework de re-rating post-spinoff (12-18 mois)',
    description:
      'Modélisation du mispricing systématique des spinoffs : forced selling indices, ' +
      'analyst coverage ramp, management incentives post-séparation. ' +
      'Calcul du re-rating potentiel sur 18 mois.',
    category: 'Valorisation',
    tags: ['Spinoff', 'Catalyseur', 'Event-Driven', 'Re-rating'],
    complexity: 'Avancé',
    status: 'soon',
  },
]

export function getModel(slug: string): Model | undefined {
  return MODELS.find((m) => m.slug === slug)
}

export const CATEGORIES = ['Tous', 'Valorisation', 'SaaS Metrics', 'Macro', 'Credit'] as const
export const COMPLEXITIES = ['Tous', 'Fondamental', 'Intermédiaire', 'Avancé'] as const
