import { useEffect, useState, useRef } from 'react'
import { useApp } from '../../context/AppContext'

const ORB = "'Orbitron', monospace"
const JB  = "'JetBrains Mono', monospace"

const STALE_MS = 15 * 60 * 1000

function toNum(v: string | number | undefined): number {
  const n = parseFloat(String(v ?? ''))
  return isNaN(n) ? 0 : n
}

function fmtPrice(v: number, sym: string): string {
  const dec = sym === 'CL' ? 2 : sym === 'GC' ? 2 : 2
  if (v === 0) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function useFlash(value: number) {
  const prev = useRef(value)
  const [cls, setCls] = useState('')
  useEffect(() => {
    if (prev.current === 0 || prev.current === value) { prev.current = value; return }
    const dir = value > prev.current ? 'flash-up' : 'flash-down'
    prev.current = value
    setCls(dir)
    const t = setTimeout(() => setCls(''), 520)
    return () => clearTimeout(t)
  }, [value])
  return cls
}

export function Header() {
  const { bridge, bridgeOnline } = useApp()
  const [clock, setClock] = useState('')

  const nq = toNum(bridge.NQ?.last)
  const es = toNum(bridge.ES?.last)
  const gc = toNum(bridge.GC?.last)
  const cl = toNum(bridge.CL?.last)

  const nqSettle = toNum(bridge.NQ?.j1_settle)
  const esSettle = toNum(bridge.ES?.j1_settle)
  const gcSettle = toNum(bridge.GC?.j1_settle)
  const clSettle = toNum(bridge.CL?.j1_settle)

  const nqTs = bridge.NQ?.lastUpdate ?? null
  const esTs = bridge.ES?.lastUpdate ?? null
  const nqLive = !!nqTs && Date.now() - new Date(nqTs).getTime() < STALE_MS
  const esLive = !!esTs && Date.now() - new Date(esTs).getTime() < STALE_MS
  const anyLive = bridgeOnline && (nqLive || esLive)

  const flashNq = useFlash(nq)
  const flashEs = useFlash(es)
  const flashGc = useFlash(gc)
  const flashCl = useFlash(cl)

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        }) + ' ET'
      )
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const instruments = [
    { sym: 'NQ', price: nq, settle: nqSettle, accent: '#c9a84c', accentGlow: '0 0 14px rgba(201,168,76,0.7)', flash: flashNq },
    { sym: 'ES', price: es, settle: esSettle, accent: null,       accentGlow: 'none', flash: flashEs },
    { sym: 'GC', price: gc, settle: gcSettle, accent: null,       accentGlow: 'none', flash: flashGc },
    { sym: 'CL', price: cl, settle: clSettle, accent: null,       accentGlow: 'none', flash: flashCl },
  ]

  return (
    <header style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      background: '#141820',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      flexShrink: 0,
      overflow: 'hidden',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Tickers */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
        {instruments.map((inst) => {
          const hasData = inst.price > 0
          const hasSettle = inst.settle > 0
          const diff = hasData && hasSettle ? inst.price - inst.settle : 0
          const pct  = hasData && hasSettle ? (diff / inst.settle) * 100 : 0
          const up   = diff >= 0

          return (
            <div key={inst.sym} style={{
              padding: '0 18px',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', gap: 1,
            }}>
              <div style={{
                fontFamily: ORB,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                color: inst.accent ?? 'rgba(255,255,255,0.35)',
              }}>{inst.sym}</div>

              <div className={inst.flash} style={{
                fontFamily: JB,
                fontSize: 16, fontWeight: 700,
                color: !hasData
                  ? 'rgba(136,153,187,0.3)'
                  : inst.accent ? '#f0d070' : 'rgba(226,232,240,0.9)',
                textShadow: hasData ? inst.accentGlow : 'none',
                lineHeight: 1,
                padding: '1px 3px',
                borderRadius: 3,
                transition: 'color 0.15s',
              }}>
                {fmtPrice(inst.price, inst.sym)}
              </div>

              <div style={{
                fontFamily: JB,
                fontSize: 10, fontWeight: 600,
                color: !hasData || !hasSettle
                  ? 'rgba(136,153,187,0.3)'
                  : up ? '#00ff88' : '#ff4444',
              }}>
                {hasData && hasSettle
                  ? `${up ? '▲' : '▼'} ${up ? '+' : ''}${pct.toFixed(2)}%`
                  : 'vs settle —'}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ flex: 1 }} />

      {/* Status + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', flexShrink: 0 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: anyLive ? '#00ff88' : bridgeOnline ? '#f0d070' : '#ff4444',
          boxShadow: anyLive ? '0 0 6px #00ff88' : bridgeOnline ? '0 0 6px #f0d070' : '0 0 6px #ff4444',
          animation: 'dot 1.6s infinite',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: JB, fontSize: 11, fontWeight: 600,
          color: anyLive ? '#00ff88' : bridgeOnline ? '#f0d070' : '#ff6b6b',
        }}>
          {anyLive ? 'LIVE' : bridgeOnline ? 'STALE' : 'OFFLINE'}
        </span>
        <span style={{ fontFamily: JB, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{clock}</span>
      </div>
    </header>
  )
}
