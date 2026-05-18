# AlphaBrief — Investment Cases Platform

Publication de cas d'investissement sur actions américaines.
Stack : **Next.js 14** · **Supabase** · **TipTap** · **Vercel**

---

## Architecture

```
Pages publiques
  /                      → Homepage avec analyses featured + récentes
  /analyses              → Liste filtrée par secteur / rating / recherche
  /analyse/[slug]        → Article complet (TipTap → HTML server-side)
  /secteurs              → Index de tous les secteurs
  /secteur/[slug]        → Analyses d'un secteur
  /tickers               → Index des sociétés par secteur
  /ticker/[TICKER]       → Fiche société + ses analyses

Interface admin (auth requise)
  /admin                 → Dashboard (stats + tableau des analyses)
  /admin/nouveau         → Créer une analyse (éditeur TipTap)
  /admin/editer/[id]     → Éditer une analyse existante
  /admin/societes        → Gérer l'univers de couverture (tickers)
  /admin/login           → Connexion
```

---

## 1. Supabase

1. Crée un projet sur [supabase.com](https://supabase.com)
2. Va dans **SQL Editor** et exécute le fichier `supabase_schema.sql`
3. Va dans **Authentication → Users** et crée ton compte admin
4. Récupère `Project URL` et `anon public key` dans **Settings → API**

---

## 2. Variables d'environnement

Copie `.env.example` → `.env.local` :

```bash
cp .env.example .env.local
```

Remplis :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 3. Développement local

```bash
npm install
npm run dev
# → http://localhost:3000
# → http://localhost:3000/admin/login
```

---

## 4. Déploiement Vercel

```bash
# Depuis GitHub (recommandé)
# 1. Push le repo sur GitHub
# 2. Import sur vercel.com → "New Project"
# 3. Ajoute les env vars dans Vercel Dashboard → Settings → Environment Variables
#    NEXT_PUBLIC_SUPABASE_URL
#    NEXT_PUBLIC_SUPABASE_ANON_KEY
# 4. Deploy → done
```

Ou via CLI :
```bash
npm i -g vercel
vercel
```

---

## 5. Workflow de publication

1. Connecte-toi sur `/admin/login`
2. Va dans **Sociétés** → ajoute le ticker (ex: NVDA, AAPL…)
3. Clique **+ Nouvelle analyse**
4. Rédige dans l'éditeur TipTap (H1/H2/H3, tableaux, citations, liens)
5. Dans la sidebar : choisis Rating, Horizon, Ticker, Secteur
6. **Sauvegarder brouillon** pour ne pas publier, ou **▲ Publier** pour mettre en ligne immédiatement
7. La page se régénère automatiquement (ISR 60s)

---

## 6. Liens automatiques

- Chaque ticker (ex: `NVDA`) dans `/admin/societes` crée automatiquement une page `/ticker/NVDA`
- Chaque secteur dans la DB crée une page `/secteur/technology`
- Les analyses sont cross-linkées via les badges-tickers cliquables sur chaque carte

---

## 7. Personnalisation

**Nom du site** : cherche `AlphaBrief` dans `components/Nav.tsx`, `pages/index.tsx`

**Couleurs** : modifie les variables CSS dans `styles/globals.css` (`:root`)

**Disclaimer légal** : modifie le footer dans `pages/index.tsx`

**Secteurs** : ajoute/modifie dans `supabase_schema.sql` (section seed) ou directement en SQL dans Supabase

---

## Structure des fichiers

```
investment-platform/
├── components/
│   ├── Nav.tsx           → Navigation sticky
│   ├── CaseCard.tsx      → Carte d'analyse (grille)
│   ├── RichEditor.tsx    → Éditeur TipTap
│   └── CaseEditor.tsx    → Formulaire complet nouveau/édition
├── lib/
│   └── supabase.ts       → Client + types + queries
├── pages/
│   ├── index.tsx         → Homepage
│   ├── analyses.tsx      → Liste avec filtres
│   ├── secteurs.tsx      → Index secteurs
│   ├── tickers.tsx       → Index tickers
│   ├── analyse/[slug].tsx
│   ├── secteur/[slug].tsx
│   ├── ticker/[ticker].tsx
│   └── admin/
│       ├── index.tsx     → Dashboard
│       ├── login.tsx
│       ├── nouveau.tsx
│       ├── societes.tsx
│       └── editer/[id].tsx
├── styles/
│   └── globals.css       → Design system complet
├── supabase_schema.sql   → Schema DB + RLS + seed
└── .env.example
```
