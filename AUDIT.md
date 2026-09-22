# AUDIT — CAMEL MARKET COCKPIT
*Généré le 2026-09-22 — lecture seule, aucune modification*

---

## 1. INVENTAIRE COMPLET DES FICHIERS

### 1.1 Frontends HTML (6 fichiers, ~6 300 lignes)

| Fichier | Emplacement | Lignes | Rôle | État |
|---|---|---|---|---|
| `cockpit-camel.html` | racine | 969 | Étude Salah — saisie session, niveaux ALN/IB | **ACTIF — page principale** |
| `public/cockpit-v3.html` | public/ | 1699 | Cockpit trading full — AVWAP §9, SD levels, profil | **ACTIF** |
| `public/nq-live.html` | public/ | 1388 | Dashboard NQ live — prix, alarme, CSV import | **ACTIF** |
| `public/tracker.html` | public/ | 1088 | Tracker sessions — idem suivi_sd_nq.html | **ACTIF (doublon exact)** |
| `suivi_sd_nq.html` | racine | 1088 | Idem tracker.html | **DOUBLON — bit-for-bit identique** |
| `index.html` | racine | 24 | Entry point Vite React | **ACTIF — app React uniquement** |

**Problème :** `tracker.html` et `suivi_sd_nq.html` sont 100% identiques (diff -q confirme).
Le bridge sert les deux. L'un est un vestige.

---

### 1.2 Bridges / Backends (5 fichiers, ~2 400 lignes)

| Fichier | Lignes | Rôle | Dépendances | État |
|---|---|---|---|---|
| `nq_bridge.py` | 234 | Bridge HTTP local stdlib Python, port 8766, données test | stdlib uniquement | **ACTIF — bridge local** |
| `sc_bridge.py` | 627 | Bridge WebSocket + HTTP, lit CSV Sierra Chart, port 8765+8766 | `websockets`, `pytz` (pip install) | **VPS / Windows — actif en prod** |
| `sc_bridge.js` | 1396 | Idem sc_bridge.py mais Node.js, ngrok intégré | `ws`, `@ngrok/ngrok`, `node` | **Alternative Windows — actif si Node.js dispo** |
| `bridge_receiver.py` | 65 | Proxy VPS : reçoit POST /update depuis sc_bridge.py, sert GET /data | stdlib | **VPS — rôle relais** |
| `api/bridge-data.ts` | 71 | Proxy Vercel serverless : appelle ngrok/cloudflared, enrichit SD bands | `@vercel/node` | **ACTIF en prod Vercel** |

**Architecture réelle (non documentée) :**
```
Sierra Chart (Windows)
       ↓ export CSV
sc_bridge.py OU sc_bridge.js (Windows, port 8766)
       ↓ ngrok tunnel (hatbox-placidly-crabmeat.ngrok-free.dev)
       OU cloudflared (33654683-...cfargotunnel.com)
       ↓ HTTPS
api/bridge-data.ts (Vercel serverless)
       ↓ /api/bridge-data
cockpit-v3.html / tracker.html / React app (navigateur)

En local :
nq_bridge.py (port 8766, données test)
       ↓ http://localhost:8766/data
cockpit-camel.html / nq-live.html / cockpit-v3.html
```

---

### 1.3 Application React / Vite (36 fichiers src/, ~11 175 lignes)

| Dossier | Contenu | Rôle | État |
|---|---|---|---|
| `src/pages/` | 12 pages TSX | Dashboard, Journal, Bible, Cockpit iframe, Status… | **ACTIF — app Vercel** |
| `src/components/` | 9 composants | Layout, Chart, Badge, StatCard | **ACTIF** |
| `src/context/AppContext.tsx` | 1 fichier | Fetch `/api/bridge-data` toutes les 3s | **ACTIF** |
| `src/pages/CockpitApp.tsx` | 1 fichier | Charge cockpit-v3.html dans iframe | **ACTIF** |
| `src/pages/Status.tsx` | 1 fichier | Page /status React — fetch `/api/bridge-data` | **ACTIF** |
| `vite.config.ts`, `tsconfig*.json`, `tailwind*` | config | Build Vite+React | **ACTIF** |

**Note :** L'app React est une couche séparée déployée sur Vercel (`npm run build` → dist/).
Elle n'est **pas servie** par `nq_bridge.py`. Les 5 HTML standalone sont servis directement.

---

### 1.4 Scripts de lancement Windows (17 fichiers .bat/.vbs/.ps1)

| Fichier | Rôle | État |
|---|---|---|
| `start_bridge.bat` | Lance `nq_bridge.py` (Python stdlib) | **ACTIF — script principal** |
| `lancer_bridge.bat` | Télécharge + lance `sc_bridge.py` | **ACTIF — bridge Sierra Chart** |
| `start_bridge.vbs` | Lance startup_bridge.bat invisible | Vestige / démarrage auto |
| `startup_bridge.bat` | Script démarrage complet (4171 lignes) | Sur-complexe |
| `stop_bridge.bat` | `taskkill /f /im python.exe` — tue TOUS les Python | **DANGEREUX** |
| `LANCER_TRACKER.bat` | Lance tracker.html | Vestige |
| `LANCER_TRACKER.vbs` | Lance LANCER_TRACKER.bat invisible | Vestige |
| `cloudflared_setup.bat` | Configure cloudflared | Infrastructure |
| `install.bat` | Script install complet (35944 octets) | Infrastructure |
| `installer_ngrok.bat` | Configure ngrok | Infrastructure |
| `install_pusher.bat` | Configure Pusher | Vestige (Pusher non utilisé) |
| `install_startup.bat` | Configure démarrage auto | Infrastructure |
| `register_protocol.bat` | Enregistre protocole Windows | Spécifique |
| `send_csv.bat` | Envoie CSV Sierra Chart vers bridge | **ACTIF** |
| `send_csv_silent.vbs` | Idem silencieux | **ACTIF** |
| `INSTALLER_AUTO.bat` | Installation automatique | Infrastructure |
| `watchdog_bridge.ps1` | PowerShell — redémarre bridge si mort | Infrastructure |

---

### 1.5 Infrastructure / CI-CD

| Fichier | Rôle |
|---|---|
| `.github/workflows/deploy-vercel.yml` | Deploy Vercel (manuel) |
| `.github/workflows/deploy-pages.yml` | Deploy GitHub Pages (push main) |
| `.github/workflows/deploy-vps.yml` | Deploy sc_bridge.py sur VPS 2.29.3.199 |
| `vercel.json` | Config Vercel : routes, rewrites, headers |
| `.vercel/project.json` | ID projet Vercel |
| `deploy_vps.sh` / `install_vps.sh` / `setup_ssl_vps.sh` | Scripts VPS |

---

### 1.6 Docs et config

| Fichier | Contenu |
|---|---|
| `LIRE-MOI.md` | Guide utilisateur local (nq_bridge.py) |
| `README.md` | Readme générique |
| `SC_BRIDGE_HANDOFF.md` | Doc technique sc_bridge |
| `CLAUDE.md` | Bible Méthode Salah (instructions Claude) |
| `session-exemple.json` | Template session JSON |
| `public/session-data.json` | Données session persistées navigateur |
| `nq_alert/config.json` | Config alertes NQ |
| `.env.example` | Variables d'environnement |

---

### 1.7 Divers actifs

| Fichier | Rôle |
|---|---|
| `pinescript/camel_cockpit_v1.pine` | Indicateur TradingView |
| `pinescript/camel_cockpit_v2.pine` | Indicateur TradingView v2 |
| `public/sc_ahk_bridge.ahk` | Script AutoHotkey Sierra Chart |
| `nq_alert/alert.py` | Alertes audio/desktop CSV Sierra Chart |
| `public/sw.js` | Service Worker (PWA) |
| `public/manifest.json` | Manifest PWA |

---

## 2. DOUBLONS

| # | Type | Fichiers | Impact |
|---|---|---|---|
| D1 | **HTML identiques** | `suivi_sd_nq.html` = `public/tracker.html` (bit-for-bit) | Route /suivi-sd sert un doublon inutile |
| D2 | **Bridges Python** | `sc_bridge.py` et `nq_bridge.py` exposent tous deux port 8766 | **Conflit de port si les deux tournent simultanément** |
| D3 | **Bridges SC** | `sc_bridge.py` (Python) et `sc_bridge.js` (Node.js) font exactement la même chose | Double maintenance |
| D4 | **Launchers bridge** | `start_bridge.bat` → nq_bridge.py ; `lancer_bridge.bat` → sc_bridge.py ; `startup_bridge.bat` (4000 lignes) | Confusion utilisateur |
| D5 | **Proxy /data** | `bridge_receiver.py` (VPS) + `api/bridge-data.ts` (Vercel) jouent le même rôle relais | Redondance non documentée |

---

## 3. CHEMINS EN DUR

### 3.1 URLs ngrok/cloudflared figées dans le code

| Fichier | Ligne | URL figée |
|---|---|---|
| `api/bridge-data.ts` | 8 | `https://hatbox-placidly-crabmeat.ngrok-free.dev/data` |
| `api/bridge-data.ts` | 9 | `https://33654683-3a3b-4484-8441-0cda7748d29e.cfargotunnel.com/data` |
| `public/nq-live.html` | 1023 | `https://hatbox-placidly-crabmeat.ngrok-free.dev/data` |
| `public/nq-live.html` | 491 | placeholder `https://hatbox-placidly-crabmeat.ngrok-free.dev/api/bridge-data` |

**Risque :** Si le tunnel ngrok change de domaine → toutes ces URLs cassent silencieusement.

### 3.2 localhost:8766 figé dans les frontends

| Fichier | Lignes | Impact |
|---|---|---|
| `public/cockpit-v3.html` | 1388, 1567 | 2 fallbacks `http://localhost:8766/data` en dur |
| `public/nq-live.html` | 1021 | `defaultBridge()` renvoie `http://localhost:8766/data` |
| `public/tracker.html` | 741 | Idem |
| `suivi_sd_nq.html` | 741 | Idem |

*Note : ces fallbacks localhost sont intentionnels pour l'usage local — à conserver mais documenter.*

### 3.3 Chemins Windows en dur dans les bridges

| Fichier | Chemins |
|---|---|
| `sc_bridge.py` | `C:\SierraChart_CME\Data\nq 30 mn.txt`, `C:\SierraChart_CME\Data\ESU26_FUT_CME...` |
| `sc_bridge.js` | `C:\SierraChart_CME\Data\NQ.csv`, `C:\SierraChart\CME\Data\sc_snapshot.json` |
| `nq_alert/config.json` | `C:/SierraChart/Data/NQ_auto.csv` |

### 3.4 IP VPS en dur

| Fichier | Valeur |
|---|---|
| `.github/workflows/deploy-vps.yml` | `2.29.3.199` |

### 3.5 Port 8766 en dur

Présent dans : `nq_bridge.py`, `sc_bridge.py`, `sc_bridge.js`, `public/nq-live.html`, `public/tracker.html`, `suivi_sd_nq.html`, `LIRE-MOI.md` — **au moins 12 endroits**.

---

## 4. CODE MORT

| # | Élément | Localisation | Raison |
|---|---|---|---|
| C1 | `api/order.ts` (36 lignes) | `api/order.ts` | Jamais appelé depuis aucun frontend ni bridge |
| C2 | `install_pusher.bat` | racine | Pusher non référencé dans aucun code actif |
| C3 | `register_protocol.bat` | racine | Protocole custom non utilisé dans les pages actives |
| C4 | `public/sc_ahk_bridge.ahk` | public/ | AutoHotkey — non référencé dans les docs actifs |
| C5 | `LANCER_TRACKER.bat` + `LANCER_TRACKER.vbs` | racine | Ouvre tracker.html directement — inutile si bridge actif |
| C6 | `deploy_vps.sh` + `install_vps.sh` + `setup_ssl_vps.sh` | racine | Redondants avec les workflows GitHub Actions |
| C7 | `startup_bridge.bat` (4171 lignes) | racine | Énorme script non référencé dans start_bridge.bat |
| C8 | React pages `GEXPanel.tsx`, `TopDown.tsx`, `PlanSemaine.tsx` | src/pages/ | Présents dans routes mais contenu factice / non branché sur données réelles |

---

## 5. INCOHÉRENCES

### 5.1 Formats JSON incohérents entre bridges

| Bridge | Format exposé sur `/data` |
|---|---|
| `nq_bridge.py` | `{"NQ": {last, vwap, sd1h, sd1l, sd2h, sd2l, j1_high, ...}}` |
| `sc_bridge.py` | `{"NQ": {last, j1_high, j1_low, j1_settle, poc, vah, val, bars_today, bars_j1, ...}}` |
| `sc_bridge.js` | Identique sc_bridge.py + champs extra : `lastUpdate`, `last_csv_date`, `_from_snapshot` |

`nq_bridge.py` envoie `vwap` ; `sc_bridge.py` ne l'envoie pas (l'app React doit utiliser `enrichSdBands()` dans Vercel pour le dériver). `cockpit-v3.html` s'attend à `vwap` et tombe en mode OFFLINE si absent.

### 5.2 Endpoints appelés vs endpoints existants

| Appelant | Endpoint appelé | Servi par | Résultat si nq_bridge.py seul |
|---|---|---|---|
| `cockpit-v3.html` | `/api/bridge-data` (priorité 1) | Vercel (prod) ou **absent en local** | **503 → fallback localhost** |
| `cockpit-v3.html` | `http://localhost:8766/data` (fallback) | `nq_bridge.py` | ✅ |
| `public/tracker.html` | `/api/bridge-data` | Absent en local | **503 → pas de fallback** |
| React `AppContext` | `/api/bridge-data` | Absent en local | **503 silencieux** |
| React `Status.tsx` | `/api/bridge-data` | Absent en local | **503 silencieux** |

### 5.3 Badges de statut incohérents entre pages

| Page | Badge bridge | Logique stale/online/offline |
|---|---|---|
| `cockpit-v3.html` | ⬤ BRIDGE xxx / ⬤ OFFLINE | Vert si données reçues, rouge si erreur fetch |
| `nq-live.html` | dot CSS + "OFFLINE" texte | Vert/jaune/rouge selon `miss` counter (3 niveaux) |
| `tracker.html` | dot CSS similaire nq-live | Vert/rouge |
| React app | Pas de badge bridge visible | Status page séparée uniquement |

### 5.4 Absence de version commune

Aucun fichier ne définit une version du système. `public/version.json` est généré au build Vite mais contient seulement un timestamp, invisible dans les pages standalone HTML.

### 5.5 GET / renvoie quoi ?

| Contexte | GET http://localhost:8766/ | Attendu par l'utilisateur |
|---|---|---|
| `nq_bridge.py` actuel | `cockpit-camel.html` (modifié récemment) | Cockpit principal |
| Vercel | React SPA (index.html → React Router) | Dashboard React |
| GitHub Pages | React SPA | Dashboard React |

Trois comportements différents selon l'environnement de déploiement.

### 5.6 AbortSignal.timeout() — compatibilité Safari

| Fichier | Utilise AbortSignal.timeout() | Polyfill présent |
|---|---|---|
| `public/nq-live.html` | Non — utilise `timeoutSignal()` | ✅ corrigé |
| `public/tracker.html` | **Oui — ligne 1024, 1064** | ❌ **ABSENT** → crash Safari |
| `public/cockpit-v3.html` | Non — utilise callbacks | ✅ |

### 5.7 `cockpit-camel.html` n'a AUCUN fetch bridge

`cockpit-camel.html` (969 lignes) ne contient **zéro** appel fetch, zéro WebSocket, zéro `localhost:8766`. C'est une page 100% locale (données saisies manuellement ou via bouton "JSON CLAUDE"). Elle n'a pas besoin du bridge pour fonctionner — mais c'est non documenté.

---

## 6. RÉSUMÉ EXÉCUTIF

### Ce qui marche aujourd'hui
- `nq_bridge.py` sert correctement les pages HTML en local
- `cockpit-camel.html` fonctionne seul (0 dépendance réseau)
- `cockpit-v3.html` fonctionne avec fallback localhost:8766
- `nq-live.html` fonctionne avec polyfill timeoutSignal
- L'application React sur Vercel fonctionne via `api/bridge-data.ts`

### Ce qui est fragile
1. **Port 8766 en dur** à 12+ endroits — une config centralisée résoudrait ça
2. **URLs ngrok figées** dans `api/bridge-data.ts` et `nq-live.html` — cassent si tunnel change
3. **3 bridges concurrents** sur le même port — conflit si deux tournent en même temps
4. **tracker.html crash Safari** — AbortSignal.timeout() sans polyfill
5. **`/api/bridge-data` absent en local** — 5 appels sans fallback (React app + tracker)
6. **Doublon suivi_sd_nq.html = tracker.html** — maintenance doublée
7. **stop_bridge.bat tue tous les Python** — dangereux si autre app Python tourne
8. **Aucun logging** dans `nq_bridge.py` — diagnostic impossible sans terminal ouvert
9. **Aucun test automatique** — régression silencieuse à chaque commit
10. **LIRE-MOI.md périmé** — affiche encore les anciennes URLs `/cockpit-v3.html` au lieu de `/`

### Priorités recommandées pour la tâche 2+

| Priorité | Action |
|---|---|
| P0 | Fixer `tracker.html` polyfill AbortSignal (crash Safari immédiat) |
| P1 | Une config centralisée `config.json` — port, ngrok URL, source |
| P2 | Archiver `sc_bridge.py` et `sc_bridge.js` dans `legacy/` |
| P3 | Supprimer `suivi_sd_nq.html` (doublon de tracker.html) |
| P4 | Logging + auto-restart dans `nq_bridge.py` |
| P5 | bridge-client.js commun pour tous les HTML |
| P6 | Tests automatiques |

---

*Aucun fichier modifié lors de cet audit.*


---

## 7. DÉCISIONS PRISES (2026-09-22)

### Q1 — suivi_sd_nq.html
**Décision : DÉPLACER vers `legacy/suivi_sd_nq.html` (ne pas supprimer).**
- Raison : zéro risque de perte accidentelle. La route `/suivi-sd` redirigera vers `/tracker`.
- `legacy/README.md` expliquera que c'est un doublon exact de `tracker.html`.

### Q2 — sc_bridge.py vs sc_bridge.js
**Décision : ARCHIVER LES DEUX dans `legacy/`.**
- `sc_bridge.js` = ancien bridge Node.js utilisé avec tunnel ngrok (Windows).
- `sc_bridge.py` = ancien bridge Python WebSocket (probablement VPS).
- `nq_bridge.py` devient **LE SEUL bridge actif** sur port 8766.
- Les .bat qui lancent les anciens bridges ne sont pas modifiés à cette étape (tâche 8).

### Q3 — URLs ngrok figées
**Décision : EXTERNALISER toutes les URLs dans `config.json`.**
- `config.tunnels.ngrok_url`, `cloudflared_url`, `vercel_proxy_url`.
- Valeurs actuelles (`hatbox-placidly-crabmeat`, `cfargotunnel`) comme défauts documentés.
- `/status` teste chaque tunnel en live et retourne `up`/`down`.
- Le frontend lit `/status` pour choisir automatiquement le tunnel qui répond.
- Aucune URL de tunnel codée en dur dans `nq_bridge.py`.

### Q4 — React app / Vercel
**Décision : HORS SCOPE.**
- Les 36 fichiers `src/` et `api/bridge-data.ts` ne sont pas touchés.
- La stabilisation cible : `nq_bridge.py` + les 5 HTML servis localement + `config.json` + docs + tests.
- LIRE-MOI.md documentera l'existence de la stack React/Vercel (séparée).

### Ajustements aux tâches suivantes
| Tâche | Ajustement |
|---|---|
| 2 (consolidation) | Intègre Q1+Q2 : legacy/ pour sc_bridge.py, sc_bridge.js, suivi_sd_nq.html |
| 3 (config) | Intègre Q3 : URLs tunnels dans config.json |
| 4 (robustesse) | Ajouter détection "port 8766 déjà occupé" au démarrage (audit #2) |
| 6 (mixed content) | Le frontend lit `/status` pour choisir tunnel HTTPS, pas en dur |
| 8 (launcher) | `stop_bridge.bat` tuera UNIQUEMENT le PID de `nq_bridge.py`, pas tous les Python |
