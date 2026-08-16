import { useEffect, useState } from 'react'
import { CockpitChart } from '../components/chart/CockpitChart'

const CSS = `
  @keyframes glowPrice {
    0%,100% { text-shadow: 0 0 24px rgba(240,208,112,0.9), 0 0 48px rgba(240,208,112,0.4), 0 0 80px rgba(240,208,112,0.15); }
    50%      { text-shadow: 0 0 8px rgba(240,208,112,0.4); }
  }
  @keyframes glowGreen {
    0%,100% { text-shadow: 0 0 16px rgba(0,255,136,0.8), 0 0 32px rgba(0,255,136,0.3); }
    50%      { text-shadow: 0 0 6px rgba(0,255,136,0.3); }
  }
  @keyframes scanHub {
    0%   { top: -80px; }
    100% { top: 100%; }
  }
`

const NQ_REF = 30044.75
const ORBITRON = "'Orbitron', monospace"
const JB      = "'JetBrains Mono', monospace"

function InfoCard({ accent, glow, icon, title, rows }: {
  accent: string
  glow: string
  icon: string
  title: string
  rows: { k: string; v: string; c: string; bold?: boolean }[]
}) {
  return (
    <div style={{
      background: 'rgba(10,15,26,0.85)',
      border: `1px solid ${accent}33`,
      borderTop: `2px solid ${accent}`,
      borderRadius: 4, padding: 14,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 0%, ${glow}, transparent 65%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontFamily: ORBITRON, fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', color: accent }}>{title}</span>
      </div>
      {rows.map(r => (
        <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontFamily: JB, fontSize: 8, color: 'rgba(136,153,187,0.5)' }}>{r.k}</span>
          <span style={{
            fontFamily: JB, fontSize: 9,
            fontWeight: r.bold ? 700 : 600,
            color: r.c,
            textShadow: r.bold ? `0 0 8px ${r.c}80` : 'none',
          }}>{r.v}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [nq, setNq] = useState(30141.0)

  useEffect(() => {
    const t = setInterval(() => setNq(p => +(p + (Math.random() - 0.49) * 3).toFixed(2)), 900)
    return () => clearInterval(t)
  }, [])

  const diff = nq - NQ_REF
  const pct  = (diff / NQ_REF) * 100
  const up   = diff >= 0

  return (
    <div style={{ marginLeft: -24, marginRight: -24, marginTop: -24 }}>
      <style>{CSS}</style>

      {/* Scan line */}
      <div style={{
        position: 'fixed', left: 0, right: 0, height: 60,
        pointerEvents: 'none', zIndex: 5,
        background: 'linear-gradient(180deg, transparent, rgba(201,168,76,0.018), transparent)',
        animation: 'scanHub 16s linear infinite',
      }} />

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── PRICE HERO ── */}
        <div style={{ textAlign: 'center', padding: '20px 0 14px', position: 'relative' }}>
          <div style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 400, height: 100,
            background: 'radial-gradient(ellipse, rgba(201,168,76,0.09), transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            fontFamily: ORBITRON, fontSize: 8,
            letterSpacing: '0.22em', color: 'rgba(201,168,76,0.45)', marginBottom: 4,
          }}>NQ · NASDAQ 100 FUTURES · CME</div>
          <div style={{
            fontFamily: ORBITRON,
            fontSize: 'clamp(44px, 6vw, 68px)',
            fontWeight: 900, letterSpacing: '0.04em', lineHeight: 1,
            background: 'linear-gradient(135deg, #c9a84c, #f0d070, #e8c86a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: 'glowPrice 3s ease-in-out infinite',
          } as React.CSSProperties}>
            {nq.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 5 }}>
            <span style={{
              fontFamily: JB, fontSize: 13, fontWeight: 700,
              color: up ? '#00ff88' : '#ff4444', letterSpacing: '0.05em',
              textShadow: `0 0 10px ${up ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.5)'}`,
            }}>{up ? '▲' : '▼'} {up ? '+' : ''}{diff.toFixed(2)} pts</span>
            <span style={{ fontFamily: JB, fontSize: 11, fontWeight: 600, color: up ? '#00ff88' : '#ff4444' }}>
              {up ? '+' : ''}{pct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* ── INFO CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <InfoCard
            accent="#c9a84c" glow="rgba(201,168,76,0.05)"
            icon="📊" title="RTH J-1"
            rows={[
              { k: 'OPEN',  v: '21,400.00', c: 'rgba(255,255,255,0.85)' },
              { k: 'HIGH',  v: '21,492.50', c: '#1eb3bc' },
              { k: 'LOW',   v: '21,318.75', c: '#ff4444' },
              { k: 'CLOSE', v: '21,443.25', c: '#c9a84c' },
            ]}
          />
          <InfoCard
            accent="#1eb3bc" glow="rgba(30,179,188,0.06)"
            icon="🌙" title="OVN"
            rows={[
              { k: 'Biais',    v: 'LONG',      c: '#00ff88', bold: true },
              { k: 'AVWAP',    v: '21,358.50', c: '#c9a84c' },
              { k: 'Excess',   v: '+1.8%',     c: '#1eb3bc' },
              { k: 'OVN HIGH', v: '21,412.00', c: 'rgba(255,255,255,0.7)' },
            ]}
          />
          <InfoCard
            accent="#d4af37" glow="rgba(212,175,55,0.06)"
            icon="🧭" title="ALN"
            rows={[
              { k: 'Session',   v: 'P4 London', c: 'rgba(212,175,55,0.9)', bold: true },
              { k: 'ASIA HIGH', v: '21,412.00', c: 'rgba(255,255,255,0.7)' },
              { k: 'ASIA LOW',  v: '21,318.75', c: 'rgba(255,255,255,0.7)' },
              { k: 'Call Wall', v: '30,600.00', c: '#c9a84c' },
            ]}
          />
          <InfoCard
            accent="#f0d070" glow="rgba(240,208,112,0.05)"
            icon="⚡" title="IB · GEX"
            rows={[
              { k: 'IB HIGH',        v: '21,492.50',    c: '#1eb3bc' },
              { k: 'IB LOW',         v: '21,318.75',    c: '#ff4444' },
              { k: 'Gamma Exposure', v: 'POSITIF',      c: '#f0d070' },
              { k: 'QQQ × 40',       v: '540 → 30,600', c: '#c9a84c' },
            ]}
          />
        </div>

        {/* ── SIGNAL BAR ── */}
        <div style={{
          background: 'linear-gradient(90deg, rgba(10,15,26,0.95), rgba(6,8,16,0.98))',
          border: '1px solid rgba(201,168,76,0.25)',
          borderRadius: 4, padding: '14px 20px',
          boxShadow: '0 0 24px rgba(201,168,76,0.08), inset 0 0 40px rgba(0,255,136,0.02)',
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.5), transparent)',
          }} />

          {/* Signal dot + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: '#00ff88', boxShadow: '0 0 10px #00ff88',
              animation: 'pulseDot 1.4s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <div>
              <div style={{
                fontFamily: ORBITRON, fontSize: 16, fontWeight: 900,
                color: '#00ff88', letterSpacing: '0.14em', lineHeight: 1,
                animation: 'glowGreen 2s ease-in-out infinite',
              }}>ACHAT</div>
              <div style={{ fontFamily: JB, fontSize: 7, letterSpacing: '0.1em', color: 'rgba(0,255,136,0.5)', marginTop: 1 }}>SIGNAL ACTIF</div>
            </div>
          </div>

          <div style={{ width: 1, height: 32, background: 'rgba(201,168,76,0.12)', flexShrink: 0 }} />

          {/* Trade params */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              { k: 'ENTRY',  v: '30,141.00', c: '#c9a84c',  glow: false },
              { k: 'STOP',   v: '30,050.00', c: '#ff4444',  glow: true },
              { k: 'TARGET', v: '30,400.00', c: '#00ff88',  glow: true },
              { k: 'R:R',    v: 'R·R  2.8',  c: '#1eb3bc',  glow: false },
            ].map(p => (
              <div key={p.k}>
                <div style={{ fontFamily: JB, fontSize: 7, letterSpacing: '0.1em', color: 'rgba(136,153,187,0.45)', marginBottom: 2 }}>{p.k}</div>
                <div style={{
                  fontFamily: JB, fontSize: 13, fontWeight: 700, color: p.c,
                  textShadow: p.glow ? `0 0 8px ${p.c}66` : 'none',
                }}>{p.v}</div>
              </div>
            ))}
          </div>

          <span style={{ fontFamily: JB, fontSize: 7, letterSpacing: '0.12em', color: 'rgba(136,153,187,0.3)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            NQ · CME · MÉTHODE SALAH
          </span>
        </div>

        {/* ── COCKPIT CHART ── */}
        <div style={{
          background: 'rgba(6,8,16,0.97)',
          border: '1px solid rgba(201,168,76,0.14)',
          borderTop: '2px solid rgba(201,168,76,0.6)',
          borderRadius: 4,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Chart header bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '8px 14px',
            borderBottom: '1px solid rgba(201,168,76,0.08)',
            background: 'rgba(10,15,26,0.8)',
          }}>
            <span style={{ fontFamily: ORBITRON, fontSize: 7, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(201,168,76,0.6)' }}>NQ · 30 MIN · CME</span>
            <div style={{ width: 1, height: 12, background: 'rgba(201,168,76,0.12)' }} />
            <span style={{ fontFamily: JB, fontSize: 8, color: 'rgba(136,153,187,0.4)' }}>VOLUME PROFILE · BPR · FVG · OTE · RTH LEVELS</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              {[
                { label: 'DONNÉES SIMULÉES', c: 'rgba(240,208,112,0.5)' },
                { label: 'SIERRA CHART READY', c: 'rgba(30,179,188,0.5)' },
              ].map(p => (
                <span key={p.label} style={{
                  fontFamily: JB, fontSize: 6.5, color: p.c,
                  background: `${p.c.replace('0.5)', '0.05)')}`,
                  border: `1px solid ${p.c.replace('0.5)', '0.18)')}`,
                  padding: '2px 7px', borderRadius: 2, letterSpacing: '0.06em',
                }}>{p.label}</span>
              ))}
            </div>
          </div>
          <CockpitChart height={440} />
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { k: 'WIN RATE',        v: '68.4%',   c: '#00ff88' },
            { k: 'PROFIT FACTOR',   v: '2.14',    c: '#c9a84c' },
            { k: 'R-MULTIPLE MOY.', v: '+1.8R',   c: '#1eb3bc' },
            { k: 'STREAKS',         v: '5W · 1L', c: '#f0d070' },
          ].map(s => (
            <div key={s.k} style={{
              background: 'rgba(10,15,26,0.7)',
              border: '1px solid rgba(201,168,76,0.1)',
              borderRadius: 4, padding: 12, textAlign: 'center',
            }}>
              <div style={{ fontFamily: JB, fontSize: 7, letterSpacing: '0.12em', color: 'rgba(136,153,187,0.45)', marginBottom: 4 }}>{s.k}</div>
              <div style={{ fontFamily: ORBITRON, fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
