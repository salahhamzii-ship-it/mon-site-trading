import { useEffect, useState, useRef } from 'react'
import { CockpitChart } from '../components/chart/CockpitChart'

const ORB = "'Orbitron', monospace"
const JB  = "'JetBrains Mono', monospace"

const fmt = (v: number | string | undefined, dec = 2) => {
  const n = parseFloat(String(v || ''))
  if (isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

const STATS = [
  { k: 'WIN RATE',      v: '68.4%', c: '#00ff88', bar: 68.4, type: 'bar'  as const },
  { k: 'PROFIT FACTOR', v: '2.14',  c: '#c9a84c', bar: 72,   type: 'bar'  as const },
  { k: 'R-MULTIPLE',    v: '+1.8R', c: '#1eb3bc', bar: 60,   type: 'bar'  as const },
  { k: 'STREAKS', v: '5W · 1L', c: '#f0d070', type: 'dots' as const,
    dots: [true,true,true,true,true,false] },
]

interface BridgeNQ {
  last?: string | number
  j1_open?: string | number
  j1_high?: string | number
  j1_low?: string | number
  j1_settle?: string | number
  vah?: string | number
  val?: string | number
  poc?: string | number
  ovn_vwap?: string | number
  ovn_high?: string | number
  ovn_low?: string | number
  ovn_close?: string | number
  atr_auto?: string | number
  asia_high?: string | number
  asia_low?: string | number
  lon_high?: string | number
  lon_low?: string | number
  ovn_sd2h?: string | number
  ovn_sd2l?: string | number
}

export default function Dashboard() {
  const [bridge, setBridge] = useState<BridgeNQ>({})
  const [online, setOnline]   = useState(false)
  const [sigDir, setSigDir]   = useState<'ACHAT' | 'VENTE'>('ACHAT')
  const prevRef = useRef<number>(0)

  useEffect(() => {
    let active = true
    const poll = async () => {
      try {
        const r = await fetch('/api/bridge-data')
        if (r.ok) {
          const d = await r.json()
          if (active && !d.error && d.NQ) {
            setBridge(d.NQ)
            setOnline(true)
            prevRef.current = parseFloat(String(d.NQ.last || '0'))
          }
        } else { if (active) setOnline(false) }
      } catch { if (active) setOnline(false) }
      if (active) setTimeout(poll, 10000)
    }
    poll()
    return () => { active = false }
  }, [])

  const nq      = parseFloat(String(bridge.last || '0')) || prevRef.current
  const settle  = parseFloat(String(bridge.j1_settle || bridge.last || '0'))
  const diff    = settle > 0 ? nq - settle : 0
  const pct     = settle > 0 ? (diff / settle) * 100 : 0
  const up      = diff >= 0

  const isBuy    = sigDir === 'ACHAT'
  const sigColor = isBuy ? '#00ff88' : '#ff4444'

  // OVN biais: prix vs AVWAP18h
  const avwap18h = parseFloat(String(bridge.ovn_vwap || '0'))
  const ovnBiais = avwap18h > 0 ? (nq >= avwap18h ? 'LONG' : 'SHORT') : '—'
  const ovnColor = ovnBiais === 'LONG' ? '#00ff88' : ovnBiais === 'SHORT' ? '#ff4444' : '#8899bb'

  // ALN pattern depuis session (à renseigner manuellement dans calculateur)
  const DATA_CARDS = [
    {
      accent: '#c9a84c', label: '📊 RTH J-1',
      rows: [
        { k: 'OPEN',   v: fmt(bridge.j1_open),   c: '#e2e8f0' },
        { k: 'HIGH',   v: fmt(bridge.j1_high),   c: '#1eb3bc' },
        { k: 'LOW',    v: fmt(bridge.j1_low),    c: '#ff6b6b' },
        { k: 'SETTLE', v: fmt(bridge.j1_settle), c: '#c9a84c' },
      ],
    },
    {
      accent: '#1eb3bc', label: '🌙 OVN',
      rows: [
        { k: 'BIAIS',    v: ovnBiais,              c: ovnColor, bold: true },
        { k: 'AVWAP 18H',v: fmt(bridge.ovn_vwap), c: '#c9a84c' },
        { k: 'OVN HIGH', v: fmt(bridge.ovn_high), c: '#e2e8f0' },
        { k: 'OVN LOW',  v: fmt(bridge.ovn_low),  c: '#e2e8f0' },
      ],
    },
    {
      accent: '#d4af37', label: '🧭 ALN',
      rows: [
        { k: 'ASIA HIGH',  v: fmt(bridge.asia_high), c: '#1eb3bc' },
        { k: 'ASIA LOW',   v: fmt(bridge.asia_low),  c: '#ff6b6b' },
        { k: 'LON HIGH',   v: fmt(bridge.lon_high),  c: '#1eb3bc' },
        { k: 'LON LOW',    v: fmt(bridge.lon_low),   c: '#ff6b6b' },
      ],
    },
    {
      accent: '#f0d070', label: '📐 SD BANDS',
      rows: [
        { k: 'SD+2',  v: fmt(bridge.ovn_sd2h), c: '#ff6b6b' },
        { k: 'VWAP',  v: fmt(bridge.ovn_vwap), c: '#c9a84c' },
        { k: 'SD-2',  v: fmt(bridge.ovn_sd2l), c: '#00ff88' },
        { k: 'ATR',   v: fmt(bridge.atr_auto, 0), c: '#8899bb' },
      ],
    },
  ]

  return (
    <>
      {/* ── PRICE HERO + SIGNAL ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'stretch' }}>

        {/* Left: price panel */}
        <div style={{
          background: 'linear-gradient(135deg, #141820, #0e1017)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 8, padding: '20px 28px',
          display: 'flex', alignItems: 'center', gap: 28,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, width: 4, height: '100%',
            background: 'linear-gradient(180deg, #c9a84c, #f0d070)',
            borderRadius: '8px 0 0 8px',
          }} />
          <div style={{ paddingLeft: 4 }}>
            <div style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)', marginBottom: 4, fontFamily: JB,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              NQ · NASDAQ-100 FUTURES · CME
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '1px 6px', borderRadius: 3,
                background: online ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)',
                border: `1px solid ${online ? 'rgba(0,255,136,0.3)' : 'rgba(255,68,68,0.3)'}`,
                fontSize: 9, color: online ? '#00ff88' : '#ff4444',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: online ? '#00ff88' : '#ff4444',
                  display: 'inline-block',
                }} />
                {online ? 'BRIDGE' : 'OFFLINE'}
              </span>
            </div>
            <div style={{
              fontFamily: ORB,
              fontSize: 'clamp(42px, 5vw, 60px)',
              fontWeight: 900,
              color: nq > 0 ? '#f0d070' : '#444',
              textShadow: nq > 0 ? '0 0 20px rgba(240,208,112,1), 0 0 40px rgba(240,208,112,0.5)' : 'none',
              lineHeight: 1, letterSpacing: '0.02em',
            }}>
              {nq > 0 ? nq.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '——'}
            </div>
            {settle > 0 && (
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
            )}
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
              background: sigColor, animation: 'dot 1.3s infinite',
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
              { k: 'VAH J-1', v: fmt(bridge.vah),      c: '#c9a84c' },
              { k: 'VAL J-1', v: fmt(bridge.val),       c: '#ff4444' },
              { k: 'POC J-1', v: fmt(bridge.poc),       c: '#00ff88' },
              { k: 'ATR',     v: fmt(bridge.atr_auto,0),c: '#8899bb' },
            ].map(p => (
              <div key={p.k} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '6px 8px' }}>
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
            <div style={{ fontFamily: ORB, fontSize: 24, fontWeight: 900, color: s.c }}>{s.v}</div>
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
