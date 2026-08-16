import { useEffect, useState } from 'react'
import { useApp } from '../../context/AppContext'

const GRAD = {
  background: 'linear-gradient(135deg, #f0d070, #c9a84c)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as React.CSSProperties

export function Header() {
  const { sidebarOpen } = useApp()
  const [live, setLive]   = useState(21340.0)
  const [clock, setClock] = useState('')
  const [up, setUp]       = useState(true)

  useEffect(() => {
    const t = setInterval(() => {
      setLive(p => {
        const n = +(p + (Math.random() - 0.49) * 3).toFixed(2)
        setUp(n >= p)
        return n
      })
    }, 900)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString('fr-FR', {
          timeZone: 'America/New_York',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        }) + ' ET'
      )
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const leftOffset = sidebarOpen ? 224 : 64

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: leftOffset,
        right: 0,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 20,
        background: 'rgba(6,8,16,0.97)',
        borderBottom: '1px solid rgba(201,168,76,0.16)',
        zIndex: 10,
        transition: 'left 0.3s',
        backdropFilter: 'blur(8px)',
        overflow: 'hidden',
      }}
    >
      {/* Horizon line */}
      <div style={{
        position: 'absolute', bottom: 0, left: '5%', right: '5%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)',
      }} />

      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20, filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.5))' }}>🐪</span>
        <div>
          <div style={{
            ...GRAD,
            fontFamily: "'Orbitron', monospace",
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: '0.16em',
            lineHeight: 1.1,
          }}>CAMEL MARKET COCKPIT</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 7.5,
            color: '#7a6a50',
            letterSpacing: '0.1em',
          }}>by SalahTataouine · NQ·ES MARKET READING SYSTEM</div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Live price */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          ...GRAD,
          fontFamily: "'Orbitron', monospace",
          fontWeight: 900,
          fontSize: 18,
          lineHeight: 1,
          filter: 'drop-shadow(0 0 10px rgba(201,168,76,0.3))',
        }}>
          {live.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: up ? '#34d399' : '#ef4444',
          marginTop: 1,
        }}>
          {up ? '▲' : '▼'} NQ100
        </div>
      </div>

      {/* LIVE chip */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        background: 'rgba(30,179,188,0.1)',
        border: '1px solid rgba(30,179,188,0.4)',
        borderRadius: 3,
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#1eb3bc',
          boxShadow: '0 0 6px #1eb3bc',
          display: 'inline-block',
          animation: 'pulseDot 1.2s ease-in-out infinite',
        }} />
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 7,
          fontWeight: 700,
          color: '#1eb3bc',
          letterSpacing: '0.1em',
        }}>LIVE RTH</span>
      </div>

      {/* Clock */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        color: '#c9a84c',
        minWidth: 92,
        textAlign: 'right',
      }}>{clock}</div>
    </header>
  )
}
