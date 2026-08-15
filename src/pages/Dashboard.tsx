import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink } from 'react-router-dom'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Candle { o: number; h: number; l: number; c: number; v: number }

// ── Helpers ───────────────────────────────────────────────────────────────────
function genCandles(n: number): Candle[] {
  const out: Candle[] = []
  let p = 21340
  for (let i = 0; i < n; i++) {
    const o = p, d = Math.random() > 0.46 ? 1 : -1
    const c = o + d * (5 + Math.random() * 20)
    out.push({ o, h: Math.max(o, c) + Math.random() * 6, l: Math.min(o, c) - Math.random() * 6, c, v: 400 + Math.random() * 2000 })
    p = c
  }
  return out
}

function fmt(p: number, dec = 2) {
  const [i, d] = p.toFixed(dec).split('.')
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (dec > 0 ? '.' + d : '')
}

// ── Chart ─────────────────────────────────────────────────────────────────────
function MiniChart({ hist, live, avwap, gex }: { hist: Candle[]; live: number; avwap: number; gex: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const cv = cvRef.current, ct = cv?.getContext('2d')
    if (!cv || !ct) return
    const W = cv.width, H = cv.height
    if (!W || !H) return

    const PL = 6, PR = 66, PT = 10, PB = 24, VH = 22
    const pw = W - PL - PR, ph = H - PT - PB - VH
    ct.clearRect(0, 0, W, H)

    const fm: Candle = { o: hist.at(-1)!.c, h: Math.max(hist.at(-1)!.c, live), l: Math.min(hist.at(-1)!.c, live), c: live, v: 600 }
    const cs = [...hist.slice(-58), fm]
    const n = cs.length
    const pMn = Math.min(...cs.map(c => c.l)) - 2, pMx = Math.max(...cs.map(c => c.h)) + 2
    const pR = pMx - pMn || 1, mV = Math.max(...cs.map(c => c.v))
    const py = (p: number) => PT + (1 - (p - pMn) / pR) * ph
    const bS = pw / n, bW = Math.max(1.5, bS * 0.65)

    // grid
    ct.strokeStyle = '#1e293b'; ct.lineWidth = 1; ct.setLineDash([])
    for (let i = 0; i <= 4; i++) {
      const y = PT + (i / 4) * ph
      ct.beginPath(); ct.moveTo(PL, y); ct.lineTo(W - PR, y); ct.stroke()
      ct.fillStyle = '#475569'; ct.font = '7px monospace'; ct.textAlign = 'right'
      ct.fillText(fmt(pMx - (i / 4) * pR, 0), W - PR + 62, y + 2.5)
    }

    // AVWAP
    const avY = py(avwap)
    if (avY > PT && avY < PT + ph) {
      ct.setLineDash([3, 3]); ct.strokeStyle = '#3b82f6bb'; ct.lineWidth = 1.2
      ct.beginPath(); ct.moveTo(PL, avY); ct.lineTo(W - PR, avY); ct.stroke()
      ct.setLineDash([]); ct.fillStyle = '#3b82f6aa'; ct.font = '6px monospace'; ct.textAlign = 'left'
      ct.fillText('AVWAP 18h', PL + 2, avY - 2)
    }

    // GEX attracteur
    const gY = py(gex)
    if (gY > PT && gY < PT + ph) {
      ct.setLineDash([2, 5]); ct.strokeStyle = '#f59e0b77'; ct.lineWidth = 1
      ct.beginPath(); ct.moveTo(PL, gY); ct.lineTo(W - PR, gY); ct.stroke(); ct.setLineDash([])
    }

    // BPR zone fill
    const bprHi = py(21380), bprLo = py(21340)
    if (bprHi < PT + ph && bprLo > PT) {
      ct.fillStyle = '#7c3aed11'
      ct.fillRect(PL, bprHi, W - PR - PL, bprLo - bprHi)
    }

    // candles
    for (let i = 0; i < n; i++) {
      const c = cs[i], x = PL + (i + .5) * bS, bull = c.c >= c.o
      const col = bull ? '#10b981' : '#ef4444'
      ct.globalAlpha = i === n - 1 ? 0.5 : 1
      ct.strokeStyle = col; ct.lineWidth = 1; ct.setLineDash([])
      ct.beginPath(); ct.moveTo(x, py(c.h)); ct.lineTo(x, py(c.l)); ct.stroke()
      const bY = Math.min(py(c.o), py(c.c)), bH = Math.max(1, Math.abs(py(c.o) - py(c.c)))
      ct.fillStyle = bull ? '#064e3b' : '#7f1d1d'; ct.fillRect(x - bW / 2, bY, bW, bH)
      ct.strokeRect(x - bW / 2, bY, bW, bH)
      const vH = (c.v / mV) * (VH - 2), vY = H - PB - vH
      ct.fillStyle = bull ? '#10b98118' : '#ef444418'; ct.fillRect(x - bW / 2, vY, bW, vH)
      ct.globalAlpha = 1
    }

    // live price tag
    const lY = py(live), bull = live >= 21262
    const tc = bull ? '#10b981' : '#ef4444'
    ct.setLineDash([2, 3]); ct.strokeStyle = tc + '55'; ct.lineWidth = 1
    ct.beginPath(); ct.moveTo(PL, lY); ct.lineTo(W - PR, lY); ct.stroke(); ct.setLineDash([])
    const tag = fmt(live); ct.font = 'bold 8px monospace'
    const tw = ct.measureText(tag).width
    ct.fillStyle = tc; ct.shadowColor = tc; ct.shadowBlur = 5
    ct.beginPath(); ct.roundRect(W - PR + 2, lY - 7, tw + 8, 14, 2); ct.fill()
    ct.shadowBlur = 0; ct.fillStyle = '#fff'; ct.textAlign = 'left'
    ct.fillText(tag, W - PR + 6, lY + 3)
  }, [hist, live, avwap, gex])

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (cvRef.current && boxRef.current) {
        cvRef.current.width = boxRef.current.clientWidth
        cvRef.current.height = boxRef.current.clientHeight
        draw()
      }
    })
    if (boxRef.current) ro.observe(boxRef.current)
    return () => ro.disconnect()
  }, [draw])

  useEffect(() => { draw() }, [draw])

  return (
    <div ref={boxRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'linear-gradient(to right,rgba(239,68,68,.04) 0%,transparent 12%,transparent 88%,rgba(16,185,129,.04) 100%)'
      }}/>
      <canvas ref={cvRef} style={{ display: 'block', width: '100%', height: '100%' }}/>
    </div>
  )
}

// ── Data card ──────────────────────────────────────────────────────────────────
function Card({ title, icon, accent, children }: {
  title: string; icon: string; accent: string; children: React.ReactNode
}) {
  return (
    <div style={{
      background: '#0f172a', borderRadius: 6, border: `1px solid ${accent}22`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1,
      boxShadow: `0 0 0 1px ${accent}11, inset 0 1px 0 ${accent}18`,
    }}>
      <div style={{
        padding: '5px 10px', borderBottom: `1px solid #1e293b`,
        display: 'flex', alignItems: 'center', gap: 6,
        background: `linear-gradient(135deg, ${accent}0e 0%, transparent 100%)`,
      }}>
        <span style={{ fontSize: 10 }}>{icon}</span>
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: accent }}>{title}</span>
      </div>
      <div style={{ padding: '6px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, color = '#94a3b8', tag }: { label: string; value: string; color?: string; tag?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 0' }}>
      <span style={{ fontSize: 8, color: '#475569', letterSpacing: .5 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {tag && (
          <span style={{ fontSize: 6, padding: '1px 3px', borderRadius: 2, fontWeight: 700, background: color + '22', color }}>{tag}</span>
        )}
        <span style={{ fontSize: 9, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [hist] = useState(() => genCandles(80))
  const [live, setLive] = useState(21340.0)
  const [clock, setClock] = useState('')
  const [bprPct, setBprPct] = useState(61.8)

  const open = 21262
  const avwap = 21380
  const gex   = 21340

  useEffect(() => {
    const t = () => {
      const n = new Date()
      setClock([n.getHours(), n.getMinutes(), n.getSeconds()].map(v => String(v).padStart(2, '0')).join(':'))
    }
    t(); const id = setInterval(t, 1000); return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setLive(p => Math.round((p + (Math.random() - 0.48) * 3) * 4) / 4)
    }, 900)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setBprPct(p => Math.min(90, Math.max(30, p + (Math.random() - .5) * 8)))
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const chg = live - open
  const chgPct = ((chg / open) * 100).toFixed(2)
  const bull = chg >= 0
  const priceColor = bull ? '#10b981' : '#ef4444'

  const oteLevel = bprPct > 61.8 && bprPct < 78.6
  const signalReady = oteLevel && bull
  const signalColor = signalReady ? '#10b981' : bprPct > 78.6 ? '#ef4444' : '#f59e0b'
  const signalLabel = signalReady ? '🟢 PRÊT' : bprPct > 78.6 ? '🔴 DÉPASSÉ' : '🟡 EN ATTENTE'

  // Nav items
  const navItems = [
    { to: '/', label: 'Dashboard', icon: '📊', end: true },
    { to: '/session', label: 'Analyseur', icon: '🧮' },
    { to: '/gex', label: 'GEX Panel', icon: '⚡' },
    { to: '/journal', label: 'Journal', icon: '📓' },
    { to: '/setups', label: 'Setups NQ', icon: '🎯' },
    { to: '/bible', label: 'Bible', icon: '📖' },
    { to: '/plan', label: 'Plan', icon: '📅' },
    { to: '/stats', label: 'Stats', icon: '📈' },
  ]

  const C = {
    root: {
      marginLeft: '-24px', marginRight: '-24px', marginTop: '-24px',
      height: 'calc(100vh - 56px)',
      display: 'flex', flexDirection: 'column' as const, overflow: 'hidden',
      background: '#0a0f1a', color: '#e2e8f0',
      fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif', fontSize: 12,
    },
  }

  return (
    <div style={C.root}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1;box-shadow:0 0 6px #10b981}50%{opacity:.25;box-shadow:none}}
        .nav-tab{display:flex;align-items:center;gap:5px;padding:0 14px;height:100%;border:none;
          background:transparent;color:#64748b;font-size:11px;font-weight:600;cursor:pointer;
          border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap;text-decoration:none;}
        .nav-tab:hover{color:#cbd5e1;background:#ffffff08}
        .nav-tab.active{color:#e2e8f0;border-bottom-color:#3b82f6;background:#1e3a5f22}
        .bpr-bar{height:8px;border-radius:4px;background:#1e293b;position:relative;overflow:hidden}
        .bpr-fill{height:100%;border-radius:4px;transition:width 1s ease;
          background:linear-gradient(90deg,#7c3aed,#a855f7)}
        .bpr-marker{position:absolute;top:-2px;width:2px;height:12px;border-radius:1px;transition:left 1s ease}
      `}</style>

      {/* ── ROW 1 : PRICE HEADER ── */}
      <div style={{
        height: 50, background: '#060c16', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16,
        flexShrink: 0, boxShadow: '0 1px 0 #1e293b',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: 'linear-gradient(135deg,#10b981,#3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 11, color: '#000', letterSpacing: -.5,
          }}>ST</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: '#f1f5f9' }}>NQ100 • Méthode Salah</div>
            <div style={{ fontSize: 8, color: '#10b981', letterSpacing: 1 }}>@SalahTataouine</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: '#1e293b' }}/>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', fontVariantNumeric: 'tabular-nums', letterSpacing: .5 }}>
            {fmt(live)}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: priceColor, fontVariantNumeric: 'tabular-nums' }}>
            {bull ? '▲' : '▼'} {bull ? '+' : ''}{fmt(chg)} ({bull ? '+' : ''}{chgPct}%)
          </span>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 12, marginLeft: 8 }}>
          {[
            { l: 'Open', v: fmt(open), c: '#94a3b8' },
            { l: 'VAH', v: '21 420', c: '#f87171' },
            { l: 'VAL', v: '21 240', c: '#34d399' },
            { l: 'POC', v: '21 340', c: '#a78bfa' },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 7, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>{l}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'blink 1.4s infinite' }}/>
          <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 3, fontWeight: 700, letterSpacing: 1,
            background: '#0a2318', color: '#10b981', border: '1px solid #0d3d24' }}>LIVE RTH</span>
          <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 3, fontWeight: 700, letterSpacing: 1,
            background: '#0d1f3d', color: '#60a5fa', border: '1px solid #1a3a6a' }}>NQ · CME</span>
          <span style={{ fontSize: 9, color: '#475569', letterSpacing: 2, fontVariantNumeric: 'tabular-nums',
            fontFamily: '"Courier New", monospace' }}>{clock} ET</span>
        </div>
      </div>

      {/* ── ROW 2 : NAV TABS ── */}
      <div style={{
        height: 38, background: '#060c16', borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'stretch', padding: '0 4px',
        flexShrink: 0, overflowX: 'auto',
      }}>
        {navItems.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
          >
            <span style={{ fontSize: 10 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>

      {/* ── ROW 3 : DATA CARDS ── */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 12px',
        flexShrink: 0, background: '#0a0f1a', borderBottom: '1px solid #1e293b',
      }}>
        {/* RTH J-1 */}
        <Card title="RTH J-1" icon="📊" accent="#3b82f6">
          <Row label="Open"   value="21 262"  color="#94a3b8" />
          <Row label="High"   value="21 455"  color="#f87171" tag="H" />
          <Row label="Low"    value="21 198"  color="#34d399" tag="L" />
          <Row label="Settle" value="21 340"  color="#e2e8f0" />
          <Row label="VAH"    value="21 420"  color="#f87171" />
          <Row label="VAL"    value="21 240"  color="#34d399" />
          <Row label="POC"    value="21 340"  color="#a78bfa" tag="KEY" />
        </Card>

        {/* OVN */}
        <Card title="OVN · Overnight" icon="🌙" accent="#8b5cf6">
          <Row label="Inventaire"   value="NET SHORT"  color="#f87171" />
          <Row label="OVN Points"   value="− 38 pts"   color="#f87171" />
          <Row label="AVWAP OVN"    value="21 380"     color="#a78bfa" />
          <Row label="Excess High"  value="21 455"     color="#fbbf24" tag="EXC" />
          <Row label="OFT4 Dir."    value="BEARISH"    color="#f87171" />
          <Row label="London High"  value="21 412"     color="#60a5fa" />
          <Row label="Asia High"    value="21 390"     color="#60a5fa" />
        </Card>

        {/* ALN */}
        <Card title="ALN · Pattern" icon="🎯" accent="#10b981">
          <Row label="Structure"    value="P4 London"   color="#10b981" tag="ALN" />
          <Row label="London High"  value="21 412"      color="#60a5fa" />
          <Row label="London Low"   value="21 298"      color="#f87171" />
          <Row label="Asia High"    value="21 390"      color="#94a3b8" />
          <Row label="Call Wall"    value="21 500"      color="#f87171" tag="GEX" />
          <Row label="Put Wall"     value="21 200"      color="#34d399" tag="GEX" />
          <Row label="IB Class"     value="Normal IB"   color="#fbbf24" />
        </Card>

        {/* IB + GEX */}
        <Card title="IB · GEX · Structure" icon="⚡" accent="#f59e0b">
          <Row label="IB High"      value="21 380"   color="#f87171" />
          <Row label="IB Low"       value="21 280"   color="#34d399" />
          <Row label="IB Range"     value="100 pts"  color="#94a3b8" />
          <Row label="AVWAP 18h"    value="21 380"   color="#3b82f6" tag="KEY" />
          <Row label="GEX Bias"     value="LONG γ"   color="#10b981" />
          <Row label="GEX Attract." value="21 340"   color="#fbbf24" />
          <Row label="OTE 61.8%"    value="21 348"   color="#a78bfa" tag="OTE" />
        </Card>
      </div>

      {/* ── ROW 4 : CHART ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 0 }}>
        {/* Chart */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e293b' }}>
          {/* chart toolbar */}
          <div style={{
            height: 26, background: '#060c16', borderBottom: '1px solid #1e293b',
            display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6, flexShrink: 0,
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#60a5fa', letterSpacing: 1 }}>NQ1! · 5M</span>
            <div style={{ width: 1, height: 14, background: '#1e293b', margin: '0 2px' }}/>
            {['1m','5m','15m','1h','D'].map(tf => (
              <span key={tf} style={{
                fontSize: 8, padding: '1px 5px', borderRadius: 2, cursor: 'pointer',
                color: tf === '5m' ? '#10b981' : '#475569',
                background: tf === '5m' ? '#064e3b' : 'transparent',
                border: tf === '5m' ? '1px solid #065f46' : '1px solid transparent',
              }}>{tf}</span>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 8, color: '#475569' }}>
              <span>MA20 <span style={{ color: '#f59e0b' }}>──</span></span>
              <span>AVWAP <span style={{ color: '#3b82f6' }}>- -</span></span>
              <span>GEX <span style={{ color: '#f59e0b88' }}>···</span></span>
              <span style={{ color: '#a855f766' }}>BPR ░</span>
            </div>
          </div>
          <MiniChart hist={hist} live={live} avwap={avwap} gex={gex}/>
        </div>

        {/* Right mini panel */}
        <div style={{
          width: 188, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: '#0a0f1a', overflow: 'hidden',
        }}>
          {/* Scenarios */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #1e293b', flex: 1 }}>
            <div style={{ fontSize: 7, letterSpacing: 3, textTransform: 'uppercase', color: '#334155', fontWeight: 700, marginBottom: 6 }}>
              Scénarios
            </div>
            <div style={{ padding: '5px 7px', background: '#052e16', borderRadius: 4, borderLeft: '2px solid #10b981', marginBottom: 5 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#34d399', marginBottom: 3 }}>🟢 BULL — Principal</div>
              <div style={{ fontSize: 8, color: '#6b7280', lineHeight: 1.5 }}>
                Reclaim 21 380 AVWAP<br/>→ Target 21 500 Call Wall<br/>Stop: 21 280 IB Low
              </div>
            </div>
            <div style={{ padding: '5px 7px', background: '#1c0a0a', borderRadius: 4, borderLeft: '2px solid #ef4444' }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#f87171', marginBottom: 3 }}>🔴 BEAR — Alternatif</div>
              <div style={{ fontSize: 8, color: '#6b7280', lineHeight: 1.5 }}>
                Échec 21 380<br/>→ Test 21 200 Put Wall<br/>Stop: 21 412 London High
              </div>
            </div>
          </div>
          {/* ALN rules */}
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontSize: 7, letterSpacing: 3, textTransform: 'uppercase', color: '#334155', fontWeight: 700, marginBottom: 5 }}>
              Règles actives
            </div>
            {[
              { n: 'R1', txt: 'OVN Short → bull bias', c: '#10b981' },
              { n: 'R7', txt: 'ALN P4 confirmée', c: '#10b981' },
              { n: 'R13', txt: 'IB Normal IB', c: '#f59e0b' },
              { n: 'R18', txt: 'GEX Long Gamma', c: '#60a5fa' },
            ].map(r => (
              <div key={r.n} style={{ display: 'flex', gap: 5, padding: '2px 0', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 6, padding: '1px 3px', borderRadius: 2, fontWeight: 700,
                  background: r.c + '20', color: r.c, flexShrink: 0, marginTop: 1 }}>{r.n}</span>
                <span style={{ fontSize: 8, color: '#64748b', lineHeight: 1.3 }}>{r.txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 5 : BPR / FVG ZONE ── */}
      <div style={{
        background: '#060c16', borderTop: '1px solid #1e293b',
        padding: '8px 14px', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: '#a855f7', letterSpacing: 2, textTransform: 'uppercase' }}>
            📦 BPR / FVG Zone
          </span>
          <span style={{ fontSize: 8, color: '#475569' }}>Zone : 21 340 – 21 380</span>
          <div style={{ flex: 1 }}/>
          <span style={{ fontSize: 8, color: '#7c3aed' }}>OTE 61.8% → 78.6%</span>
          <span style={{ fontSize: 8, color: '#475569' }}>Profondeur actuelle :</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#a855f7', fontVariantNumeric: 'tabular-nums' }}>
            {bprPct.toFixed(1)}%
          </span>
          <span style={{
            fontSize: 8, padding: '2px 7px', borderRadius: 3, fontWeight: 700,
            background: oteLevel ? '#14532d' : '#1c1917', color: oteLevel ? '#4ade80' : '#a8a29e',
            border: `1px solid ${oteLevel ? '#15803d' : '#292524'}`,
          }}>
            {oteLevel ? '✅ IN OTE' : bprPct < 61.8 ? '⏳ ATTENTE' : '⚠️ OVER'}
          </span>
        </div>
        {/* Progress bar */}
        <div className="bpr-bar">
          <div className="bpr-fill" style={{ width: `${bprPct}%` }}/>
          {/* OTE markers */}
          <div className="bpr-marker" style={{ left: '61.8%', background: '#4ade80' }}/>
          <div className="bpr-marker" style={{ left: '78.6%', background: '#fbbf24' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 7, color: '#334155' }}>21 340 (0%)</span>
          <span style={{ fontSize: 7, color: '#4ade80' }}>61.8% OTE</span>
          <span style={{ fontSize: 7, color: '#fbbf24' }}>78.6% OTE</span>
          <span style={{ fontSize: 7, color: '#334155' }}>21 380 (100%)</span>
        </div>
      </div>

      {/* ── ROW 6 : SIGNAL BAR ── */}
      <div style={{
        height: 44, background: '#050911', borderTop: `1px solid ${signalColor}33`,
        display: 'flex', alignItems: 'center', padding: '0 14px', gap: 14,
        flexShrink: 0, boxShadow: `0 -2px 16px ${signalColor}0a`,
      }}>
        {/* Signal */}
        <div style={{
          padding: '4px 14px', borderRadius: 4, fontWeight: 700, fontSize: 12,
          background: signalColor + '18', color: signalColor,
          border: `1px solid ${signalColor}44`, letterSpacing: .5,
        }}>
          Signal : {signalLabel}
        </div>

        <div style={{ width: 1, height: 24, background: '#1e293b' }}/>

        {/* Setup details */}
        {[
          { l: 'SETUP', v: 'BPR OTE', c: '#a855f7' },
          { l: 'ENTRY', v: fmt(live), c: '#e2e8f0' },
          { l: 'STOP', v: '21 280', c: '#ef4444' },
          { l: 'TP1', v: '21 380', c: '#10b981' },
          { l: 'TP2', v: '21 500', c: '#10b981' },
          { l: 'RISK', v: `${fmt(live - 21280, 0)} pts`, c: '#f59e0b' },
          { l: 'RATIO', v: '1 : 2.8R', c: '#60a5fa' },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: 7, color: '#334155', letterSpacing: 1, textTransform: 'uppercase' }}>{l}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
          </div>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 8, color: '#334155' }}>@SalahTataouine · NQ100 · Méthode Salah</span>
        </div>
      </div>
    </div>
  )
}
