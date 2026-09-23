# RAPPORT AUDIT — sc_bridge.js
**Fichier analysé :** `legacy/sc_bridge.js` (1 397 lignes)  
**Date audit :** 2026-09-23  
**Statut :** Lecture seule — aucun fichier modifié

---

## A. MÉTHODE DE CONNEXION À SIERRA CHART

| Mécanisme | Détail |
|---|---|
| **Source primaire** | Lecture CSV sur disque Windows |
| **Déclenchement** | `fs.watch` sur les CSV → refresh immédiat (debounce 300ms) + boucle toutes les 3s |
| **Push CSV** | `POST /upload/:instr` — Sierra Chart (ou script externe) pousse le CSV via HTTP |
| **Ordres (SIM)** | WebSocket DTC vers SC port 11099 (`POST /order`) — trading seulement |

**Aucun flux DTC de cotation.** Les prix viennent exclusivement des CSV exportés par Sierra Chart.

---

## B. ENDPOINTS HTTP / WS

| Méthode | URL | Rôle |
|---|---|---|
| GET | `/data` | **Payload JSON complet** — tous les instruments |
| GET | `/health` | `"ok"` — ping simple |
| GET | `/scan` | Scan des dossiers SC → liste les CSV trouvés |
| GET | `/` ou `/tracker` | Sert `suivi_sd_nq.html` |
| POST | `/upload/:instr` | Reçoit CSV brut pour NQ / ES / GC / CL |
| POST | `/order` | Envoie ordre DTC à Sierra Chart (SIM) |
| WS | `ws://0.0.0.0:8765` | Push JSON à chaque refresh → clients WebSocket |

---

## C. FORMAT JSON — GET /data

```json
{
  "NQ": {
    "last":         "29509.25",
    "lastUpdate":   "2026-08-28T20:00:00.000Z",
    "last_csv_date":"2026-08-28",

    "j1_high":   "29811.50",
    "j1_low":    "29436.25",
    "j1_open":   "...",
    "j1_settle": "29509.25",
    "poc":  "29533.50",
    "vah":  "29708.00",
    "val":  "29401.00",

    "vwap":  "29570.82",
    "sd1h":  "29608.08",
    "sd1l":  "29533.56",
    "sd2h":  "29645.34",
    "sd2l":  "29496.30",

    "ovn_vwap": "...",
    "ovn_sd1h": "...", "ovn_sd1l": "...",
    "ovn_sd2h": "...", "ovn_sd2l": "...",
    "ovn_sd3h": "...", "ovn_sd3l": "...",

    "asia_high":  "...", "asia_low":  "...", "asia_close":  "...",
    "lon_high":   "...", "lon_low":   "...", "lon_close":   "...",
    "ovn_high":   "...", "ovn_low":   "...", "ovn_close":   "...",
    "ovn_poc":    "...", "ovn_vah":   "...", "ovn_val":     "...",

    "avwap_side": "below",
    "laf_sd2":    false,
    "lbf_sd2":    false,
    "par9":       "below",
    "atr_auto":   "375.40",

    "bars_today":  [ {"time":"09:30","open":"...","high":"...","low":"...","close":"...","vol":61367,"bid":31250,"ask":30117,"delta":-1133,"vwap":"...","sd1h":"...","sd1l":"...","sd2h":"...","sd2l":"..."} ],
    "bars_j1":     [...],
    "bars_asia":   [...],
    "bars_london": [...]
  },
  "ES": { /* même structure */ },
  "GC": { /* même structure */ },
  "CL": { /* même structure */ }
}
```

---

## D. MONO vs MULTI-INSTRUMENTS

**MULTI-INSTRUMENT natif.** Instruments gérés : NQ, ES, GC, CL.

| Instrument | Fichier principal attendu |
|---|---|
| NQ | `C:\SierraChart_CME\Data\NQ_auto.csv` |
| NQ 30min | `C:\SierraChart_CME\Data\NQ_30min.csv` (source enrichie) |
| NQ RTH | `C:\SierraChart_CME\Data\NQ_RTH.csv` |
| NQ OVN | `C:\SierraChart_CME\Data\NQ_OVN.csv` |
| NQ TPO | `C:\SierraChart_CME\Data\NQ_TPO.csv` |
| ES | `C:\SierraChart_CME\Data\ES_auto.csv` |
| GC | `C:\SierraChart_CME\Data\GC.csv` |
| CL | `C:\SierraChart_CME\Data\CL.csv` |

Auto-découverte active : scan de 9 dossiers Sierra Chart connus si les chemins par défaut sont absents.

---

## E. IDENTIFICATION DES GRAPHIQUES (CHART ID)

**Le bridge ne connaît PAS les numéros de graphiques Sierra Chart.**

Aucune référence à chart #28, #11, #3, #15, #5 dans le code.  
L'identification est uniquement par **nom de fichier CSV** :
- `NQ_auto.csv` → instrument NQ, toutes timeframes confondues
- `NQ_30min.csv` → source enrichie 30min (BidVol/AskVol)
- Aucun fichier 10min dédié → **NQ 10min et ES 10min absents**

Pour distinguer les timeframes, Sierra Chart doit exporter des fichiers distincts :
`NQ_10min.csv`, `ES_30min.csv`, `ES_10min.csv`, `CL_30min.csv`

---

## F. CAPACITÉS DONNÉES — INVENTAIRE COMPLET

| Donnée | Disponible | Source |
|---|---|---|
| Dernier prix (last) | ✅ | CSV colonne `Last/Close` |
| OHLC par barre | ✅ | Colonnes standard SC |
| Volume par barre | ✅ | Colonne 6 |
| BidVol / AskVol / Delta | ✅ | Colonnes 8-9 SC (fallback positionnel) |
| VWAP (AVWAP ancré 18h) | ✅ | Lu dans CSV + calculé si absent |
| SD±1 / SD±2 | ✅ | Lus dans CSV + dérivés formule si absents |
| SD±3 | ✅ | Lu CSV ou calculé depuis σ = SD+1 − AVWAP |
| POC / VAH / VAL (TPO) | ✅ | Lus CSV ou calculés depuis barres OHLC |
| Barres J-1 RTH | ✅ | Filtrage par date |
| Sessions Asie / Londres / OVN | ✅ | Découpage horaire NY |
| J1 settle / high / low | ✅ | Agrégation RTH J-1 |
| LAF SD+2 / LBF SD-2 | ✅ | Détection transition sur 2 barres |
| §9 (NQ + ES alignés) | ✅ | Calculé automatiquement |
| ATR auto (10 sessions) | ✅ | Calculé depuis barres historiques |
| Alertes Windows (toast) | ✅ | PowerShell, Windows seulement |
| J1 cache (survie reset 18h) | ✅ | `j1_cache.json` — 7 jours conservés |
| Snapshot fallback | ✅ | `sc_snapshot.json` — rechargé si CSV absent |
| Ordres DTC (SIM) | ✅ | WS port 11099 Sierra Chart |

---

## G. LACUNES PAR RAPPORT À LA MISSION (5 INSTRUMENTS)

| Instrument demandé | Statut actuel | Ce qui manque |
|---|---|---|
| NQ 30min (chart #28) | ✅ Partiel | Chemin `NQ_30min.csv` présent mais non garanti d'exister |
| **NQ 10min (chart #11)** | ❌ Absent | Aucun chemin ni logique 10min |
| ES 30min (chart #3) | ⚠️ Partiel | ES n'a qu'un seul CSV — pas de séparation 30min |
| **ES 10min (chart #15)** | ❌ Absent | Aucun chemin ni logique 10min |
| CL 30min (chart #5) | ⚠️ Partiel | CL n'a qu'un seul CSV — pas de séparation 30min |

**Note :** Le code tourne sur le port 8766 (HTTP) et 8765 (WS). `nq_bridge.py` tourne aussi sur 8766.  
Les deux bridges ne peuvent pas cohabiter sur le même port.

---

## H. RÉSUMÉ DÉCISION POUR L'ÉTAPE 2

| Question | Réponse |
|---|---|
| Peut-on réutiliser sc_bridge.js ? | Oui — le cœur CSV→JSON est solide et multi-instruments |
| Faut-il modifier sc_bridge.js ? | Oui — ajouter chemins ES_30min, NQ_10min, ES_10min, CL_30min |
| Conflit de port avec nq_bridge.py ? | Oui — l'un des deux doit changer de port ou être désactivé |
| Sierra Chart doit exporter quoi ? | 5 CSV : NQ_30min, NQ_10min, ES_30min, ES_10min, CL_30min |
| Le frontend peut-il lire /data tel quel ? | Oui — format JSON déjà compatible, il faut ajouter les clés par timeframe |
