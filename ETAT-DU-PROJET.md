# État du projet — 2026-09-23

## Ce qui FONCTIONNE aujourd'hui

- Cockpit React servi sur `http://localhost:8766/#/cockpit`
- Bridge stable dans `C:\Users\USER\Desktop\sc-bridge\sc_bridge.js`
- NQ 30min en temps réel (fichier `NQ_TPO.csv`)
- ES 30min présent dans `/data` (fichier `ES_auto.csv`)
- Historique des trades visible dans le cockpit
- Badge BRIDGE vert avec prix live (confirmé 30094.00 le 23/09/2026)

---

## Ce qui RESTE À FAIRE

- [ ] Afficher ES 30min dans la vue cockpit (données déjà dans `/data`, UI à faire)
- [ ] Configurer l'export NQ 10min dans Sierra Chart (chart #11)
      → Fichier cible : `C:\SierraChart_CME\Data\NQ_10min.csv`
- [ ] Configurer l'export ES 10min dans Sierra Chart (chart #15)
      → Fichier cible : `C:\SierraChart_CME\Data\ES_10min.csv`
- [ ] Configurer l'export CL 30min dans Sierra Chart (chart #5)
      → Fichier cible : `C:\SierraChart_CME\Data\CL_30min.csv`
- [ ] Migrer les améliorations du repo git (`mon-site-trading\legacy\sc_bridge.js`)
      vers l'installation stable (`Desktop\sc-bridge\sc_bridge.js`)
      — parsing CSV robuste, findFile multi-noms, NO_FILE sentinel
- [ ] Ajouter la vue MULTI dans le cockpit (5 cartes : NQ30, NQ10, ES30, ES10, CL)
- [ ] Brancher l'alerte nocturne `alarm_service.py`

---

## Architecture actuelle

```
Sierra Chart (charts #28, #11, #3, #15, #5)
    ↓ exports CSV (Spreadsheet Study, toutes les 1s)
C:\SierraChart_CME\Data\*.csv
    ↓ lecture par sc_bridge.js (Node.js)
http://localhost:8766/data  (JSON)
    ↓ fetch par React (dist/)
http://localhost:8766/#/cockpit  (navigateur)
```

---

## Comment reprendre demain

1. Double-clic sur `C:\Users\USER\Desktop\sc-bridge\start_bridge.bat`
2. Ouvrir `http://localhost:8766/#/cockpit`
3. Vérifier badge BRIDGE vert avec prix NQ
4. Si badge rouge → voir section "Résolution des problèmes" dans `LIRE-MOI.md`

---

## Configuration Sierra Chart — rappel

Pour CHAQUE chart à exporter :

| Étape | Action |
|---|---|
| 1 | Ouvrir le chart Sierra Chart (#28, #11, #3, #15, #5) |
| 2 | `Analysis → Studies → Spreadsheet Study` |
| 3 | Input "Periodically Save Sheet as Text in Seconds" → `1` |
| 4 | Input "Chart Data Output Sheet Name" → nom sans extension (ex: `NQ_30min`) |
| 5 | Le fichier apparaît dans `C:\SierraChart_CME\Data\` |

Format attendu : virgule, UTF-8, avec en-tête  
Colonnes : `Heure,Open,High,Low,Close,VWAP,SD+1,SD-1,SD+2,SD-2`

| Chart SC | Instrument | Timeframe | Fichier cible |
|---|---|---|---|
| #28 | NQ | 30 min | `NQ_TPO.csv` ✅ actif |
| #11 | NQ | 10 min | `NQ_10min.csv` — à configurer |
| #3  | ES | 30 min | `ES_auto.csv` ✅ actif |
| #15 | ES | 10 min | `ES_10min.csv` — à configurer |
| #5  | CL | 30 min | `CL_30min.csv` — à configurer |

---

## Points d'attention

- Ne **PAS** lancer `nq_bridge.py` ET `sc_bridge.js` en même temps → conflit port 8766
- Le `package.json` dans `C:\Users\USER\` est cassé → ne pas s'en servir
- Les vieux fichiers CSV (`NQ_TPO.csv33`, `NQ_TPO.csv 111`, etc.) sont ignorés
  automatiquement — peuvent être supprimés manuellement dans l'Explorateur Windows
- Le repo git (`mon-site-trading\legacy\sc_bridge.js`) contient des améliorations
  non encore déployées sur `Desktop\sc-bridge` → pas urgent tant que le bridge tourne

---

## Deux installations — résumé

| Dossier | Rôle | État |
|---|---|---|
| `Desktop\sc-bridge\` | **Production — NE PAS TOUCHER** | ✅ Stable, live |
| `mon-site-trading\` | Développement / améliorations | En cours (branche `claude/serene-hypatia-72vve5`) |
