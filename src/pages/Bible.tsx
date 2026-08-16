import { useState } from 'react'

const ORBITRON = "'Orbitron', monospace"
const JB = "'JetBrains Mono', monospace"

/* ── CSS ────────────────────────────────────────────────────────────── */
const CSS = `
  @keyframes glowGold {
    0%,100% { text-shadow: 0 0 14px rgba(201,168,76,0.8), 0 0 28px rgba(201,168,76,0.3); }
    50%      { text-shadow: 0 0 4px rgba(201,168,76,0.3); }
  }
`

/* ── SETUP CARDS DATA ───────────────────────────────────────────────── */
interface Setup {
  id: string
  icon: string
  title: string
  accent: string
  glow: string
  desc: string
  rr: string
  rules: string[]
  conditions: string[]
}

const SETUPS: Setup[] = [
  {
    id: 'BPR',
    icon: '⚡',
    title: 'BPR — BALANCED PRICE RANGE',
    accent: '#c9a84c',
    glow: 'rgba(201,168,76,0.07)',
    desc: 'Déséquilibre entre 2 bougies opposées. Le prix retourne combler la zone.',
    rr: '2:1',
    rules: [
      'Identifier le BPR sur 15m ou 5m dans la direction du biais journalier',
      'Attendre le retour du prix dans la zone BPR (premier test uniquement)',
      'Chercher une confirmation : bougie de rejet ou excess sur la zone',
      'Stop derrière l\'extrême du BPR + 2 pts de sécurité',
    ],
    conditions: [
      'Biais confirmé sur timeframe supérieur (30m/journalier)',
      'Zone BPR non mitigée — première visite seulement',
      'Confluence : OTE zone (61.8%-78.6%) ou Order Block proche',
    ],
  },
  {
    id: 'FVG',
    icon: '🕳️',
    title: 'FVG — FAIR VALUE GAP',
    accent: '#1eb3bc',
    glow: 'rgba(30,179,188,0.07)',
    desc: 'Gap de 3 bougies entre l\'ombre haute de B1 et l\'ombre basse de B3. Zone d\'inefficacité institutionnelle.',
    rr: '2:1',
    rules: [
      'Identifier le FVG sur 15m ou 5m (ombre high B1 vs ombre low B3)',
      'Classer : Bullish FVG (rempli par le bas) ou Bearish FVG (par le haut)',
      'Entrée au 50% du FVG ou à la fermeture en zone — pas de limite ferme',
      'Stop derrière l\'extrême du FVG + 1.5 pts de sécurité',
    ],
    conditions: [
      'FVG dans le sens du biais journalier (pas contre-tendance)',
      'FVG créé lors d\'un mouvement impulsif fort (bougie corps > 80%)',
      'Distance cible suffisante pour valider le ratio 2:1',
    ],
  },
  {
    id: 'OB',
    icon: '🧱',
    title: 'OB — ORDER BLOCK',
    accent: '#d4af37',
    glow: 'rgba(212,175,55,0.07)',
    desc: 'Dernière bougie contratrend avant un mouvement impulsif. Zone d\'accumulation institutionnelle.',
    rr: '2.5:1',
    rules: [
      'Identifier la dernière bougie haussière avant la baisse impulsive (OB baissier) — et vice versa',
      'Marquer le range complet de l\'OB : du high au low de la bougie',
      'Attendre le retour du prix dans le 50%-100% de la zone OB',
      'Confirmation obligatoire : excess ou engulf de la zone avant entrée',
    ],
    conditions: [
      'OB non mitigé — le prix ne doit pas être repassé à l\'intérieur',
      'Mouvement impulsif post-OB ≥ 3× la taille de la bougie OB',
      'Confluences : FVG ou AVWAP dans la même zone',
    ],
  },
  {
    id: 'SWEEP',
    icon: '🌊',
    title: 'LIQUIDITY SWEEP',
    accent: '#f0d070',
    glow: 'rgba(240,208,112,0.06)',
    desc: 'Prise de liquidité au-delà d\'un niveau clé (Asia High/Low, PDH/PDL, IB). Retournement violent post-sweep.',
    rr: '3:1',
    rules: [
      'Identifier le niveau liquide ciblé : Asia High/Low, PDH, PDL, IB extrêmes',
      'Observer le sweep : cassure + rejection rapide sur 1m-5m',
      'Entrée sur la bougie de fermeture du retournement (bougie de confirmation)',
      'Stop 3-5 pts au-delà du plus haut/bas du sweep (zone du piège)',
    ],
    conditions: [
      'Niveau ciblé testé ≥ 3 fois (plus de liquidité accumulée)',
      'Sweep rapide — retour dans la range en < 3 bougies 5m',
      'Alignement avec biais ALN (P3 ou P4) pour confirmation directionnelle',
    ],
  },
  {
    id: 'ORB',
    icon: '🔔',
    title: 'ORB — OPENING RANGE BREAKOUT',
    accent: '#c9a84c',
    glow: 'rgba(201,168,76,0.07)',
    desc: 'Cassure de l\'Initial Balance (30 premières minutes RTH). Setup directionnel de référence.',
    rr: '2:1',
    rules: [
      'Définir l\'IB : High et Low des 2 premières bougies 15m (09h30-10h00)',
      'Classifier l\'IB : Bullish (close B2 > mid IB) ou Bearish (close B2 < mid IB)',
      'IBGW : entrée directe sur cassure de l\'IB High/Low dans le sens du biais',
      'IBGP : attendre le pullback sur le niveau cassé (ex-résistance → support)',
    ],
    conditions: [
      'Biais IB aligné avec ALN Pattern (P3 Bullish ou P4 Bearish)',
      'Aucun rapport macro dans l\'heure suivant la cassure',
      'Range IB ≤ 1.5× la moyenne des IB des 5 dernières sessions',
    ],
  },
]

/* ── RULES DATA ─────────────────────────────────────────────────────── */
interface Rule {
  id: string
  title: string
  body: string
  category: 'FONDAMENTAL' | 'ALN' | 'IB' | 'SETUP' | 'PSYCHO' | 'GESTION'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

const RULES: Rule[] = [
  { id: 'R1', category: 'FONDAMENTAL', priority: 'HIGH', title: 'Règle 1 — Hiérarchie des timeframes', body: 'Journalier → 30 min → 5 min. Ne jamais trader à contre-sens du timeframe supérieur sans signal de retournement confirmé sur le TF supérieur lui-même.' },
  { id: 'R2', category: 'FONDAMENTAL', priority: 'HIGH', title: 'Règle 2 — 85% Rotationnel / 15% Trend Day', body: 'La grande majorité des journées est rotationnelle. En journée rotationnelle : privilegier les fades sur les extrêmes. En Trend Day : ne pas fader, suivre le mouvement avec trailing stop.' },
  { id: 'R3', category: 'FONDAMENTAL', priority: 'HIGH', title: 'Règle 3 — Inventaire OVN', body: 'Si le prix OVN est au-dessus du settle RTH J-1 → inventaire LONG. Si en dessous → inventaire SHORT. L\'inventaire définit qui est vulnérable dans la session.' },
  { id: 'R4', category: 'FONDAMENTAL', priority: 'HIGH', title: 'Règle 4 — AVWAP 18h : Le Chef', body: 'L\'AVWAP ancré à l\'ouverture Globex 18h00 est le niveau de référence absolu. Au-dessus = long privilégié. En dessous = short privilégié. Ne jamais ignorer ce niveau.' },
  { id: 'R5', category: 'FONDAMENTAL', priority: 'MEDIUM', title: 'Règle 5 — Market Generated Information (MGI)', body: 'Chaque journée génère de l\'information : Poor High/Low, POC orphelin, Single Prints, VAH/VAL acceptés ou rejetés. Utiliser le MGI des 3-5 dernières sessions pour construire le contexte.' },
  { id: 'R6', category: 'ALN', priority: 'HIGH', title: 'Règle 6 — ALN Pattern P3 : signal haussier', body: 'P3 : London High > Asia High ET London Low > Asia Low. Casse du London High en RTH : 80.8%. Confirmation IB Bullish : 100%. Signal fort LONG.' },
  { id: 'R7', category: 'ALN', priority: 'HIGH', title: 'Règle 7 — ALN Pattern P4 : signal baissier', body: 'P4 : London High < Asia High ET London Low < Asia Low. Casse du London Low en RTH : 75%. Signal fort SHORT. Confirmation IB Bearish pour IBGW.' },
  { id: 'R8', category: 'IB', priority: 'HIGH', title: 'Règle 8 — Classification IB', body: 'BULLISH : close B > mid IB. BEARISH : close B < mid IB. MITIGÉ : |close B − mid| / range < 3%. L\'IB classe la session. BULLISH en P3 → contexte idéal long.' },
  { id: 'R9', category: 'IB', priority: 'HIGH', title: 'Règle 9 — IBGW (Go With)', body: 'Initial Balance Go With : entrée à la cassure de l\'IB High (si Bullish) ou de l\'IB Low (si Bearish). Stop derrière l\'IB. Cible : extensions Fibonacci ou VAH/VAL J-1.' },
  { id: 'R10', category: 'IB', priority: 'HIGH', title: 'Règle 10 — IBGP (Go With Pullback)', body: 'Initial Balance Go With Pullback : attendre le pullback sur le niveau cassé. Entrée sur close bougie de confirmation. Stop serré. Ratio cible 2:1 minimum.' },
  { id: 'R11', category: 'IB', priority: 'MEDIUM', title: 'Règle 11 — XTFD (Extension Fade)', body: 'Extension fade : si IB > 1.5× la moyenne des IB des 5 dernières sessions → fader l\'extension au-delà de l\'IB. Valide surtout en journée rotationnelle.' },
  { id: 'R12', category: 'FONDAMENTAL', priority: 'MEDIUM', title: 'Règle 12 — OTF (One Time Framing)', body: 'OTF Higher : chaque bougie 30 min fait un Low plus haut. OTF Lower : chaque High 30 min est plus bas. En OTF, ne pas fader. Arrêt OTF = retournement potentiel.' },
  { id: 'R13', category: 'SETUP', priority: 'HIGH', title: 'Règle 13 — Excess : signal maître', body: 'Un excess est un wick long sur un niveau clé. Entrée = close de la bougie de rejet. Stop = derrière l\'excess + 1-2 pts. Ratio 2:1 minimum. Règle universelle.' },
  { id: 'R14', category: 'SETUP', priority: 'HIGH', title: 'Règle 14 — Post Trend Day', body: 'Après un Trend Day, le lendemain est statistiquement rotationnel. Privilegier les fades sur les extrêmes du Trend Day. Ne pas chercher la continuation.' },
  { id: 'R15', category: 'SETUP', priority: 'MEDIUM', title: 'Règle 15 — Counter Auction Dalton', body: '65% de probabilité que le marché revienne vers le centre de valeur après une extension. En journée rotationnelle : fader les extensions hors VAH/VAL.' },
  { id: 'R16', category: 'SETUP', priority: 'MEDIUM', title: 'Règle 16 — Noon Curve Signal', body: 'Q1 = 9h30-12h. Q2 = 12h-15h30. Si Q2 casse Q1 High uniquement → AM High / PM Low (82.12%). Si Q2 casse Q1 Low uniquement → AM Low / PM High (72.42%).' },
  { id: 'R17', category: 'SETUP', priority: 'HIGH', title: 'Règle 17 — Universalité de l\'excess', body: 'L\'excess est valable sur toutes les sessions : OVN, London, RTH AM, RTH PM. Le setup est identique partout. La taille de position s\'adapte au horaire.' },
  { id: 'R18', category: 'FONDAMENTAL', priority: 'HIGH', title: 'Règle 18 — GEX Attracteur', body: 'Le strike QQQ de max gamma net × 40 = niveau NQ magnétique. Le prix gravite vers l\'attracteur. Call Wall = résistance. Put Wall = support. Ne pas aller contre sans excess confirmé.' },
  { id: 'R19', category: 'FONDAMENTAL', priority: 'MEDIUM', title: 'Règle 19 — Structure Cleanup', body: 'Les Single Prints et le POC orphelin sont des aimants structurels. Le marché revient nettoyer ces zones. Setup : attendre le retour, confirmation, entrée dans le sens du cleanup.' },
  { id: 'R20', category: 'ALN', priority: 'MEDIUM', title: 'Règle 20 — P1 : Engulf Total', body: 'P1 : London englobe Asia (London High > Asia High ET London Low < Asia Low). Signal mixte. Attendre l\'IB pour le biais. Plus faible que P3/P4.' },
  { id: 'R21', category: 'ALN', priority: 'MEDIUM', title: 'Règle 21 — P2 : Inside London', body: 'P2 : London est entièrement dans Asia. Compression — explosion attendue. Direction donnée par le premier breakout de l\'IB en RTH.' },
  { id: 'R22', category: 'GESTION', priority: 'HIGH', title: 'Règle 22 — Gestion du risque NQ', body: 'NQ = 5$/point/contrat. MNQ = 0.5$/point/contrat. Risque max 1% du compte par trade. Contrats = (Compte × 1%) / (riskPts × 5$). Toujours arrondir à l\'inférieur.' },
  { id: 'R23', category: 'GESTION', priority: 'HIGH', title: 'Règle 23 — Stop Loss absolu', body: 'Stop Loss = règle inviolable. Jamais de stop mental. Si le stop est touché → sortir immédiatement. Revenge trading interdit. 3 pertes consécutives = stop de la journée.' },
  { id: 'R24', category: 'PSYCHO', priority: 'HIGH', title: 'Règle 24 — FOMO & Discipline', body: 'Pas de trade si le setup n\'est pas dans la Bible. Pas d\'entrée sur émotion. Toujours noter l\'émotion avant/après (échelle 1-5). Si FOMO détecté → attendre la prochaine session.' },
  { id: 'R25', category: 'PSYCHO', priority: 'MEDIUM', title: 'Règle 25 — One Trade Setup', body: 'Identifier LE meilleur setup de la journée avant l\'ouverture. Maximum 2 trades par session en mode normal. Qualité > Quantité.' },
  { id: 'R26', category: 'FONDAMENTAL', priority: 'MEDIUM', title: 'Règle 26 — Chain causale MGI', body: 'Chaque analyse commence par : « Qu\'a fait le marché hier ? Quel MGI a été généré ? Comment cela influence-t-il aujourd\'hui ? ». La chain causale doit être documentée avant la session.' },
  { id: 'R27', category: 'SETUP', priority: 'MEDIUM', title: 'Règle 27 — P3 AM Signal', body: 'En P3, le signal haussier AM est le plus fort en session AM (9h30-12h). Après 12h, la probabilité de renversement augmente. Ne pas initier P3 long après 12h30 sans signal fort.' },
  { id: 'R28', category: 'SETUP', priority: 'MEDIUM', title: 'Règle 28 — P4 Fade', body: 'En P4, si le prix tente de recasser le London High en RTH et échoue → fade short. Cible : retour vers London Low. Valide uniquement avec IB Bearish confirmation.' },
  { id: 'R29', category: 'GESTION', priority: 'HIGH', title: 'Règle 29 — Ratio minimum', body: 'Ratio cible minimum : 2:1. Idéal : 3:1. Jamais prendre un trade avec cible < 2× le risque. Calculer le ratio AVANT d\'entrer. Si ratio < 2 → passer.' },
  { id: 'R30', category: 'FONDAMENTAL', priority: 'MEDIUM', title: 'Règle 30 — Sessions interdites', body: 'Pas de trade dans les 30 min avant/après FOMC, NFP ou CPI. Pas de trade dans les 15 premières minutes de RTH (9h30-9h45) sauf excess évident.' },
  { id: 'R31', category: 'PSYCHO', priority: 'LOW', title: 'Règle 31 — Journal obligatoire', body: 'Chaque trade doit être journalisé : setup, émotion pré/post, FOMO, revenge, respect du stop. Revue hebdomadaire obligatoire. Identifier les patterns comportementaux défavorables.' },
  { id: 'R32', category: 'GESTION', priority: 'MEDIUM', title: 'Règle 32 — Adaptation taille STEG', body: 'En cas de risque de coupure de courant : réduire à MNQ. Privilégier les setups excess OVN et London. Pas de position ouverte en RTH si coupure probable.' },
]

const CATEGORIES = ['ALL', 'FONDAMENTAL', 'ALN', 'IB', 'SETUP', 'PSYCHO', 'GESTION'] as const
type CatFilter = typeof CATEGORIES[number]

const CAT_ACCENT: Record<string, string> = {
  FONDAMENTAL: '#c9a84c',
  ALN: '#9b7fd4',
  IB: '#f0d070',
  SETUP: '#00ff88',
  PSYCHO: '#ff9944',
  GESTION: '#8899bb',
}

const PRIORITY_COLOR: Record<string, string> = {
  HIGH:   '#ff4444',
  MEDIUM: '#f0d070',
  LOW:    'rgba(136,153,187,0.5)',
}

/* ── SETUP CARD ─────────────────────────────────────────────────────── */
function SetupCard({ s }: { s: Setup }) {
  return (
    <div style={{
      background: 'rgba(10,15,26,0.85)',
      border: `1px solid ${s.accent}33`,
      borderTop: `2px solid ${s.accent}`,
      borderRadius: 4,
      padding: 18,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 0%, ${s.glow}, transparent 65%)`,
        pointerEvents: 'none',
      }} />

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 14 }}>{s.icon}</span>
        <span style={{
          fontFamily: ORBITRON, fontSize: 8, fontWeight: 700,
          letterSpacing: '0.16em', color: s.accent,
          textShadow: `0 0 12px ${s.accent}80`,
        }}>{s.title}</span>
      </div>

      {/* Desc + RR */}
      <div style={{ marginBottom: 14 }}>
        <p style={{
          fontFamily: JB, fontSize: 9, lineHeight: 1.6,
          color: 'rgba(200,190,165,0.7)', marginBottom: 6,
        }}>{s.desc}</p>
        <span style={{
          fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
          letterSpacing: '0.14em', color: s.accent,
          background: `${s.accent}18`, border: `1px solid ${s.accent}40`,
          padding: '2px 7px', borderRadius: 2,
        }}>R:R MIN {s.rr}</span>
      </div>

      {/* Rules */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontFamily: ORBITRON, fontSize: 6.5, fontWeight: 700,
          letterSpacing: '0.18em', color: 'rgba(136,153,187,0.45)',
          marginBottom: 7,
        }}>RÈGLES D'EXÉCUTION</div>
        {s.rules.map((r, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8, marginBottom: 5, alignItems: 'flex-start',
          }}>
            <span style={{
              fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
              color: s.accent, flexShrink: 0, marginTop: 1,
              minWidth: 14,
            }}>0{i + 1}</span>
            <span style={{
              fontFamily: JB, fontSize: 8.5, lineHeight: 1.55,
              color: 'rgba(200,190,165,0.75)',
            }}>{r}</span>
          </div>
        ))}
      </div>

      {/* Conditions */}
      <div style={{ borderTop: `1px solid ${s.accent}22`, paddingTop: 12 }}>
        <div style={{
          fontFamily: ORBITRON, fontSize: 6.5, fontWeight: 700,
          letterSpacing: '0.18em', color: 'rgba(136,153,187,0.45)',
          marginBottom: 7,
        }}>CONDITIONS DE VALIDITÉ</div>
        {s.conditions.map((c, i) => (
          <div key={i} style={{
            display: 'flex', gap: 7, marginBottom: 5, alignItems: 'flex-start',
          }}>
            <span style={{
              color: '#00ff88', fontSize: 9, flexShrink: 0, marginTop: 1,
              textShadow: '0 0 6px rgba(0,255,136,0.5)',
            }}>✓</span>
            <span style={{
              fontFamily: JB, fontSize: 8.5, lineHeight: 1.5,
              color: 'rgba(200,190,165,0.65)',
            }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── MAIN ───────────────────────────────────────────────────────────── */
export default function Bible() {
  const [filter, setFilter] = useState<CatFilter>('ALL')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = RULES.filter(r => {
    if (filter !== 'ALL' && r.category !== filter) return false
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.body.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div style={{ marginLeft: -24, marginRight: -24, marginTop: -24 }}>
      <style>{CSS}</style>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(201,168,76,0.12)', paddingBottom: 16 }}>
          <div style={{
            fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
            letterSpacing: '0.22em', color: 'rgba(201,168,76,0.4)',
            marginBottom: 6,
          }}>MÉTHODE SALAH · NQ100 · ICT / SMC</div>
          <div style={{
            fontFamily: ORBITRON,
            fontSize: 'clamp(18px,2.5vw,26px)',
            fontWeight: 900, letterSpacing: '0.08em',
            background: 'linear-gradient(135deg, #c9a84c, #f0d070, #e8c86a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'glowGold 4s ease-in-out infinite',
          } as React.CSSProperties}>THE CODEX</div>
          <div style={{
            fontFamily: JB, fontSize: 9, color: 'rgba(136,153,187,0.45)',
            marginTop: 4, letterSpacing: '0.06em',
          }}>5 setups fondamentaux · 32 règles méthode · Bible de référence</div>
        </div>

        {/* Setup Cards */}
        <div>
          <div style={{
            fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
            letterSpacing: '0.2em', color: 'rgba(201,168,76,0.5)',
            marginBottom: 12,
          }}>SETUPS PRINCIPAUX</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {SETUPS.map(s => <SetupCard key={s.id} s={s} />)}
          </div>
        </div>

        {/* Rules section */}
        <div>
          <div style={{
            fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
            letterSpacing: '0.2em', color: 'rgba(136,153,187,0.4)',
            marginBottom: 14,
            borderTop: '1px solid rgba(201,168,76,0.1)',
            paddingTop: 20,
          }}>RÈGLES MÉTHODE SALAH — 32 COMMANDEMENTS</div>

          {/* Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, alignItems: 'center' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  fontFamily: ORBITRON, fontSize: 6.5, fontWeight: 700,
                  letterSpacing: '0.14em',
                  padding: '4px 10px', borderRadius: 2,
                  cursor: 'pointer',
                  border: filter === cat
                    ? `1px solid ${cat === 'ALL' ? '#c9a84c' : CAT_ACCENT[cat] || '#c9a84c'}66`
                    : '1px solid rgba(136,153,187,0.15)',
                  background: filter === cat
                    ? `${cat === 'ALL' ? '#c9a84c' : CAT_ACCENT[cat] || '#c9a84c'}18`
                    : 'transparent',
                  color: filter === cat
                    ? (cat === 'ALL' ? '#c9a84c' : CAT_ACCENT[cat] || '#c9a84c')
                    : 'rgba(136,153,187,0.45)',
                  transition: 'all 0.15s',
                }}
              >{cat}</button>
            ))}
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              style={{
                marginLeft: 'auto',
                fontFamily: JB, fontSize: 9,
                padding: '4px 10px', borderRadius: 2,
                background: 'rgba(10,15,26,0.8)',
                border: '1px solid rgba(201,168,76,0.18)',
                color: 'rgba(200,190,165,0.8)',
                outline: 'none',
                width: 160,
              }}
            />
          </div>

          {/* Rules list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {filtered.map(rule => {
              const open = expanded.has(rule.id)
              const catColor = CAT_ACCENT[rule.category] || '#c9a84c'
              return (
                <div key={rule.id} style={{
                  background: 'rgba(10,15,26,0.7)',
                  border: '1px solid rgba(201,168,76,0.08)',
                  borderLeft: `2px solid ${PRIORITY_COLOR[rule.priority]}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}>
                  <button
                    onClick={() => toggle(rule.id)}
                    style={{
                      width: '100%', display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'transparent', border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span style={{
                        fontFamily: JB, fontSize: 7.5, color: 'rgba(136,153,187,0.35)',
                        flexShrink: 0,
                      }}>{rule.id}</span>
                      <span style={{
                        fontFamily: JB, fontSize: 10, fontWeight: 600,
                        color: 'rgba(200,190,165,0.85)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{rule.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 10 }}>
                      <span style={{
                        fontFamily: ORBITRON, fontSize: 6, fontWeight: 700,
                        letterSpacing: '0.12em', color: catColor,
                        background: `${catColor}18`, border: `1px solid ${catColor}33`,
                        padding: '2px 6px', borderRadius: 2,
                      }}>{rule.category}</span>
                      <span style={{ color: 'rgba(136,153,187,0.35)', fontSize: 8 }}>
                        {open ? '▲' : '▼'}
                      </span>
                    </div>
                  </button>
                  {open && (
                    <div style={{
                      padding: '0 14px 12px',
                      borderTop: '1px solid rgba(201,168,76,0.07)',
                    }}>
                      <p style={{
                        fontFamily: JB, fontSize: 9, lineHeight: 1.65,
                        color: 'rgba(200,190,165,0.65)',
                        margin: '10px 0 0',
                      }}>{rule.body}</p>
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '48px 0',
                fontFamily: JB, fontSize: 9,
                color: 'rgba(136,153,187,0.25)',
              }}>Aucune règle trouvée</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
