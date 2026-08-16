import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'

const REFS = { NQ: 30044.75, ES: 7816.90, GC: 4441.32, CL: 81.96 }
const ORB = "'Orbitron', monospace"
const JB  = "'JetBrains Mono', monospace"

export function Header() {
  useApp()
  const [nq, setNq] = useState(30141.0)
  const [es, setEs] = useState(7831.0)
  const [gc, setGc] = useState(4432.0)
  const [cl, setCl] = useState(82.40)
  const [clock, setClock] = useState('')

  useEffect(() => {
    const t = setInterval(() => {
      setNq(p => +(p + (Math.random() - 0.49) * 3).toFixed(2))
      setEs(p => +(p + (Math.random() - 0.49) * 0.5).toFixed(2))
      setGc(p => +(p + (Math.random() - 0.49) * 0.3).toFixed(2))
      setCl(p => +(p + (Math.random() - 0.505) * 0.05).toFixed(2))
    }, 900)
    return () => clearInterval(t)
  }, [])

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
    { sym: 'NQ', price: nq, ref: REFS.NQ, accent: '#c9a84c', accentGlow: '0 0 14px rgba(201,168,76,0.7)' },
    { sym: 'ES', price: es, ref: REFS.ES, accent: null, accentGlow: 'none' },
    { sym: 'GC', price: gc, ref: REFS.GC, accent: null, accentGlow: 'none' },
    { sym: 'CL', price: cl, ref: REFS.CL, accent: null, accentGlow: 'none' },
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
      {/* Tickers — 3-row vertical columns */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: '100%' }}>
        {instruments.map((inst) => {
          const diff = inst.price - inst.ref
          const pct  = (diff / inst.ref) * 100
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
              <div style={{
                fontFamily: JB,
                fontSize: 16, fontWeight: 700,
                color: inst.accent ? '#f0d070' : 'rgba(226,232,240,0.9)',
                textShadow: inst.accentGlow,
                lineHeight: 1,
              }}>
                {inst.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{
                fontFamily: JB,
                fontSize: 10, fontWeight: 600,
                color: up ? '#00ff88' : '#ff4444',
              }}>
                {up ? '▲' : '▼'} {up ? '+' : ''}{pct.toFixed(2)}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Badge pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16, flexWrap: 'wrap' }}>
        <div style={{
          padding: '4px 10px',
          background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)',
          borderRadius: 20, fontSize: 10, fontWeight: 600, color: '#00ff88',
          fontFamily: JB, whiteSpace: 'nowrap',
        }}>GEX POSITIF</div>
        <div style={{
          padding: '4px 10px',
          background: 'rgba(30,179,188,0.08)', border: '1px solid rgba(30,179,188,0.2)',
          borderRadius: 20, fontSize: 10, fontWeight: 600, color: '#1eb3bc',
          fontFamily: JB, whiteSpace: 'nowrap',
        }}>CALL 30,600</div>
        <div style={{
          padding: '4px 10px',
          background: 'rgba(255,68,68,0.07)', border: '1px solid rgba(255,68,68,0.2)',
          borderRadius: 20, fontSize: 10, fontWeight: 600, color: '#ff6b6b',
          fontFamily: JB, whiteSpace: 'nowrap',
        }}>PUT 29,600</div>
      </div>

      <div style={{ flex: 1 }} />

      {/* LIVE + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', flexShrink: 0 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#00ff88',
          animation: 'dot 1.6s infinite',
          color: '#00ff88',
          flexShrink: 0,
        }} />
        <span style={{ fontFamily: JB, fontSize: 11, fontWeight: 600, color: '#00ff88' }}>LIVE RTH</span>
        <span style={{ fontFamily: JB, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{clock}</span>
      </div>
    </header>
  )
}
