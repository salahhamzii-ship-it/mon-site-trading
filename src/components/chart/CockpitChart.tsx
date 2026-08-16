import { useRef, useEffect, useCallback } from 'react'

/* ── Seeded RNG (LCG) ─────────────────────────────────────────────── */
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

/* ── Candle generation (52 candles: 4 days × 13) ────────────────── */
interface Candle { o: number; c: number; h: number; l: number; day: number }

function generateCandles(): Candle[] {
  const r = makeRng(42)
  const candles: Candle[] = []
  let p = 29600
  for (let d = 0; d < 4; d++) {
    for (let i = 0; i < 13; i++) {
      const o = p
      const c = o + (r() - 0.46) * 90
      const h = Math.max(o, c) + r() * 40
      const l = Math.min(o, c) - r() * 40
      candles.push({ o, c, h, l, day: d })
      p = c
    }
  }
  // Scale so last close = 30141
  const sc = 30141 / p
  for (const cd of candles) {
    cd.o *= sc; cd.c *= sc; cd.h *= sc; cd.l *= sc
  }
  return candles
}

const CANDLES = generateCandles()
const TPO_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/* ── Palette ──────────────────────────────────────────────────────── */
const T = {
  bg:     '#0e1017',
  card:   '#141820',
  border: 'rgba(255,255,255,0.07)',
  accent: '#c9a84c',
  up:     '#00ff88',
  down:   '#ff4444',
}

/* ── Main Component ───────────────────────────────────────────────── */
export function CockpitChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef  = useRef({ x: -1, y: -1 })
  const rafRef    = useRef<number>(0)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const W0 = canvas.offsetWidth
    const H0 = canvas.offsetHeight
    if (!W0 || !H0) return
    canvas.width  = W0 * dpr
    canvas.height = H0 * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    const W = W0, H = H0

    const candles = CANDLES
    const pT = 10, pB = 6, pR = 60

    // Price range
    const allP = candles.flatMap(cd => [cd.h, cd.l])
    const minP = Math.min(...allP) - 50
    const maxP = Math.max(...allP) + 50
    const pr   = maxP - minP
    const toY  = (p: number) => pT + (1 - (p - minP) / pr) * (H - pT - pB)

    // ── Background ────────────────────────────────────────────────
    ctx.fillStyle = T.card
    ctx.fillRect(0, 0, W, H)

    // Horizontal grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 6; i++) {
      const y = pT + (i / 6) * (H - pT - pB)
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W - pR, y); ctx.stroke()
    }

    // Candle width
    const cw = (W - pR) / candles.length
    const bw = Math.max(cw * 0.5, 2)

    // ── Day separators ────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    for (let d = 1; d < 4; d++) {
      const x = d * 13 * cw
      ctx.beginPath(); ctx.moveTo(x, pT); ctx.lineTo(x, H - pB); ctx.stroke()
    }
    ctx.setLineDash([])

    // ── TPO Market Profile letters (binned at price levels) ───────
    const tpoBins = 24
    const binH = (H - pT - pB) / tpoBins
    ctx.textAlign = 'center'
    for (let i = 0; i < candles.length; i++) {
      const cd = candles[i]
      const letter = TPO_LETTERS[(cd.day * 13 + (i % 13)) % 26]
      const loB = Math.max(0, Math.floor((cd.l - minP) / pr * tpoBins))
      const hiB = Math.min(tpoBins - 1, Math.ceil((cd.h - minP) / pr * tpoBins))
      const isUp = cd.c >= cd.o
      ctx.font = `bold ${Math.max(binH * 0.7, 6).toFixed(0)}px Inter, monospace`
      ctx.fillStyle = isUp ? T.up + '38' : T.down + '33'
      for (let b = loB; b <= hiB; b++) {
        ctx.fillText(letter, i * cw + cw / 2, pT + (tpoBins - 1 - b) * binH + binH * 0.78)
      }
    }
    ctx.textAlign = 'left'

    // ── VWAP line ─────────────────────────────────────────────────
    const vwapY = toY(29900)
    ctx.strokeStyle = 'rgba(201,168,76,0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.beginPath(); ctx.moveTo(0, vwapY); ctx.lineTo(W - pR, vwapY); ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(201,168,76,0.6)'
    ctx.font = '7px Inter, sans-serif'
    ctx.fillText('VWAP', 4, vwapY - 3)

    // ── Candlesticks (drawn over TPO) ─────────────────────────────
    for (let i = 0; i < candles.length; i++) {
      const cd = candles[i]
      const x  = i * cw + cw / 2
      const isUp = cd.c >= cd.o
      const oY = toY(cd.o), cY = toY(cd.c)
      const hY = toY(cd.h), lY = toY(cd.l)
      const bT = Math.min(oY, cY)
      const bH = Math.max(Math.abs(oY - cY), 1.5)

      // Wick
      ctx.strokeStyle = isUp ? T.up + '99' : T.down + '99'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, lY); ctx.stroke()

      // Gradient body
      const g = ctx.createLinearGradient(0, bT, 0, bT + bH)
      if (isUp) {
        g.addColorStop(0, T.up + 'b0')
        g.addColorStop(1, T.up + '30')
      } else {
        g.addColorStop(0, T.down + 'b0')
        g.addColorStop(1, T.down + '30')
      }
      ctx.fillStyle = g
      ctx.globalAlpha = 0.9
      ctx.fillRect(x - bw / 2, bT, bw, bH)
      ctx.globalAlpha = 1
    }

    // ── Current price dashed line ─────────────────────────────────
    const lastPrice = candles[candles.length - 1].c
    const lastY = toY(lastPrice)
    ctx.strokeStyle = 'rgba(201,168,76,0.5)'
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])
    ctx.beginPath(); ctx.moveTo(0, lastY); ctx.lineTo(W - pR, lastY); ctx.stroke()
    ctx.setLineDash([])

    // ── Price badge ───────────────────────────────────────────────
    ctx.fillStyle = T.accent
    ctx.fillRect(W - pR, lastY - 8, pR, 16)
    ctx.fillStyle = T.bg
    ctx.font = 'bold 8px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(lastPrice.toFixed(2), W - pR / 2, lastY + 3.5)
    ctx.textAlign = 'left'

    // ── Price axis labels ─────────────────────────────────────────
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = '7px Inter, sans-serif'
    for (let i = 0; i <= 5; i++) {
      const pv = minP + (i / 5) * pr
      const y  = toY(pv)
      if (y > pT + 8 && y < H - pB - 4) {
        ctx.fillText(pv.toFixed(0), W - pR + 3, y + 3)
      }
    }

    // ── Crosshair ─────────────────────────────────────────────────
    const { x: mx, y: my } = mouseRef.current
    if (mx >= 0 && mx < W - pR && my >= 0 && my < H - pB) {
      ctx.strokeStyle = 'rgba(201,168,76,0.3)'
      ctx.lineWidth = 0.7
      ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(mx, pT); ctx.lineTo(mx, H - pB); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, my); ctx.lineTo(W - pR, my); ctx.stroke()
      ctx.setLineDash([])

      // Tooltip
      const ci = Math.min(candles.length - 1, Math.max(0, Math.floor(mx / cw)))
      const cd = candles[ci]
      if (cd) {
        const isUp = cd.c >= cd.o
        const tx = Math.min(mx + 10, W - pR - 120)
        const ty = Math.max(pT + 4, Math.min(my - 64, H - pB - 72))
        ctx.fillStyle = 'rgba(14,16,23,0.93)'
        ctx.strokeStyle = 'rgba(201,168,76,0.25)'
        ctx.lineWidth = 0.8
        // tooltip box
        ctx.beginPath()
        ctx.roundRect?.(tx, ty, 112, 60, 4) ?? (() => {
          ctx.rect(tx, ty, 112, 60)
        })()
        ctx.fill(); ctx.stroke()
        ctx.font = '600 8px Inter, monospace'
        const rows = [
          { k: 'O', v: cd.o.toFixed(2), c: 'rgba(200,190,165,0.8)' },
          { k: 'H', v: cd.h.toFixed(2), c: '#1eb3bc' },
          { k: 'L', v: cd.l.toFixed(2), c: '#ff6b6b' },
          { k: 'C', v: cd.c.toFixed(2), c: isUp ? '#00ff88' : '#ff4444' },
        ]
        rows.forEach((r, j) => {
          ctx.fillStyle = 'rgba(136,153,187,0.4)'
          ctx.fillText(r.k, tx + 8, ty + 14 + j * 11)
          ctx.fillStyle = r.c
          ctx.fillText(r.v, tx + 22, ty + 14 + j * 11)
        })
      }
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obs = new ResizeObserver(() => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(draw)
    })
    obs.observe(canvas)
    draw()
    return () => { obs.disconnect(); cancelAnimationFrame(rafRef.current) }
  }, [draw])

  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
  }, [draw])

  const onLeave = useCallback(() => {
    mouseRef.current = { x: -1, y: -1 }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    />
  )
}
