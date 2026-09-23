# NQ BRIDGE — GUIDE RAPIDE

> Version 2.2 — Septembre 2026  
> Méthode Salah | NQ Futures | Python stdlib uniquement

---

## 1. DÉMARRAGE RAPIDE

**Double-clic sur `start_bridge.bat`**

Le bridge démarre, ouvre le cockpit dans votre navigateur et affiche :
```
NQ Bridge v2.2.0 démarré — port 8766 — source=test
  App React  : http://localhost:8766/
  Cockpit    : http://localhost:8766/#/cockpit
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
| `/` ou `/#/cockpit` | React App | **PAGE PRINCIPALE** — Cockpit NQ (servi depuis dist/) |
| `/cockpit` | → redirige vers `/#/cockpit` | Alias pratique |
| `/cockpit-v3` | cockpit-v3.html | Cockpit complet SD/AVWAP multi-source |
| `/nq-live` | nq-live.html | Dashboard NQ live temps réel |
| `/tracker` | tracker.html | Tracker sessions ALN/IB/SD |
| `/status-page` | status.html | **Diagnostic** — santé du bridge, tunnels, uptime |

> **Note** : l'app React est servie en local depuis `dist/` par `nq_bridge.py`.
> Vercel n'est plus utilisé pour l'usage quotidien.

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

## 12. ALARME NOCTURNE FIABLE (indépendante du navigateur)

Fichier : `alarm_service.py`  
Surveille `/data` du bridge toutes les 3s.  
Entre **18h–06h NY** : popup Windows modale + son en boucle si NQ touche un band SD (±15 pts).

### Installation (une seule fois)

```
Double-clic : install_alarm.bat
```

Essaie 3 méthodes dans l'ordre :
1. Task Scheduler `onlogon` avec droits admin
2. Task Scheduler `onlogon` droits standard
3. Dossier Startup Windows (VBS silencieux, fallback garanti)

L'alarme se lance automatiquement à chaque connexion Windows.

### Tests

```
python alarm_service.py --test-sound    → son strident 5 secondes
python alarm_service.py --test-popup    → popup modale au premier plan
python alarm_service.py --test-trigger  → son + popup simultanés (cliquer OK pour arrêter)
```

Faire les 3 tests après installation pour valider audio + affichage.

### Comportement nocturne (18h–06h NY)

| Condition | Action |
|---|---|
| NQ dans ±15 pts d'un band SD | Son en boucle + popup modale (reste au premier plan jusqu'au clic OK) |
| Bridge muet > 2 min | Popup "BRIDGE MORT" + son |
| PC en veille | Empêché par `SetThreadExecutionState` (Windows ne dort pas la nuit) |
| Même band retouché | Ré-armement après 60s post-ACK |

### Fichier son

`alarm.wav` — généré automatiquement au premier lancement (bip 1200 Hz, pur Python).

### Logs

`alarm.log` (racine du projet) — rotation 10 MB, 2 archives.

### Désinstallation

```
schtasks /delete /tn "NQAlarm" /f
```
(ou supprimer `NQAlarm.vbs` dans `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`)

### Si Windows refuse la tâche planifiée

Méthode manuelle : ajouter `pythonw alarm_service.py` dans le dossier Startup :
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\
```

---

## 13. CONFIGURATION SIERRA CHART — EXPORT CSV AUTOMATIQUE

Pour brancher Sierra Chart au cockpit, chaque chart doit exporter ses données en CSV automatiquement.

### Tableau des 5 charts à configurer

| Chart SC | Instrument | Timeframe | Nom fichier | Chemin complet |
|----------|-----------|-----------|-------------|----------------|
| #28 | NQ | 30 min | `NQ_30min.csv` | `C:\SierraChart_CME\Data\NQ_30min.csv` |
| #11 | NQ | 10 min | `NQ_10min.csv` | `C:\SierraChart_CME\Data\NQ_10min.csv` |
| #3  | ES | 30 min | `ES_30min.csv` | `C:\SierraChart_CME\Data\ES_30min.csv` |
| #15 | ES | 10 min | `ES_10min.csv` | `C:\SierraChart_CME\Data\ES_10min.csv` |
| #5  | CL | 30 min | `CL_30min.csv` | `C:\SierraChart_CME\Data\CL_30min.csv` |

Répéter la procédure ci-dessous pour chacun des 5 charts.

---

### Procédure (une fois par chart)

**Étape 1 — Ouvrir le chart**

Dans Sierra Chart, ouvrir le chart concerné (ex : chart #28, NQ 30min).

**Étape 2 — Ouvrir le menu Auto Export**

Chemin à confirmer selon version SC :

- **Version courante** : `Analysis` → `Auto Export Chart Data` *(le plus fréquent)*
- **Alternative** : `Chart` → `Export Chart Data to File`
- **Alternative ancienne** : `File` → `Export` → `Chart Data`

Si le menu est introuvable : `Ctrl+F`, rechercher "export".

**Étape 3 — Activer l'export**

Cocher **Enable Auto Export** (ou **Export Data to CSV**).

**Étape 4 — Chemin de sortie (Output File)**

Saisir le chemin exact du tableau ci-dessus, par exemple :

```
C:\SierraChart_CME\Data\NQ_30min.csv
```

Si le dossier `C:\SierraChart_CME\Data\` n'existe pas, le créer manuellement (clic droit → Nouveau dossier).

**Étape 5 — Format**

| Paramètre | Valeur |
|-----------|--------|
| Séparateur | **Tabulation (TSV)** — ou virgule si l'option tabulation est absente |
| Encodage | **UTF-8** |
| En-têtes | **Oui** (inclure la ligne d'en-tête) |

**Étape 6 — Intervalle d'export**

- **Export Interval** → `1 Minute` (ou `On Bar Close` pour minimiser les écritures)
- Si `1 Minute` absent : choisir l'intervalle le plus court disponible

**Étape 7 — Valider**

Cliquer **OK**. Sierra Chart crée et met à jour le fichier automatiquement.

**Étape 8 — Vérifier**

Dans l'explorateur Windows, ouvrir `C:\SierraChart_CME\Data\` et vérifier que le fichier apparaît et que sa date de modification avance en temps réel.

---

### Vérification depuis le cockpit

Une fois les 5 fichiers configurés et le bridge lancé (`LANCER-COCKPIT.bat`) :

```
http://localhost:8766/scan
```

Affiche la liste des CSV détectés. Chaque fichier configuré doit apparaître avec son chemin.

```
http://localhost:8766/data
```

Retourne le JSON avec les données de chaque instrument.

---

## 14. ARRÊT

**Double-clic sur `stop_bridge.bat`**

Arrête uniquement `nq_bridge.py` — ne tue pas les autres processus Python.

---

*Ligiste du désert. Héritier de Dalton, Dorian, Josh et du Texan.*  
*"Vivons cachés, vivons heureux." 🐪*
