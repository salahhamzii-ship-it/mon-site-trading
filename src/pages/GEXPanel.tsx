import { useState } from 'react'
import type { GEXStrike, GEXAnalysis } from '../types/methode'
import { analyzeGEX } from '../utils/methodeCalc'

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:              '#060810',
  surface:         '#090d15',
  gold:            '#c9a84c',
  goldBright:      '#f0d070',
  goldFaint:       'rgba(201,168,76,0.10)',
  turquoise:       '#1eb3bc',
  turquoiseFaint:  'rgba(30,179,188,0.10)',
  turquoiseBorder: 'rgba(30,179,188,0.35)',
  border:          'rgba(201,168,76,0.14)',
  green:           '#00ff88',
  red:             '#ff4444',
  sand:            '#d8cdb8',
  sandMuted:       'rgba(136,153,187,0.5)',
}

const ORBITRON = "'Orbitron', monospace"
const JB       = "'JetBrains Mono', monospace"

const CSS = `
  @keyframes gexPulse {
    0%,100% { opacity:1; transform:scale(1); box-shadow:0 0 8px currentColor; }
    50%      { opacity:0.25; transform:scale(0.65); box-shadow:none; }
  }
  @keyframes gexGlow {
    0%,100% { text-shadow:0 0 16px rgba(30,179,188,0.8), 0 0 32px rgba(30,179,188,0.3); }
    50%      { text-shadow:0 0 6px rgba(30,179,188,0.3); }
  }
  @keyframes gexGlowGreen {
    0%,100% { text-shadow:0 0 16px rgba(0,255,136,0.8), 0 0 32px rgba(0,255,136,0.3); }
    50%      { text-shadow:0 0 6px rgba(0,255,136,0.3); }
  }
  .gex-pulse { animation: gexPulse 1.4s ease-in-out infinite; }
  .gex-glow  { animation: gexGlow 2s ease-in-out infinite; }
  .gex-glow-green { animation: gexGlowGreen 2s ease-in-out infinite; }
`

// Live GEX data — ready to connect to Sierra Chart / real feed
const LIVE = {
  attraction: 30141,
  callWall:   30600,
  putWall:    29600,
  bias:       'CALLS' as const,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const n = (v: string) => parseFloat(v) || 0
function fmt(p: number) { return p.toLocaleString('en-US', { minimumFractionDigits: 2 }) }

// ─── Sub-components ───────────────────────────────────────────────────────────
function FieldInput({ label, value, onChange, placeholder, type = 'number' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div>
      <div style={{ fontFamily: JB, fontSize: 8, color: C.sandMuted, marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        step={type === 'number' ? '0.25' : undefined}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        style={{
          width: '100%', boxSizing: 'border-box' as const,
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 3, padding: '5px 8px',
          color: C.sand, fontFamily: JB, fontSize: 11,
          outline: 'none',
        }}
      />
    </div>
  )
}

interface GEXSession {
  date: string; avwap18h: number; currentPrice: number
  strikes: GEXStrike[]; analysis: GEXAnalysis | null
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GEXPanel() {
  const [sessions, setSessions] = useState<GEXSession[]>([])
  const [avwap, setAvwap]     = useState('')
  const [price, setPrice]     = useState('')
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows]       = useState(
    Array(5).fill(null).map(() => ({ strike: '', callGamma: '', putGamma: '' }))
  )

  function updateRow(i: number, field: string, v: string) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: v } : row))
  }
  function addRow() { setRows(r => [...r, { strike: '', callGamma: '', putGamma: '' }]) }
  function removeRow(i: number) { setRows(r => r.filter((_, idx) => idx !== i)) }

  function analyzeSession() {
    const strikes: GEXStrike[] = rows
      .filter(r => r.strike)
      .map(r => ({ strike: n(r.strike), callGamma: n(r.callGamma), putGamma: n(r.putGamma) }))
    const analysis = analyzeGEX(strikes, n(avwap), n(price))
    setSessions(prev => [{ date, avwap18h: n(avwap), currentPrice: n(price), strikes, analysis }, ...prev])
    setRows(Array(5).fill(null).map(() => ({ strike: '', callGamma: '', putGamma: '' })))
  }

  const isBullish = LIVE.bias === 'CALLS'
  const biasColor = isBullish ? C.green : C.red
  const range     = LIVE.callWall - LIVE.putWall
  const magnetPct = ((LIVE.attraction - LIVE.putWall) / range) * 100

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', paddingBottom: 32 }}>
      <style>{CSS}</style>

      {/* ── LIVE GEX STATUS ─────────────────────────────────────────────── */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.turquoiseBorder}`,
        borderTop: `2px solid ${C.turquoise}`,
        borderRadius: 6, marginBottom: 16, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '8px 16px',
          background: C.turquoiseFaint,
          borderBottom: `1px solid ${C.turquoiseBorder}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div className="gex-pulse" style={{
            width: 8, height: 8, borderRadius: '50%',
            background: C.turquoise, color: C.turquoise, flexShrink: 0,
          }} />
          <span style={{ fontFamily: ORBITRON, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: C.turquoise }}>
            FLOW · GEX — LIVE STATUS
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: JB, fontSize: 7.5, color: C.sandMuted }}>QQQ × 40 = NQ</span>
        </div>

        {/* Metrics row */}
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>

          {/* GEX Bias — prominent */}
          <div style={{
            background: `${biasColor}0f`,
            border: `1px solid ${biasColor}40`,
            borderRadius: 4, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontFamily: ORBITRON, fontSize: 7, letterSpacing: '0.2em', color: C.sandMuted }}>GEX BIAS</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div className="gex-pulse" style={{
                width: 10, height: 10, borderRadius: '50%',
                background: biasColor, color: biasColor, flexShrink: 0,
              }} />
              <span
                className={isBullish ? 'gex-glow-green' : ''}
                style={{ fontFamily: ORBITRON, fontSize: 20, fontWeight: 900, color: biasColor, letterSpacing: '0.05em' }}
              >
                {isBullish ? '▲' : '▼'} {LIVE.bias}
              </span>
            </div>
            <span style={{ fontFamily: JB, fontSize: 8, color: C.sandMuted }}>
              {isBullish ? 'BUYERS IN CONTROL' : 'SELLERS IN CONTROL'}
            </span>
          </div>

          {/* GEX Attraction */}
          <div style={{
            background: 'rgba(30,179,188,0.06)', border: `1px solid rgba(30,179,188,0.22)`,
            borderRadius: 4, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{ fontFamily: ORBITRON, fontSize: 7, letterSpacing: '0.2em', color: C.sandMuted }}>GEX ATTRACTION</span>
            <span className="gex-glow" style={{ fontFamily: JB, fontSize: 22, fontWeight: 700, color: C.turquoise }}>
              {fmt(LIVE.attraction)}
            </span>
            <span style={{ fontFamily: JB, fontSize: 7.5, color: C.sandMuted }}>NQ MAGNETIC LEVEL</span>
            <span style={{ fontFamily: JB, fontSize: 7, color: 'rgba(30,179,188,0.45)' }}>
              QQQ {(LIVE.attraction / 40).toFixed(2)}
            </span>
          </div>

          {/* Call Wall */}
          <div style={{
            background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 4, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{ fontFamily: ORBITRON, fontSize: 7, letterSpacing: '0.2em', color: C.sandMuted }}>CALL WALL</span>
            <span style={{ fontFamily: JB, fontSize: 22, fontWeight: 700, color: C.green }}>
              {LIVE.callWall.toLocaleString()}
            </span>
            <span style={{ fontFamily: JB, fontSize: 7.5, color: C.sandMuted }}>RÉSISTANCE GAMMA</span>
            <span style={{ fontFamily: JB, fontSize: 7, color: 'rgba(0,255,136,0.45)' }}>
              QQQ {(LIVE.callWall / 40).toFixed(2)}
            </span>
          </div>

          {/* Put Wall */}
          <div style={{
            background: 'rgba(255,68,68,0.04)', border: '1px solid rgba(255,68,68,0.2)',
            borderRadius: 4, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 4,
          }}>
            <span style={{ fontFamily: ORBITRON, fontSize: 7, letterSpacing: '0.2em', color: C.sandMuted }}>PUT WALL</span>
            <span style={{ fontFamily: JB, fontSize: 22, fontWeight: 700, color: C.red }}>
              {LIVE.putWall.toLocaleString()}
            </span>
            <span style={{ fontFamily: JB, fontSize: 7.5, color: C.sandMuted }}>SUPPORT GAMMA</span>
            <span style={{ fontFamily: JB, fontSize: 7, color: 'rgba(255,68,68,0.45)' }}>
              QQQ {(LIVE.putWall / 40).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Magnetic zone bar */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontFamily: ORBITRON, fontSize: 7, letterSpacing: '0.18em', color: C.sandMuted, marginBottom: 6 }}>
            ZONE MAGNÉTIQUE GEX — {LIVE.putWall.toLocaleString()} ←→ {LIVE.callWall.toLocaleString()}
          </div>
          <div style={{
            position: 'relative', height: 26,
            background: 'rgba(201,168,76,0.04)',
            borderRadius: 4, border: `1px solid ${C.border}`,
            overflow: 'visible',
          }}>
            {/* Background gradient */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 3,
              background: `linear-gradient(90deg, rgba(255,68,68,0.12), rgba(30,179,188,0.15) ${magnetPct}%, rgba(0,255,136,0.12))`,
            }} />
            {/* Attraction marker */}
            <div style={{
              position: 'absolute', top: -4, left: `${magnetPct}%`,
              transform: 'translateX(-50%)',
              width: 2, height: 34,
              background: C.turquoise, boxShadow: `0 0 8px ${C.turquoise}`,
              borderRadius: 1,
            }} />
            {/* Price labels */}
            <div style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              fontFamily: JB, fontSize: 8, color: C.red,
            }}>PUT {LIVE.putWall.toLocaleString()}</div>
            <div style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              fontFamily: JB, fontSize: 8, color: C.green,
            }}>CALL {LIVE.callWall.toLocaleString()}</div>
            {/* Magnet label */}
            <div style={{
              position: 'absolute', left: `${magnetPct}%`, top: -20,
              transform: 'translateX(-50%)',
              fontFamily: JB, fontSize: 7.5, color: C.turquoise, whiteSpace: 'nowrap',
            }}>↓ {fmt(LIVE.attraction)}</div>
          </div>
        </div>
      </div>

      {/* ── RULES ───────────────────────────────────────────────────────── */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${C.gold}`,
        borderRadius: 4, padding: '8px 14px',
        marginBottom: 16,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 24px',
        fontFamily: JB, fontSize: 8, color: C.sandMuted,
      }}>
        {[
          ['gold',       'Max gamma net = attracteur magnétique NQ'],
          ['green',      'Call Wall (strike max call γ × 40) = résistance'],
          ['red',        'Put Wall (strike max put γ × 40) = support'],
          ['turquoise',  'Entre les murs → zone neutre GEX'],
          ['gold',       'GEX positif fort → compression volatilité'],
          ['gold',       'QQQ strike × 40 = équivalent NQ'],
        ].map(([color, text], i) => (
          <div key={i}>
            <span style={{ color: color === 'green' ? C.green : color === 'red' ? C.red : color === 'turquoise' ? C.turquoise : C.gold }}>›</span>
            {' '}{text}
          </div>
        ))}
      </div>

      {/* ── QQQ CALCULATOR ──────────────────────────────────────────────── */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderTop: `2px solid ${C.gold}`,
        borderRadius: 6, padding: '12px 16px', marginBottom: 16,
      }}>
        <div style={{ fontFamily: ORBITRON, fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', color: C.gold, marginBottom: 12 }}>
          CALCULATEUR QQQ × 40 — NOUVELLE SESSION
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <FieldInput label="Date" value={date} onChange={setDate} type="date" />
          <FieldInput label="Prix NQ actuel" value={price} onChange={setPrice} placeholder="30141" />
          <FieldInput label="AVWAP 18h (NQ)" value={avwap} onChange={setAvwap} placeholder="30120" />
        </div>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '90px 1fr 1fr 90px 24px',
          gap: 6, marginBottom: 4, padding: '0 2px',
        }}>
          {['Strike QQQ', 'Call Γ ($M)', 'Put Γ ($M)', 'NQ equiv.', ''].map(h => (
            <div key={h} style={{ fontFamily: JB, fontSize: 7.5, color: C.sandMuted }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 1fr 90px 24px', gap: 6, alignItems: 'center' }}>
              {(['strike', 'callGamma', 'putGamma'] as const).map(field => (
                <input
                  key={field}
                  type="number" step="0.25"
                  value={row[field]}
                  onChange={e => updateRow(i, field, e.target.value)}
                  placeholder={field === 'strike' ? '765' : '1.2'}
                  style={{
                    width: '100%', boxSizing: 'border-box' as const,
                    background: C.bg, border: `1px solid ${C.border}`,
                    borderRadius: 3, padding: '4px 6px',
                    color: C.sand, fontFamily: JB, fontSize: 10, outline: 'none',
                  }}
                />
              ))}
              <span style={{ fontFamily: JB, fontSize: 9, color: C.turquoise }}>
                {row.strike ? (n(row.strike) * 40).toLocaleString() : '—'}
              </span>
              {rows.length > 2 ? (
                <button
                  onClick={() => removeRow(i)}
                  style={{ background: 'none', border: 'none', color: C.sandMuted, cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
                >×</button>
              ) : <span />}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={addRow}
            style={{
              background: 'none', border: `1px solid ${C.border}`,
              borderRadius: 3, padding: '5px 14px',
              color: C.gold, fontFamily: JB, fontSize: 9, cursor: 'pointer',
            }}
          >+ Strike</button>
          <button
            onClick={analyzeSession}
            style={{
              flex: 1, background: `rgba(30,179,188,0.12)`,
              border: `1px solid rgba(30,179,188,0.4)`, borderRadius: 3,
              padding: '6px 16px', color: C.turquoise,
              fontFamily: ORBITRON, fontSize: 8, fontWeight: 700,
              letterSpacing: '0.15em', cursor: 'pointer',
            }}
          >ANALYSER LES NIVEAUX GEX</button>
        </div>
      </div>

      {/* ── SESSION RESULTS ──────────────────────────────────────────────── */}
      {sessions.map((session, idx) => (
        <div key={idx} style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderTop: `2px solid ${C.turquoise}`,
          borderRadius: 6, padding: '12px 16px', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: ORBITRON, fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', color: C.turquoise }}>
              SESSION — {new Date(session.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
            </span>
            <span style={{ fontFamily: JB, fontSize: 8, color: C.sandMuted }}>
              NQ {session.currentPrice.toLocaleString()} | AVWAP {session.avwap18h.toLocaleString()}
            </span>
          </div>

          {session.analysis ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Attracteur GEX', value: session.analysis.attracteur.toLocaleString(), color: C.turquoise },
                  { label: 'Call Wall',       value: session.analysis.callWall.toLocaleString(),   color: C.green },
                  { label: 'Put Wall',        value: session.analysis.putWall.toLocaleString(),    color: C.red },
                  { label: 'Zone Haute',      value: session.analysis.zoneHaute.toLocaleString(),  color: C.goldBright },
                  { label: 'Zone Basse',      value: session.analysis.zoneBasse.toLocaleString(),  color: C.goldBright },
                  { label: 'Écart AVWAP',     value: `${session.analysis.ecartAvwap > 0 ? '+' : ''}${session.analysis.ecartAvwap} pts`, color: session.analysis.ecartAvwap >= 0 ? C.green : C.red },
                ].map(item => (
                  <div key={item.label} style={{
                    background: C.bg, borderRadius: 3,
                    padding: '8px 12px', border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ fontFamily: JB, fontSize: 7.5, color: C.sandMuted, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontFamily: JB, fontSize: 14, fontWeight: 700, color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: session.analysis.bias === 'SUPPORT' ? 'rgba(0,255,136,0.06)' : session.analysis.bias === 'RESISTANCE' ? 'rgba(255,68,68,0.06)' : 'rgba(100,100,120,0.06)',
                border: `1px solid ${session.analysis.bias === 'SUPPORT' ? 'rgba(0,255,136,0.3)' : session.analysis.bias === 'RESISTANCE' ? 'rgba(255,68,68,0.3)' : C.border}`,
                borderRadius: 3, padding: '8px 12px',
                fontFamily: JB, fontSize: 9,
                color: session.analysis.bias === 'SUPPORT' ? C.green : session.analysis.bias === 'RESISTANCE' ? C.red : C.sandMuted,
              }}>
                GEX Bias: <strong>{session.analysis.bias}</strong> — Attracteur {session.analysis.attracteur.toLocaleString()}
                {session.analysis.bias === 'SUPPORT' && ' → biais haussier, prix cherche à monter vers attracteur'}
                {session.analysis.bias === 'RESISTANCE' && ' → biais baissier, prix cherche à descendre vers attracteur'}
                {session.analysis.bias === 'NEUTRE' && ' → prix entre Put Wall et Call Wall, range GEX'}
              </div>
            </>
          ) : (
            <div style={{ fontFamily: JB, fontSize: 9, color: C.sandMuted }}>Données insuffisantes pour analyser.</div>
          )}
        </div>
      ))}

      {sessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.sandMuted }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚡</div>
          <div style={{ fontFamily: JB, fontSize: 9 }}>Entrer les strikes QQQ et cliquer sur Analyser</div>
        </div>
      )}
    </div>
  )
}
