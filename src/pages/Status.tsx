import { useEffect, useState } from 'react'

interface InstrumentStatus {
  label: string
  symbol: string
  lastPrice: string
  lastUpdate: string | null
  lastCsvDate: string
  j1Settle: string
  stale: boolean
  ok: boolean
  fromSnapshot: boolean
}

interface BridgeInstrument {
  last?: string
  lastUpdate?: string
  last_csv_date?: string
  j1_date?: string
  j1_expected?: string
  j1_settle?: string
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
  if (!raw) return { label, symbol: key.toUpperCase(), lastPrice: '—', lastUpdate: null, lastCsvDate: '—', j1Settle: '—', stale: true, ok: false, fromSnapshot: false }
  const price = raw.last || '—'
  const ts = raw.lastUpdate || null
  const stale = !ts || Date.now() - new Date(ts).getTime() > STALE_MS
  return {
    label,
    symbol: key.toUpperCase(),
    lastPrice: price,
    lastUpdate: ts,
    lastCsvDate: raw.last_csv_date || '—',
    j1Settle: raw.j1_settle || '—',
    stale,
    ok: !!price && price !== '—',
    fromSnapshot: !!raw._from_snapshot,
  }
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
        display: 'grid', gridTemplateColumns: '1fr 160px 160px 110px',
        padding: '20px 28px',
        borderBottom: last ? 'none' : '1px solid rgba(201,168,76,0.07)',
        background: hovered
          ? 'rgba(201,168,76,0.05)'
          : alt ? 'rgba(201,168,76,0.02)' : 'transparent',
        alignItems: 'center',
        transition: 'background 0.18s',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flexShrink: 0 }}>
          {!inst.ok ? (
            <span style={{ width: 14, height: 14, display: 'inline-block',
              background: 'rgba(136,153,187,0.2)', borderRadius: '50%' }} />
          ) : inst.stale ? (
            <StaleCross />
          ) : (
            <RadarDot color="#00ff88" />
          )}
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: hovered ? 'rgba(240,208,112,0.9)' : 'rgba(220,210,180,0.9)', letterSpacing: '0.06em', transition: 'color 0.18s' }}>
            {inst.label}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(136,153,187,0.45)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
            CSV: <span style={{ color: inst.lastCsvDate === '—' ? 'rgba(255,140,80,0.6)' : 'rgba(136,153,187,0.7)' }}>{inst.lastCsvDate}</span>
            {inst.fromSnapshot && <span style={{ marginLeft: 8, color: '#ff8c50' }}>⚠ SNAPSHOT</span>}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 18, fontWeight: 700,
          color: inst.ok ? '#f0d070' : 'rgba(136,153,187,0.35)',
          fontFamily: "'JetBrains Mono', monospace",
          textShadow: inst.ok && !inst.stale ? '0 0 10px rgba(240,208,112,0.3)' : 'none',
        }}>
          {inst.lastPrice}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(136,153,187,0.4)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
          settle: {inst.j1Settle}
        </div>
      </div>
      <div style={{
        textAlign: 'right', fontSize: 13,
        color: inst.stale ? 'rgba(255,140,80,0.7)' : 'rgba(0,255,136,0.7)',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {inst.lastUpdate ? `il y a ${formatAgo(inst.lastUpdate)}` : '—'}
      </div>
      <div style={{ textAlign: 'center' }}>
        {!inst.ok ? (
          <span style={{ fontSize: 11, color: 'rgba(136,153,187,0.3)', letterSpacing: '0.1em' }}>PAS DE CSV</span>
        ) : inst.stale ? (
          <span style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 4,
            background: 'rgba(255,140,80,0.1)', border: '1px solid rgba(255,140,80,0.35)',
            color: '#ff8c50', letterSpacing: '0.12em', fontWeight: 700,
          }} className="stale-pulse">STALE</span>
        ) : (
          <span style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 4,
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
  const [showRaw, setShowRaw] = useState(false)

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
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto', fontFamily: "'JetBrains Mono', monospace" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontFamily: "'Orbitron', monospace", fontWeight: 900,
          fontSize: 22, letterSpacing: '0.2em',
          background: 'linear-gradient(135deg, #f0d070, #c9a84c)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>BRIDGE STATUS</div>
        <div style={{ fontSize: 13, color: 'rgba(136,153,187,0.5)', letterSpacing: '0.12em', marginTop: 6 }}>
          SIERRA CHART → SC_BRIDGE → COCKPIT · MONITORING
        </div>
      </div>

      {/* Bridge global status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 18,
        padding: '20px 28px', marginBottom: 28,
        background: bridgeUp
          ? 'linear-gradient(135deg, rgba(0,255,136,0.07), rgba(0,200,100,0.03))'
          : 'linear-gradient(135deg, rgba(255,80,80,0.09), rgba(180,40,40,0.03))',
        border: `1px solid ${bridgeUp ? 'rgba(0,255,136,0.2)' : 'rgba(255,80,80,0.22)'}`,
        borderRadius: 8,
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%',
          background: bridgeUp ? '#00ff88' : '#ff5050',
          boxShadow: bridgeUp ? '0 0 10px #00ff88' : '0 0 10px #ff5050',
          animation: 'pulseDot 1.8s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: bridgeUp ? '#00ff88' : '#ff5050', letterSpacing: '0.14em' }}>
            {bridgeUp ? 'BRIDGE UP' : 'BRIDGE OFFLINE'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(136,153,187,0.5)', marginTop: 4 }}>
            {lastFetch ? `Dernière réponse : il y a ${formatAgo(lastFetch.toISOString())}` : 'En attente…'}
            {anyLive && bridgeUp ? ' · Données en direct' : !bridgeUp ? ' · Vérifier sc_bridge.js + ngrok' : ''}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(136,153,187,0.35)' }}>
          Rafraîchissement : 30s
        </div>
      </div>

      {/* Instrument table */}
      <div style={{
        border: '1px solid rgba(201,168,76,0.12)',
        borderRadius: 8, overflow: 'hidden', marginBottom: 32,
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 160px 160px 110px',
          padding: '12px 28px',
          background: 'rgba(201,168,76,0.05)',
          borderBottom: '1px solid rgba(201,168,76,0.1)',
          fontSize: 11, letterSpacing: '0.14em', color: 'rgba(136,153,187,0.5)',
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

      {/* Diagnostic brut — bouton toggle */}
      {data && (
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => setShowRaw(r => !r)}
            style={{
              background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)',
              color: '#c9a84c', fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, letterSpacing: '0.14em', padding: '8px 18px', borderRadius: 5,
              cursor: 'pointer', marginBottom: showRaw ? 14 : 0,
            }}
          >
            {showRaw ? '▲ MASQUER DONNÉES BRUTES' : '▼ DONNÉES BRUTES DU BRIDGE'}
          </button>

          {showRaw && (
            <div style={{
              background: 'rgba(10,12,18,0.9)', border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: 8, padding: '18px 22px', overflowX: 'auto',
            }}>
              {(['NQ', 'ES', 'GC', 'CL'] as const).map(sym => {
                const raw = data[sym] as BridgeInstrument | undefined
                if (!raw) return (
                  <div key={sym} style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,140,80,0.8)', letterSpacing: '0.15em', marginBottom: 4 }}>{sym} — ABSENT DU BRIDGE</div>
                  </div>
                )
                const fields: [string, string][] = [
                  ['last (PRIX AFFICHÉ)', String(raw.last ?? '—')],
                  ['lastUpdate', String(raw.lastUpdate ?? '—')],
                  ['last_csv_date', String(raw.last_csv_date ?? '—')],
                  ['j1_settle', String(raw.j1_settle ?? '—')],
                  ['_from_snapshot', String(raw._from_snapshot ?? false)],
                ]
                const isSnap = !!raw._from_snapshot
                return (
                  <div key={sym} style={{ marginBottom: 20 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', marginBottom: 6,
                      color: isSnap ? '#ff8c50' : '#c9a84c',
                    }}>
                      {sym}{isSnap ? ' ⚠ SNAPSHOT — PAS DE CSV' : ''}
                    </div>
                    {fields.map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: 12, fontSize: 12, marginBottom: 2 }}>
                        <span style={{ color: 'rgba(136,153,187,0.45)', width: 200, flexShrink: 0 }}>{k}</span>
                        <span style={{
                          color: k.includes('last (') ? '#f0d070' : 'rgba(220,210,180,0.85)',
                          fontWeight: k.includes('last (') ? 700 : 400,
                        }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Info footer */}
      <div style={{
        fontSize: 12, color: 'rgba(136,153,187,0.35)', letterSpacing: '0.08em',
        lineHeight: 2, borderTop: '1px solid rgba(201,168,76,0.07)', paddingTop: 20,
      }}>
        <div>🟢 LIVE = CSV mis à jour il y a moins de 15 min</div>
        <div>🟠 STALE = CSV plus ancien que 15 min (marché fermé ou bridge stoppé)</div>
        <div>PAS DE CSV = instrument non encore configuré dans Sierra Chart</div>
      </div>

    </div>
  )
}
