import { useEffect, useState } from 'react'
import { CockpitChart } from '../components/chart/CockpitChart'

const ORB = "'Orbitron', monospace"
const JB  = "'JetBrains Mono', monospace"

const NQ_REF = 30044.75

/* ── Data cards ──────────────────────────────────────────────────── */
const DATA_CARDS = [
  {
    accent: '#c9a84c', label: '📊 RTH J-1',
    rows: [
      { k: 'OPEN',  v: '29,847.50', c: '#e2e8f0' },
      { k: 'HIGH',  v: '30,043.25', c: '#1eb3bc' },
      { k: 'LOW',   v: '29,712.00', c: '#ff6b6b' },
      { k: 'CLOSE', v: '29,984.75', c: '#c9a84c' },
    ],
  },
  {
    accent: '#1eb3bc', label: '🌙 OVN',
    rows: [
      { k: 'BIAIS',    v: 'LONG',      c: '#00ff88', bold: true },
      { k: 'AVWAP',    v: '30,024.00', c: '#c9a84c' },
      { k: 'EXCESS',   v: '+1.8%',     c: '#1eb3bc' },
      { k: 'OVN HIGH', v: '30,158.50', c: '#e2e8f0' },
    ],
  },
  {
    accent: '#d4af37', label: '🧭 ALN',
    rows: [
      { k: 'SESSION',   v: 'P4 London', c: '#d4af37' },
      { k: 'ASIA HIGH', v: '30,158.50', c: '#1eb3bc' },
      { k: 'ASIA LOW',  v: '29,962.00', c: '#ff6b6b' },
      { k: 'CALL WALL', v: '30,600.00', c: '#c9a84c' },
    ],
  },
  {
    accent: '#f0d070', label: '⚡ IB · GEX',
    rows: [
      { k: 'IB HIGH', v: '30,198.75', c: '#1eb3bc' },
      { k: 'IB LOW',  v: '30,042.50', c: '#ff6b6b' },
      { k: 'GAMMA',   v: 'POSITIF',   c: '#f0d070' },
      { k: 'QQQ×40',  v: '540→30,600', c: '#c9a84c' },
    ],
  },
]

/* ── Stats cards ─────────────────────────────────────────────────── */
const STATS = [
  { k: 'WIN RATE',      v: '68.4%', c: '#00ff88', bar: 68.4, type: 'bar' as const },
  { k: 'PROFIT FACTOR', v: '2.14',  c: '#c9a84c', bar: 72,   type: 'bar' as const },
  { k: 'R-MULTIPLE',    v: '+1.8R', c: '#1eb3bc', bar: 60,   type: 'bar' as const },
  {
    k: 'STREAKS', v: '5W · 1L', c: '#f0d070', type: 'dots' as const,
    dots: [true, true, true, true, true, false],
  },
]

export default function Dashboard() {
  const [nq, setNq] = useState(30141.0)
  const [sigDir, setSigDir] = useState<'ACHAT' | 'VENTE'>('ACHAT')

  useEffect(() => {
    const t = setInterval(() => setNq(p => +(p + (Math.random() - 0.49) * 3).toFixed(2)), 900)
    return () => clearInterval(t)
  }, [])

  const diff = nq - NQ_REF
  const pct  = (diff / NQ_REF) * 100
  const up   = diff >= 0

  const isBuy   = sigDir === 'ACHAT'
  const sigColor = isBuy ? '#00ff88' : '#ff4444'

  return (
    <>
      {/* ── PRICE HERO + SIGNAL ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'stretch' }}>

        {/* Left: price panel */}
        <div style={{
          background: 'linear-gradient(135deg, #141820, #0e1017)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8,
          padding: '20px 28px',
          display: 'flex', alignItems: 'center', gap: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* 4px left accent bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
            background: 'linear-gradient(180deg, #c9a84c, #f0d070)',
            borderRadius: '8px 0 0 8px',
          }} />
          <div style={{ paddingLeft: 4 }}>
            <div style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)', marginBottom: 4,
              fontFamily: JB,
            }}>NQ · NASDAQ-100 FUTURES · CME</div>
            <div style={{
              fontFamily: ORB,
              fontSize: 'clamp(42px, 5vw, 60px)',
              fontWeight: 900,
              color: '#f0d070',
              textShadow: '0 0 20px rgba(240,208,112,1), 0 0 40px rgba(240,208,112,0.5)',
              lineHeight: 1, letterSpacing: '0.02em',
            }}>
              {nq.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span style={{
                fontSize: 14, fontWeight: 700, fontFamily: JB,
                color: up ? '#00ff88' : '#ff4444',
                textShadow: up ? '0 0 10px rgba(0,255,136,0.6)' : '0 0 10px rgba(255,68,68,0.6)',
              }}>
                {up ? '▲' : '▼'} {up ? '+' : ''}{diff.toFixed(2)} pts
              </span>
              <span style={{
                padding: '2px 8px',
                background: up ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
                borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: JB,
                color: up ? '#00ff88' : '#ff4444',
              }}>
                {up ? '+' : ''}{pct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Right: signal card */}
        <div style={{
          background: `linear-gradient(135deg, ${sigColor}0f, ${sigColor}05)`,
          border: `1px solid ${sigColor}40`,
          borderRadius: 8, padding: '18px 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          gap: 10, minWidth: 240,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: sigColor, animation: 'dot 1.3s infinite', color: sigColor,
              flexShrink: 0,
            }} />
            <div style={{
              fontFamily: ORB, fontSize: 18, fontWeight: 900,
              color: sigColor, letterSpacing: '0.1em',
              textShadow: `0 0 16px ${sigColor}`,
              cursor: 'pointer',
            }} onClick={() => setSigDir(d => d === 'ACHAT' ? 'VENTE' : 'ACHAT')}>
              {sigDir}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {[
              { k: 'ENTRY',  v: '30,141.00', c: '#c9a84c' },
              { k: 'STOP',   v: '30,050.00', c: '#ff4444' },
              { k: 'TARGET', v: '30,400.00', c: '#00ff88' },
              { k: 'R·R',    v: '2.8',       c: '#c9a84c' },
            ].map(p => (
              <div key={p.k} style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 6, padding: '6px 8px',
              }}>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 2, fontFamily: JB }}>{p.k}</div>
                <div style={{ fontFamily: JB, fontSize: 13, fontWeight: 700, color: p.c }}>{p.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4 DATA CARDS ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {DATA_CARDS.map(card => (
          <div key={card.label} className="panel">
            <div className="panel-header">
              <span style={{
                fontFamily: ORB, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.1em', color: card.accent,
              }}>{card.label}</span>
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {card.rows.map(r => (
                <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: JB }}>{r.k}</span>
                  <span style={{
                    fontFamily: JB, fontSize: 12, fontWeight: (r as typeof r & {bold?: boolean}).bold ? 800 : 600,
                    color: r.c,
                  }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── CHART ─────────────────────────────────────────────── */}
      <div className="panel" style={{ overflow: 'hidden', minHeight: 220 }}>
        <div className="panel-header">
          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)', fontFamily: JB }}>
            NQ · 30M · CANDLESTICK + TPO
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'Bougies', bg: 'rgba(201,168,76,0.1)', border: 'rgba(201,168,76,0.2)', c: '#c9a84c' },
              { label: 'TPO',     bg: 'rgba(30,179,188,0.1)', border: 'rgba(30,179,188,0.2)', c: '#1eb3bc' },
            ].map(b => (
              <span key={b.label} style={{
                padding: '2px 8px',
                background: b.bg, border: `1px solid ${b.border}`,
                borderRadius: 4, fontSize: 9, color: b.c, fontFamily: JB,
              }}>{b.label}</span>
            ))}
          </div>
        </div>
        <div style={{ height: 200 }}>
          <CockpitChart />
        </div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, paddingBottom: 6 }}>
        {STATS.map(s => (
          <div key={s.k} className="panel" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{
              fontSize: 9, fontWeight: 500, letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)', marginBottom: 6, fontFamily: JB,
            }}>{s.k}</div>
            <div style={{
              fontFamily: ORB, fontSize: 24, fontWeight: 900, color: s.c,
            }}>{s.v}</div>

            {s.type === 'bar' && (
              <div style={{ marginTop: 6, height: 3, background: `${s.c}26`, borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${s.bar}%`, background: s.c, borderRadius: 2 }} />
              </div>
            )}

            {s.type === 'dots' && s.dots && (
              <div style={{ marginTop: 6, display: 'flex', gap: 2, justifyContent: 'center' }}>
                {s.dots.map((win, i) => (
                  <div key={i} style={{
                    width: 14, height: 6, borderRadius: 2,
                    background: win ? '#00ff88' : '#ff6b6b',
                  }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
