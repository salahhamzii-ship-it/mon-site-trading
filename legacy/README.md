# legacy/ — Fichiers archivés

Ces fichiers sont conservés à titre de référence historique.
**Ils ne sont plus utilisés activement.** Ne pas modifier.

---

## sc_bridge.js

**Ancien bridge Node.js** (WebSocket ws://0.0.0.0:8765 + HTTP :8766).

- Utilisé avant la migration vers `nq_bridge.py` (Python stdlib).
- Lisait les CSV Sierra Chart depuis Windows, exposait `/data` pour Vercel.
- Intégrait ngrok (`@ngrok/ngrok`) pour tunneliser le trafic HTTPS.
- Dépendances : Node.js, `ws`, `@ngrok/ngrok` (npm install).
- Remplacé par : `nq_bridge.py` (zéro dépendance externe).

---

## sc_bridge.py

**Ancien bridge Python** (WebSocket ws://0.0.0.0:8765 + HTTP :8766).

- Tournait sur le VPS Linux (`deploy-vps.yml` le déployait sur 2.29.3.199).
- Lisait les CSV Sierra Chart depuis `/tmp/sc-bridge/` (uploadés par `send_csv.bat`).
- Dépendances : `websockets`, `pytz` (pip install).
- Remplacé par : `nq_bridge.py` (stdlib uniquement, port 8766 seul).

---

## suivi_sd_nq.html

**Doublon exact de `public/tracker.html`** (diff -q confirme 0 différence).

- Ancienne version du tracker, renommée à un moment de l'historique.
- La route `/suivi-sd` redirige désormais vers `/tracker`.
- Conservé ici pour éviter toute perte accidentelle.

---

*Archivé le 2026-09-22 — tâche 2 stabilisation.*
