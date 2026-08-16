const ORB = "'Orbitron', monospace"
const JB  = "'JetBrains Mono', monospace"

const SETUPS = [
  {
    id: 'BPR',
    icon: '⚡',
    glowCol: 'rgba(201,168,76,0.08)',
    border: 'rgba(201,168,76,0.18)',
    borderTop: '#c9a84c',
    shadow: 'rgba(201,168,76,0.08)',
    accent: '#c9a84c',
    title1: 'ICT BALANCED',
    title2: 'PRICE RANGE',
    rr: '2:1',
    rrBg: 'rgba(201,168,76,0.1)',
    rrBorder: 'rgba(201,168,76,0.3)',
    desc: 'Zone de déséquilibre créée par un mouvement impulsif. Prix revient pour combler le gap avant de repartir.',
    descBorder: 'rgba(201,168,76,0.08)',
    ruleColor: 'rgba(201,168,76,0.5)',
    rules: [
      'Identifier le FVG haussier et baissier qui se chevauchent',
      'Attendre que le prix entre dans la zone BPR',
      'Chercher une confirmation sur LTF (M1/M5)',
      'Entrée sur le retour dans la zone avec confluence HTF',
    ],
    condBorder: 'rgba(201,168,76,0.08)',
    conditions: [
      'Prix dans la zone BPR',
      'Confluence avec OTE (61.8%–78.6%)',
      'Session NY AM ou Londres',
    ],
  },
  {
    id: 'FVG',
    icon: '🕳️',
    glowCol: 'rgba(30,179,188,0.07)',
    border: 'rgba(30,179,188,0.18)',
    borderTop: '#1eb3bc',
    shadow: 'rgba(30,179,188,0.07)',
    accent: '#1eb3bc',
    title1: 'FAIR VALUE',
    title2: 'GAP (FVG)',
    rr: '2:1',
    rrBg: 'rgba(30,179,188,0.08)',
    rrBorder: 'rgba(30,179,188,0.3)',
    desc: "Déséquilibre de prix entre 3 bougies. Le marché tend à revenir combler ces zones avant de reprendre sa direction.",
    descBorder: 'rgba(30,179,188,0.08)',
    ruleColor: 'rgba(30,179,188,0.5)',
    rules: [
      'Identifier le gap entre mèche haute du candle 1 et mèche basse du candle 3',
      'Zone doit être dans la direction du trend HTF',
      'Attendre le retour dans le FVG',
      'Stopper sous / au-dessus du FVG',
    ],
    condBorder: 'rgba(30,179,188,0.08)',
    conditions: [
      'FVG aligné HTF + LTF',
      'Pas de structure cassée sous le FVG',
      'Volume décroissant sur le retour',
    ],
  },
  {
    id: 'OB',
    icon: '🧱',
    glowCol: 'rgba(212,175,55,0.07)',
    border: 'rgba(212,175,55,0.18)',
    borderTop: '#d4af37',
    shadow: 'rgba(212,175,55,0.07)',
    accent: '#d4af37',
    title1: 'ORDER BLOCK',
    title2: '(OB)',
    rr: '2.5:1',
    rrBg: 'rgba(212,175,55,0.08)',
    rrBorder: 'rgba(212,175,55,0.3)',
    desc: "Dernière bougie opposée avant un mouvement impulsif. Représente une zone d'ordres institutionnels.",
    descBorder: 'rgba(212,175,55,0.08)',
    ruleColor: 'rgba(212,175,55,0.5)',
    rules: [
      'Identifier le dernier candle baissier avant mouvement haussier fort (OB Bull)',
      'Le mouvement doit casser la structure',
      'Attendre le retour dans le 50%–75% du candle OB',
      'Confirmer avec liquidité prise au-dessus',
    ],
    condBorder: 'rgba(212,175,55,0.08)',
    conditions: [
      'Structure HTF intacte',
      'Liquidité disponible au-dessus / en-dessous',
      'Session active',
    ],
  },
  {
    id: 'SWEEP',
    icon: '🌊',
    glowCol: 'rgba(240,208,112,0.06)',
    border: 'rgba(240,208,112,0.16)',
    borderTop: '#f0d070',
    shadow: 'rgba(240,208,112,0.06)',
    accent: '#f0d070',
    title1: 'LIQUIDITY',
    title2: 'SWEEP',
    rr: '3:1',
    rrBg: 'rgba(240,208,112,0.07)',
    rrBorder: 'rgba(240,208,112,0.28)',
    desc: "Chasse aux stops sous les plus bas ou au-dessus des plus hauts. Entrée après le rejet rapide.",
    descBorder: 'rgba(240,208,112,0.07)',
    ruleColor: 'rgba(240,208,112,0.5)',
    rules: [
      'Identifier les equal highs/lows (liquidity pool)',
      'Attendre le sweep (dépassement et rejet rapide)',
      'Entrée dès que le prix revient dans le range',
      'Stop au-delà du wick de sweep',
    ],
    condBorder: 'rgba(240,208,112,0.07)',
    conditions: [
      'Pool de liquidité clairement identifiable',
      'Rejet en < 3 bougies',
      'Confluence avec PDH/PDL ou niveau clé',
    ],
  },
  {
    id: 'ORB',
    icon: '🔔',
    glowCol: 'rgba(201,168,76,0.07)',
    border: 'rgba(201,168,76,0.18)',
    borderTop: '#c9a84c',
    shadow: 'rgba(201,168,76,0.07)',
    accent: '#c9a84c',
    title1: 'OPENING RANGE',
    title2: 'BREAKOUT',
    rr: '2:1',
    rrBg: 'rgba(201,168,76,0.1)',
    rrBorder: 'rgba(201,168,76,0.3)',
    desc: "Breakout du range des 30 premières minutes de session NY. Setup de momentum directionnel.",
    descBorder: 'rgba(201,168,76,0.08)',
    ruleColor: 'rgba(201,168,76,0.5)',
    rules: [
      'Définir le range des 30 premières minutes (9h30–10h00 ET)',
      'Attendre un breakout clair avec volume',
      'Entrée sur le premier pullback après breakout',
      'Stop sous le bas du range',
    ],
    condBorder: 'rgba(201,168,76,0.08)',
    conditions: [
      'Gap overnight > 0.3%',
      'Direction confirmée par bias HTF',
      'Volume > moyenne 10 jours',
    ],
  },
]

const QUICK_REF = [
  { name: 'BPR',         rr: 'RR 2:1',   c: '#c9a84c', session: 'NY AM · Londres',  rrc: 'rgba(201,168,76,0.5)' },
  { name: 'FVG',         rr: 'RR 2:1',   c: '#1eb3bc', session: 'Toutes sessions',  rrc: 'rgba(30,179,188,0.5)' },
  { name: 'OB',          rr: 'RR 2.5:1', c: '#d4af37', session: 'Session active',   rrc: 'rgba(212,175,55,0.5)' },
  { name: 'Liq. Sweep',  rr: 'RR 3:1',   c: '#f0d070', session: 'PDH/PDL',          rrc: 'rgba(240,208,112,0.5)' },
  { name: 'ORB',         rr: 'RR 2:1',   c: '#c9a84c', session: '9h30 NY open',     rrc: 'rgba(201,168,76,0.5)' },
]

export default function Setups() {
  return (
    <div style={{ padding: 0 }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 22 }}>▶</span>
          <div style={{
            fontFamily: ORB,
            fontSize: 'clamp(18px, 2.5vw, 28px)',
            fontWeight: 900, letterSpacing: '0.2em',
            background: 'linear-gradient(135deg, #c9a84c, #f0d070)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'glowGold 4s ease-in-out infinite',
          } as React.CSSProperties}>NQ ROUTES</div>
          <div style={{
            padding: '3px 10px',
            background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)',
            borderRadius: 3, fontSize: 8, letterSpacing: '0.14em',
            color: 'rgba(201,168,76,0.7)', fontFamily: ORB,
          }}>SETUPS NQ100</div>
        </div>
        <div style={{
          fontSize: 11, color: 'rgba(136,153,187,0.6)',
          letterSpacing: '0.08em', fontFamily: JB,
        }}>
          Tes setups validés avec règles d'entrée · Méthode Salah · ICT/SMC
        </div>
        <div style={{
          marginTop: 10, height: 1,
          background: 'linear-gradient(90deg, rgba(201,168,76,0.3), rgba(30,179,188,0.2), transparent)',
        }} />
      </div>

      {/* ── Cards 3-col grid ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {SETUPS.map(s => (
          <div
            key={s.id}
            className="setup-card"
            style={{
              '--glow-col': s.glowCol,
              border: `1px solid ${s.border}`,
              borderTop: `2px solid ${s.borderTop}`,
              boxShadow: `0 4px 32px ${s.shadow}`,
            } as React.CSSProperties}
          >
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 20,
                  filter: `drop-shadow(0 0 6px ${s.borderTop}99)`,
                }}>{s.icon}</span>
                <div>
                  <div style={{
                    fontFamily: ORB, fontSize: 11, fontWeight: 900,
                    letterSpacing: '0.16em', color: s.accent, lineHeight: 1.2,
                  }}>{s.title1}</div>
                  <div style={{
                    fontFamily: ORB, fontSize: 11, fontWeight: 900,
                    letterSpacing: '0.16em', color: s.accent,
                  }}>{s.title2}</div>
                </div>
              </div>
              {/* RR badge */}
              <div style={{
                padding: '3px 8px',
                background: s.rrBg, border: `1px solid ${s.rrBorder}`,
                borderRadius: 3, textAlign: 'center', flexShrink: 0,
              }}>
                <div style={{ fontSize: 7, letterSpacing: '0.1em', color: s.ruleColor, fontFamily: JB }}>RR MIN</div>
                <div style={{
                  fontFamily: ORB, fontSize: 11, fontWeight: 700,
                  color: s.accent, textShadow: `0 0 8px ${s.borderTop}80`,
                }}>{s.rr}</div>
              </div>
            </div>

            {/* Description */}
            <div style={{
              fontSize: 11, color: 'rgba(200,190,165,0.65)',
              lineHeight: 1.6, marginBottom: 14,
              borderBottom: `1px solid ${s.descBorder}`,
              paddingBottom: 12, fontFamily: JB,
            }}>{s.desc}</div>

            {/* Rules */}
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontFamily: ORB, fontSize: 7, letterSpacing: '0.18em',
                color: s.ruleColor, marginBottom: 8,
              }}>RÈGLES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {s.rules.map((rule, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 10, color: s.ruleColor, flexShrink: 0, fontFamily: JB }}>
                      {i + 1}.
                    </span>
                    <span style={{ fontSize: 10, color: 'rgba(200,190,165,0.75)', lineHeight: 1.5, fontFamily: JB }}>
                      {rule}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conditions */}
            <div style={{ paddingTop: 10, borderTop: `1px solid ${s.condBorder}` }}>
              <div style={{
                fontFamily: ORB, fontSize: 7, letterSpacing: '0.18em',
                color: s.ruleColor, marginBottom: 6,
              }}>CONDITIONS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {s.conditions.map((cond, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ color: '#00ff88', fontSize: 10, flexShrink: 0, marginTop: 1, fontFamily: JB }}>✓</span>
                    <span style={{ fontSize: 10, color: 'rgba(200,190,165,0.75)', fontFamily: JB }}>{cond}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Quick reference card */}
        <div style={{
          background: 'rgba(10,15,26,0.6)',
          border: '1px solid rgba(201,168,76,0.1)',
          borderRadius: 6, padding: '22px 20px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10,
        }}>
          <div style={{
            fontFamily: ORB, fontSize: 8, letterSpacing: '0.18em',
            color: 'rgba(201,168,76,0.5)', marginBottom: 4,
          }}>RÉFÉRENCE RAPIDE</div>
          {QUICK_REF.map((r, i) => (
            <div key={r.name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < QUICK_REF.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={{ fontSize: 9, color: 'rgba(200,190,165,0.5)', fontFamily: JB }}>{r.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 8, color: r.rrc, fontFamily: JB }}>{r.rr}</span>
                <span style={{ fontSize: 9, fontWeight: 600, color: r.c, fontFamily: JB }}>{r.session}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
