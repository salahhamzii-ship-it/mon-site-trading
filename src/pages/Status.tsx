import { useEffect, useState } from 'react'

interface InstrumentStatus {
  label: string
  symbol: string
  lastPrice: string
  lastUpdate: string | null
  stale: boolean
  ok: boolean
}

interface BridgeInstrument {
  last?: string
  lastUpdate?: string
  _from_snapshot?: boolean
  [key: string]: unknown
}

interface BridgeData {
  NQ?: BridgeInstrument
  ES?: BridgeInstrument
  GC?: BridgeInstrument
  CL?: BridgeInstrument
  _fetchedAt?: string
}

const STALE_MS = 15 * 60 * 1000

function parseInstrument(key: string, label: string, raw?: BridgeInstrument): InstrumentStatus {
  if (!raw) return { label, symbol: key.toUpperCase(), lastPrice: '—', lastUpdate: null, stale: true, ok: false }
  const price = raw.last || '—'
  const ts = raw.lastUpdate || null
  const stale = !ts || Date.now() - new Date(ts).getTime() > STALE_MS
  return { label, symbol: key.toUpperCase(), lastPrice: price, lastUpdate: ts, stale, ok: !!price && price !== '—' }
}

function formatAgo(ts: string | null): string {
  if (!ts) return '—'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)    return `${diff}s`
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`
  return `${Math.floor(diff / 3600)}h${Math.floor((diff % 3600) / 60)}min`
}

function RadarDot({ color }: { color: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color, color,
      }} className="radar-ring" />
      <span style={{
        position: 'absolute', inset: 2, borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px ${color}`,
      }} />
    </span>
  )
}

function StaleCross() {
  return (
    <span className="stale-pulse" style={{
      fontSize: 13, color: '#ff8c50',
      textShadow: '0 0 8px rgba(255,140,80,0.6)',
      lineHeight: 1,
    }}>✕</span>
  )
}

function InstrumentRow({ inst, last, alt }: { inst: InstrumentStatus; last: boolean; alt: boolean }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 80px 110px 80px',
        padding: '13px 18px',
        borderBottom: last ? 'none' : '1px solid rgba(201,168,76,0.07)',
        background: hovered
          ? 'rgba(201,168,76,0.05)'
          : alt ? 'rgba(201,168,76,0.02)' : 'transparent',
        alignItems: 'center',
        transition: 'background 0.18s',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flexShrink: 0 }}>
          {!inst.ok ? (
            <span style={{ width: 10, height: 10, display: 'inline-block',
              background: 'rgba(136,153,187,0.2)', borderRadius: '50%' }} />
          ) : inst.stale ? (
            <StaleCross />
          ) : (
            <RadarDot color="#00ff88" />
          )}
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, color: hovered ? 'rgba(240,208,112,0.9)' : 'rgba(220,210,180,0.9)', letterSpacing: '0.08em', transition: 'color 0.18s' }}>
          {inst.label}
        </div>
      </div>
      <div style={{
        textAlign: 'right', fontSize: 10, fontWeight: 700,
        color: inst.ok ? '#f0d070' : 'rgba(136,153,187,0.35)',
        fontFamily: "'JetBrains Mono', monospace",
        textShadow: inst.ok && !inst.stale ? '0 0 10px rgba(240,208,112,0.3)' : 'none',
      }}>
        {inst.lastPrice}
      </div>
      <div style={{
        textAlign: 'right', fontSize: 8,
        color: inst.stale ? 'rgba(255,140,80,0.7)' : 'rgba(0,255,136,0.7)',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {inst.lastUpdate ? `il y a ${formatAgo(inst.lastUpdate)}` : '—'}
      </div>
      <div style={{ textAlign: 'center' }}>
        {!inst.ok ? (
          <span style={{ fontSize: 7, color: 'rgba(136,153,187,0.3)', letterSpacing: '0.1em' }}>PAS DE CSV</span>
        ) : inst.stale ? (
          <span style={{
            fontSize: 7, padding: '3px 8px', borderRadius: 3,
            background: 'rgba(255,140,80,0.1)', border: '1px solid rgba(255,140,80,0.35)',
            color: '#ff8c50', letterSpacing: '0.12em', fontWeight: 700,
          }} className="stale-pulse">STALE</span>
        ) : (
          <span style={{
            fontSize: 7, padding: '3px 8px', borderRadius: 3,
            background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
            color: '#00ff88', letterSpacing: '0.12em', fontWeight: 700,
            textShadow: '0 0 8px rgba(0,255,136,0.4)',
          }}>LIVE</span>
        )}
      </div>
    </div>
  )
}

export default function Status() {
  const [data, setData] = useState<BridgeData | null>(null)
  const [error, setError] = useState(false)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)
  const [, setTick] = useState(0)

  async function fetchData() {
    try {
      const r = await fetch('/api/bridge-data', { cache: 'no-store' })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const json = await r.json()
      setData(json)
      setLastFetch(new Date())
      setError(false)
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    fetchData()
    const iv = setInterval(fetchData, 30_000)
    return () => clearInterval(iv)
  }, [])

  // tick every second to refresh "ago" labels
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [])

  const instruments: InstrumentStatus[] = [
    parseInstrument('nq', 'NQ — Nasdaq E-mini', data?.NQ),
    parseInstrument('es', 'ES — S&P E-mini',    data?.ES),
    parseInstrument('gc', 'GC — Gold',           data?.GC),
    parseInstrument('cl', 'CL — Crude Oil',      data?.CL),
  ]

  const bridgeUp = !error && !!data
  const anyLive = instruments.some(i => !i.stale && i.ok)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 820, margin: '0 auto', fontFamily: "'JetBrains Mono', monospace" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontFamily: "'Orbitron', monospace", fontWeight: 900,
          fontSize: 13, letterSpacing: '0.2em',
          background: 'linear-gradient(135deg, #f0d070, #c9a84c)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>BRIDGE STATUS</div>
        <div style={{ fontSize: 9, color: 'rgba(136,153,187,0.5)', letterSpacing: '0.12em', marginTop: 4 }}>
          SIERRA CHART → SC_BRIDGE → COCKPIT · MONITORING
        </div>
      </div>

      {/* Bridge global status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', marginBottom: 20,
        background: bridgeUp
          ? 'linear-gradient(135deg, rgba(0,255,136,0.07), rgba(0,200,100,0.03))'
          : 'linear-gradient(135deg, rgba(255,80,80,0.09), rgba(180,40,40,0.03))',
        border: `1px solid ${bridgeUp ? 'rgba(0,255,136,0.2)' : 'rgba(255,80,80,0.22)'}`,
        borderRadius: 6,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: bridgeUp ? '#00ff88' : '#ff5050',
          boxShadow: bridgeUp ? '0 0 8px #00ff88' : '0 0 8px #ff5050',
          animation: 'pulseDot 1.8s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: bridgeUp ? '#00ff88' : '#ff5050', letterSpacing: '0.14em' }}>
            {bridgeUp ? 'BRIDGE UP' : 'BRIDGE OFFLINE'}
          </div>
          <div style={{ fontSize: 8, color: 'rgba(136,153,187,0.5)', marginTop: 2 }}>
            {lastFetch ? `Dernière réponse : il y a ${formatAgo(lastFetch.toISOString())}` : 'En attente…'}
            {anyLive && bridgeUp ? ' · Données en direct' : !bridgeUp ? ' · Vérifier sc_bridge.js + ngrok' : ''}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 8, color: 'rgba(136,153,187,0.35)' }}>
          Rafraîchissement : 30s
        </div>
      </div>

      {/* Instrument table */}
      <div style={{
        border: '1px solid rgba(201,168,76,0.12)',
        borderRadius: 6, overflow: 'hidden', marginBottom: 24,
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 80px 110px 80px',
          padding: '8px 18px',
          background: 'rgba(201,168,76,0.05)',
          borderBottom: '1px solid rgba(201,168,76,0.1)',
          fontSize: 7, letterSpacing: '0.14em', color: 'rgba(136,153,187,0.5)',
        }}>
          <span>INSTRUMENT</span>
          <span style={{ textAlign: 'right' }}>DERNIER PRIX</span>
          <span style={{ textAlign: 'right' }}>MISE À JOUR</span>
          <span style={{ textAlign: 'center' }}>STATUT</span>
        </div>

        {instruments.map((inst, i) => (
          <InstrumentRow key={inst.symbol} inst={inst} last={i === instruments.length - 1} alt={i % 2 !== 0} />
        ))}
      </div>

      {/* Info footer */}
      <div style={{
        fontSize: 8, color: 'rgba(136,153,187,0.35)', letterSpacing: '0.1em',
        lineHeight: 1.8, borderTop: '1px solid rgba(201,168,76,0.07)', paddingTop: 16,
      }}>
        <div>🟢 LIVE = CSV mis à jour il y a moins de 15 min</div>
        <div>🟠 STALE = CSV plus ancien que 15 min (marché fermé ou bridge stoppé)</div>
        <div>PAS DE CSV = instrument non encore configuré dans Sierra Chart</div>
        <div style={{ marginTop: 8, color: 'rgba(136,153,187,0.22)' }}>
          PROCHAINS NIVEAUX → ES · GC · CL export (Niveau 3) · Watchdog auto-restart (Niveau 4)
        </div>
      </div>

    </div>
  )
}
