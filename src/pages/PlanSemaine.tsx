import { useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { WeeklyPlan, PriceLevel } from '../types'

function getWeekStart(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function uid() { return Math.random().toString(36).slice(2) }

const LEVEL_TYPES = ['PDH', 'PDL', 'PWH', 'PWL', 'PMH', 'PML', 'SUPPORT', 'RESISTANCE', 'VWAP', 'CUSTOM'] as const

export default function PlanSemaine() {
  const weekStart = getWeekStart()
  const [plans, setPlans] = useLocalStorage<WeeklyPlan[]>('weekly_plans', [])
  const currentPlan = plans.find((p) => p.weekStart === weekStart)

  const [bias, setBias] = useState<WeeklyPlan['bias']>(currentPlan?.bias ?? 'NEUTRAL')
  const [goals, setGoals] = useState<string[]>(currentPlan?.goals ?? [''])
  const [notes, setNotes] = useState(currentPlan?.notes ?? '')
  const [levels, setLevels] = useState<PriceLevel[]>(currentPlan?.keyLevels ?? [])
  const [newLevel, setNewLevel] = useState({ price: '', type: 'SUPPORT' as PriceLevel['type'], label: '' })

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
    setPlans((prev) => {
      const filtered = prev.filter((p) => p.weekStart !== weekStart)
      return [plan, ...filtered]
    })
  }

  const addLevel = () => {
    if (!newLevel.price) return
    setLevels((prev) => [...prev, { price: Number(newLevel.price), type: newLevel.type, label: newLevel.label || newLevel.type, active: true }])
    setNewLevel({ price: '', type: 'SUPPORT', label: '' })
  }

  const biasColors = {
    BULLISH: 'bg-profit/20 text-profit border-profit/40',
    BEARISH: 'bg-loss/20 text-loss border-loss/40',
    NEUTRAL: 'bg-slate-600/30 text-slate-300 border-slate-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Plan de Semaine</h1>
          <p className="text-slate-400 text-sm mt-1">Semaine du {weekStart}</p>
        </div>
        <button onClick={save} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
          Sauvegarder
        </button>
      </div>

      {/* Bias */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">Biais Hebdomadaire</h2>
        <div className="flex gap-3">
          {(['BULLISH', 'BEARISH', 'NEUTRAL'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBias(b)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                bias === b ? biasColors[b] : 'border-surface-border text-slate-500 hover:text-slate-300'
              }`}
            >
              {b === 'BULLISH' ? '🟢 HAUSSIER' : b === 'BEARISH' ? '🔴 BAISSIER' : '⚪ NEUTRE'}
            </button>
          ))}
        </div>
      </div>

      {/* Niveaux */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">Niveaux Clés</h2>
        <div className="flex gap-2 mb-3 flex-wrap">
          <input
            type="number"
            placeholder="Prix"
            value={newLevel.price}
            onChange={(e) => setNewLevel((n) => ({ ...n, price: e.target.value }))}
            className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white font-mono w-28 focus:outline-none focus:border-brand-500"
          />
          <select
            value={newLevel.type}
            onChange={(e) => setNewLevel((n) => ({ ...n, type: e.target.value as PriceLevel['type'] }))}
            className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
          >
            {LEVEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            placeholder="Label (optionnel)"
            value={newLevel.label}
            onChange={(e) => setNewLevel((n) => ({ ...n, label: e.target.value }))}
            className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white flex-1 focus:outline-none focus:border-brand-500"
          />
          <button onClick={addLevel} className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm">
            + Ajouter
          </button>
        </div>
        {levels.length > 0 ? (
          <div className="space-y-1">
            {levels.map((lvl, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-surface-border/50">
                <span className="font-mono text-white w-24">{lvl.price.toFixed(2)}</span>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{lvl.type}</span>
                <span className="text-slate-400 flex-1">{lvl.label}</span>
                <button onClick={() => setLevels((l) => l.filter((_, j) => j !== i))} className="text-slate-600 hover:text-loss">✕</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm">Aucun niveau ajouté.</p>
        )}
      </div>

      {/* Objectifs */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">Objectifs de la Semaine</h2>
        <div className="space-y-2">
          {goals.map((goal, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-slate-500 mt-2.5 text-sm">→</span>
              <input
                value={goal}
                onChange={(e) => setGoals((g) => g.map((v, j) => (j === i ? e.target.value : v)))}
                placeholder={`Objectif ${i + 1}`}
                className="flex-1 bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          ))}
          <button onClick={() => setGoals((g) => [...g, ''])} className="text-brand-400 hover:text-brand-300 text-sm">
            + Ajouter un objectif
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5">
        <h2 className="font-semibold text-white mb-3">Notes & Analyse</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Contexte macro, événements à surveiller, observations chart..."
          className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
        />
      </div>
    </div>
  )
}
