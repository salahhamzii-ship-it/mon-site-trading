# SC BRIDGE — HANDOFF CLAUDE CODE
*Document de passation technique — mis à jour le 2026-09-06*

---

## ARCHITECTURE GLOBALE

```
Sierra Chart (Windows)
  └── Write Bar and Study Data To File (study)
        └── CSV → C:\SierraChart_CME\Data\*.csv.txt
              └── sc_bridge.js (Node.js :8766)
                    └── ngrok tunnel permanent
                          └── hatbox-placidly-crabmeat.ngrok-free.dev
                                └── api/bridge-data.ts (Vercel serverless)
                                      └── Frontend React (Vercel)
```

---

## FICHIERS DU PROJET

| Fichier | Rôle |
|---------|------|
| `sc_bridge.js` | Bridge principal — lit CSV, calcule TPO, sert JSON HTTP :8766 |
| `startup_bridge.bat` | Lanceur Windows — installe deps, kill anciens process, démarre bridge + ngrok |
| `watchdog_bridge.ps1` | Watchdog — vérifie /health toutes les 5 min, redémarre si mort, notif Windows |
| `api/bridge-data.ts` | Proxy Vercel → ngrok → bridge |
| `src/pages/Status.tsx` | Page /status — monitoring LIVE/STALE par instrument |

---

## CHEMINS WINDOWS (FIXES — NE PAS CHANGER)

| Instrument | CSV Sierra Chart |
|------------|-----------------|
| NQ | `C:\SierraChart_CME\Data\NQ.csv.txt` |
| ES | `C:\SierraChart_CME\Data\ES_auto.csv.txt` |
| GC | `C:\SierraChart_CME\Data\GC.csv.txt` |
| CL | `C:\SierraChart_CME\Data\CL.csv.txt` |
| Snapshot JSON | `C:\SierraChart_CME\Data\sc_snapshot.json` |
| Logs watchdog | `C:\SierraChart_CME\Logs\watchdog.log` |
| Startup bat | `C:\SierraChart_CME\startup_bridge.bat` |
| Watchdog ps1 | `C:\SierraChart_CME\watchdog_bridge.ps1` |

---

## NGROK

- Tunnel permanent : `hatbox-placidly-crabmeat.ngrok-free.dev`
- Authtoken stocké dans `%USERPROFILE%\.ngrok2\ngrok.yml` (ou équivalent)
- Commande : `ngrok http 8766 --domain=hatbox-placidly-crabmeat.ngrok-free.dev`

---

## TASK SCHEDULER WINDOWS (2 tâches)

| Tâche | Déclencheur | Action |
|-------|-------------|--------|
| `SC Bridge NQ` | Au démarrage Windows | `startup_bridge.bat` — RunLevel Highest |
| `SC Bridge Watchdog` | Toutes les 5 min | `watchdog_bridge.ps1` — RunLevel Highest |

Vérification : `Get-ScheduledTask -TaskName "SC Bridge NQ"` et `"SC Bridge Watchdog"`

---

## sc_bridge.js — FONCTIONS CLÉS

| Fonction | Rôle |
|----------|------|
| `parseCsv(filepath)` | Lit CSV Sierra Chart, autodetect colonnes, retourne rows[] |
| `buildPayload(instr, rows, extraSources)` | Construit le JSON d'un instrument (settle, VAH, VAL, POC, SD, barres...) |
| `calcTpoFromBars(bars)` | Calcule POC/VAH/VAL Dalton depuis barres OHLC si Sierra Chart n'exporte pas TPO |
| `saveSnapshot(data)` | Sauvegarde JSON après chaque refresh (survie weekends) |
| `loadSnapshot()` | Restaure depuis JSON si CSV absent/vide |
| `buildMessage()` | Assemble NQ+ES+GC+CL, applique snapshot fallback, retourne JSON |
| `refreshAndBroadcast()` | Appelé toutes les 10s — rebuild + broadcast WS |

---

## NQ — MULTI-SOURCES

NQ lit plusieurs fichiers optionnels (si présents) :

| Clé | Chemin | Rôle |
|-----|--------|------|
| `main` | `NQ.csv.txt` | Source principale (auto) |
| `m30` | `NQ_30min.csv.txt` | Barres 30 min dédiées |
| `rth` | `NQ_RTH.csv.txt` | RTH seul |
| `ovn` | `NQ_OVN.csv.txt` | Overnight |
| `tpo` | `NQ_TPO.csv.txt` | TPO Sierra Chart natif (priorité maximale pour POC/VAH/VAL) |

ES/GC/CL : fichier unique, TPO calculé automatiquement depuis barres.

---

## SIERRA CHART — CONFIG PAR INSTRUMENT

Sur chaque chart : **Analysis → Write Bar and Study Data to File**

| Paramètre | Valeur |
|-----------|--------|
| Write Bar Data to File | Yes |
| Write Header Line | Yes |
| Include Hidden Studies | Yes |
| Include Hidden Subgraphs | No |
| Path and File Name | (voir tableau chemins ci-dessus) |

---

## PAYLOAD JSON — STRUCTURE PAR INSTRUMENT

```json
{
  "NQ": {
    "last": "29509.25",
    "settle": "29509.25",
    "high": "29811.50",
    "low": "29436.25",
    "poc": "29506.75",
    "vah": "29595.75",
    "val": "29493.00",
    "vwap": "...",
    "sd1h": "...", "sd1l": "...", "sd2h": "...", "sd2l": "...",
    "ovn_high": "...", "ovn_low": "...",
    "bars_today": [...],
    "bars_j1": [...],
    "_from_snapshot": false
  }
}
```

`_from_snapshot: true` = données issues du cache JSON (marché fermé).

---

## PAGE /STATUS

- Route : `/status`
- Composant : `src/pages/Status.tsx`
- Fetch : `/api/bridge-data` toutes les 30s
- STALE threshold : 15 min
- Affiche : LIVE / STALE / PAS DE CSV par instrument + Bridge UP/DOWN

---

## CE QUI POURRAIT ÊTRE AMÉLIORÉ (FUTURE)

- Ajouter NQ_TPO.csv.txt dans Sierra Chart pour POC/VAH/VAL natif plus précis
- Ajouter ES_TPO.csv.txt si besoin de TPO Sierra Chart pour ES
- Historique multi-jours (actuellement J-1 only)
- Dashboard /status avec graphe uptime
- Export snapshot vers Vercel KV pour partage multi-device

---

## ÉTAT AU 2026-09-06

- ✅ Bridge opérationnel NQ + ES + GC + CL
- ✅ Boot automatique Windows
- ✅ Watchdog + notification Windows
- ✅ Snapshot weekends/fériés
- ✅ Page /status monitoring
- ✅ Déployé Vercel production
