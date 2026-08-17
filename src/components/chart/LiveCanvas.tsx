import { useRef, useEffect } from 'react'

type Candle = { o: number; h: number; l: number; c: number; v: number }

function genCandles(n = 90): Candle[] {
  let p = 21250
  const moves = [1.3,2.1,-1.5,0.8,-2.3,1.7,0.4,-0.9,2.8,-1.1,0.6,1.9,-0.7,1.2,-1.8,0.5,2.2,-1.4,0.9,-2.1,1.6,-0.5,3.1,-2.0]
  const candles: Candle[] = []
  for (let i = 0; i < n; i++) {
    const move = moves[i % moves.length] * (1 + 0.35 * Math.sin(i * 0.4))
    const rng  = Math.abs(move) * (1.4 + Math.random() * 0.8)
    const o = p
    const c = p + move * 0.65
    const h = Math.max(o, c) + rng * 0.32
    const l = Math.min(o, c) - rng * 0.28
    const v = 0.4 + Math.random() * 0.9
    candles.push({ o, h, l, c, v })
    p = c
  }
  return candles
}

interface LiveCanvasProps { fullHeight?: boolean }

export function LiveCanvas({ fullHeight }: LiveCanvasProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const candlesRef = useRef<Candle[]>(genCandles(90))
  const partialRef = useRef<Candle | null>(null)
  const tickRef    = useRef(0)
  const rafRef     = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width  = canvas.offsetWidth  * (window.devicePixelRatio || 1)
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1)
      canvas.style.width  = canvas.offsetWidth  + 'px'
      canvas.style.height = canvas.offsetHeight + 'px'
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1)
      const CW = canvas.offsetWidth
      const CH = canvas.offsetHeight

      const allC = partialRef.current
        ? [...candlesRef.current, partialRef.current]
        : candlesRef.current

      let minP = Infinity, maxP = -Infinity
      for (const c of allC) { if (c.l < minP) minP = c.l; if (c.h > maxP) maxP = c.h }
      const pad = { top: 28, right: 78, bottom: 36, left: 8 }
      const chartW = CW - pad.left - pad.right
      const chartH = CH - pad.top - pad.bottom
      const range  = maxP - minP || 1
      const toY = (p: number) => pad.top + chartH * (1 - (p - minP) / range)
      const nC  = allC.length
      const cw  = Math.max(3, Math.floor(chartW / nC) - 1)
      const toX = (i: number) => pad.left + (i / nC) * chartW + cw * 0.5

      // bg
      ctx.fillStyle = '#060810'
      ctx.fillRect(0, 0, CW, CH)

      // cockpit grid
      ctx.strokeStyle = 'rgba(201,168,76,0.048)'
      ctx.lineWidth = 0.5
      for (let x = 0; x < CW; x += 44) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CH); ctx.stroke() }
      for (let y = 0; y < CH; y += 44) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CW,y); ctx.stroke() }

      // volume profile
      const vpW = 68; const nBkt = 20
      const bkts = new Array(nBkt).fill(0)
      for (const c of allC) {
        const mid = (c.o + c.c) / 2
        const bi  = Math.min(Math.max(Math.floor(((mid - minP) / range) * (nBkt - 1)), 0), nBkt - 1)
        bkts[bi] += c.v
      }
      const maxBkt = Math.max(...bkts)
      for (let i = 0; i < nBkt; i++) {
        const y  = pad.top + (1 - (i + 0.5) / nBkt) * chartH
        const bH = chartH / nBkt - 1
        const bW = (bkts[i] / maxBkt) * vpW
        const g  = ctx.createLinearGradient(CW - pad.right, 0, CW - pad.right + bW, 0)
        g.addColorStop(0, 'rgba(201,168,76,0.38)')
        g.addColorStop(1, 'rgba(201,168,76,0.04)')
        ctx.fillStyle = g
        ctx.fillRect(CW - pad.right, y - bH / 2, bW, bH)
      }

      // POC
      const pocI = bkts.indexOf(maxBkt)
      const pocY = pad.top + (1 - (pocI + 0.5) / nBkt) * chartH
      ctx.save()
      ctx.strokeStyle = 'rgba(201,168,76,0.75)'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 4])
      ctx.shadowColor = 'rgba(201,168,76,0.5)'; ctx.shadowBlur = 5
      ctx.beginPath(); ctx.moveTo(pad.left, pocY); ctx.lineTo(CW - pad.right, pocY); ctx.stroke()
      ctx.restore()
      ctx.fillStyle = 'rgba(201,168,76,0.9)'
      ctx.font = '8px Orbitron'; ctx.textAlign = 'left'
      ctx.fillText('POC', pad.left + 4, pocY - 3)

      // VWAP
      let spv = 0, sv = 0
      ctx.save()
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1.8
      ctx.setLineDash([7, 4]); ctx.beginPath()
      for (let i = 0; i < allC.length; i++) {
        const c = allC[i]; const tp = (c.h + c.l + c.c) / 3
        spv += tp * c.v; sv += c.v
        const x = toX(i); const y = toY(spv / sv)
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke(); ctx.restore()

      // Day separators
      ctx.save()
      ctx.strokeStyle = 'rgba(201,168,76,0.22)'; ctx.lineWidth = 1; ctx.setLineDash([4, 6])
      for (let i = 30; i < allC.length; i += 30) {
        const x = toX(i)
        ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, CH - pad.bottom); ctx.stroke()
        ctx.fillStyle = 'rgba(136,153,187,0.55)'; ctx.font = '8px JetBrains Mono'; ctx.textAlign = 'center'
        ctx.fillText(`D${Math.floor(i / 30)}`, x, pad.top - 4)
      }
      ctx.restore()

      // Price axis labels
      ctx.fillStyle = 'rgba(136,153,187,0.7)'; ctx.font = '8.5px JetBrains Mono'; ctx.textAlign = 'left'
      for (let i = 0; i <= 5; i++) {
        const pv = minP + (i / 5) * range; const y = toY(pv)
        ctx.strokeStyle = 'rgba(136,153,187,0.07)'; ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(CW - pad.right, y); ctx.stroke()
        ctx.fillStyle = 'rgba(136,153,187,0.7)'
        ctx.fillText(pv.toFixed(0), CW - pad.right + 4, y + 3)
      }

      // Volume bars
      const volH = CH > 200 ? 28 : 16; const volY = CH - pad.bottom - volH
      const maxV = Math.max(...allC.map(c => c.v))
      for (let i = 0; i < allC.length; i++) {
        const c = allC[i]; const x = toX(i); const bh = (c.v / maxV) * volH
        ctx.fillStyle = c.c >= c.o ? 'rgba(0,255,136,0.28)' : 'rgba(255,68,68,0.28)'
        ctx.fillRect(x - cw / 2, volY + volH - bh, cw, bh)
      }

      // Candles
      for (let i = 0; i < allC.length; i++) {
        const c = allC[i]; const x = toX(i)
        const bull = c.c >= c.o
        const col  = bull ? '#00ff88' : '#ff4444'
        ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = bull ? 5 : 4
        ctx.strokeStyle = col; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x, toY(c.h)); ctx.lineTo(x, toY(c.l)); ctx.stroke()
        const y1 = toY(Math.max(c.o, c.c)); const y2 = toY(Math.min(c.o, c.c))
        ctx.fillStyle = bull ? 'rgba(0,255,136,0.82)' : 'rgba(255,68,68,0.82)'
        ctx.fillRect(x - cw / 2, y1, cw, Math.max(1, y2 - y1))
        ctx.restore()
      }

      // Price dashed line
      const last = allC[allC.length - 1]; const py = toY(last.c)
      ctx.save(); ctx.strokeStyle = 'rgba(201,168,76,0.55)'; ctx.lineWidth = 0.8; ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(pad.left, py); ctx.lineTo(CW - pad.right, py); ctx.stroke(); ctx.restore()

      // Price tag
      ctx.fillStyle = '#07090f'; ctx.fillRect(CW - pad.right, py - 9, pad.right - 1, 18)
      ctx.strokeStyle = 'rgba(201,168,76,0.55)'; ctx.lineWidth = 1
      ctx.strokeRect(CW - pad.right, py - 9, pad.right - 1, 18)
      ctx.fillStyle = '#c9a84c'; ctx.font = '700 9px JetBrains Mono'; ctx.textAlign = 'center'
      ctx.fillText(last.c.toFixed(2), CW - pad.right + (pad.right - 1) / 2, py + 4)

      // Signal arrows
      ctx.textAlign = 'center'
      for (let i = 14; i < allC.length; i += 15) {
        const c = allC[i]; const x = toX(i); const buy = (Math.floor(i / 15) % 2 === 0)
        ctx.save(); ctx.font = '11px sans-serif'
        if (buy) {
          ctx.fillStyle = '#00ff88'; ctx.shadowColor = '#00ff88'; ctx.shadowBlur = 10
          ctx.fillText('▲', x, toY(c.l) + 12)
        } else {
          ctx.fillStyle = '#ff4444'; ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 10
          ctx.fillText('▼', x, toY(c.h) - 4)
        }
        ctx.restore()
      }
    }

    const animate = (time: number) => {
      if (time % 220 < 16) {
        const partial = partialRef.current
        if (!partial) {
          const last = candlesRef.current[candlesRef.current.length - 1]
          partialRef.current = { ...last, c: last.c + (Math.random() - 0.48) * 1.2, v: 0.3 + Math.random() * 0.5 }
        } else {
          const d = (Math.random() - 0.47) * 1.8
          partial.c += d
          partial.h = Math.max(partial.h, partial.c)
          partial.l = Math.min(partial.l, partial.c)
          partial.v = Math.min(partial.v + 0.005, 1.2)
        }
        tickRef.current++
        if (tickRef.current >= 60) {
          tickRef.current = 0
          candlesRef.current = [...candlesRef.current, partialRef.current!].slice(-120)
          partialRef.current = null
        }
        draw()
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    draw()
    rafRef.current = requestAnimationFrame(animate)
    const onResize = () => draw()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: fullHeight ? '100%' : '100%', display: 'block' }}
    />
  )
}
