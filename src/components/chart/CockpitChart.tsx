import { useRef, useEffect, useCallback, useState } from 'react'

/* ── Types ────────────────────────────────────────────────────────── */
interface Candle {
  t: number  // unix ms
  o: number
  h: number
  l: number
  c: number
  v: number
}

interface VPBar { price: number; vol: number }
interface VA    { poc: number; vah: number; val: number }

/* ── Seeded RNG ───────────────────────────────────────────────────── */
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0
    return s / 0x100000000
  }
}

/* ── Simulated NQ 30-min candles (3 sessions) ────────────────────── */
function generateCandles(): Candle[] {
  const rng = makeRng(0xCAFE2026)
  const candles: Candle[] = []
  // Start: Aug 9 2026 18:00 ET = Aug 10 00:00 UTC approx
  const base = new Date('2026-08-09T22:00:00Z').getTime()
  const STEP = 30 * 60 * 1000

  // Predefined session shape: OVN drift + RTH volatility
  // Target: end near 30,141
  const phaseVol  = [8, 8, 10, 10, 10, 18, 18, 16, 14, 12, 10, 8, 8, 8, 8, 8]   // 30-min vol multiplier
  const phaseDrift: number[] = []
  for (let i = 0; i < 3; i++) {
    // Each day: small OVN drift then RTH move
    for (let j = 0; j < 16; j++) {
      if (j < 4)  phaseDrift.push((rng() - 0.5) * 6)   // OVN quiet
      else if (j < 8)  phaseDrift.push((rng() - 0.44) * 18) // RTH AM trending
      else phaseDrift.push((rng() - 0.52) * 10)           // RTH PM fade
    }
  }

  let price = 29710
  for (let i = 0; i < 48; i++) {
    const vol   = 8000 + rng() * 18000
    const range = phaseVol[i % 16] + rng() * 15
    const drift = phaseDrift[i] ?? 0
    const o = price
    const c = +(o + drift + (rng() - 0.5) * range * 0.6).toFixed(2)
    const wick = range * (0.2 + rng() * 0.35)
    const h = +(Math.max(o, c) + wick * rng()).toFixed(2)
    const l = +(Math.min(o, c) - wick * rng()).toFixed(2)
    candles.push({ t: base + i * STEP, o, h, l, c, v: vol })
    price = c
  }

  // Force last candle to land on 30,141
  const last = candles[candles.length - 1]
  const adj = 30141 - last.c
  for (const c of candles.slice(-6)) {
    c.o += adj * 0.6; c.h += adj * 0.6; c.l += adj * 0.6; c.c += adj * 0.6
  }
  candles[candles.length - 1].c = 30141

  return candles
}

/* ── Volume Profile ───────────────────────────────────────────────── */
const BUCKET = 10

function buildVP(candles: Candle[]): VPBar[] {
  const map = new Map<number, number>()
  for (const c of candles) {
    const lo = Math.floor(c.l / BUCKET) * BUCKET
    const hi = Math.ceil(c.h  / BUCKET) * BUCKET
    const bins = Math.max(1, (hi - lo) / BUCKET)
    for (let p = lo; p <= hi; p += BUCKET) {
      const w = 1 - Math.abs(p - c.c) / (c.h - c.l + 1)
      map.set(p, (map.get(p) ?? 0) + c.v * Math.max(0.05, w) / bins)
    }
  }
  return [...map.entries()]
    .map(([price, vol]) => ({ price, vol }))
    .sort((a, b) => a.price - b.price)
}

function calcVA(bars: VPBar[]): VA {
  if (!bars.length) return { poc: 30000, vah: 30050, val: 29950 }
  const poc = bars.reduce((a, b) => b.vol > a.vol ? b : a).price
  const total = bars.reduce((s, b) => s + b.vol, 0)
  const target = total * 0.7
  const pocIdx = bars.findIndex(b => b.price === poc)
  let up = pocIdx, dn = pocIdx
  let acc = bars[pocIdx].vol
  while (acc < target) {
    const nextUp = up < bars.length - 1 ? bars[up + 1].vol : 0
    const nextDn = dn > 0 ? bars[dn - 1].vol : 0
    if (nextUp >= nextDn && up < bars.length - 1) { up++; acc += nextUp }
    else if (dn > 0) { dn--; acc += nextDn }
    else break
  }
  return { poc, vah: bars[up].price, val: bars[dn].price }
}

/* ── VWAP (daily reset) ───────────────────────────────────────────── */
function calcVWAP(candles: Candle[]): number[] {
  const result: number[] = []
  let cumTP = 0, cumV = 0, lastDay = -1
  for (const c of candles) {
    const day = new Date(c.t).getUTCDate()
    if (day !== lastDay) { cumTP = 0; cumV = 0; lastDay = day }
    const tp = (c.h + c.l + c.c) / 3
    cumTP += tp * c.v
    cumV  += c.v
    result.push(cumV > 0 ? cumTP / cumV : tp)
  }
  return result
}

/* ── TPO letter for each 30-min period ───────────────────────────── */
const TPO_CHARS = 'ABCDEFGHIJKLMNOP'

function getTpoChar(candle: Candle): string {
  // Period index within the day: A=first 30min, B=next, ...
  const d = new Date(candle.t)
  const minuteOfDay = d.getUTCHours() * 60 + d.getUTCMinutes()
  const period = Math.floor(minuteOfDay / 30) % 16
  return TPO_CHARS[period] ?? 'A'
}

/* ── Key levels (demo) ────────────────────────────────────────────── */
const LEVELS = {
  rthHigh:   30080,
  rthLow:    29750,
  imbHigh:   29942,
  imbLow:    29728,
  bprTop:    29980,
  bprBot:    29940,
  fvgTop:    30055,
  fvgBot:    30025,
  swingHigh: 30141,
  swingLow:  29750,
}
// OTE retracements from swing
const OTE_618 = +(LEVELS.swingHigh - (LEVELS.swingHigh - LEVELS.swingLow) * 0.618).toFixed(2)
const OTE_786 = +(LEVELS.swingHigh - (LEVELS.swingHigh - LEVELS.swingLow) * 0.786).toFixed(2)

/* ── Palette ──────────────────────────────────────────────────────── */
const C = {
  bg:       '#060810',
  grid:     'rgba(201,168,76,0.05)',
  bull:     '#00ff88',
  bear:     '#ff4444',
  gold:     '#c9a84c',
  goldL:    '#f0d070',
  teal:     '#1eb3bc',
  muted:    'rgba(136,153,187,0.5)',
  mutedL:   'rgba(136,153,187,0.25)',
  white50:  'rgba(255,255,255,0.5)',
  white30:  'rgba(255,255,255,0.3)',
  poc:      '#f0d070',
  vah:      'rgba(255,255,255,0.55)',
  val:      'rgba(255,255,255,0.55)',
  bpr:      'rgba(201,168,76,0.10)',
  bprLine:  'rgba(201,168,76,0.35)',
  fvg:      'rgba(30,179,188,0.10)',
  fvgLine:  'rgba(30,179,188,0.35)',
  ote618:   'rgba(0,255,136,0.12)',
  ote786:   'rgba(240,208,112,0.10)',
  rthH:     'rgba(200,190,165,0.5)',
  rthL:     'rgba(200,190,165,0.5)',
  imbH:     'rgba(255,255,255,0.55)',
  imbL:     '#ff4444',
  vpFill:   (t: number) => `rgba(201,168,76,${0.55 * t + 0.1})`,
  vpPoc:    '#f0d070',
}

/* ── Drawing helpers ──────────────────────────────────────────────── */
function hline(
  ctx: CanvasRenderingContext2D,
  y: number, x0: number, x1: number,
  color: string, dash: number[] = [], lw = 1
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(x0, y)
  ctx.lineTo(x1, y)
  ctx.stroke()
  ctx.restore()
}

function labelRight(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  color: string, bg: string, fontSize = 8
) {
  ctx.save()
  ctx.font = `600 ${fontSize}px 'JetBrains Mono', monospace`
  const tw = ctx.measureText(text).width
  ctx.fillStyle = bg
  ctx.fillRect(x + 2, y - fontSize * 0.75, tw + 8, fontSize + 4)
  ctx.fillStyle = color
  ctx.fillText(text, x + 6, y + 1)
  ctx.restore()
}

/* ── Main Component ───────────────────────────────────────────────── */
interface Props {
  height?: number | string
}

export function CockpitChart({ height = '100%' }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const stateRef   = useRef({ mx: -1, my: -1 })
  const [candles]  = useState<Candle[]>(generateCandles)
  const [vp]       = useState<VPBar[]>(() => buildVP(candles))
  const [va]       = useState<VA>(() => calcVA(vp))
  const [vwap]     = useState<number[]>(() => calcVWAP(candles))

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W0 = canvas.offsetWidth
    const H0 = canvas.offsetHeight
    if (W0 === 0 || H0 === 0) return
    canvas.width  = W0 * dpr
    canvas.height = H0 * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    const W = W0, H = H0

    // Layout
    const AXIS_W  = 64
    const TIME_H  = 22
    const VP_W    = 88
    const cW      = W - AXIS_W   // chart + VP area
    const cH      = H - TIME_H
    const mx = stateRef.current.mx
    const my = stateRef.current.my

    // Price range
    const allH = candles.map(c => c.h)
    const allL = candles.map(c => c.l)
    const pMin = Math.min(...allL) - 30
    const pMax = Math.max(...allH) + 30
    const pRange = pMax - pMin

    // Coord transforms
    const py = (price: number) => cH - ((price - pMin) / pRange) * cH
    const px = (i: number)     => (i / (candles.length - 1)) * (cW - VP_W - 4)

    // ── Background ────────────────────────────────────────────────
    ctx.fillStyle = C.bg
    ctx.fillRect(0, 0, W, H)

    // Subtle grid lines (horizontal)
    const gridStep = 50
    const gridLo = Math.ceil(pMin / gridStep) * gridStep
    ctx.save()
    ctx.strokeStyle = C.grid
    ctx.lineWidth = 0.5
    for (let p = gridLo; p <= pMax; p += gridStep) {
      const y = py(p)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cW, y); ctx.stroke()
    }
    ctx.restore()

    // RTH session vertical bands + day separators
    let lastDay = -1
    for (let i = 0; i < candles.length; i++) {
      const d = new Date(candles[i].t)
      const h = d.getUTCHours()
      const day = d.getUTCDate()
      // RTH = 13:30-20:00 UTC (9:30-16:00 ET)
      if (h >= 13 && h < 20) {
        const x0 = px(i)
        const x1 = i < candles.length - 1 ? px(i + 1) : x0 + (cW - VP_W) / candles.length
        ctx.fillStyle = 'rgba(201,168,76,0.018)'
        ctx.fillRect(x0, 0, x1 - x0, cH)
      }
      // Day separator at session start
      if (day !== lastDay && i > 0) {
        const xSep = px(i)
        ctx.save()
        ctx.strokeStyle = 'rgba(201,168,76,0.18)'
        ctx.lineWidth = 0.8
        ctx.setLineDash([2, 3])
        ctx.beginPath(); ctx.moveTo(xSep, 0); ctx.lineTo(xSep, cH); ctx.stroke()
        ctx.restore()
        // Date label
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
        ctx.save()
        ctx.font = '500 7px \'JetBrains Mono\', monospace'
        ctx.fillStyle = 'rgba(201,168,76,0.4)'
        ctx.fillText(label, xSep + 3, 10)
        ctx.restore()
      }
      lastDay = day
    }

    // ── Zones ─────────────────────────────────────────────────────
    // BPR zone
    const bprY1 = py(LEVELS.bprTop), bprY2 = py(LEVELS.bprBot)
    ctx.fillStyle = C.bpr
    ctx.fillRect(0, bprY1, cW - VP_W, bprY2 - bprY1)
    hline(ctx, bprY1, 0, cW - VP_W, C.bprLine, [3, 4])
    hline(ctx, bprY2, 0, cW - VP_W, C.bprLine, [3, 4])
    labelRight(ctx, 'BPR', cW - VP_W - 36, bprY1 + 4, C.gold, 'rgba(6,8,16,0.9)', 7)

    // FVG zone
    const fvgY1 = py(LEVELS.fvgTop), fvgY2 = py(LEVELS.fvgBot)
    ctx.fillStyle = C.fvg
    ctx.fillRect(0, fvgY1, cW - VP_W, fvgY2 - fvgY1)
    hline(ctx, fvgY1, 0, cW - VP_W, C.fvgLine, [2, 3])
    hline(ctx, fvgY2, 0, cW - VP_W, C.fvgLine, [2, 3])
    labelRight(ctx, 'FVG', cW - VP_W - 36, fvgY1 + 4, C.teal, 'rgba(6,8,16,0.9)', 7)

    // OTE 61.8%
    const oteY618 = py(OTE_618)
    ctx.fillStyle = C.ote618
    ctx.fillRect(0, oteY618 - 6, cW - VP_W, 12)
    hline(ctx, oteY618, 0, cW - VP_W, 'rgba(0,255,136,0.45)', [4, 4])
    labelRight(ctx, `OTE 61.8 · ${OTE_618}`, cW - VP_W - 100, oteY618 - 2, '#00ff88', 'rgba(6,8,16,0.9)', 7)

    // OTE 78.6%
    const oteY786 = py(OTE_786)
    ctx.fillStyle = C.ote786
    ctx.fillRect(0, oteY786 - 5, cW - VP_W, 10)
    hline(ctx, oteY786, 0, cW - VP_W, 'rgba(240,208,112,0.45)', [4, 4])
    labelRight(ctx, `OTE 78.6 · ${OTE_786}`, cW - VP_W - 100, oteY786 - 2, C.goldL, 'rgba(6,8,16,0.9)', 7)

    // Imbalance HIGH
    const imbHY = py(LEVELS.imbHigh)
    hline(ctx, imbHY, 0, cW - VP_W, C.imbH, [5, 3], 1)
    labelRight(ctx, `IMBALANCE HIGH  ${LEVELS.imbHigh}`, cW - VP_W - 148, imbHY - 2, C.white50, 'rgba(6,8,16,0.85)', 7)

    // Imbalance LOW
    const imbLY = py(LEVELS.imbLow)
    hline(ctx, imbLY, 0, cW - VP_W, 'rgba(255,68,68,0.55)', [5, 3], 1)
    labelRight(ctx, `IMBALANCE LOW  ${LEVELS.imbLow}`, cW - VP_W - 142, imbLY - 2, '#ff4444', 'rgba(6,8,16,0.85)', 7)

    // VAH
    const vahY = py(va.vah)
    hline(ctx, vahY, 0, cW - VP_W, C.vah, [6, 4], 1)
    labelRight(ctx, `VAH  ${va.vah}`, cW - VP_W - 76, vahY - 2, C.white50, 'rgba(6,8,16,0.85)', 7)

    // VAL
    const valY = py(va.val)
    hline(ctx, valY, 0, cW - VP_W, C.val, [6, 4], 1)
    labelRight(ctx, `VAL  ${va.val}`, cW - VP_W - 76, valY - 2, C.white50, 'rgba(6,8,16,0.85)', 7)

    // RTH HIGH
    const rthHY = py(LEVELS.rthHigh)
    hline(ctx, rthHY, 0, cW - VP_W, C.rthH, [8, 4], 1.2)
    labelRight(ctx, `RTH HIGH  ${LEVELS.rthHigh}`, cW - VP_W - 94, rthHY - 2, C.rthH, 'rgba(6,8,16,0.85)', 7)

    // RTH LOW
    const rthLY = py(LEVELS.rthLow)
    hline(ctx, rthLY, 0, cW - VP_W, C.rthL, [8, 4], 1.2)
    labelRight(ctx, `RTH LOW  ${LEVELS.rthLow}`, cW - VP_W - 88, rthLY + 8, C.rthL, 'rgba(6,8,16,0.85)', 7)

    // POC
    const pocY = py(va.poc)
    // POC glow
    ctx.save()
    ctx.shadowColor = C.poc
    ctx.shadowBlur  = 6
    hline(ctx, pocY, 0, cW, C.poc, [], 1.5)
    ctx.restore()
    labelRight(ctx, `POC  ${va.poc}`, cW - VP_W - 72, pocY - 2, C.poc, 'rgba(6,8,16,0.95)', 7.5)

    // ── Candlesticks ──────────────────────────────────────────────
    const totalW = cW - VP_W - 4
    const cW2 = totalW / candles.length
    const bodyW = Math.max(3, Math.min(12, cW2 * 0.7))

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]
      const x = px(i) + cW2 / 2
      const bull = c.c >= c.o
      const color = bull ? C.bull : C.bear

      // Wick
      ctx.save()
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x, py(c.h))
      ctx.lineTo(x, py(c.l))
      ctx.stroke()
      ctx.restore()

      // Body
      const yO = py(c.o), yC = py(c.c)
      const bY = Math.min(yO, yC)
      const bH = Math.max(1, Math.abs(yC - yO))

      if (bull) {
        ctx.save()
        ctx.shadowColor = 'rgba(0,255,136,0.3)'
        ctx.shadowBlur  = 3
        ctx.fillStyle = color
        ctx.fillRect(x - bodyW / 2, bY, bodyW, bH)
        ctx.restore()
      } else {
        ctx.fillStyle = color
        ctx.fillRect(x - bodyW / 2, bY, bodyW, bH)
      }
    }

    // ── TPO letters (above each candle wick) ──────────────────────
    ctx.save()
    ctx.font = 'bold 8px \'JetBrains Mono\', monospace'
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]
      const x = px(i) + cW2 / 2
      const bull = c.c >= c.o
      const tpoChar = getTpoChar(c)
      ctx.fillStyle = bull ? 'rgba(0,255,136,0.5)' : 'rgba(255,68,68,0.45)'
      ctx.textAlign = 'center'
      ctx.fillText(tpoChar, x, py(c.h) - 4)
    }
    ctx.textAlign = 'left'
    ctx.restore()

    // ── VWAP line ─────────────────────────────────────────────────
    if (vwap.length === candles.length) {
      ctx.save()
      ctx.strokeStyle = 'rgba(212,175,55,0.75)'
      ctx.lineWidth = 1.2
      ctx.setLineDash([6, 3])
      ctx.shadowColor = 'rgba(212,175,55,0.35)'
      ctx.shadowBlur = 4
      ctx.beginPath()
      for (let i = 0; i < candles.length; i++) {
        const x = px(i) + cW2 / 2
        const y = py(vwap[i])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.restore()
      // VWAP label
      const lastVwap = vwap[vwap.length - 1]
      const lastVwapX = px(candles.length - 1) + cW2 / 2
      labelRight(ctx, `VWAP  ${lastVwap.toFixed(2)}`, lastVwapX - 90, py(lastVwap) - 4, 'rgba(212,175,55,0.85)', 'rgba(6,8,16,0.9)', 7)
    }

    // ── Volume Profile ─────────────────────────────────────────────
    if (vp.length > 0) {
      const maxVol  = Math.max(...vp.map(b => b.vol))
      const vpX0    = cW - VP_W
      const barH    = Math.max(1, cH / ((pMax - pMin) / BUCKET))

      for (const bar of vp) {
        const bW    = (bar.vol / maxVol) * (VP_W - 4)
        const by    = py(bar.price + BUCKET)
        const isPoc = bar.price === va.poc
        const isVA  = bar.price >= va.val && bar.price <= va.vah

        const t = bar.vol / maxVol
        ctx.fillStyle = isPoc
          ? 'rgba(240,208,112,0.75)'
          : isVA
          ? `rgba(201,168,76,${0.4 + t * 0.25})`
          : `rgba(201,168,76,${0.15 + t * 0.2})`
        ctx.fillRect(vpX0, by, bW, Math.max(1, barH - 0.5))
      }

      // VP separator line
      ctx.save()
      ctx.strokeStyle = 'rgba(201,168,76,0.12)'
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(vpX0, 0); ctx.lineTo(vpX0, cH); ctx.stroke()
      ctx.restore()
    }

    // ── Price axis ────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(6,8,16,0.95)'
    ctx.fillRect(cW, 0, AXIS_W, H)
    ctx.save()
    ctx.strokeStyle = 'rgba(201,168,76,0.15)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(cW, 0); ctx.lineTo(cW, H); ctx.stroke()
    ctx.restore()

    // Price axis labels
    ctx.font = '600 9px \'JetBrains Mono\', monospace'
    const labelStep = 50
    const labelLo = Math.ceil(pMin / labelStep) * labelStep
    for (let p = labelLo; p <= pMax; p += labelStep) {
      const y = py(p)
      if (y < 6 || y > cH - 6) continue
      ctx.fillStyle = 'rgba(136,153,187,0.4)'
      ctx.fillText(p.toLocaleString(), cW + 4, y + 3)
      // tick
      ctx.save()
      ctx.strokeStyle = 'rgba(201,168,76,0.12)'
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(cW, y); ctx.lineTo(cW + 3, y); ctx.stroke()
      ctx.restore()
    }

    // Current price pill
    const lastC = candles[candles.length - 1].c
    const lastY = py(lastC)
    ctx.fillStyle = 'rgba(0,255,136,0.9)'
    ctx.fillRect(cW + 1, lastY - 7, AXIS_W - 2, 14)
    ctx.fillStyle = '#060810'
    ctx.font = 'bold 8px \'JetBrains Mono\', monospace'
    ctx.fillText(lastC.toLocaleString(), cW + 4, lastY + 3)

    // ── Time axis ─────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(6,8,16,0.95)'
    ctx.fillRect(0, cH, cW, TIME_H)
    ctx.save()
    ctx.strokeStyle = 'rgba(201,168,76,0.1)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(0, cH); ctx.lineTo(cW, cH); ctx.stroke()
    ctx.restore()

    ctx.font = '600 8px \'JetBrains Mono\', monospace'
    const step = Math.max(1, Math.round(candles.length / 8))
    for (let i = 0; i < candles.length; i += step) {
      const x = px(i) + cW2 / 2
      const d = new Date(candles[i].t)
      const label = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York' })
      ctx.fillStyle = 'rgba(136,153,187,0.35)'
      ctx.fillText(label, x - 18, cH + 14)
      // tick
      ctx.save()
      ctx.strokeStyle = 'rgba(201,168,76,0.1)'
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(x, cH); ctx.lineTo(x, cH + 3); ctx.stroke()
      ctx.restore()
    }

    // ── Crosshair ─────────────────────────────────────────────────
    if (mx >= 0 && mx < cW && my >= 0 && my < cH) {
      const price = pMin + (1 - my / cH) * pRange

      // Vertical line
      ctx.save()
      ctx.strokeStyle = 'rgba(201,168,76,0.35)'
      ctx.lineWidth = 0.7
      ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, cH); ctx.stroke()
      // Horizontal line
      ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(cW, my); ctx.stroke()
      ctx.restore()

      // Price label on axis
      ctx.fillStyle = 'rgba(201,168,76,0.85)'
      ctx.fillRect(cW + 1, my - 7, AXIS_W - 2, 14)
      ctx.fillStyle = '#060810'
      ctx.font = 'bold 8px \'JetBrains Mono\', monospace'
      ctx.fillText(price.toFixed(2), cW + 4, my + 3)

      // Candle tooltip
      const ci = Math.round((mx / (cW - VP_W - 4)) * (candles.length - 1))
      const hc = candles[Math.max(0, Math.min(candles.length - 1, ci))]
      if (hc) {
        const bull2 = hc.c >= hc.o
        const tp = {
          x: Math.min(mx + 10, cW - 160),
          y: Math.max(8, Math.min(my - 70, cH - 80)),
        }
        ctx.fillStyle = 'rgba(6,8,16,0.92)'
        ctx.strokeStyle = 'rgba(201,168,76,0.3)'
        ctx.lineWidth = 0.8
        roundRect(ctx, tp.x, tp.y, 148, 68, 3)
        ctx.fill(); ctx.stroke()

        const tt = [
          { k: 'O', v: hc.o.toFixed(2), c: 'rgba(200,190,165,0.7)' },
          { k: 'H', v: hc.h.toFixed(2), c: '#1eb3bc' },
          { k: 'L', v: hc.l.toFixed(2), c: '#ff4444' },
          { k: 'C', v: hc.c.toFixed(2), c: bull2 ? '#00ff88' : '#ff4444' },
          { k: 'V', v: Math.round(hc.v).toLocaleString(), c: 'rgba(201,168,76,0.7)' },
        ]
        ctx.font = '600 8px \'JetBrains Mono\', monospace'
        tt.forEach((r, j) => {
          ctx.fillStyle = 'rgba(136,153,187,0.35)'
          ctx.fillText(r.k, tp.x + 8, tp.y + 14 + j * 11)
          ctx.fillStyle = r.c
          ctx.fillText(r.v, tp.x + 22, tp.y + 14 + j * 11)
        })
      }
    }

  }, [candles, vp, va, vwap])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obs = new ResizeObserver(() => draw())
    obs.observe(canvas)
    draw()
    return () => obs.disconnect()
  }, [draw])

  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    stateRef.current = { mx: e.clientX - r.left, my: e.clientY - r.top }
    draw()
  }, [draw])

  const onLeave = useCallback(() => {
    stateRef.current = { mx: -1, my: -1 }
    draw()
  }, [draw])

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      />
      {/* Legend */}
      <div style={{
        position: 'absolute', top: 8, left: 10,
        display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
        pointerEvents: 'none',
      }}>
        {[
          { color: '#c9a84c', label: 'BPR', dash: true },
          { color: '#1eb3bc', label: 'FVG', dash: true },
          { color: '#f0d070', label: 'POC' },
          { color: 'rgba(255,255,255,0.5)', label: 'VAH / VAL', dash: true },
          { color: '#00ff88', label: 'OTE 61.8%', dash: true },
          { color: '#f0d070', label: 'OTE 78.6%', dash: true },
          { color: 'rgba(200,190,165,0.5)', label: 'RTH H/L', dash: true },
          { color: 'rgba(212,175,55,0.75)', label: 'VWAP', dash: true },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 16, height: 1.5,
              background: l.dash ? 'transparent' : l.color,
              borderBottom: l.dash ? `1.5px dashed ${l.color}` : 'none',
            }} />
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 7, color: 'rgba(136,153,187,0.4)',
              letterSpacing: '0.04em',
            }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── roundRect polyfill ───────────────────────────────────────────── */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
