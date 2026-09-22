# CAMEL MARKET COCKPIT — GUIDE DE LANCEMENT

## 1. PRÉREQUIS
- Python 3.8+ installé (https://python.org — cocher "Add to PATH")
- Ce dossier cloné quelque part sur le PC (ex: C:\Users\TonNom\mon-site-trading)

---

## 2. LANCER LE BRIDGE

**Double-clic sur `start_bridge.bat`**

Une fenêtre noire s'ouvre et affiche :
```
NQ Bridge démarré — port 8766
  → Cockpit     : http://localhost:8766/cockpit-v3.html
  → Étude Salah : http://localhost:8766/cockpit-camel.html
  → NQ Live     : http://localhost:8766/nq-live.html
```

Laisser cette fenêtre ouverte pendant toute la session de trading.

---

## 3. OUVRIR LE COCKPIT PRINCIPAL

Dans Chrome : **http://localhost:8766/cockpit-v3.html**

- Badge vert "⬤ BRIDGE xxx" = bridge actif, données reçues
- Badge rouge "⬤ OFFLINE" = bridge Python non lancé (lancer start_bridge.bat)

---

## 4. OUVRIR L'ÉTUDE SALAH (LIVE TRACKER)

Dans Chrome : **http://localhost:8766/cockpit-camel.html**

---

## 5. OUVRIR LE DASHBOARD NQ LIVE

Dans Chrome : **http://localhost:8766/nq-live.html**

---

## 6. CHARGER UNE SESSION DANS LE LIVE TRACKER

Trois boutons dans la sidebar :

### CHARGER SESSION
Charge les données de la session du jour depuis la mémoire locale du navigateur.
À utiliser si vous avez déjà saisi une session aujourd'hui.

### JSON CLAUDE
Génère un bloc JSON contenant tous les niveaux de la session en cours.
Copier-coller ce JSON dans Claude pour un morning plan ou une analyse.

### SC CSV
Importe un fichier CSV Sierra Chart (High/Low/Close/BidVol/AskVol).
Rempli automatiquement les champs J-1 (High, Low, Settle).

---

## 7. FORMAT SESSION — SAISIE MANUELLE

Remplir les champs dans la section "SESSION DU JOUR" :

| Champ    | Signification              | Exemple     |
|----------|----------------------------|-------------|
| AVWAP    | AVWAP ancré 18h            | 20450.00    |
| Sigma    | SD1H - AVWAP               | 120.00      |
| VAH J-1  | Value Area High J-1        | 21200.00    |
| VAL J-1  | Value Area Low J-1         | 20700.00    |
| POC J-1  | Point of Control J-1       | 20950.00    |
| High J-1 | High RTH J-1               | 21300.00    |
| Low J-1  | Low RTH J-1                | 20900.00    |
| Settle   | Settle RTH J-1             | 21080.00    |

Les niveaux SD±1/±2/±3 sont calculés automatiquement depuis AVWAP + Sigma.

---

## 8. FORMAT JSON COMPLET (bouton JSON CLAUDE)

Voir le fichier `session-exemple.json` pour un exemple complet.

---

## 9. BRANCHEMENT SIERRA CHART (avancé)

Pour obtenir des données live depuis Sierra Chart :
1. Lancer `sc_bridge.js` sur le PC Sierra Chart (Node.js requis)
2. Configurer ngrok ou cloudflared pour exposer le port 8766
3. Les URLs sont définies dans `api/bridge-data.ts`

En mode local sans Sierra Chart, `nq_bridge.py` utilise des valeurs de test
oscillantes. Pour des données réelles, voir les TODO dans `nq_bridge.py`
(Options A/B/C/D).

---

## 10. RÉSOLUTION DES PROBLÈMES

| Problème                   | Solution                                      |
|----------------------------|-----------------------------------------------|
| Badge OFFLINE              | Lancer start_bridge.bat                       |
| "Python introuvable"       | Installer Python depuis python.org            |
| Port 8766 déjà utilisé     | Fermer l'autre instance du bridge             |
| Chrome bloque localhost    | Utiliser http:// pas https://                 |
| AVWAP §9 "⚠ erreur"        | Normal si bridge SC hors-ligne, données test  |
