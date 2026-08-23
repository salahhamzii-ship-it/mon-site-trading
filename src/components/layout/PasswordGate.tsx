import { useState } from 'react'
import type { ReactNode } from 'react'

const SK = 'cmc-access-v1'
const CODE = 'SALAH2026'

const orb = (sz: number, w = 700): React.CSSProperties => ({
  fontFamily: 'Orbitron, monospace', fontSize: sz, fontWeight: w,
})
const jb = (sz: number, w = 400): React.CSSProperties => ({
  fontFamily: '"JetBrains Mono", monospace', fontSize: sz, fontWeight: w,
})

export default function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem(SK) === '1' } catch { return false }
  })
  const [input, setInput]   = useState('')
  const [error, setError]   = useState(false)

  if (unlocked) return <>{children}</>

  const attempt = () => {
    if (input.trim().toUpperCase() === CODE) {
      try { sessionStorage.setItem(SK, '1') } catch {}
      setUnlocked(true)
    } else {
      setError(true)
      setInput('')
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0b1120',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(201,168,76,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,76,0.025) 1px,transparent 1px)',
        backgroundSize: '44px 44px',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        width: '100%', maxWidth: 360,
        padding: '40px 32px',
        background: '#141820',
        border: '1px solid rgba(201,168,76,0.18)',
        borderRadius: 6,
        display: 'flex', flexDirection: 'column', gap: 24,
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: 32, marginBottom: 12, filter: 'drop-shadow(0 0 10px rgba(201,168,76,0.4))' }}>🐪</div>
          <div style={{ ...orb(11, 900), color: '#c9a84c', letterSpacing: '0.22em', marginBottom: 6 }}>
            CAMEL MARKET COCKPIT
          </div>
          <div style={{ ...jb(9), color: 'rgba(136,153,187,0.5)', letterSpacing: '0.1em' }}>
            SESSION CALCULATOR · ACCÈS RESTREINT
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...jb(9, 500), color: '#b4c2d9', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'left' }}>
            Code d'accès
          </div>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && attempt()}
            placeholder="••••••••"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#1a2236',
              border: `1px solid ${error ? 'rgba(255,68,68,0.6)' : 'rgba(201,168,76,0.30)'}`,
              borderRadius: 3, padding: '10px 14px',
              fontSize: 16, fontWeight: 600,
              color: '#fff', fontFamily: '"JetBrains Mono",monospace',
              outline: 'none', letterSpacing: '0.2em', textAlign: 'center',
              transition: 'border-color 0.2s',
            }}
          />
          {error && (
            <div style={{ ...jb(10, 500), color: '#ff6b6b', letterSpacing: '0.08em' }}>
              Accès réservé pour l'instant.
            </div>
          )}
        </div>

        <button
          onClick={attempt}
          style={{
            padding: '10px', border: 'none', borderRadius: 3, cursor: 'pointer',
            background: 'rgba(201,168,76,0.12)',
            outline: '1px solid rgba(201,168,76,0.35)',
            color: '#f0d070',
            ...orb(9, 700), letterSpacing: '0.2em',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(201,168,76,0.22)' }}
          onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(201,168,76,0.12)' }}
        >
          ACCÉDER
        </button>
      </div>
    </div>
  )
}
