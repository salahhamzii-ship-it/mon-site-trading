# Mon Site Trading — Contexte Claude Code

## Stack technique
React 19 + Vite + TypeScript + Tailwind CSS + React Router

## Workflow d'analyse graphique Sierra Chart

### Les 4 graphiques prioritaires

| Fichier PNG | Instrument | Type | Rôle analytique |
|-------------|-----------|------|-----------------|
| `NQ_TPO_RTH.png` | NQ (Nasdaq) | TPO Letters + Value Area | Structure de journée — niveaux clés, POC, VA High/Low |
| `ES_TPO_RTH_OVN.png` | ES (S&P 500) | TPO complet RTH+OVN | Confirmation §9, structure overnight |
| `NQ_30m_AVWAP.png` | NQ (Nasdaq) | Bougies 30min + AVWAP 18h | Biais directionnel principal |
| `ES_30m_AVWAP.png` | ES (S&P 500) | Bougies 30min + AVWAP 18h | Confirmation ES vs NQ |

Dossier local Sierra Chart : `C:\SierraChartImages\`

### Commandes d'analyse rapide

Quand l'utilisateur dit :
- **"Analyse le NQ"** → lire NQ_TPO_RTH.png + NQ_30m_AVWAP.png
- **"Analyse l'ES"** → lire ES_TPO_RTH_OVN.png + ES_30m_AVWAP.png
- **"Vue d'ensemble"** ou **"Tableau de bord"** → lire les 4 graphiques
- **"Biais du jour"** → NQ_30m_AVWAP.png + ES_30m_AVWAP.png en priorité
- **"Structure"** → NQ_TPO_RTH.png + ES_TPO_RTH_OVN.png

### Grille d'analyse TPO

Pour chaque TPO lu, identifier et mentionner :
1. **POC** (Point of Control) — prix le plus échangé
2. **Value Area High / Low** (VAH / VAL)
3. **Singles** (lettres isolées = zones de faible acceptance)
4. **Excess** haut/bas de range
5. **Distribution** : normale / P-shape / b-shape / double distribution
6. **Rotation factor** si visible

### Grille d'analyse AVWAP 30min

Pour chaque AVWAP lu, identifier :
1. **Position prix vs AVWAP** (au-dessus = haussier, en-dessous = baissier)
2. **Pente AVWAP** (montante / plate / descendante)
3. **Distance au AVWAP** (extension possible, retour probable)
4. **Confluence** avec niveaux TPO (VAH/VAL/POC)
5. **Momentum bougies** : corps, mèches, volumes si visible

### Format de réponse attendu

```
BIAIS DIRECTIONNEL : [HAUSSIER / BAISSIER / NEUTRE]

NQ TPO :
- POC : [niveau]
- VA : [VAL] — [VAH]
- Structure : [type]
- Observation : [...]

NQ 30min AVWAP :
- Prix vs AVWAP : [...]
- Biais : [...]

CONFLUENCE NQ/ES : [accord / divergence]

NIVEAUX CLÉS À SURVEILLER :
1. [niveau] — [raison]
2. [niveau] — [raison]

SCÉNARIO PRÉFÉRENTIEL : [description courte]
INVALIDATION : [niveau + raison]
```

## Commandes de développement

```bash
npm run dev      # Serveur local Vite
npm run build    # Build production TypeScript + Vite
npm run lint     # Linter oxlint
npm run preview  # Preview du build
```
