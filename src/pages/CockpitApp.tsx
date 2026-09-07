import { useState, useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { LiveCanvas } from '../components/chart/LiveCanvas'

/* ── Types ──────────────────────────────────────────────────── */
type View   = 'dash' | 'session' | 'signals' | 'chart' | 'screener' | 'settings'
type Signal = 'ACHAT' | 'VENTE'

interface BridgePayload {
  last?: string
  ovn_vwap?: string
  ovn_sd1h?: string; ovn_sd1l?: string
  ovn_sd2h?: string; ovn_sd2l?: string
  ovn_sd3h?: string; ovn_sd3l?: string
  avwap_side?: 'above' | 'below' | ''
  laf_sd2?: boolean; lbf_sd2?: boolean
  par9?: string
  poc?: string; vah?: string; val?: string
  j1_high?: string; j1_low?: string; j1_settle?: string
}
interface BridgeData {
  NQ?: BridgePayload
  ES?: BridgePayload
  GC?: BridgePayload
  CL?: BridgePayload
}

/* ── Design tokens ──────────────────────────────────────────── */
const T = {
  gold:    '#c9a84c',
  goldL:   '#f0d070',
  teal:    '#1eb3bc',
  amber:   '#d4af37',
  up:      '#00ff88',
  down:    '#ff4444',
  muted:   '#8899bb',
  bg:      '#060810',
  bgB:     '#0a0f1a',
  surface: 'rgba(7,10,18,0.6)',
  border:  'rgba(201,168,76,0.11)',
}

/* ── Inline style helpers ───────────────────────────────────── */
const orb  = (sz: number, w = 700, extra?: CSSProperties): CSSProperties =>
  ({ fontFamily: 'Orbitron, monospace', fontSize: sz, fontWeight: w, ...extra })
const jb   = (sz: number, w = 400, extra?: CSSProperties): CSSProperties =>
  ({ fontFamily: '"JetBrains Mono", monospace', fontSize: sz, fontWeight: w, ...extra })

/* ── Ticker instruments ─────────────────────────────────────── */
const INSTRUMENTS = [
  { sym: 'NQ100', base: 29500, mult: 8 },
  { sym: 'ES',    base: 7700,  mult: 2.5 },
  { sym: 'GC',    base: 4450,  mult: 1.2 },
  { sym: 'CL',    base: 92,    mult: 0.4 },
]

interface TickerPrice { price: number; delta: number }

/* ════════════════════════════════════════════════════════════════
   MAIN COCKPIT
════════════════════════════════════════════════════════════════ */
export default function CockpitApp() {
  const [view,   setView]   = useState<View>('dash')
  const [signal, setSignal] = useState<Signal>('ACHAT')
  const [clock,  setClock]  = useState('')
  const [date,   setDate]   = useState('')
  const [prices, setPrices] = useState<TickerPrice[]>(
    INSTRUMENTS.map(i => ({ price: i.base, delta: 0 }))
  )
  const [bridgeData, setBridgeData] = useState<BridgeData | null>(null)
  const prevAvwapSide = useRef<string>('')

  // Bridge data — fetch every 30s
  useEffect(() => {
    const fetchBridge = async () => {
      try {
        const r = await fetch('/api/bridge-data', { cache: 'no-store' })
        if (!r.ok) return
        const d: BridgeData = await r.json()
        setBridgeData(d)
        // Seed ticker prices from real bridge data
        setPrices(prev => {
          const keys = ['NQ', 'ES', 'GC', 'CL'] as const
          return prev.map((p, i) => {
            const real = parseFloat(String(d[keys[i]]?.last || ''))
            if (!isNaN(real) && real > 0) return { price: real, delta: +(real - p.price).toFixed(2) }
            return p
          })
        })
        // Signal from AVWAP side
        const side = d?.NQ?.avwap_side || ''
        if (side === 'above') setSignal('ACHAT')
        else if (side === 'below') setSignal('VENTE')
        if (side && prevAvwapSide.current && side !== prevAvwapSide.current) {
          playBip()
        }
        if (side) prevAvwapSide.current = side
      } catch { /* bridge offline */ }
    }
    fetchBridge()
    const id = setInterval(fetchBridge, 30_000)
    return () => clearInterval(id)
  }, [])

  // Clock — EST
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const est = new Date(now.getTime() - (now.getTimezoneOffset() + 300) * 60000)
      setClock(est.toLocaleTimeString('en-US', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' }))
      setDate(est.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }))
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  // Ticker
  useEffect(() => {
    const id = setInterval(() => {
      setPrices(prev => prev.map((p, i) => {
        const d = (Math.random() - 0.49) * INSTRUMENTS[i].mult
        return { price: +(p.price + d).toFixed(2), delta: d }
      }))
    }, 680)
    return () => clearInterval(id)
  }, [])


  const NAV: { id: View; icon: string; label: string }[] = [
    { id: 'dash',     icon: '⬡', label: 'DASHBOARD' },
    { id: 'session',  icon: '◈', label: 'SESSION'   },
    { id: 'signals',  icon: '◉', label: 'SIGNAUX'   },
    { id: 'chart',    icon: '▦', label: 'CHART'     },
    { id: 'screener', icon: '≡', label: 'SCREENER'  },
    { id: 'settings', icon: '⚙', label: 'CONFIG'    },
  ]

  const shell: CSSProperties = {
    display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
    background: T.bg, position: 'relative',
  }
  const scanline: CSSProperties = {
    position: 'absolute', left: 0, right: 0, height: 160, pointerEvents: 'none', zIndex: 10,
    background: 'linear-gradient(transparent, rgba(201,168,76,0.03) 50%, transparent)',
    animation: 'scanMove 9s linear infinite',
    top: 0,
  }
  const topEdge: CSSProperties = {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.7) 50%, transparent 100%)',
    boxShadow: '0 0 18px rgba(201,168,76,0.7)',
    zIndex: 100,
  }

  return (
    <div style={shell}>
      <div style={scanline} />
      <div style={topEdge} />

      {/* ── Header ── */}
      <header style={{
        height: 62, flexShrink: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 18px',
        background: 'linear-gradient(90deg, #0d1628, #09101c, #0d1628)',
        borderBottom: `1px solid ${T.border}`,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 120 }}>
          <span style={orb(12.5, 900, {
            color: T.gold, letterSpacing: '0.12em',
            textShadow: '0 0 18px rgba(201,168,76,0.5)',
            animation: 'glowPulse 3s ease-in-out infinite',
          })}>🐪 CAMEL MARKET</span>
          <span style={orb(8, 700, { color: T.goldL, opacity: 0.7, letterSpacing: '0.18em' })}>
            COCKPIT · NQ100 FUTURES
          </span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', gap: 4, overflowX: 'auto', alignItems: 'center' }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', border: 'none', cursor: 'pointer', borderRadius: 3,
              background: view === n.id ? 'rgba(201,168,76,0.10)' : 'transparent',
              outline: view === n.id ? '1px solid rgba(201,168,76,0.28)' : '1px solid transparent',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (view !== n.id) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,0.06)' }}
            onMouseLeave={e => { if (view !== n.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <span style={{ fontSize: 12, color: view === n.id ? T.gold : T.muted }}>{n.icon}</span>
              <span style={orb(7.5, 700, {
                letterSpacing: '0.22em',
                color: view === n.id ? T.gold : T.muted,
              })}>{n.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: clock + RTH pill */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span style={orb(14, 700, {
            color: T.goldL, letterSpacing: '0.08em',
            animation: 'shimmer 2.5s ease-in-out infinite',
          })}>{clock}</span>
          <span style={jb(8.5, 400, { color: T.muted })}>{date}</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px',
          background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 3,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.up, animation: 'pulseDot 1.8s infinite' }} />
          <span style={orb(8, 700, { color: T.up, letterSpacing: '0.18em' })}>RTH LIVE</span>
        </div>
      </header>

      {/* ── Ticker Bar ── */}
      <div style={{
        height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 28,
        padding: '0 18px', overflowX: 'auto',
        background: 'rgba(7,10,18,0.97)',
        borderBottom: 'rgba(201,168,76,0.065) 1px solid',
        zIndex: 40,
      }}>
        {INSTRUMENTS.map((inst, i) => {
          const p = prices[i]; const up = p.delta >= 0
          return (
            <div key={inst.sym} style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={orb(9, 700, { color: T.gold, letterSpacing: '0.22em' })}>{inst.sym}</span>
              <span style={jb(12, 600, { color: '#fff' })}>
                {p.price.toLocaleString('en-US', { minimumFractionDigits: inst.mult < 1 ? 2 : 2 })}
              </span>
              <span style={jb(10, 600, {
                color: up ? T.up : T.down,
                textShadow: up ? '0 0 10px rgba(0,255,136,0.6)' : '0 0 10px rgba(255,68,68,0.6)',
              })}>{up ? '▲' : '▼'} {Math.abs(p.delta).toFixed(2)}</span>
            </div>
          )
        })}
      </div>

      {/* ── View Body ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {view === 'dash'     && <DashView     signal={signal} nqPrice={prices[0].price} nqDelta={prices[0].delta} bridgeData={bridgeData} />}
        {view === 'session'  && <SessionView  />}
        {view === 'signals'  && <SignalsView  signal={signal} />}
        {view === 'chart'    && <ChartView    />}
        {view === 'screener' && <ScreenerView prices={prices} />}
        {view === 'settings' && <SettingsView />}
      </div>
    </div>
  )
}

/* ── Bip sonore alerte changement AVWAP side ──────────────────── */
function playBip() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'; osc.frequency.value = 880
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.start(); osc.stop(ctx.currentTime + 0.45)
  } catch { /* autoplay blocked */ }
}

/* ════════════════════════════════════════════════════════════════
   DASHBOARD VIEW
════════════════════════════════════════════════════════════════ */
interface DashProps { signal: Signal; nqPrice: number; nqDelta: number; bridgeData: BridgeData | null }

function DashView({ signal, nqPrice, nqDelta, bridgeData }: DashProps) {
  const isBuy = signal === 'ACHAT'
  const sigCol = isBuy ? T.up : T.down
  const whole = Math.floor(nqPrice).toLocaleString('en-US')
  const dec   = (nqPrice % 1).toFixed(2).slice(1)
  const up    = nqDelta >= 0

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', animation: 'fadeSlide 0.2s ease-out' }}>
      {/* Chart left 65% */}
      <div style={{ flex: '0 0 65%', position: 'relative', height: '100%', borderRight: `1px solid ${T.border}` }}>
        <LiveCanvas />
      </div>

      {/* Right panel 35% */}
      <div style={{
        flex: '0 0 35%', overflowY: 'auto', padding: '14px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {/* Price block */}
        <div style={{ padding: '12px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4 }}>
          <div style={orb(8.5, 700, { color: T.muted, letterSpacing: '0.3em', marginBottom: 6 })}>
            NQ100 FUTURES · LIVE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={orb(50, 900, {
              color: T.gold, letterSpacing: '0.02em', lineHeight: 1,
              animation: 'glowPulse 3s ease-in-out infinite',
            })}>{whole}</span>
            <span style={orb(28, 900, { color: T.gold, opacity: 0.6, lineHeight: 1 })}>{dec}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span style={jb(18, 700, {
              color: up ? T.up : T.down,
              textShadow: up ? '0 0 14px rgba(0,255,136,0.7)' : '0 0 14px rgba(255,68,68,0.7)',
            })}>
              {up ? '▲' : '▼'} {up ? '+' : ''}{nqDelta.toFixed(2)}
            </span>
            <span style={orb(12, 700, {
              color: up ? T.up : T.down,
              background: up ? 'rgba(0,255,136,0.09)' : 'rgba(255,68,68,0.09)',
              border: `1px solid ${up ? 'rgba(0,255,136,0.22)' : 'rgba(255,68,68,0.22)'}`,
              borderRadius: 3, padding: '3px 11px',
            })}>
              {up ? '+' : ''}{((nqDelta / nqPrice) * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Signal block */}
        <div style={{ padding: '12px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{
              width: 11, height: 11, borderRadius: '50%', background: sigCol, flexShrink: 0,
              animation: isBuy ? 'pulseDot 1.8s infinite' : 'pulseDotRed 1.8s infinite',
            }} />
            <span style={orb(36, 900, {
              color: sigCol, lineHeight: 1,
              textShadow: `0 0 24px ${sigCol}, 0 0 48px ${sigCol}40`,
            })}>{signal}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'ENTRY',  val: (nqPrice + (isBuy ? -12 : +12)).toFixed(2),           col: T.gold },
              { label: 'STOP',   val: (nqPrice + (isBuy ? -45 : +45)).toFixed(2),            col: T.down },
              { label: 'TARGET', val: (nqPrice + (isBuy ? +78 : -78)).toFixed(2),            col: T.up },
              { label: 'R:R',    val: '1 : 2.4',                                              col: T.teal },
            ].map(b => (
              <div key={b.label} style={{
                padding: '8px 10px', borderRadius: 3,
                background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`,
              }}>
                <div style={orb(7.5, 700, { color: T.muted, letterSpacing: '0.2em', marginBottom: 3 })}>{b.label}</div>
                <div style={jb(13, 600, { color: b.col })}>{b.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AVWAP §9 panel — données bridge live */}
        <AvwapPanel bridgeData={bridgeData} />

        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { lbl: 'WIN%', val: '68.4%', col: T.up,   border: T.up  },
            { lbl: 'P·F',  val: '2.14',  col: T.gold,  border: T.gold },
            { lbl: 'P&L',  val: '+$1 248', col: T.up, border: T.teal },
          ].map(s => (
            <div key={s.lbl} style={{
              padding: '8px 10px', borderRadius: 3, textAlign: 'center',
              background: T.surface, border: `1px solid ${T.border}`,
              borderTop: `2px solid ${s.border}`,
            }}>
              <div style={orb(7.5, 700, { color: T.muted, letterSpacing: '0.18em', marginBottom: 4 })}>{s.lbl}</div>
              <div style={jb(14, 700, { color: s.col })}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Balance */}
        <div style={{ padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'baseline' }}>
            <span style={orb(8, 700, { color: T.muted, letterSpacing: '0.2em' })}>BALANCE COMPTE</span>
            <span style={jb(14, 700, { color: T.up })}>$53 248.00</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: '68%', borderRadius: 2,
              background: `linear-gradient(90deg, ${T.gold}, ${T.goldL})`,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={jb(8, 400, { color: T.muted })}>Drawdown max : $2 800</span>
            <span style={jb(8, 600, { color: T.gold })}>68% objectif</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   AVWAP §9 PANEL — données bridge live NQ + ES
════════════════════════════════════════════════════════════════ */
function AvwapPanel({ bridgeData }: { bridgeData: BridgeData | null }) {
  const nq = bridgeData?.NQ
  const es = bridgeData?.ES

  const sideColor = (s?: string) =>
    s === 'above' ? T.up : s === 'below' ? T.down : T.muted

  const sideLabel = (s?: string) =>
    s === 'above' ? 'ABOVE ↑' : s === 'below' ? 'BELOW ↓' : '——'

  const par9 = nq?.par9
  const par9Color = par9 === 'above' ? T.up : par9 === 'below' ? T.down : par9 === 'divergent' ? T.amber : T.muted
  const par9Label = par9 === 'above' ? '§9 LONG' : par9 === 'below' ? '§9 SHORT' : par9 === 'divergent' ? '§9 DIVERGENT' : '§9 ——'

  const fmt = (v?: string) => v && parseFloat(v) > 100 ? parseFloat(v).toFixed(2) : '——'

  const sdRow = (label: string, val?: string, note = '', col = T.muted) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '1.5px 0' }}>
      <span style={jb(7.5, 400, { color: T.muted, minWidth: 38 })}>{label}</span>
      <span style={jb(10.5, 600, { color: col, fontVariantNumeric: 'tabular-nums' })}>{fmt(val)}</span>
      {note && <span style={jb(7, 400, { color: T.muted, marginLeft: 4 })}>{note}</span>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>

      {/* §9 badge */}
      <div style={{
        padding: '8px 12px', borderRadius: 3,
        background: T.surface, border: `1px solid ${T.border}`,
        borderTop: `2px solid ${par9Color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={orb(7.5, 700, { color: T.muted, letterSpacing: '0.25em', marginBottom: 4 })}>AVWAP 18H · §9 DALTON</div>
          <div style={orb(20, 900, {
            color: par9Color, lineHeight: 1,
            textShadow: par9 !== 'divergent' && par9 ? `0 0 16px ${par9Color}80` : 'none',
          })}>{par9Label}</div>
        </div>
        {(nq?.laf_sd2 || nq?.lbf_sd2) && (
          <div style={{
            padding: '3px 8px', borderRadius: 2,
            background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)',
          }}>
            <span style={orb(8, 700, { color: T.down })}>{nq?.laf_sd2 ? 'LAF SD2' : 'LBF SD2'}</span>
          </div>
        )}
      </div>

      {/* NQ + ES côte à côte */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {([['NQ', nq], ['ES', es]] as const).map(([sym, d]) => {
          const side = d?.avwap_side
          const col  = sideColor(side)
          return (
            <div key={sym} style={{
              padding: '9px 11px', borderRadius: 3,
              background: `${col}08`, border: `1px solid ${col}28`,
              borderTop: `2px solid ${col}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'baseline' }}>
                <span style={orb(10, 900, { color: T.gold })}>{sym}</span>
                <span style={jb(8, 700, { color: col })}>{sideLabel(side)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sdRow('SD+3', d?.ovn_sd3h, '★', T.down)}
                {sdRow('SD+2', d?.ovn_sd2h, '', T.down)}
                {sdRow('SD+1', d?.ovn_sd1h)}
                {sdRow('AVWAP', d?.ovn_vwap, '👑', T.teal)}
                {sdRow('SD-1', d?.ovn_sd1l)}
                {sdRow('SD-2', d?.ovn_sd2l, '', T.up)}
                {sdRow('LAST', d?.last, '', '#fff')}
              </div>
            </div>
          )
        })}
      </div>

      {/* J-1 ref */}
      {nq?.vah && (
        <div style={{ padding: '8px 11px', borderRadius: 3, background: T.surface, border: `1px solid ${T.border}` }}>
          <div style={orb(7.5, 700, { color: T.muted, letterSpacing: '0.2em', marginBottom: 5 })}>J-1 NQ · VALUE AREA</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {[['VAH', nq.vah, T.down], ['POC', nq.poc, T.gold], ['VAL', nq.val, T.up]].map(([l, v, c]) => (
              <div key={l as string} style={{ textAlign: 'center' }}>
                <div style={jb(7.5, 400, { color: T.muted, marginBottom: 2 })}>{l as string}</div>
                <div style={jb(11, 600, { color: c as string })}>{fmt(v as string)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!bridgeData && (
        <div style={{ padding: '8px 12px', textAlign: 'center', borderRadius: 3, border: `1px solid ${T.border}` }}>
          <span style={jb(9, 400, { color: T.muted })}>Bridge offline — données en attente</span>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   SESSION VIEW
════════════════════════════════════════════════════════════════ */
function SessionView() {
  const cols = [
    {
      title: 'RTH · REGULAR TRADING', color: T.gold, badge: 'ACTIVE',
      sections: [
        { name: 'RTH OPEN', data: [['OPEN','21 284.00'],['GAP','+ 16.25'],['GAP DIR','UP'],['TYPE','Gap & Go']] },
        { name: 'IB · INITIAL BALANCE', data: [['IB HIGH','21 392.00'],['IB LOW','21 264.00'],['IB RANGE','128 pts'],['TIME','09:30–10:30']] },
        { name: 'SETUP ICT/SMC', data: [['SETUP','OB + FVG'],['BOS','→ Bullish'],['MSS','Non confirmé'],['ENTRY','21 305.50']] },
      ]
    },
    {
      title: 'OVN · OVERNIGHT', color: T.teal, badge: 'TERMINÉ',
      sections: [
        { name: 'OVN RANGE', data: [['HIGH','21 321.50'],['LOW','21 089.00'],['CLOSE','21 267.75'],['RANGE','232.50 pts']] },
        { name: 'GEX · GAMMA', data: [['CALL WALL','21 500'],['PUT WALL','21 000'],['HVL','21 250'],['FLIP','21 300']] },
        { name: 'ALN · NIVEAUX', data: [['BULL LVL','21 450'],['BEAR LVL','21 150'],['VAD','HAUSSE'],['CONF','85%']] },
      ]
    },
    {
      title: 'ASIA · ASIE', color: T.amber, badge: 'ACTIF',
      sections: [
        { name: 'ASIA RANGE', data: [['HIGH','21 310.00'],['LOW','21 205.50'],['MID','21 257.75'],['RANGE','104.50 pts']] },
        { name: 'LONDON KILLZONE', data: [['OPEN','21 280.00'],['HIGH','21 332.50'],['SWEEP','Oui'],['DIR','Bearish']] },
        { name: 'SCORE SESSION', data: [['SETUP','8.5/10'],['CONF','78%'],['RR CIB','1:3.2'],['STATUT','TRADE']] },
      ]
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', animation: 'fadeSlide 0.2s ease-out' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', flexShrink: 0,
        background: 'rgba(201,168,76,0.04)', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={orb(10, 900, { color: T.gold, letterSpacing: '0.25em' })}>◈ SESSION ANALYZER</span>
        <span style={jb(9, 400, { color: T.muted })}>NQ100 · Méthode Salah v2</span>
      </div>

      {/* 3 columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', overflow: 'hidden', gap: 0 }}>
        {cols.map((col, ci) => (
          <div key={ci} style={{
            overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
            borderRight: ci < 2 ? `1px solid ${T.border}` : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={orb(9, 900, { color: col.color, letterSpacing: '0.2em' })}>{col.title}</span>
              <span style={orb(7, 700, {
                color: col.color, background: `${col.color}15`,
                border: `1px solid ${col.color}40`, borderRadius: 2, padding: '2px 6px',
              })}>{col.badge}</span>
            </div>
            {col.sections.map(sec => (
              <div key={sec.name} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  padding: '6px 10px', borderBottom: `1px solid ${T.border}`,
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <span style={orb(8, 700, { color: col.color, letterSpacing: '0.18em' })}>{sec.name}</span>
                </div>
                <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 6, columnGap: 10 }}>
                  {sec.data.map(([lbl, val]) => (
                    <div key={lbl}>
                      <div style={jb(7.5, 400, { color: T.muted, marginBottom: 1 })}>{lbl}</div>
                      <div style={jb(13, 600, { color: '#fff' })}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px', flexShrink: 0,
        background: 'rgba(0,255,136,0.04)', borderTop: `1px solid rgba(0,255,136,0.12)`,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.up, animation: 'pulseDot 1.8s infinite' }} />
          <span style={orb(16, 900, { color: T.up, textShadow: '0 0 16px rgba(0,255,136,0.7)' })}>ACHAT</span>
        </div>
        {[['ENTRY','21 305.50'],['STOP','21 260.00'],['TARGET','21 460.00'],['R:R','1 : 3.4'],['SCORE','8.5/10']].map(([l,v]) => (
          <div key={l}>
            <div style={orb(7, 700, { color: T.muted, letterSpacing: '0.15em' })}>{l}</div>
            <div style={jb(12, 600, { color: T.gold })}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   SIGNALS VIEW
════════════════════════════════════════════════════════════════ */
const SIG_DATA = [
  { sym:'NQ100', type:'ACHAT', setup:'OB + FVG', entry:'21 305.50', stop:'21 260.00', t1:'21 380.00', t2:'21 450.00', rr:'1:3.4', score:88, ts:'09:47 EST' },
  { sym:'ES',    type:'VENTE', setup:'Rejection Zone', entry:'5 618.25', stop:'5 630.00', t1:'5 596.00', t2:'5 575.00', rr:'1:2.1', score:72, ts:'09:52 EST' },
  { sym:'NQ100', type:'ACHAT', setup:'MSS Bullish',    entry:'21 198.00', stop:'21 155.00', t1:'21 290.00', t2:'21 380.00', rr:'1:2.8', score:81, ts:'08:32 EST' },
  { sym:'GC',    type:'ACHAT', setup:'VWAP Reclaim',   entry:'2 648.50', stop:'2 634.00', t1:'2 668.00', t2:'2 685.00', rr:'1:2.2', score:69, ts:'07:15 EST' },
  { sym:'CL',    type:'VENTE', setup:'POC Rejection',  entry:'78.65', stop:'79.10', t1:'77.90', t2:'77.20', rr:'1:1.9', score:65, ts:'06:58 EST' },
  { sym:'NQ100', type:'VENTE', setup:'BOS + OB',       entry:'21 442.00', stop:'21 480.00', t1:'21 370.00', t2:'21 290.00', rr:'1:3.1', score:84, ts:'10:18 EST' },
]

function SignalsView({ signal: _signal }: { signal: Signal }) {
  const [filter, setFilter] = useState<'TOUS'|Signal>('TOUS')
  const filtered = filter === 'TOUS' ? SIG_DATA : SIG_DATA.filter(s => s.type === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', animation: 'fadeSlide 0.2s ease-out' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', flexShrink: 0,
        background: 'rgba(201,168,76,0.04)', borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={orb(10, 900, { color: T.gold, letterSpacing: '0.25em' })}>◉ SIGNAUX ICT/SMC</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['TOUS','ACHAT','VENTE'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '3px 10px', borderRadius: 2, border: 'none', cursor: 'pointer',
              background: filter === f ? (f === 'ACHAT' ? 'rgba(0,255,136,0.12)' : f === 'VENTE' ? 'rgba(255,68,68,0.12)' : 'rgba(201,168,76,0.12)') : 'transparent',
              outline: filter === f ? `1px solid ${f === 'ACHAT' ? 'rgba(0,255,136,0.3)' : f === 'VENTE' ? 'rgba(255,68,68,0.3)' : 'rgba(201,168,76,0.3)'}` : '1px solid transparent',
            }}>
              <span style={orb(8, 700, {
                color: filter === f ? (f === 'ACHAT' ? T.up : f === 'VENTE' ? T.down : T.gold) : T.muted,
                letterSpacing: '0.18em',
              })}>{f}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {filtered.map((sig, i) => {
            const buy = sig.type === 'ACHAT'
            const col = buy ? T.up : T.down
            return (
              <div key={i} style={{
                background: T.surface, borderRadius: 4,
                border: `1px solid ${T.border}`, borderTop: `2px solid ${col}`,
                transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'default',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = 'translateY(-3px)'
                el.style.boxShadow = `0 8px 24px ${col}20`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.transform = ''; el.style.boxShadow = ''
              }}
              >
                {/* Card header */}
                <div style={{
                  padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
                  borderBottom: `1px solid ${T.border}`,
                }}>
                  <span style={orb(10, 900, { color: T.gold })}>{sig.sym}</span>
                  <span style={orb(9, 900, {
                    color: col, background: `${col}12`,
                    border: `1px solid ${col}30`, borderRadius: 2, padding: '1px 7px',
                  })}>{sig.type}</span>
                  <span style={{ flex: 1 }} />
                  <span style={jb(9, 400, { color: T.muted })}>{sig.score}/100</span>
                </div>
                {/* Card body */}
                <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[['ENTRY',sig.entry],['STOP',sig.stop],['TARGET 1',sig.t1],['TARGET 2',sig.t2],['R:R',sig.rr],['SETUP',sig.setup]].map(([l,v]) => (
                    <div key={l}>
                      <div style={jb(7.5, 400, { color: T.muted, marginBottom: 2 })}>{l}</div>
                      <div style={jb(11, 600, { color: l === 'STOP' ? T.down : l.startsWith('TARGET') ? T.up : T.gold })}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{
                  padding: '6px 12px', borderTop: `1px solid ${T.border}`,
                  display: 'flex', justifyContent: 'flex-end',
                }}>
                  <span style={jb(8, 400, { color: T.muted })}>{sig.ts}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   CHART VIEW (fullscreen)
════════════════════════════════════════════════════════════════ */
function ChartView() {
  const [tf, setTf] = useState('15M')
  const TFS = ['1M','5M','15M','30M','1H','4H']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', animation: 'fadeSlide 0.2s ease-out' }}>
      {/* Mini header */}
      <div style={{
        height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
        background: 'rgba(7,10,18,0.8)', borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={orb(10, 900, { color: T.gold, letterSpacing: '0.2em' })}>▦ NQ100 FUTURES</span>
        <span style={jb(10, 400, { color: T.muted })}>NASDAQ · CME</span>
        <span style={{ flex: 1 }} />
        {TFS.map(t => (
          <button key={t} onClick={() => setTf(t)} style={{
            padding: '2px 9px', borderRadius: 2, border: 'none', cursor: 'pointer',
            background: tf === t ? 'rgba(201,168,76,0.12)' : 'transparent',
            outline: tf === t ? `1px solid rgba(201,168,76,0.3)` : '1px solid transparent',
          }}>
            <span style={orb(8, 700, { color: tf === t ? T.gold : T.muted, letterSpacing: '0.12em' })}>{t}</span>
          </button>
        ))}
      </div>
      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <LiveCanvas fullHeight />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   SCREENER VIEW
════════════════════════════════════════════════════════════════ */
const SCR_ROWS = [
  { sym:'NQ100',  price:'21 456.75', var:'+0.73%', sig:'ACHAT', setup:'OB+FVG',  score:88, entry:'21 305', stop:'21 260', target:'21 450', rr:'1:3.4', ses:'RTH',  st:'ACTIF'   },
  { sym:'ES',     price:'5 632.25',  var:'-0.21%', sig:'VENTE', setup:'POC Rej', score:72, entry:'5 618',  stop:'5 630',  target:'5 596',  rr:'1:2.1', ses:'RTH',  st:'ACTIF'   },
  { sym:'GC',     price:'2 654.30',  var:'+0.44%', sig:'ACHAT', setup:'VWAP',    score:69, entry:'2 648',  stop:'2 634',  target:'2 668',  rr:'1:2.2', ses:'OVN',  st:'PENDING' },
  { sym:'CL',     price:'78.42',     var:'-0.89%', sig:'VENTE', setup:'POC Rej', score:65, entry:'78.65',  stop:'79.10',  target:'77.90',  rr:'1:1.9', ses:'OVN',  st:'PENDING' },
  { sym:'YM',     price:'43 218.00', var:'+0.38%', sig:'ACHAT', setup:'BOS',     score:77, entry:'43 150', stop:'43 050', target:'43 350', rr:'1:2.0', ses:'RTH',  st:'ACTIF'   },
  { sym:'RTY',    price:'2 187.50',  var:'-0.55%', sig:'NEUTRE',setup:'—',        score:45, entry:'—',      stop:'—',      target:'—',      rr:'—',     ses:'RTH',  st:'WATCH'   },
]

function ScreenerView({ prices: _prices }: { prices: TickerPrice[] }) {
  const COLS = ['SYMBOLE','PRIX','VAR%','SIGNAL','SETUP','SCORE','ENTRY','STOP','TARGET','R:R','SESSION','STATUT']
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', animation: 'fadeSlide 0.2s ease-out' }}>
      <div style={{
        padding: '10px 16px', flexShrink: 0,
        background: 'rgba(201,168,76,0.04)', borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={orb(10, 900, { color: T.gold, letterSpacing: '0.25em' })}>≡ SCREENER MULTI-MARCHÉS</span>
      </div>
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'rgba(201,168,76,0.04)' }}>
              {COLS.map(c => (
                <th key={c} style={{
                  padding: '8px 10px', textAlign: 'left', borderBottom: `1px solid ${T.border}`,
                  position: 'sticky', top: 0, background: 'rgba(6,8,16,0.97)',
                  ...orb(8, 700, { color: T.muted, letterSpacing: '0.18em' }),
                }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCR_ROWS.map((r, i) => {
              const buy = r.sig === 'ACHAT'; const sell = r.sig === 'VENTE'
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.12s' }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(201,168,76,0.03)'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}>
                  <td style={{ padding: '8px 10px' }}><span style={orb(10, 700, { color: T.gold })}>{r.sym}</span></td>
                  <td style={{ padding: '8px 10px' }}><span style={jb(12, 600, { color: '#fff' })}>{r.price}</span></td>
                  <td style={{ padding: '8px 10px' }}><span style={jb(11, 600, { color: r.var.startsWith('+') ? T.up : T.down })}>{r.var}</span></td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{
                      ...orb(8, 700, { borderRadius: 2, padding: '2px 7px',
                        color: buy ? T.up : sell ? T.down : T.muted,
                        background: buy ? 'rgba(0,255,136,0.1)' : sell ? 'rgba(255,68,68,0.1)' : 'rgba(136,153,187,0.1)',
                      }),
                    }}>{r.sig}</span>
                  </td>
                  <td style={{ padding: '8px 10px' }}><span style={jb(10, 400, { color: T.muted })}>{r.setup}</span></td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 80, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${r.score}%`, background: `linear-gradient(90deg, ${T.gold}, ${T.goldL})`, borderRadius: 2 }} />
                      </div>
                      <span style={jb(9, 600, { color: T.gold })}>{r.score}</span>
                    </div>
                  </td>
                  {[r.entry, r.stop, r.target, r.rr].map((v, j) => (
                    <td key={j} style={{ padding: '8px 10px' }}><span style={jb(10, 500, { color: j === 1 ? T.down : j === 2 ? T.up : T.gold })}>{v}</span></td>
                  ))}
                  <td style={{ padding: '8px 10px' }}><span style={jb(9, 600, { color: T.teal })}>{r.ses}</span></td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={orb(7.5, 700, {
                      color: r.st === 'ACTIF' ? T.up : r.st === 'PENDING' ? T.amber : T.muted,
                      background: r.st === 'ACTIF' ? 'rgba(0,255,136,0.08)' : r.st === 'PENDING' ? 'rgba(212,175,55,0.08)' : 'rgba(136,153,187,0.08)',
                      border: `1px solid ${r.st === 'ACTIF' ? 'rgba(0,255,136,0.2)' : r.st === 'PENDING' ? 'rgba(212,175,55,0.2)' : 'rgba(136,153,187,0.2)'}`,
                      borderRadius: 2, padding: '2px 6px',
                    })}>{r.st}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   SETTINGS VIEW
════════════════════════════════════════════════════════════════ */
function SettingsView() {
  const [activeNav, setActiveNav] = useState('général')
  const [toggles, setToggles] = useState({ alerts: true, sound: false, overlay: true, darkMode: true })
  const navItems = [
    { id: 'général',  icon: '◈', label: 'GÉNÉRAL' },
    { id: 'alertes',  icon: '◉', label: 'ALERTES' },
    { id: 'theme',    icon: '⬡', label: 'THÈME' },
  ]

  const toggle = (k: keyof typeof toggles) => setToggles(prev => ({ ...prev, [k]: !prev[k] }))

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', animation: 'fadeSlide 0.2s ease-out' }}>
      {/* Sidebar nav */}
      <div style={{
        width: 200, flexShrink: 0, overflowY: 'auto', borderRight: `1px solid ${T.border}`,
        padding: '14px 0', background: 'rgba(7,10,18,0.4)',
      }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setActiveNav(n.id)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', border: 'none', cursor: 'pointer', background: 'transparent',
            borderLeft: activeNav === n.id ? `2px solid ${T.gold}` : '2px solid transparent',
            transition: 'all 0.12s',
          }}>
            <span style={{ fontSize: 11, color: activeNav === n.id ? T.gold : T.muted }}>{n.icon}</span>
            <span style={orb(8.5, 700, { color: activeNav === n.id ? T.gold : T.muted, letterSpacing: '0.18em' })}>{n.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {activeNav === 'général' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={orb(11, 900, { color: T.gold, letterSpacing: '0.2em', marginBottom: 6 })}>PARAMÈTRES GÉNÉRAUX</div>
            {[
              { label: 'Mode sombre',     key: 'darkMode' as const },
              { label: 'Overlay cockpit', key: 'overlay'  as const },
            ].map(row => (
              <div key={row.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4,
              }}>
                <span style={jb(12, 400, { color: '#fff' })}>{row.label}</span>
                <div
                  onClick={() => toggle(row.key)}
                  style={{
                    width: 42, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative',
                    background: toggles[row.key] ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.1)',
                    border: toggles[row.key] ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(255,255,255,0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: toggles[row.key] ? 20 : 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: toggles[row.key] ? T.up : 'rgba(255,255,255,0.4)',
                    boxShadow: toggles[row.key] ? `0 0 8px ${T.up}` : 'none',
                    transition: 'all 0.2s',
                  }} />
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={orb(8, 700, { color: T.muted, letterSpacing: '0.18em' })}>SYMBOLE PAR DÉFAUT</span>
              <input defaultValue="NQ100" style={{
                background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(201,168,76,0.18)`,
                borderRadius: 3, padding: '8px 12px', color: '#fff',
                fontFamily: '"JetBrains Mono", monospace', fontSize: 12, outline: 'none',
                transition: 'border 0.15s',
              }}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.45)'}
              onBlur={e  => (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.18)'}
              />
            </div>
          </div>
        )}

        {activeNav === 'alertes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={orb(11, 900, { color: T.gold, letterSpacing: '0.2em', marginBottom: 6 })}>ALERTES & SONS</div>
            {[
              { label: 'Alertes actives', key: 'alerts' as const },
              { label: 'Son signal',      key: 'sound'  as const },
            ].map(row => (
              <div key={row.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4,
              }}>
                <span style={jb(12, 400, { color: '#fff' })}>{row.label}</span>
                <div
                  onClick={() => toggle(row.key)}
                  style={{
                    width: 42, height: 22, borderRadius: 11, cursor: 'pointer', position: 'relative',
                    background: toggles[row.key] ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.1)',
                    border: toggles[row.key] ? '1px solid rgba(0,255,136,0.4)' : '1px solid rgba(255,255,255,0.15)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: toggles[row.key] ? 20 : 2,
                    width: 16, height: 16, borderRadius: '50%',
                    background: toggles[row.key] ? T.up : 'rgba(255,255,255,0.4)',
                    boxShadow: toggles[row.key] ? `0 0 8px ${T.up}` : 'none',
                    transition: 'all 0.2s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeNav === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={orb(11, 900, { color: T.gold, letterSpacing: '0.2em', marginBottom: 6 })}>THÈME COULEURS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[
                { name: 'GOLD COCKPIT', col: T.gold,  active: true  },
                { name: 'TEAL MATRIX',  col: T.teal,  active: false },
                { name: 'AMBER ELITE',  col: T.amber, active: false },
                { name: 'GREEN PULSE',  col: T.up,    active: false },
              ].map(p => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  border: p.active ? `1px solid ${p.col}` : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 3, cursor: 'pointer', background: T.surface,
                  transition: 'all 0.15s',
                }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.col }} />
                  <span style={orb(8, 700, { color: p.active ? p.col : T.muted, letterSpacing: '0.12em' })}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
