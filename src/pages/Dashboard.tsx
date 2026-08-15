import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candle {
  open: number; high: number; low: number; close: number; vol: number
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function mkCandle(prev?: Candle): Candle {
  const open  = prev ? prev.close : 21200
  const body  = (Math.random() - 0.47) * 75
  const close = open + body
  const wick  = Math.abs(body) * (0.3 + Math.random() * 0.7)
  return {
    open, close,
    high: Math.max(open, close) + wick * Math.random(),
    low:  Math.min(open, close) - wick * Math.random(),
    vol:  30000 + Math.random() * 100000,
  }
}

function genHistory(n: number): Candle[] {
  const out: Candle[] = []
  for (let i = 0; i < n; i++) out.push(mkCandle(out[i - 1]))
  return out
}

const N   = 60
const MA  = 20
const VR  = 0.14
const SBI = N - 20     // session base index

// ─── Gauge (SVG arc) ──────────────────────────────────────────────────────────

function Gauge({ value, color }: { value: number; color: string }) {
  const ARC    = 190
  const offset = ARC - (value / 100) * ARC
  return (
    <svg width="164" height="92" viewBox="0 0 164 92" aria-hidden="true">
      <path d="M22 87 A60 60 0 0 1 142 87" fill="none"
            stroke={`${color}1a`} strokeWidth="8" strokeLinecap="round"/>
      <path d="M22 87 A60 60 0 0 1 142 87" fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={ARC} strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1)' }}/>
      <text x="82" y="74" textAnchor="middle" fontFamily="monospace" fontSize="10" fill="#3d4f6a">PRESSION</text>
      <text x="82" y="58" textAnchor="middle" fontFamily="monospace" fontSize="16" fontWeight="700" fill={color}>
        {value}%
      </text>
    </svg>
  )
}

// ─── Candlestick Canvas ───────────────────────────────────────────────────────

function CandlestickChart({ hist, live }: { hist: Candle[]; live: Candle }) {
  const wrapRef   = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const wrap   = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = wrap.clientWidth
    const H = wrap.clientHeight
    canvas.width  = W
    canvas.height = H

    const all = [...hist, live]
    const n   = all.length
    ctx.clearRect(0, 0, W, H)

    const cw     = (W - 60) / n
    const bw     = Math.max(2, cw * 0.58)
    const chartH = H * (1 - VR) - 8
    const volH   = H * VR
    const volY   = H - volH
    const pad    = 8

    const hiMax = Math.max(...all.map(c => c.high)) + 15
    const loMin = Math.min(...all.map(c => c.low))  - 15
    const pr    = hiMax - loMin
    const vm    = Math.max(...all.map(c => c.vol))

    const py = (p: number) => pad + (1 - (p - loMin) / pr) * (chartH - pad * 2)
    const cx = (i: number) => 30 + i * cw + cw / 2
    const vy = (v: number) => volY + (1 - v / vm) * volH * 0.92

    // Grid
    ctx.strokeStyle = 'rgba(26,34,54,.9)'
    ctx.lineWidth   = 1
    for (let g = 0; g <= 5; g++) {
      const y = pad + (g / 5) * (chartH - pad * 2)
      ctx.beginPath(); ctx.moveTo(30, y); ctx.lineTo(W - 12, y); ctx.stroke()
      ctx.fillStyle   = 'rgba(61,79,106,.8)'
      ctx.font        = '9px monospace'
      ctx.textAlign   = 'left'
      ctx.fillText(Math.round(hiMax - (g / 5) * pr).toLocaleString(), 2, y + 3)
    }

    // Vol separator
    ctx.strokeStyle = 'rgba(26,34,54,.5)'
    ctx.beginPath(); ctx.moveTo(30, volY); ctx.lineTo(W - 12, volY); ctx.stroke()

    // MA
    const ma = all.map((_, i) => {
      if (i < MA - 1) return null
      const sl = all.slice(i - MA + 1, i + 1)
      return sl.reduce((s, c) => s + c.close, 0) / MA
    })
    ctx.strokeStyle = 'rgba(245,158,11,.55)'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    let first = true
    for (let i = 0; i < n; i++) {
      if (ma[i] == null) continue
      const x = cx(i), y = py(ma[i]!)
      if (first) { ctx.moveTo(x, y); first = false } else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // AVWAP 18h
    const avwapY = py(loMin + pr * 0.38)
    ctx.strokeStyle = 'rgba(96,165,250,.45)'
    ctx.lineWidth   = 1
    ctx.setLineDash([4, 5])
    ctx.beginPath(); ctx.moveTo(30, avwapY); ctx.lineTo(W - 12, avwapY); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(96,165,250,.6)'
    ctx.font = '9px monospace'; ctx.textAlign = 'right'
    ctx.fillText('AVWAP 18h', W - 14, avwapY - 3)

    // GEX attracteur
    const gexY = py(loMin + pr * 0.55)
    ctx.strokeStyle = 'rgba(245,158,11,.25)'
    ctx.lineWidth   = 1
    ctx.setLineDash([2, 6])
    ctx.beginPath(); ctx.moveTo(30, gexY); ctx.lineTo(W - 12, gexY); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(245,158,11,.5)'
    ctx.fillText('GEX Attr.', W - 14, gexY - 3)

    // Candles
    for (let i = 0; i < n; i++) {
      const c    = all[i]
      const isUp = c.close >= c.open
      const col  = isUp ? '#10b981' : '#f43f5e'
      const x    = cx(i)
      const last = i === n - 1

      ctx.strokeStyle = last ? col : (isUp ? 'rgba(16,185,129,.4)' : 'rgba(244,63,94,.4)')
      ctx.lineWidth   = 1
      ctx.beginPath(); ctx.moveTo(x, py(c.high)); ctx.lineTo(x, py(c.low)); ctx.stroke()

      const top = py(Math.max(c.open, c.close))
      const bot = py(Math.min(c.open, c.close))
      ctx.fillStyle = last ? col : (isUp ? 'rgba(16,185,129,.65)' : 'rgba(244,63,94,.65)')
      ctx.fillRect(x - bw / 2, top, bw, Math.max(1, bot - top))

      if (c.vol) {
        ctx.fillStyle = isUp ? 'rgba(16,185,129,.18)' : 'rgba(244,63,94,.18)'
        const vy_ = vy(c.vol)
        ctx.fillRect(x - bw / 2, vy_, bw, (volY + volH * 0.92) - vy_)
      }
    }

    // Price dashed line
    const priceY = py(live.close)
    ctx.strokeStyle = 'rgba(96,165,250,.5)'
    ctx.lineWidth   = 1
    ctx.setLineDash([2, 5])
    ctx.beginPath(); ctx.moveTo(30, priceY); ctx.lineTo(W - 64, priceY); ctx.stroke()
    ctx.setLineDash([])

    // Price tag
    const tx = W - 62, tw = 54, th = 17, ty = priceY - th / 2, tr = 3
    ctx.fillStyle = 'rgba(96,165,250,.88)'
    ctx.beginPath()
    ctx.moveTo(tx + tr, ty)
    ctx.lineTo(tx + tw - tr, ty)
    ctx.quadraticCurveTo(tx + tw, ty, tx + tw, ty + tr)
    ctx.lineTo(tx + tw, ty + th - tr)
    ctx.quadraticCurveTo(tx + tw, ty + th, tx + tw - tr, ty + th)
    ctx.lineTo(tx + tr, ty + th)
    ctx.quadraticCurveTo(tx, ty + th, tx, ty + th - tr)
    ctx.lineTo(tx, ty + tr)
    ctx.quadraticCurveTo(tx, ty, tx + tr, ty)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#07090f'
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center'
    ctx.fillText(live.close.toFixed(2), tx + tw / 2, priceY + 4)
  }, [hist, live])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [draw])

  useEffect(() => { draw() }, [draw])

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0 overflow-hidden" style={{ background: '#07090f' }}>
      {/* Chromatic edge bleed: red left, green right */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{
        background: [
          'linear-gradient(to right, rgba(244,63,94,.07) 0%, transparent 16%)',
          'linear-gradient(to left, rgba(16,185,129,.07) 0%, transparent 16%)',
        ].join(', '),
      }}/>
      <canvas ref={canvasRef} className="block"/>
      {/* OHLC overlay */}
      <div className="absolute top-2.5 left-3 z-20 flex gap-3.5 pointer-events-none"
           style={{ fontFamily: 'monospace', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
        {[
          ['O', hist[hist.length - 1]?.open.toFixed(2)],
          ['H', live.high.toFixed(2)],
          ['L', live.low.toFixed(2)],
          ['C', live.close.toFixed(2)],
        ].map(([l, v]) => (
          <span key={l} style={{ color: '#3d4f6a' }}>
            {l} <span style={{ color: '#8892a4' }}>{v}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Le Chameau Canvas ────────────────────────────────────────────────────────

function ChameauCanvas({ strength }: { strength: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cW = 440, cH = 88
    ctx.clearRect(0, 0, cW, cH)

    // Camel silhouette: two humps + neck/head
    ctx.beginPath()
    ctx.moveTo(16, 78)
    ctx.bezierCurveTo(45, 78, 65, 12, 108, 12)
    ctx.bezierCurveTo(150, 12, 155, 46, 172, 46)
    ctx.bezierCurveTo(183, 46, 190, 48, 200, 48)
    ctx.bezierCurveTo(210, 48, 218, 18, 256, 18)
    ctx.bezierCurveTo(294, 18, 298, 48, 312, 48)
    ctx.bezierCurveTo(322, 48, 336, 38, 350, 26)
    ctx.bezierCurveTo(356, 22, 364, 18, 372, 18)
    ctx.bezierCurveTo(378, 18, 382, 24, 382, 30)
    ctx.lineTo(382, 78)
    ctx.closePath()

    const fillG = ctx.createLinearGradient(0, 12, 0, 78)
    fillG.addColorStop(0, `rgba(245,158,11,${strength * 0.28})`)
    fillG.addColorStop(1, 'rgba(245,158,11,.03)')
    ctx.fillStyle = fillG; ctx.fill()
    ctx.strokeStyle = `rgba(245,158,11,${0.22 + strength * 0.45})`
    ctx.lineWidth = 1.5; ctx.stroke()

    // Ground
    ctx.strokeStyle = 'rgba(245,158,11,.08)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(16, 78); ctx.lineTo(400, 78); ctx.stroke()

    // Hump labels
    ctx.fillStyle = 'rgba(245,158,11,.35)'; ctx.font = '8px monospace'; ctx.textAlign = 'center'
    ctx.fillText('AVWAP', 108, 6); ctx.fillText('POC', 256, 10)

    // Dot position along spine
    const sx = 60 + strength * 280
    let sy: number
    if      (sx < 108) sy = 78 - (78-12) * (sx-16)  / (108-16)
    else if (sx < 172) sy = 12 + (46-12) * (sx-108) / (172-108)
    else if (sx < 200) sy = 46 + (48-46) * (sx-172) / (200-172)
    else if (sx < 256) sy = 48 - (48-18) * (sx-200) / (256-200)
    else if (sx < 312) sy = 18 + (48-18) * (sx-256) / (312-256)
    else               sy = 48 - (48-26) * (sx-312) / (382-312)

    const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 14)
    glow.addColorStop(0, `rgba(245,158,11,${strength * 0.7})`)
    glow.addColorStop(1, 'rgba(245,158,11,0)')
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill()

    ctx.fillStyle = `rgba(245,158,11,${0.5 + strength * 0.5})`
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'
    ctx.fillText(`${Math.round(strength * 100)}%`, sx, sy - 12)
  }, [strength])

  return <canvas ref={ref} width={440} height={88}/>
}

// ─── Panel sub-components ─────────────────────────────────────────────────────

function SecLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] tracking-[2.5px] uppercase px-1.5 py-2"
         style={{ color: '#3d4f6a', fontFamily: 'monospace' }}>
      {children}
    </div>
  )
}

function Sig({ children, dotColor, value, valColor }: {
  children: React.ReactNode
  dotColor: string
  value: string
  valColor: string
}) {
  return (
    <div className="flex items-start gap-2 px-2 py-1.5 rounded" style={{ fontSize: 12 }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5 inline-block" style={{ background: dotColor }}/>
      <span className="flex-1" style={{ color: '#8892a4' }}>{children}</span>
      <span className="text-[10px] tabular-nums" style={{ color: valColor, fontFamily: 'monospace' }}>{value}</span>
    </div>
  )
}

function Level({ name, value, side }: { name: string; value: string; side: 'r' | 'g' }) {
  const tc = side === 'r' ? '#f43f5e' : '#10b981'
  const bc = side === 'r' ? 'rgba(244,63,94,.4)' : 'rgba(16,185,129,.4)'
  return (
    <div className="flex justify-between items-center px-2 py-1.5 mb-0.5"
         style={{ borderLeft: `2px solid ${bc}` }}>
      <span className="text-[10px]" style={{ color: '#3d4f6a' }}>{name}</span>
      <span className="text-[11px] tabular-nums" style={{ color: tc, fontFamily: 'monospace' }}>{value}</span>
    </div>
  )
}

function ALNBadge({ p }: { p: 'P3' | 'P4' | 'P2' }) {
  const s = {
    P3: { bg: 'rgba(16,185,129,.12)',  fg: '#10b981', br: 'rgba(16,185,129,.25)' },
    P4: { bg: 'rgba(244,63,94,.12)',   fg: '#f43f5e', br: 'rgba(244,63,94,.25)'  },
    P2: { bg: 'rgba(245,158,11,.1)',   fg: '#f59e0b', br: 'rgba(245,158,11,.2)'  },
  }[p]
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-[1px]"
          style={{ background: s.bg, color: s.fg, border: `1px solid ${s.br}` }}>
      {p}
    </span>
  )
}

function ChMetric({ label, value, bar, align = 'left' }: {
  label: string; value: string; bar: number | null; align?: 'left' | 'right'
}) {
  return (
    <div className={`flex flex-col gap-1 ${align === 'right' ? 'items-end' : ''}`}>
      <span className="text-[9px] tracking-[2px] uppercase" style={{ color: '#3d4f6a', fontFamily: 'monospace' }}>{label}</span>
      <span className="text-[15px] font-bold tabular-nums" style={{ color: '#f59e0b', fontFamily: 'monospace' }}>{value}</span>
      {bar !== null && (
        <div className="h-[3px] w-32 rounded-full overflow-hidden" style={{ background: 'rgba(245,158,11,.1)' }}>
          <div className="h-full rounded-full" style={{ width: `${bar}%`, background: '#f59e0b', transition: 'width 1.5s ease' }}/>
        </div>
      )}
    </div>
  )
}

// ─── Bears & Bulls panels ─────────────────────────────────────────────────────

function BearsPanel({ pressure }: { pressure: number }) {
  return (
    <aside className="flex-shrink-0 flex flex-col overflow-hidden"
           style={{ width: 256, background: 'linear-gradient(170deg,#110810 0%,#0d1118 100%)', borderRight: '1px solid #1a2236' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: '#1a2236' }}>
        <span className="text-[11px] tracking-[3px] uppercase font-bold" style={{ color: '#f43f5e' }}>⬇ Bears</span>
        <span className="text-xl font-bold tabular-nums" style={{ color: '#f43f5e', fontFamily: 'monospace' }}>{pressure}</span>
      </div>
      <div className="flex justify-center py-1">
        <Gauge value={pressure} color="#f43f5e"/>
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 pb-2" style={{ scrollbarWidth: 'none' }}>
        <SecLabel>Pattern ALN</SecLabel>
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <ALNBadge p="P4"/>
          <span className="text-xs flex-1" style={{ color: '#8892a4' }}>London inside Asia</span>
          <span className="text-[10px]" style={{ color: '#f43f5e', fontFamily: 'monospace' }}>ACTIF</span>
        </div>
        <SecLabel>Résistances</SecLabel>
        <Level name="London High" value="21 340" side="r"/>
        <Level name="Asia High"   value="21 388" side="r"/>
        <Level name="Call Wall"   value="21 400" side="r"/>
        <SecLabel>Signaux vendeurs</SecLabel>
        <Sig dotColor="#f43f5e" value="EN DESSOUS" valColor="#f43f5e">AVWAP 18h (Chef)</Sig>
        <Sig dotColor="#f43f5e" value="SHORT –38"  valColor="#f43f5e">Inventaire OVN</Sig>
        <Sig dotColor="#f43f5e" value="↓ LOWER"    valColor="#f43f5e">OTF</Sig>
        <Sig dotColor="#f43f5e" value="REJETÉ"     valColor="#f43f5e">Excess Haut</Sig>
        <Sig dotColor="#f59e0b" value="MITIGÉ"     valColor="#f59e0b">IB Classification</Sig>
      </div>
    </aside>
  )
}

function BullsPanel({ pressure }: { pressure: number }) {
  return (
    <aside className="flex-shrink-0 flex flex-col overflow-hidden"
           style={{ width: 256, background: 'linear-gradient(170deg,#071210 0%,#0d1118 100%)', borderLeft: '1px solid #1a2236' }}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: '#1a2236' }}>
        <span className="text-[11px] tracking-[3px] uppercase font-bold" style={{ color: '#10b981' }}>⬆ Bulls</span>
        <span className="text-xl font-bold tabular-nums" style={{ color: '#10b981', fontFamily: 'monospace' }}>{pressure}</span>
      </div>
      <div className="flex justify-center py-1">
        <Gauge value={pressure} color="#10b981"/>
      </div>
      <div className="flex-1 overflow-y-auto px-2.5 pb-2" style={{ scrollbarWidth: 'none' }}>
        <SecLabel>Pattern ALN</SecLabel>
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <ALNBadge p="P3"/>
          <span className="text-xs flex-1" style={{ color: '#8892a4' }}>Haussier actif</span>
          <span className="text-[10px]" style={{ color: '#10b981', fontFamily: 'monospace' }}>80.8%</span>
        </div>
        <SecLabel>Supports</SecLabel>
        <Level name="London Low"  value="21 180" side="g"/>
        <Level name="Put Wall"    value="21 120" side="g"/>
        <Level name="VAL J-1"     value="21 062" side="g"/>
        <SecLabel>Signaux acheteurs</SecLabel>
        <Sig dotColor="#10b981" value="AU-DESSUS" valColor="#10b981">AVWAP 18h (Chef)</Sig>
        <Sig dotColor="#10b981" value="LONG +62"  valColor="#10b981">Inventaire OVN</Sig>
        <Sig dotColor="#10b981" value="21 240"    valColor="#10b981">GEX Attracteur</Sig>
        <Sig dotColor="#10b981" value="100%"      valColor="#10b981">IB Bullish conf.</Sig>
        <Sig dotColor="#10b981" value="82.12%"    valColor="#10b981">Noon Curve PM Low</Sig>
      </div>
    </aside>
  )
}

// ─── Dashboard (Command Center) ───────────────────────────────────────────────

export default function Dashboard() {
  const [hist] = useState<Candle[]>(() => genHistory(N))
  const sessionBase = hist[SBI].open

  const [live, setLive] = useState<Candle>({
    open: hist[N-1].close, close: hist[N-1].close,
    high: hist[N-1].close, low:   hist[N-1].close, vol: 0,
  })

  const [pressure, setPressure] = useState({ bears: 38, bulls: 62 })
  const [strength, setStrength] = useState(0.77)
  const [chRes,    setChRes]    = useState(74)
  const [chInt,    setChInt]    = useState(81)
  const [chStatus, setChStatus] = useState('Résilience haute — Structure intacte')
  const [clock,    setClock]    = useState('')

  // Clock
  useEffect(() => {
    const tick = () => {
      try {
        const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
        setClock(`${String(et.getHours()).padStart(2,'0')}:${String(et.getMinutes()).padStart(2,'0')}:${String(et.getSeconds()).padStart(2,'0')} ET`)
      } catch { setClock('--:--:-- ET') }
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  // Price tick
  useEffect(() => {
    const id = setInterval(() => {
      setLive(prev => {
        const d = (Math.random() - 0.488) * 14
        const close = parseFloat((prev.close + d).toFixed(2))
        return { ...prev, close, high: Math.max(prev.high, close), low: Math.min(prev.low, close) }
      })
    }, 900)
    return () => clearInterval(id)
  }, [])

  // Pressure tick
  useEffect(() => {
    const id = setInterval(() => {
      setPressure(prev => {
        const b = Math.max(20, Math.min(75, prev.bears + Math.round((Math.random() - 0.48) * 6)))
        return { bears: b, bulls: 100 - b }
      })
    }, 4500)
    return () => clearInterval(id)
  }, [])

  // Chameau tick
  useEffect(() => {
    const msgs = [
      'Résilience haute — Structure intacte',
      'Le Chameau tient — AVWAP respecté 3×',
      'Consolidation saine — continuation probable',
      'Structure solide — inventaire LONG préservé',
    ]
    const id = setInterval(() => {
      setStrength(s => Math.max(.28, Math.min(.96, s + (Math.random() - .47) * .06)))
      setChRes(r => Math.max(30, Math.min(96, r + Math.round((Math.random() - .47) * 4))))
      setChInt(i => Math.max(30, Math.min(96, i + Math.round((Math.random() - .47) * 4))))
      setChStatus(msgs[Math.floor(Math.random() * msgs.length)])
    }, 7000)
    return () => clearInterval(id)
  }, [])

  const delta   = live.close - sessionBase
  const deltaPct = (delta / sessionBase * 100).toFixed(2)
  const up      = delta >= 0

  return (
    <div
      className="-mx-6 -mt-6 flex flex-col overflow-hidden"
      style={{ height: 'calc(100vh - 56px)', background: '#07090f', fontFamily: "'SF Mono',Consolas,monospace", userSelect: 'none' }}
    >
      {/* ── Command header ──────────────────────────────────────────────────── */}
      <header
        className="relative flex-shrink-0 flex items-center justify-between px-5"
        style={{ height: 48, background: '#0d1118', borderBottom: '1px solid #1a2236' }}
      >
        <div className="flex items-baseline gap-2.5">
          <span className="font-bold tracking-[3px] text-sm text-white uppercase">NQ100</span>
          <span className="text-[9px] tracking-[3px] uppercase" style={{ color: '#3d4f6a' }}>Command Terminal</span>
        </div>

        {/* Centered live price */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-baseline gap-2.5">
          <span className="text-[22px] font-bold tracking-[-0.5px] tabular-nums" style={{ color: '#60a5fa' }}>
            {live.close.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[13px] tabular-nums" style={{ color: up ? '#10b981' : '#f43f5e' }}>
            {up ? '+' : ''}{delta.toFixed(2)} ({up ? '+' : ''}{deltaPct}%)
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <span className="text-[10px] tracking-[2px] uppercase px-2 py-0.5 rounded"
                style={{ background: 'rgba(16,185,129,.12)', color: '#10b981', border: '1px solid rgba(16,185,129,.25)' }}>
            RTH LIVE
          </span>
          <span className="text-xs" style={{ color: '#8892a4' }}>{clock}</span>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'blink 2s ease-in-out infinite' }}/>
        </div>
      </header>

      {/* ── Arena (3 col) ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <BearsPanel pressure={pressure.bears}/>
        <CandlestickChart hist={hist} live={live}/>
        <BullsPanel pressure={pressure.bulls}/>
      </div>

      {/* ── Le Chameau ──────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 grid"
        style={{ height: 164, gridTemplateColumns: '200px 1fr 200px', background: 'linear-gradient(180deg,#0d1118 0%,#080a0f 100%)', borderTop: '1px solid #1a2236' }}
      >
        <div className="p-4 flex flex-col justify-center gap-2.5">
          <ChMetric label="Résilience AVWAP 18h" value={`${chRes}%`} bar={chRes}/>
          <ChMetric label="Rebonds sur Le Chef"   value="3× session" bar={null}/>
        </div>

        <div className="flex flex-col items-center justify-center gap-1">
          <span className="text-[9px] tracking-[3px] uppercase" style={{ color: '#f59e0b', opacity: .7 }}>
            Le Chameau — Force du Marché
          </span>
          <ChameauCanvas strength={strength}/>
          <span className="text-[10px]" style={{ color: '#3d4f6a' }}>{chStatus}</span>
        </div>

        <div className="p-4 flex flex-col justify-center items-end gap-2.5">
          <ChMetric label="Intégrité structure" value={`${chInt}%`} bar={chInt} align="right"/>
          <ChMetric label="POC distance"         value="+28 pts"    bar={null}   align="right"/>
        </div>
      </div>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
