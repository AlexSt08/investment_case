---
name: html-template
description: >
  Utiliser ce skill pour toute demande "transforme en HTML" ou de création d'un article HTML
  suivant la charte graphique αAlex du site investment-case-tau.vercel.app.
  Déclencher aussi quand l'utilisateur demande de mettre en forme un cas d'investissement,
  une analyse ou tout contenu éditorial en HTML pour publication sur le site.
---

# HTML Template — Charte αAlex

## Workflow obligatoire

1. **Avant toute exécution**, demander à l'utilisateur :
   > "Vous fournissez les variables ou je les génère ?"
   Attendre sa validation explicite avant de commencer.

2. **Lire le template** dans `assets/TEMPLATE_analyse_v2.html` — c'est la référence CSS complète.

3. **Encoder l'image** en base64 si elle est fournie en upload (`/mnt/user-data/uploads/`).

4. **Produire le fichier HTML** dans `/mnt/user-data/outputs/` puis appeler `present_files`.

---

## Charte αAlex — Variables CSS

```css
--navy:      #0F4761;   /* titres, h3, texte navy */
--orange:    #BF4E14;   /* h2 + bordures sections */
--gold:      #C8960A;   /* flash-actu, verdict-box */
--rule:      #E0D8CC;   /* bordures fines, kpi-strip */
--body-font: Aptos, Arial, sans-serif;
--mono-font: 'Courier New', Courier, monospace;
max-width:   620px;
```

---

## Variables template

| Variable | Description |
|---|---|
| `{{TITRE}}` | Titre principal — `.doc-title` 16pt bold navy centré |
| `{{SOUS_TITRE}}` | Sous-titre — `.doc-subtitle` 11pt italique navy centré |
| `{{IMAGE_URL}}` | URL ou base64 de l'image d'en-tête |
| `{{IMAGE_ALT}}` | Texte alternatif image |
| `{{LEAD}}` | Paragraphe d'intro — `.lead` italique justifié |
| `{{SOURCES}}` | Liste des sources pour le footer |

---

## Hiérarchie typographique

| Élément | Taille | Style |
|---|---|---|
| `h2` | 13pt | bold orange + bordure bottom |
| `h3` | 11pt | bold navy |
| `p` | 11pt | justifié |
| `ul li` | 10.5pt | justifié |
| `ul li strong` | 10.5pt | bold navy |
| `.verdict-box p` | 12pt | italique blanc justifié |
| `.doc-footer-disclaimer` | 7pt | #8A8A8A centré |
| `.doc-footer-sources` | 7pt | #8A8A8A centré |

---

## Composants optionnels

### Flash Actualité
```html
<div class="flash-actu">
  <div class="flash-label">⚡ Flash Actualité — JJ Mois AAAA</div>
  <p><strong>Titre.</strong> Description de la news.</p>
</div>
```

### KPI Strip (grille fixe 3 colonnes — toujours multiple de 3)
```html
<div class="kpi-strip">
  <div class="kpi-cell">
    <div class="kpi-label">Libellé</div>
    <div class="kpi-value">$00 Md</div>
    <div class="kpi-delta">▲ +00% YoY</div>
  </div>
  <!-- répéter par multiples de 3 -->
</div>
```

### Citation
```html
<div class="quote-block">
  "Texte exact de la citation."
  <cite>— Prénom Nom, Titre, Source, Date</cite>
</div>
```
La `<cite>` doit être en `color: var(--navy)` — lisible.

### Verdict / Recommandation
```html
<div class="verdict-box">
  <div class="verdict-rating">BUY — Conviction Haute</div>
  <p>Texte justifié de la recommandation.</p>
</div>
```
Le `::before` génère automatiquement "RECOMMANDATION" en gold.

### Footer (toujours présent)
```html
<div class="doc-footer">
  <p class="doc-footer-disclaimer">Ce document est produit à des fins d'analyse et d'information uniquement. Il ne constitue pas un conseil en investissement.</p>
  <p class="doc-footer-sources">Sources : {{SOURCES}}</p>
</div>
```

---

## Règles strictes

- **Zéro `style=""` inline** — toute mise en forme via classes CSS
- **Zéro `<span>` parasite** — nettoyer les copier-collers éditeur
- **Zéro `<p><br></p>`** — utiliser les marges CSS
- **Ne jamais modifier le texte fourni** — reproduction exacte
- **Image encodée en base64** si upload local, URL directe si distant
- **KPI strip toujours en multiples de 3** pour maintenir la grille
- **Attendre validation des variables** avant d'exécuter

---

## Référence CSS complète

Le fichier CSS complet est dans `assets/TEMPLATE_analyse_v2.html`.
Lire ce fichier avant toute génération pour garantir la cohérence exacte avec la charte.
