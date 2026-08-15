const SETUPS = [
  {
    id: 'ICT_BPR',
    name: 'ICT Balanced Price Range (BPR)',
    emoji: '⚡',
    description: 'Zone de déséquilibre créée par un mouvement impulsif. Prix revient pour combler le gap avant de repartir.',
    rules: [
      'Identifier le FVG haussier et baissier qui se chevauchent',
      'Attendre que le prix entre dans la zone BPR',
      'Chercher une confirmation sur LTF (M1/M5)',
      'Entrée sur le retour dans la zone avec confluence HTF',
    ],
    entryConditions: ['Prix dans la zone BPR', 'Confluent avec OTE (61.8%-78.6%)', 'Session NY AM ou Londres'],
    riskRewardMin: 2,
    tags: ['ICT', 'Liquidity', 'Gap'],
  },
  {
    id: 'FVG',
    name: 'Fair Value Gap (FVG)',
    emoji: '🕳️',
    description: 'Déséquilibre de prix entre 3 bougies. Le marché tend à revenir combler ces zones avant de reprendre sa direction.',
    rules: [
      'Identifier le gap entre la mèche haute du candle 1 et la mèche basse du candle 3',
      'Zone doit être dans la direction du trend HTF',
      'Attendre le retour dans le FVG',
      'Stopper sous/au-dessus du FVG',
    ],
    entryConditions: ['FVG aligné HTF + LTF', 'Pas de structure cassée sous le FVG', 'Volume décroissant sur le retour'],
    riskRewardMin: 2,
    tags: ['ICT', 'Imbalance'],
  },
  {
    id: 'OB',
    name: 'Order Block (OB)',
    emoji: '🧱',
    description: 'Dernière bougie opposée avant un mouvement impulsif. Représente une zone d\'ordres institutionnels.',
    rules: [
      'Identifier le dernier candle baissier avant un mouvement haussier fort (OB Bull)',
      'Le mouvement doit casser la structure',
      'Attendre le retour dans le 50%-75% du candle OB',
      'Confirmer avec liquidité prise au-dessus',
    ],
    entryConditions: ['Structure HTF intacte', 'Liquidité disponible au-dessus/en-dessous', 'Session active'],
    riskRewardMin: 2.5,
    tags: ['ICT', 'SmartMoney', 'Institutional'],
  },
  {
    id: 'LIQUIDITY_SWEEP',
    name: 'Liquidity Sweep',
    emoji: '🌊',
    description: 'Chasse aux stops sous les plus bas ou au-dessus des plus hauts. Entrée après le rejet rapide.',
    rules: [
      'Identifier les equal highs/lows (liquidity pool)',
      'Attendre le sweep (dépassement et rejet rapide)',
      'Entrée dès que le prix revient dans le range',
      'Stop au-delà du wick de sweep',
    ],
    entryConditions: ['Pool de liquidité clairement identifiable', 'Rejet en < 3 bougies', 'Confluence avec PDH/PDL ou niveau clé'],
    riskRewardMin: 3,
    tags: ['Liquidity', 'StopHunt', 'ICT'],
  },
  {
    id: 'OPENING_RANGE',
    name: 'Opening Range Breakout',
    emoji: '🔔',
    description: 'Breakout du range des 30 premières minutes de session NY. Setup de momentum.',
    rules: [
      'Définir le range des 30 premières minutes (9h30-10h00 ET)',
      'Attendre un breakout clair avec volume',
      'Entrée sur le premier pullback après breakout',
      'Stop sous le bas du range',
    ],
    entryConditions: ['Gap overnight > 0.3%', 'Direction confirmée par bias HTF', 'Volume > moyenne 10j'],
    riskRewardMin: 2,
    tags: ['Momentum', 'Opening', 'Breakout'],
  },
]

export default function Setups() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Setups NQ100</h1>
        <p className="text-slate-400 text-sm mt-1">Tes setups validés avec règles d'entrée</p>
      </div>

      <div className="grid gap-4">
        {SETUPS.map((setup) => (
          <div key={setup.id} className="bg-surface-card border border-surface-border rounded-xl p-5 hover:border-brand-500/40 transition-colors">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">{setup.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-white">{setup.name}</h2>
                  <span className="text-xs bg-brand-600/20 text-brand-300 border border-brand-600/30 px-2 py-0.5 rounded-full">
                    RR min {setup.riskRewardMin}:1
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">{setup.description}</p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {setup.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs uppercase text-slate-500 tracking-wider mb-2">Règles</h3>
                <ol className="space-y-1">
                  {setup.rules.map((rule, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-brand-400 font-mono text-xs mt-0.5 flex-shrink-0">{i + 1}.</span>
                      {rule}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h3 className="text-xs uppercase text-slate-500 tracking-wider mb-2">Conditions d'entrée</h3>
                <ul className="space-y-1">
                  {setup.entryConditions.map((cond, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-profit flex-shrink-0 mt-0.5">✓</span>
                      {cond}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
