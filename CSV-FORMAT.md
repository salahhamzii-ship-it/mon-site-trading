# CSV-FORMAT — Fichiers Sierra Chart attendus par sc_bridge.js
**Audit lecture seule — aucun fichier modifié**  
**Date :** 2026-09-23

---

## A. NOMS EXACTS DES FICHIERS CSV ATTENDUS

### NQ — 5 fichiers (multi-sources, tous optionnels sauf le principal)

| Clé interne | Nom de fichier | Rôle | Obligatoire |
|---|---|---|---|
| `FILES.NQ` (auto) | `NQ_auto.csv` | Source principale NQ (toutes bougies) | ✅ Oui |
| `NQ_PATHS.main` | `NQ.csv` | Fallback si NQ_auto.csv absent | Non |
| `NQ_PATHS.m30` | `NQ_30min.csv` | 30min enrichi — BidVol/AskVol/Delta | Non mais recommandé |
| `NQ_PATHS.rth` | `NQ_RTH.csv` | RTH uniquement (09:30–16:00) | Non |
| `NQ_PATHS.ovn` | `NQ_OVN.csv` | Overnight uniquement | Non |
| `NQ_PATHS.tpo` | `NQ_TPO.csv` | Colonnes TPO POC/VAH/VAL | Non |

### ES, CL — 1 fichier chacun

| Instrument | Nom de fichier |
|---|---|
| ES | `ES_auto.csv` |
| CL | `CL.csv` |

### ❌ FICHIERS ABSENTS (mission 5 instruments)

| Instrument | Nom attendu si existait | Statut |
|---|---|---|
| NQ 10min | `NQ_10min.csv` | **Aucun chemin défini dans sc_bridge.js** |
| ES 30min | `ES_30min.csv` | **Aucun chemin défini (ES = 1 seul fichier)** |
| ES 10min | `ES_10min.csv` | **Aucun chemin défini dans sc_bridge.js** |
| CL 30min | `CL_30min.csv` | **Aucun chemin défini (CL = 1 seul fichier)** |

**Conclusion : CAS B confirmé.** sc_bridge.js devra être modifié pour ajouter ces 4 chemins.

---

## B. CONFIG EXTERNE POUR LES CHEMINS CSV

**NON.** `sc_bridge.js` n'utilise pas de config.json externe.  
Le `config.json` à la racine du projet est exclusivement pour `nq_bridge.py`.  
Tous les chemins de `sc_bridge.js` sont codés en dur dans le source.

---

## C. CHEMINS COMPLETS ATTENDUS (Windows)

```
C:\SierraChart_CME\Data\NQ_auto.csv        ← source principale NQ
C:\SierraChart_CME\Data\NQ.csv             ← fallback NQ
C:\SierraChart_CME\Data\NQ_30min.csv       ← 30min BidVol/Delta
C:\SierraChart_CME\Data\NQ_RTH.csv         ← RTH uniquement
C:\SierraChart_CME\Data\NQ_OVN.csv         ← OVN uniquement
C:\SierraChart_CME\Data\NQ_TPO.csv         ← TPO POC/VAH/VAL
C:\SierraChart_CME\Data\ES_auto.csv        ← ES principal
C:\SierraChart_CME\Data\CL.csv             ← CL principal
```

**Auto-scan actif :** si ces chemins sont absents, sc_bridge.js scanne automatiquement :
```
C:\SierraChart_CME\Data\
C:\SierraChart\Data\
C:\SierraChart\CME\Data\
C:\Users\{USER}\SierraChart\Data\
C:\Users\{USER}\Documents\SierraChart\Data\
C:\Program Files\SierraChart\Data\
C:\Program Files (x86)\SierraChart\Data\
D:\SierraChart_CME\Data\
D:\SierraChart\Data\
```

---

## D. DISTINCTION DES TIMEFRAMES

**Le bridge ne connaît PAS les numéros de graphiques Sierra Chart (#28, #11, #3, etc.).**

La distinction est uniquement par **nom de fichier** :

| Timeframe | Mécanisme actuel |
|---|---|
| "Toutes bougies" | `NQ_auto.csv` — le bridge lit toutes les lignes sans savoir leur timeframe |
| 30min enrichi | `NQ_30min.csv` — si ce fichier existe, ses barres remplacent NQ_auto.csv pour `bars_today` et `bars_j1` |
| 10min | **Absent** — aucun chemin, aucune logique |

**Implication :** si Sierra Chart exporte le chart #28 (NQ 30min) vers `NQ_30min.csv` ET le chart #11 (NQ 10min) vers `NQ_10min.csv`, il faudra ajouter le chemin `NQ_10min` dans sc_bridge.js pour que les barres 10min soient exposées.

La modification à faire est minimale : ajouter 4 chemins dans `FILES` et `NQ_PATHS`, et exposer les données dans `/data` sous des clés distinctes.

---

## E. OHLC / BOUGIES EXPOSÉS PAR /data

**OUI — barres complètes exposées.** La réponse `/data` contient pour chaque instrument :

| Clé JSON | Contenu |
|---|---|
| `bars_today` | Toutes les barres RTH du jour — tableau d'objets |
| `bars_j1` | Toutes les barres RTH J-1 |
| `bars_asia` | Barres 18h→02h (session Asie) |
| `bars_london` | Barres 02h→08h (session Londres) |

**Format d'une barre :**
```json
{
  "time":  "10:30",
  "open":  "29799.00",
  "high":  "29811.50",
  "low":   "29773.25",
  "close": "29783.00",
  "vol":   33992,
  "bid":   16967,
  "ask":   17025,
  "delta": 58,
  "vwap":  "29677.38",
  "sd1h":  "29700.33",
  "sd1l":  "29654.43",
  "sd2h":  "29723.28",
  "sd2l":  "29631.48"
}
```

---

## F. FORMAT CSV EXACT (colonnes Sierra Chart)

### Format minimal (export standard SC sans études)

```
Date,Time,Open,High,Low,Last,Volume,NumberOfTrades,BidVolume,AskVolume
2026-08-28,09:30,29628.50,29703.25,29562.75,29629.00,61367,4821,31250,30117
```

| Col | Nom | Type | Exemple |
|---|---|---|---|
| 0 | Date | `YYYY-MM-DD` | `2026-08-28` |
| 1 | Time | `HH:MM` | `09:30` |
| 2 | Open | float | `29628.50` |
| 3 | High | float | `29703.25` |
| 4 | Low | float | `29562.75` |
| 5 | Last (Close) | float | `29629.00` |
| 6 | Volume | int | `61367` |
| 7 | NumberOfTrades | int | `4821` |
| 8 | BidVolume | int | `31250` |
| 9 | AskVolume | int | `30117` |

### Format optimal (avec études AVWAP + SD + TPO)

Ajouter ces études dans l'export Sierra Chart pour que le bridge lise les colonnes directement sans les calculer :

```
Date,Time,Open,High,Low,Last,Volume,NumberOfTrades,BidVolume,AskVolume,...,AVWAP 18H,SD+1,SD-1,SD+2,SD-2,SD+3,SD-3,...,TPO POC,TPO VAH,TPO VAL
```

Le bridge détecte les colonnes par **nom d'en-tête** (insensible à la casse, variantes reconnues) :

| Donnée | Noms d'en-tête reconnus |
|---|---|
| VWAP | `vwap`, `vwap(daily)`, `dailyvwap`, `avwap 18h` |
| SD+1 | `sd+1`, `sd +1`, `vwap sd+1`, `+1sd`, `upper band 1` |
| SD-1 | `sd-1`, `sd -1`, `vwap sd-1`, `-1sd`, `lower band 1` |
| SD+2 | `sd+2`, `sd +2`, `vwap sd+2`, `+2sd`, `upper band 2` |
| SD-2 | `sd-2`, `sd -2`, `vwap sd-2`, `-2sd`, `lower band 2` |
| POC | `tpo poc`, `poc`, `point of control` |
| VAH | `tpo vah`, `value area high` |
| VAL | `tpo val`, `value area low` |

**Si SD+1/SD-1 absents** : le bridge les dérive automatiquement depuis SD+2/SD-2.  
**Si AVWAP absent** : calculé depuis les barres OHLC + Volume.  
**Si POC/VAH/VAL absents** : calculés depuis les barres OHLC (méthode Dalton TPO 70%).

### Séparateur et encodage

| Paramètre | Valeur |
|---|---|
| Séparateur | `,` (virgule) — détection auto `,` / `;` / tab |
| Encodage | UTF-8 (BOM supprimé automatiquement) |
| Fins de ligne | CRLF ou LF (normalisé) |
| Format date | `YYYY-MM-DD` (ex: `2026-08-28`) |
| Format heure | `HH:MM` (ex: `09:30`, `16:00`) |

---

## G. CONFIGURATION SIERRA CHART RECOMMANDÉE (5 instruments)

Pour que sc_bridge.js (après modification) lise les 5 instruments demandés, Sierra Chart doit exporter ces fichiers :

| Chart SC | Timeframe | Fichier à exporter | Chemin complet |
|---|---|---|---|
| #28 | NQ 30min | `NQ_30min.csv` | `C:\SierraChart_CME\Data\NQ_30min.csv` |
| #11 | NQ 10min | `NQ_10min.csv` | `C:\SierraChart_CME\Data\NQ_10min.csv` |
| #3  | ES 30min | `ES_30min.csv` | `C:\SierraChart_CME\Data\ES_30min.csv` |
| #15 | ES 10min | `ES_10min.csv` | `C:\SierraChart_CME\Data\ES_10min.csv` |
| #5  | CL 30min | `CL_30min.csv` | `C:\SierraChart_CME\Data\CL_30min.csv` |

**Procédure Sierra Chart (identique pour chaque chart) :**
1. Ouvrir le chart (ex: chart #28, NQ 30min)
2. Menu **Analysis → Auto Export Chart Data**
3. Cocher **Export Data to CSV**
4. **Output File** → saisir le chemin exact (ex: `C:\SierraChart_CME\Data\NQ_30min.csv`)
5. **Export Interval** → `On Bar Close` (mise à jour à chaque bougie fermée)
6. Cliquer **OK**

Répéter pour les 5 charts. Sierra Chart met à jour les CSV automatiquement en temps réel.

---

## H. RÉSUMÉ — CE QUI DOIT ÊTRE FAIT EN TÂCHE 3

**CAS B confirmé.** Modifications minimales à apporter à sc_bridge.js :

1. Ajouter dans `FILES` : `ES30m`, `ES10m`, `CL30m`
2. Ajouter dans `NQ_PATHS` : chemin `NQ_10min.csv`
3. Dans `buildMessage()` : construire les payloads pour les nouvelles timeframes
4. Dans `/data` : exposer `NQ10m`, `ES30m`, `ES10m`, `CL30m` en plus des clés existantes

**Aucune autre modification** — la logique CSV, le parsing, le calcul des SD/VWAP, les snapshots, le J1 cache restent intacts.

---

*⚠️ STOP — valider ce fichier avant toute modification de code.*
