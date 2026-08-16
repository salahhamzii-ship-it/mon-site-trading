import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'

const REFS = { NQ: 30044.75, ES: 7816.90, GC: 4441.32, CL: 81.96 }

export function Header() {
  const { sidebarOpen } = useApp()
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

  const leftOffset = sidebarOpen ? 224 : 64

  const instruments = [
    { sym: 'NQ', price: nq, ref: REFS.NQ, color: '#f0d070' },
    { sym: 'ES', price: es, ref: REFS.ES, color: 'rgba(200,190,165,0.8)' },
    { sym: 'GC', price: gc, ref: REFS.GC, color: 'rgba(200,190,165,0.8)' },
    { sym: 'CL', price: cl, ref: REFS.CL, color: 'rgba(200,190,165,0.8)' },
  ]

  return (
    <header style={{
      position: 'fixed',
      top: 0, left: leftOffset, right: 0,
      height: 40,
      display: 'flex', alignItems: 'center',
      background: 'rgba(7,9,15,0.97)',
      borderBottom: '1px solid rgba(201,168,76,0.12)',
      zIndex: 10,
      transition: 'left 0.3s',
      backdropFilter: 'blur(8px)',
      overflow: 'hidden',
    }}>
      {/* Bottom gradient border */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), rgba(30,179,188,0.2), rgba(201,168,76,0.4), transparent)',
      }} />

      {/* Instruments */}
      {instruments.map((inst) => {
        const diff = inst.price - inst.ref
        const pct  = (diff / inst.ref) * 100
        const up   = diff >= 0
        return (
          <div key={inst.sym} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 14px', height: '100%',
            borderRight: '1px solid rgba(201,168,76,0.08)',
          }}>
            <span style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: 6.5, fontWeight: 700, letterSpacing: '0.16em',
              color: 'rgba(201,168,76,0.5)',
            }}>{inst.sym}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 700, color: inst.color,
            }}>
              {inst.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 8, color: up ? '#00ff88' : '#ff4444',
            }}>
              {up ? '▲' : '▼'} {up ? '+' : ''}{pct.toFixed(2)}%
            </span>
          </div>
        )
      })}

      {/* GEX pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px' }}>
        {[
          { label: 'GEX+', bg: 'rgba(201,168,76,0.07)', border: 'rgba(201,168,76,0.18)', color: 'rgba(201,168,76,0.65)' },
          { label: 'CALL 30,600', bg: 'rgba(30,179,188,0.06)', border: 'rgba(30,179,188,0.18)', color: 'rgba(30,179,188,0.65)' },
          { label: 'PUT 29,600',  bg: 'rgba(255,68,68,0.05)',  border: 'rgba(255,68,68,0.15)',  color: 'rgba(255,68,68,0.65)' },
        ].map(p => (
          <div key={p.label} style={{
            padding: '1px 6px',
            background: p.bg, border: `1px solid ${p.border}`,
            borderRadius: 2,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 6.5, color: p.color, whiteSpace: 'nowrap',
          }}>{p.label}</div>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      {/* LIVE + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#00ff88', boxShadow: '0 0 6px #00ff88',
            animation: 'pulseDot 1.5s ease-in-out infinite', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Orbitron', monospace", fontSize: 6.5,
            letterSpacing: '0.12em', color: 'rgba(0,255,136,0.7)', whiteSpace: 'nowrap',
          }}>LIVE RTH</span>
        </div>
        <span style={{
          fontFamily: "'Orbitron', monospace", fontSize: 7.5,
          color: 'rgba(201,168,76,0.5)', letterSpacing: '0.08em', whiteSpace: 'nowrap',
        }}>{clock}</span>
      </div>
    </header>
  )
}
