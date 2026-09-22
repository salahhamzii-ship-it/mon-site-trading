# NQ BRIDGE — GUIDE RAPIDE

> Version 2.2 — Septembre 2026  
> Méthode Salah | NQ Futures | Python stdlib uniquement

---

## 1. DÉMARRAGE RAPIDE

**Double-clic sur `start_bridge.bat`**

Le bridge démarre, ouvre le cockpit dans votre navigateur et affiche :
```
NQ Bridge v2.2.0 démarré — port 8766 — source=test
  Cockpit    : http://localhost:8766/cockpit
  Cockpit v3 : http://localhost:8766/cockpit-v3
  NQ Live    : http://localhost:8766/nq-live
  Tracker    : http://localhost:8766/tracker
  Status Page: http://localhost:8766/status-page
```

Laisser la fenêtre ouverte pendant toute la session.

---

## 2. PAGES DISPONIBLES

| URL | Page | Rôle |
|-----|------|------|
| `/cockpit` | cockpit-camel.html | **PAGE PRINCIPALE** — Étude Salah, bornes SD, AVWAP |
| `/cockpit-v3` | cockpit-v3.html | Cockpit complet SD/AVWAP multi-source |
| `/nq-live` | nq-live.html | Dashboard NQ live temps réel |
| `/tracker` | tracker.html | Tracker sessions ALN/IB/SD |
| `/status-page` | status.html | **Diagnostic** — santé du bridge, tunnels, uptime |

---

## 3. CONFIGURATION — `config.json`

Éditer `config.json` avant le premier lancement :

```json
{
  "bridge": {
    "host": "localhost",
    "port": 8766
  },
  "source": {
    "type": "test",
    "csv_path": "C:\\SC\\Data\\NQZ25.scid.csv"
  },
  "tunnels": {
    "ngrok_url": "https://xxx.ngrok-free.dev",
    "cloudflared_url": "https://xxx.cfargotunnel.com"
  },
  "logging": {
    "file": "nq_bridge.log",
    "max_size_mb": 10
  }
}
```

**Types de source :**
| `type` | Description |
|--------|-------------|
| `"test"` | Données oscillantes de démo (défaut) |
| `"csv"` | Lecture CSV Sierra Chart (chemin dans `csv_path`) |
| `"file"` | Lecture fichier JSON exporté par Sierra Chart |
| `"api"` | Appel API broker (IB, Rithmic, Tradovate) |

---

## 4. ARCHITECTURE

```
mon-site-trading/
├── nq_bridge.py          ← SEUL bridge actif (stdlib Python, port 8766)
├── config.json           ← Configuration centralisée
├── cockpit-camel.html    ← Page principale Salah
├── public/
│   ├── cockpit-v3.html
│   ├── nq-live.html
│   ├── tracker.html
│   ├── status.html
│   └── common/
│       └── bridge-client.js  ← Client JS universel (retry, HTTPS, badge)
├── nq_alert/             ← Alertes OVN autonomes (alert.py)
├── tests/                ← Smoke tests (18/18 OK)
│   ├── test_bridge.py
│   └── start_tests.bat
└── legacy/               ← Archivés (sc_bridge.py, sc_bridge.js)
```

**Flux de données :**
```
Sierra Chart CSV → get_nq_data() → /data (JSON) → pages HTML
```

---

## 5. ARRÊT

**Double-clic sur `stop_bridge.bat`**

Arrête uniquement `nq_bridge.py` — ne tue pas les autres processus Python.

---

## 6. BRANCHEMENT SIERRA CHART

Pour passer de `test` à des données réelles :

1. Dans Sierra Chart, exporter les données en CSV (Tools → Export Chart Data)
2. Éditer `config.json` → `"source": {"type": "csv", "csv_path": "C:\\chemin\\vers\\NQZ25.csv"}`
3. Relancer le bridge
4. Vérifier `/status-page` → "source : csv"

Le bridge relira le CSV à chaque appel de `/data`.

---

## 7. HTTPS / ACCÈS DISTANT

Pour accéder depuis un téléphone ou une machine distante :

1. Lancer ngrok : `ngrok http 8766`
2. Copier l'URL `https://xxx.ngrok-free.dev` dans `config.json → tunnels.ngrok_url`
3. Relancer le bridge
4. Ouvrir `/status-page` → bouton "Tester" pour valider le tunnel

Le client JS (`bridge-client.js`) détecte automatiquement HTTPS et bascule sur le tunnel.

---

## 8. DIAGNOSTIC

| URL | Description |
|-----|-------------|
| `/status-page` | Page visuelle : uptime, source, tunnels, erreurs |
| `/status` | JSON brut du diagnostic |
| `/health` | `{"status":"ok"}` — ping simple |

---

## 9. TESTS

```bash
python tests/test_bridge.py -v
```
Ou sous Windows : double-clic `tests/start_tests.bat`

18 tests : redirections, pages HTML, données, headers, CORS.

---

## 10. RÉSOLUTION DES PROBLÈMES

| Problème | Solution |
|----------|----------|
| Badge OFFLINE | Lancer `start_bridge.bat` |
| "Python introuvable" | Installer Python depuis python.org (cocher "Add to PATH") |
| "Port 8766 déjà utilisé" | Lancer `stop_bridge.bat`, puis relancer |
| Chrome bloque localhost | Utiliser `http://` pas `https://` pour accès local |
| Données "stale" (badge orange) | La source CSV est inaccessible — vérifier `csv_path` dans config.json |
| Cockpit vide au démarrage | Bridge non lancé ou `/data` retourne 503 — voir `/status-page` |
| Safari crash (iOS/Mac) | Bug connu corrigé — polyfill `AbortSignal` intégré |

---

## 11. FICHIERS DE LOG

`nq_bridge.log` (racine du projet) — rotation automatique, 10 MB max, 3 archives.

---

*Ligiste du désert. Héritier de Dalton, Dorian, Josh et du Texan.*  
*"Vivons cachés, vivons heureux." 🐪*
