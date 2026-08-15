const SECTIONS = [
  {
    title: '📋 Règles d\'Or',
    color: 'border-brand-500',
    items: [
      'Ne jamais risquer plus de 1% du compte par trade',
      'Attendre toujours la confirmation — jamais d\'anticipation',
      'Si la structure est cassée, ne pas trader dans la direction cassée',
      'Pas de trade dans les 30 minutes avant et après un news majeur',
      'Maximum 3 trades perdants consécutifs → stop de la journée',
      'Ne jamais move son stop contre soi',
      'Toujours avoir un RR minimum de 2:1 avant d\'entrer',
    ],
  },
  {
    title: '🕐 Sessions de Trading',
    color: 'border-yellow-500',
    items: [
      'LONDON (3h-8h ET) : Setup FVG, OB sur H1 — meilleur pour les shorts si NY prev. était haussier',
      'NY AM (9h30-11h30 ET) : Session principale — tous les setups valides — volatilité maximale',
      'NY PM (13h-16h ET) : Réversion, moins fiable — prudence',
      'OVERNIGHT : Éviter sauf setup exceptionnel avec niveau clé évident',
      'Kills zones : 2h-5h ET (London open) et 8h30-11h ET (NY open)',
    ],
  },
  {
    title: '📊 Lecture du Marché NQ',
    color: 'border-purple-500',
    items: [
      'Analyser le HTF d\'abord : Mensuel > Hebdo > Journalier > H4 > H1',
      'Identifier le Swing High/Low le plus récent cassé',
      'Chercher la liquidité des deux côtés avant de choisir un biais',
      'PDH/PDL (Previous Day High/Low) : niveaux clés à surveiller chaque jour',
      'VWAP anchored : support/résistance dynamique important en intraday',
      'Volume Profile : POC = zone magnétique, VAH/VAL = objectifs',
    ],
  },
  {
    title: '🧠 Psychologie',
    color: 'border-red-500',
    items: [
      'FOMO = destruction du compte. Attendre le prochain setup.',
      'Journaliser chaque trade avec tes émotions (note de 1 à 5)',
      'Après 2 pertes → pause de 30 minutes minimum',
      'Ne jamais trader en étant fatigué, stressé ou émotionnel',
      'Le résultat d\'un seul trade N\'importe pas — l\'edge sur 100 trades oui',
      'Review hebdomadaire obligatoire chaque dimanche soir',
    ],
  },
  {
    title: '💰 Gestion du Risque',
    color: 'border-profit',
    items: [
      'Risque max par trade : 1% du compte (ex: $500 sur $50k)',
      'Taille de position = Risque $ / (Entry - Stop) / Tick Value',
      'Target minimum : 2R — laisser courir si 3R+',
      'Partials : 50% à 2R, laisser courir le reste avec stop au BE',
      'Journée max loss : -2% → stop obligatoire',
      'Semaine max loss : -4% → réduire la taille de moitié',
      'Drawdown > 10% → review complète + taille divisée par 2',
    ],
  },
]

export default function Bible() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Bible de Trading NQ100</h1>
        <p className="text-slate-400 text-sm mt-1">Tes règles intangibles — à relire avant chaque session</p>
      </div>

      <div className="grid gap-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className={`bg-surface-card border-l-4 ${section.color} border border-surface-border rounded-xl p-5`}>
            <h2 className="font-bold text-white mb-3">{section.title}</h2>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="text-slate-600 flex-shrink-0">—</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
