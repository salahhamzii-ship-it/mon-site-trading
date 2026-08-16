import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { WeeklyPlan, PriceLevel } from '../types'

const ORBITRON = "'Orbitron', monospace"
const JB = "'JetBrains Mono', monospace"

const CSS = `
  @keyframes glowGold {
    0%,100% { text-shadow: 0 0 14px rgba(201,168,76,0.8), 0 0 28px rgba(201,168,76,0.3); }
    50%      { text-shadow: 0 0 4px rgba(201,168,76,0.3); }
  }
  @keyframes pulseDot {
    0%,100% { opacity: 1; box-shadow: 0 0 5px currentColor; }
    50%      { opacity: 0.4; box-shadow: none; }
  }
`

function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function uid() { return Math.random().toString(36).slice(2) }

function Section({ accent, title, children }: { accent: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(10,15,26,0.85)',
      border: `1px solid ${accent}22`,
      borderTop: `2px solid ${accent}`,
      borderRadius: 4, padding: '16px 18px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 0%, ${accent}06, transparent 60%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
        letterSpacing: '0.2em', color: accent,
        marginBottom: 14,
      }}>{title}</div>
      {children}
    </div>
  )
}

export default function PlanSemaine() {
  const weekStart = getWeekStart()
  const [plans, setPlans] = useLocalStorage<WeeklyPlan[]>('weekly_plans', [])
  const currentPlan = plans.find(p => p.weekStart === weekStart)

  const [bias, setBias] = useState<WeeklyPlan['bias']>(currentPlan?.bias ?? 'NEUTRAL')
  const [goals, setGoals] = useState<string[]>(currentPlan?.goals ?? [''])
  const [notes, setNotes] = useState(currentPlan?.notes ?? '')
  const [levels, setLevels] = useState<PriceLevel[]>(currentPlan?.keyLevels ?? [])
  const [newSupport, setNewSupport] = useState({ price: '', label: '' })
  const [newResistance, setNewResistance] = useState({ price: '', label: '' })
  const [saved, setSaved] = useState(false)

  const save = () => {
    const plan: WeeklyPlan = {
      id: currentPlan?.id ?? uid(),
      weekStart,
      bias,
      keyLevels: levels,
      goals: goals.filter(Boolean),
      notes,
      createdAt: currentPlan?.createdAt ?? new Date().toISOString(),
    }
    setPlans(prev => {
      const filtered = prev.filter(p => p.weekStart !== weekStart)
      return [plan, ...filtered]
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addLevel = (type: 'SUPPORT' | 'RESISTANCE', data: { price: string; label: string }) => {
    if (!data.price) return
    setLevels(prev => [...prev, {
      price: Number(data.price),
      type,
      label: data.label || type,
      active: true,
    }])
    if (type === 'SUPPORT') setNewSupport({ price: '', label: '' })
    else setNewResistance({ price: '', label: '' })
  }

  const supports = levels.filter(l => l.type === 'SUPPORT' || l.type === 'PDL' || l.type === 'PWL' || l.type === 'PML')
  const resistances = levels.filter(l => l.type === 'RESISTANCE' || l.type === 'PDH' || l.type === 'PWH' || l.type === 'PMH')

  const inputStyle: React.CSSProperties = {
    fontFamily: JB, fontSize: 10,
    padding: '7px 10px', borderRadius: 2,
    background: 'rgba(6,8,16,0.9)',
    border: '1px solid rgba(201,168,76,0.18)',
    color: 'rgba(200,190,165,0.85)',
    outline: 'none',
  }

  return (
    <div style={{ marginLeft: -24, marginRight: -24, marginTop: -24 }}>
      <style>{CSS}</style>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(201,168,76,0.12)', paddingBottom: 16,
        }}>
          <div>
            <div style={{
              fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
              letterSpacing: '0.22em', color: 'rgba(201,168,76,0.4)',
              marginBottom: 6,
            }}>MÉTHODE SALAH · NQ100 · PLANIFICATION</div>
            <div style={{
              fontFamily: ORBITRON,
              fontSize: 'clamp(18px,2.5vw,26px)',
              fontWeight: 900, letterSpacing: '0.08em',
              background: 'linear-gradient(135deg, #c9a84c, #f0d070, #e8c86a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'glowGold 4s ease-in-out infinite',
            } as React.CSSProperties}>WEEKLY ROUTE</div>
            <div style={{
              fontFamily: JB, fontSize: 9, color: 'rgba(136,153,187,0.4)',
              marginTop: 4, letterSpacing: '0.06em',
            }}>Semaine du {weekStart}</div>
          </div>
          <button
            onClick={save}
            style={{
              fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
              letterSpacing: '0.16em',
              padding: '10px 20px', borderRadius: 3, cursor: 'pointer',
              background: saved
                ? 'rgba(0,255,136,0.12)'
                : 'linear-gradient(135deg, rgba(201,168,76,0.18), rgba(201,168,76,0.08))',
              border: saved
                ? '1px solid rgba(0,255,136,0.5)'
                : '1px solid rgba(201,168,76,0.4)',
              color: saved ? '#00ff88' : '#c9a84c',
              transition: 'all 0.3s',
              boxShadow: saved
                ? '0 0 16px rgba(0,255,136,0.15)'
                : '0 0 12px rgba(201,168,76,0.08)',
            }}
          >
            {saved ? '✓ SAUVEGARDÉ' : 'SAUVEGARDER'}
          </button>
        </div>

        {/* Bias */}
        <Section accent="#c9a84c" title="BIAIS HEBDOMADAIRE">
          <div style={{ display: 'flex', gap: 10 }}>
            {([
              { val: 'BULLISH', label: '🟢 HAUSSIER', color: '#00ff88' },
              { val: 'BEARISH', label: '🔴 BAISSIER', color: '#ff4444' },
              { val: 'NEUTRAL', label: '⚪ NEUTRE',   color: 'rgba(136,153,187,0.6)' },
            ] as const).map(b => (
              <button
                key={b.val}
                onClick={() => setBias(b.val)}
                style={{
                  fontFamily: ORBITRON, fontSize: 8, fontWeight: 700,
                  letterSpacing: '0.12em',
                  padding: '10px 18px', borderRadius: 3, cursor: 'pointer',
                  background: bias === b.val ? `${b.color}18` : 'transparent',
                  border: bias === b.val
                    ? `1px solid ${b.color}55`
                    : '1px solid rgba(136,153,187,0.12)',
                  color: bias === b.val ? b.color : 'rgba(136,153,187,0.35)',
                  textShadow: bias === b.val ? `0 0 8px ${b.color}60` : 'none',
                  transition: 'all 0.15s',
                }}
              >{b.label}</button>
            ))}
          </div>
          {bias !== 'NEUTRAL' && (
            <div style={{
              marginTop: 12, padding: '8px 12px',
              background: bias === 'BULLISH' ? 'rgba(0,255,136,0.05)' : 'rgba(255,68,68,0.05)',
              border: `1px solid ${bias === 'BULLISH' ? 'rgba(0,255,136,0.15)' : 'rgba(255,68,68,0.15)'}`,
              borderRadius: 2,
              fontFamily: JB, fontSize: 8.5,
              color: bias === 'BULLISH' ? 'rgba(0,255,136,0.7)' : 'rgba(255,68,68,0.7)',
            }}>
              {bias === 'BULLISH'
                ? '▲ Biais LONG confirmé — Privilégier les setups BPR/FVG/OB dans la hausse'
                : '▼ Biais SHORT confirmé — Privilégier les sweeps et fades sur les résistances'}
            </div>
          )}
        </Section>

        {/* Key Levels — 2 columns */}
        <Section accent="#1eb3bc" title="NIVEAUX CLÉS">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* SUPPORT */}
            <div>
              <div style={{
                fontFamily: ORBITRON, fontSize: 6.5, fontWeight: 700,
                letterSpacing: '0.16em', color: '#00ff88',
                marginBottom: 10, paddingBottom: 6,
                borderBottom: '1px solid rgba(0,255,136,0.15)',
              }}>SUPPORT</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                {supports.length === 0 && (
                  <div style={{ fontFamily: JB, fontSize: 8, color: 'rgba(136,153,187,0.25)', padding: '6px 0' }}>
                    Aucun support défini
                  </div>
                )}
                {supports.map((lvl, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px',
                    background: 'rgba(0,255,136,0.04)',
                    border: '1px solid rgba(0,255,136,0.1)',
                    borderRadius: 2,
                  }}>
                    <span style={{ fontFamily: JB, fontSize: 10, fontWeight: 700, color: '#00ff88' }}>
                      {lvl.price.toFixed(2)}
                    </span>
                    <span style={{ fontFamily: JB, fontSize: 7.5, color: 'rgba(136,153,187,0.5)', flex: 1, marginLeft: 8 }}>
                      {lvl.label}
                    </span>
                    <button
                      onClick={() => setLevels(l => l.filter((_, j) => l.indexOf(lvl) !== j))}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,68,68,0.3)', fontSize: 9, padding: 2 }}
                    >✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  placeholder="Prix"
                  value={newSupport.price}
                  onChange={e => setNewSupport(n => ({ ...n, price: e.target.value }))}
                  style={{ ...inputStyle, width: 80 }}
                />
                <input
                  placeholder="Label"
                  value={newSupport.label}
                  onChange={e => setNewSupport(n => ({ ...n, label: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => addLevel('SUPPORT', newSupport)}
                  style={{
                    fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.08em',
                    padding: '7px 10px', borderRadius: 2, cursor: 'pointer',
                    background: 'rgba(0,255,136,0.08)',
                    border: '1px solid rgba(0,255,136,0.25)',
                    color: '#00ff88',
                    whiteSpace: 'nowrap',
                  }}
                >+ Ajouter</button>
              </div>
            </div>

            {/* RESISTANCE */}
            <div>
              <div style={{
                fontFamily: ORBITRON, fontSize: 6.5, fontWeight: 700,
                letterSpacing: '0.16em', color: '#ff4444',
                marginBottom: 10, paddingBottom: 6,
                borderBottom: '1px solid rgba(255,68,68,0.15)',
              }}>RÉSISTANCE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                {resistances.length === 0 && (
                  <div style={{ fontFamily: JB, fontSize: 8, color: 'rgba(136,153,187,0.25)', padding: '6px 0' }}>
                    Aucune résistance définie
                  </div>
                )}
                {resistances.map((lvl, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 8px',
                    background: 'rgba(255,68,68,0.04)',
                    border: '1px solid rgba(255,68,68,0.1)',
                    borderRadius: 2,
                  }}>
                    <span style={{ fontFamily: JB, fontSize: 10, fontWeight: 700, color: '#ff4444' }}>
                      {lvl.price.toFixed(2)}
                    </span>
                    <span style={{ fontFamily: JB, fontSize: 7.5, color: 'rgba(136,153,187,0.5)', flex: 1, marginLeft: 8 }}>
                      {lvl.label}
                    </span>
                    <button
                      onClick={() => setLevels(l => l.filter(x => x !== lvl))}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,68,68,0.3)', fontSize: 9, padding: 2 }}
                    >✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  placeholder="Prix"
                  value={newResistance.price}
                  onChange={e => setNewResistance(n => ({ ...n, price: e.target.value }))}
                  style={{ ...inputStyle, width: 80 }}
                />
                <input
                  placeholder="Label"
                  value={newResistance.label}
                  onChange={e => setNewResistance(n => ({ ...n, label: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  onClick={() => addLevel('RESISTANCE', newResistance)}
                  style={{
                    fontFamily: ORBITRON, fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.08em',
                    padding: '7px 10px', borderRadius: 2, cursor: 'pointer',
                    background: 'rgba(255,68,68,0.08)',
                    border: '1px solid rgba(255,68,68,0.25)',
                    color: '#ff4444',
                    whiteSpace: 'nowrap',
                  }}
                >+ Ajouter</button>
              </div>
            </div>
          </div>
        </Section>

        {/* Objectives */}
        <Section accent="#f0d070" title="OBJECTIFS DE LA SEMAINE">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {goals.map((goal, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: ORBITRON, fontSize: 9,
                  color: '#c9a84c', flexShrink: 0,
                  textShadow: '0 0 6px rgba(201,168,76,0.4)',
                }}>→</span>
                <input
                  value={goal}
                  onChange={e => setGoals(g => g.map((v, j) => j === i ? e.target.value : v))}
                  placeholder={`Objectif ${i + 1}`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                {goals.length > 1 && (
                  <button
                    onClick={() => setGoals(g => g.filter((_, j) => j !== i))}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,68,68,0.35)', fontSize: 11 }}
                  >✕</button>
                )}
              </div>
            ))}
            <button
              onClick={() => setGoals(g => [...g, ''])}
              style={{
                fontFamily: ORBITRON, fontSize: 6.5, fontWeight: 700,
                letterSpacing: '0.14em', cursor: 'pointer',
                background: 'transparent', border: 'none',
                color: 'rgba(201,168,76,0.45)',
                textAlign: 'left', padding: '4px 0',
                marginTop: 2,
              }}
            >+ AJOUTER UN OBJECTIF</button>
          </div>
        </Section>

        {/* Notes */}
        <Section accent="#8899bb" title="NOTES & ANALYSE MACRO">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={5}
            placeholder="Contexte macro, événements à surveiller, observations chart, MGI de la semaine précédente..."
            style={{
              ...inputStyle,
              width: '100%',
              resize: 'vertical',
              lineHeight: 1.65,
              boxSizing: 'border-box',
            }}
          />
          <div style={{
            fontFamily: JB, fontSize: 7.5,
            color: 'rgba(136,153,187,0.25)',
            marginTop: 6, letterSpacing: '0.06em',
          }}>{notes.length} caractères · auto-sauvegarde à la soumission</div>
        </Section>

      </div>
    </div>
  )
}
