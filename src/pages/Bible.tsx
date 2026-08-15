import { useState } from 'react'

interface Rule {
  id: string
  title: string
  body: string
  category: 'FONDAMENTAL' | 'ALN' | 'IB' | 'SETUP' | 'PSYCHO' | 'GESTION'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

const RULES: Rule[] = [
  // ── Fondamentaux ────────────────────────────────────────────────────────────
  {
    id: 'R1', category: 'FONDAMENTAL', priority: 'HIGH',
    title: 'Règle 1 — Hiérarchie des timeframes',
    body: 'Journalier → 30 min → 5 min. Ne jamais trader à contre-sens du timeframe supérieur sans signal de retournement confirmé sur le TF supérieur lui-même.',
  },
  {
    id: 'R2', category: 'FONDAMENTAL', priority: 'HIGH',
    title: 'Règle 2 — 85% Rotationnel / 15% Trend Day',
    body: 'La grande majorité des journées est rotationnelle. En journée rotationnelle : privilegier les fades sur les extrêmes. En Trend Day : ne pas fader, suivre le mouvement avec trailing stop.',
  },
  {
    id: 'R3', category: 'FONDAMENTAL', priority: 'HIGH',
    title: 'Règle 3 — Inventaire OVN',
    body: 'Si le prix OVN est au-dessus du settle RTH J-1 → inventaire LONG (vendeurs OVN en position, ils devront se débarrasser). Si en dessous → inventaire SHORT. L\'inventaire définit qui est vulnérable dans la session.',
  },
  {
    id: 'R4', category: 'FONDAMENTAL', priority: 'HIGH',
    title: 'Règle 4 — AVWAP 18h : Le Chef',
    body: 'L\'AVWAP ancré à l\'ouverture Globex 18h00 est le niveau de référence absolu. Au-dessus = long privilégié. En dessous = short privilégié. Ne jamais ignorer ce niveau. C\'est Le Chef.',
  },
  {
    id: 'R5', category: 'FONDAMENTAL', priority: 'MEDIUM',
    title: 'Règle 5 — Market Generated Information (MGI)',
    body: 'Chaque journée génère de l\'information : Poor High/Low, POC orphelin, Single Prints, VAH/VAL acceptés ou rejetés. Utiliser le MGI des 3-5 dernières sessions pour construire le contexte.',
  },
  {
    id: 'R6', category: 'ALN', priority: 'HIGH',
    title: 'Règle 6 — ALN Pattern P3 : signal haussier',
    body: 'P3 : London High > Asia High ET London Low > Asia Low. Casse du London High en RTH : 80.8%. Confirmation IB Bullish : 100%. Signal fort LONG. Attendre IB Bullish ou IBGW/IBGP.',
  },
  {
    id: 'R7', category: 'ALN', priority: 'HIGH',
    title: 'Règle 7 — ALN Pattern P4 : signal baissier',
    body: 'P4 : London High < Asia High ET London Low < Asia Low. Casse du London Low en RTH : 75%. Casse du London High : 68.6% (retournement). Signal fort SHORT. Confirmation IB Bearish pour IBGW.',
  },
  {
    id: 'R8', category: 'IB', priority: 'HIGH',
    title: 'Règle 8 — Classification IB',
    body: 'BULLISH : close B > mid IB. BEARISH : close B < mid IB. MITIGÉ : |close B − mid| / range < 3%. L\'IB classe la session. BULLISH en P3 → contexte idéal long. Ne jamais aller SHORT sur IB Bullish sans setup fort.',
  },
  {
    id: 'R9', category: 'IB', priority: 'HIGH',
    title: 'Règle 9 — IBGW (Go With)',
    body: 'Initial Balance Go With : entrée à la cassure de l\'IB High (si Bullish) ou de l\'IB Low (si Bearish). Stop derrière l\'IB. Cible : extensions Fibonacci ou VAH/VAL J-1.',
  },
  {
    id: 'R10', category: 'IB', priority: 'HIGH',
    title: 'Règle 10 — IBGP (Go With Pullback)',
    body: 'Initial Balance Go With Pullback : attendre le pullback sur le niveau cassé (ex-resistance devenu support). Entrée sur close bougie de confirmation. Stop serré derrière le pullback. Ratio cible 2:1 minimum.',
  },
  {
    id: 'R11', category: 'IB', priority: 'MEDIUM',
    title: 'Règle 11 — XTFD (Extension Fade)',
    body: 'Extension fade : si IB est > 1.5× la moyenne des IB des 5 dernières sessions → fader l\'extension au-delà de l\'IB. Stop derrière l\'extension. Valide surtout en journée rotationnelle.',
  },
  {
    id: 'R12', category: 'FONDAMENTAL', priority: 'MEDIUM',
    title: 'Règle 12 — OTF (One Time Framing)',
    body: 'OTF Higher : chaque bougie 30 min fait un Low plus haut que le précédent. OTF Lower : chaque High 30 min est plus bas. En OTF, ne pas fader — trader dans le sens de l\'OTF uniquement. Arrêt OTF = retournement potentiel.',
  },
  {
    id: 'R13', category: 'SETUP', priority: 'HIGH',
    title: 'Règle 13 — Excess : signal maître',
    body: 'Un excess est un wick long (rejet violent) sur un niveau clé. Entrée = close de la bougie de rejet. Stop = derrière l\'excess (wick extrême + 1-2 pts). Ratio cible : 2:1 minimum. Cible 1 = POC ou Mid IB. Règle universelle : vaut en OVN, London, et RTH.',
  },
  {
    id: 'R14', category: 'SETUP', priority: 'HIGH',
    title: 'Règle 14 — Post Trend Day',
    body: 'Après un Trend Day, le lendemain est statistiquement rotationnel. Privilegier les fades sur les extrêmes du Trend Day. Ne pas chercher la continuation.',
  },
  {
    id: 'R15', category: 'SETUP', priority: 'MEDIUM',
    title: 'Règle 15 — Counter Auction Dalton',
    body: '65% de probabilité que le marché revienne vers le centre de valeur après une extension. En journée rotationnelle : fader les extensions hors VAH/VAL avec stop serré. Ne jamais utiliser sans confirmation de structure.',
  },
  {
    id: 'R16', category: 'SETUP', priority: 'MEDIUM',
    title: 'Règle 16 — Noon Curve Signal',
    body: 'Q1 = 9h30-12h. Q2 = 12h-15h30. Si Q2 casse Q1 High uniquement → AM High / PM Low (82.12%). Si Q2 casse Q1 Low uniquement → AM Low / PM High (72.42%). Si les deux ou aucun → coin flip 50%. Utilisé pour le timing PM.',
  },
  {
    id: 'R17', category: 'SETUP', priority: 'HIGH',
    title: 'Règle 17 — Universalité de l\'excess',
    body: 'L\'excess est valable sur toutes les sessions : OVN (permettant de trader même si coupure de courant prévisible), London, RTH AM, RTH PM. Le setup est identique partout. La taille de position s\'adapte au horaire.',
  },
  {
    id: 'R18', category: 'FONDAMENTAL', priority: 'HIGH',
    title: 'Règle 18 — GEX Attracteur',
    body: 'Le strike QQQ de max gamma net × 40 = niveau NQ magnétique. Le prix gravite vers l\'attracteur pendant la session. Ne pas aller contre l\'attracteur sans excess confirmé. Call Wall = résistance. Put Wall = support.',
  },
  {
    id: 'R19', category: 'FONDAMENTAL', priority: 'MEDIUM',
    title: 'Règle 19 — Structure Cleanup',
    body: 'Les Single Prints (gaps dans le market profile) et le POC orphelin sont des aimants structurels. Le marché revient nettoyer ces zones. Setup : attendre le retour sur la zone, confirmation, entrée dans le sens du cleanup.',
  },
  {
    id: 'R20', category: 'ALN', priority: 'MEDIUM',
    title: 'Règle 20 — P1 : Engulf Total',
    body: 'P1 : London englobe Asia (London High > Asia High ET London Low < Asia Low). Signal mixte. Attendre l\'IB pour le biais. Statistiquement plus faible que P3/P4 pour les setups directionnels.',
  },
  {
    id: 'R21', category: 'ALN', priority: 'MEDIUM',
    title: 'Règle 21 — P2 : Inside London',
    body: 'P2 : London est entièrement dans Asia (London High < Asia High ET London Low > Asia Low). Compression — explosion attendue. Direction donnée par le premier breakout de l\'IB en RTH.',
  },
  {
    id: 'R22', category: 'GESTION', priority: 'HIGH',
    title: 'Règle 22 — Gestion du risque NQ',
    body: 'NQ = 5$/point/contrat. MNQ = 0.5$/point/contrat. Risque max 1% du compte par trade. Calculer le riskPts = |entry − stop|. Contrats = (Compte × 1%) / (riskPts × 5$). Toujours arrondir à l\'inférieur.',
  },
  {
    id: 'R23', category: 'GESTION', priority: 'HIGH',
    title: 'Règle 23 — Stop Loss absolu',
    body: 'Stop Loss = règle inviolable. Jamais de stop mental. Jamais de « encore un peu ». Si le stop est touché → sortir immédiatement. Revenge trading interdit. 3 pertes consécutives = stop de la journée.',
  },
  {
    id: 'R24', category: 'PSYCHO', priority: 'HIGH',
    title: 'Règle 24 — FOMO & Discipline',
    body: 'Pas de trade si le setup n\'est pas dans la Bible. Pas d\'entrée sur émotion. Toujours noter l\'émotion avant et après le trade (échelle 1-5). Si FOMO détecté → attendre la prochaine session.',
  },
  {
    id: 'R25', category: 'PSYCHO', priority: 'MEDIUM',
    title: 'Règle 25 — One Trade Setup',
    body: 'Identifier LE meilleur setup de la journée avant l\'ouverture. Se concentrer sur ce seul setup. Si raté, attendre le lendemain. Qualité > Quantité. Maximum 2 trades par session en mode normal.',
  },
  {
    id: 'R26', category: 'FONDAMENTAL', priority: 'MEDIUM',
    title: 'Règle 26 — Chain causale MGI',
    body: 'Chaque analyse commence par : « Qu\'a fait le marché hier ? Quel MGI a été généré ? Comment cela influence-t-il aujourd\'hui ? ». La chain causale doit être documentée dans le Plan Semaine avant la session.',
  },
  {
    id: 'R27', category: 'SETUP', priority: 'MEDIUM',
    title: 'Règle 27 — P3 AM Signal',
    body: 'En P3, le signal haussier AM est le plus fort en session AM (9h30-12h). Après 12h, la probabilité de renversement augmente (Noon Curve). Ne pas initier de P3 long après 12h30 sans signal de continuation fort.',
  },
  {
    id: 'R28', category: 'SETUP', priority: 'MEDIUM',
    title: 'Règle 28 — P4 Fade',
    body: 'En P4, si le prix tente de recasser le London High en RTH et échoue (rejet) → fade short avec stop au-dessus London High. Cible : retour vers London Low. Valide uniquement avec IB Bearish confirmation.',
  },
  {
    id: 'R29', category: 'GESTION', priority: 'HIGH',
    title: 'Règle 29 — Ratio minimum',
    body: 'Ratio cible minimum : 2:1. Idéal : 3:1. Jamais prendre un trade avec cible < 2× le risque. Calculer le ratio AVANT d\'entrer. Si ratio < 2 → passer au prochain setup.',
  },
  {
    id: 'R30', category: 'FONDAMENTAL', priority: 'MEDIUM',
    title: 'Règle 30 — Sessions interdites',
    body: 'Pas de trade dans les 30 min avant/après un rapport FOMC, NFP ou CPI. Pas de trade dans les 15 premières minutes de RTH (9h30-9h45) sauf excess évident. Pas de trade en Asian session sans setup excess clair.',
  },
  {
    id: 'R31', category: 'PSYCHO', priority: 'LOW',
    title: 'Règle 31 — Journal obligatoire',
    body: 'Chaque trade doit être journalisé : setup, émotion pré/post, FOMO, revenge, respect du stop. Revue hebdomadaire obligatoire. Identifier les patterns comportementaux défavorables.',
  },
  {
    id: 'R32', category: 'GESTION', priority: 'MEDIUM',
    title: 'Règle 32 — Adaptation taille STEG',
    body: 'En cas de risque de coupure de courant (contexte Tunisie) : réduire la taille à MNQ. Privilégier les setups excess OVN et London (Règle 17) qui peuvent être conclus avant RTH. Pas de position ouverte en RTH si coupure probable.',
  },
]

const CATEGORIES = ['ALL', 'FONDAMENTAL', 'ALN', 'IB', 'SETUP', 'PSYCHO', 'GESTION'] as const
type CatFilter = typeof CATEGORIES[number]

const categoryColor: Record<string, string> = {
  FONDAMENTAL: 'bg-brand-600/20 text-brand-300 border-brand-600/30',
  ALN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  IB: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  SETUP: 'bg-profit/20 text-profit border-profit/30',
  PSYCHO: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  GESTION: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

const priorityBorder: Record<string, string> = {
  HIGH: 'border-l-profit',
  MEDIUM: 'border-l-yellow-400',
  LOW: 'border-l-slate-500',
}

export default function Bible() {
  const [filter, setFilter] = useState<CatFilter>('ALL')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = RULES.filter((r) => {
    if (filter !== 'ALL' && r.category !== filter) return false
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.body.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bible — Méthode Salah NQ100</h1>
        <p className="text-slate-400 text-sm mt-0.5">32 règles fondamentales + Règles 13-26 spécialisées</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filter === cat
                ? 'bg-brand-600/30 text-brand-300 border-brand-600/50'
                : 'border-surface-border text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            {cat}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          className="ml-auto px-3 py-1.5 bg-surface border border-surface-border rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-600 w-48"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {Object.entries(categoryColor).map(([cat, cls]) => {
          const count = RULES.filter((r) => r.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat as CatFilter)}
              className={`rounded-lg px-3 py-2 border text-xs font-medium text-center transition-opacity hover:opacity-80 ${cls}`}
            >
              <div className="text-lg font-bold">{count}</div>
              <div className="opacity-70">{cat}</div>
            </button>
          )
        })}
      </div>

      {/* Rules list */}
      <div className="space-y-2">
        {filtered.map((rule) => {
          const open = expanded.has(rule.id)
          return (
            <div
              key={rule.id}
              className={`bg-surface-card border border-surface-border rounded-xl border-l-2 ${priorityBorder[rule.priority]} overflow-hidden`}
            >
              <button
                onClick={() => toggle(rule.id)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-slate-500 flex-shrink-0 font-mono">{rule.id}</span>
                  <span className="text-sm font-medium text-white truncate">{rule.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`px-2 py-0.5 rounded border text-xs font-medium ${categoryColor[rule.category]}`}>
                    {rule.category}
                  </span>
                  <span className="text-slate-500 text-xs">{open ? '▲' : '▼'}</span>
                </div>
              </button>
              {open && (
                <div className="px-5 pb-4 pt-0 text-sm text-slate-300 leading-relaxed border-t border-surface-border/50">
                  {rule.body}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-600">
            <div className="text-sm">Aucune règle trouvée</div>
          </div>
        )}
      </div>
    </div>
  )
}
