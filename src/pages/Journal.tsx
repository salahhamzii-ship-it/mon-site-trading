import { useState } from 'react'
import { useTrades } from '../hooks/useTrades'
import { calcPnl } from '../utils/tradeCalc'
import { formatCurrency } from '../utils/formatters'
import type { Trade, SetupType, SessionType } from '../types'

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const defaultForm = {
  symbol: 'MNQ' as 'NQ' | 'MNQ',
  direction: 'LONG' as 'LONG' | 'SHORT',
  entry: '',
  exit: '',
  stopLoss: '',
  takeProfit: '',
  contracts: '1',
  setup: 'FVG' as SetupType,
  session: 'NEW_YORK_AM' as SessionType,
  notes: '',
}

export default function Journal() {
  const { trades, addTrade, deleteTrade } = useTrades()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const base = {
      id: uid(),
      date: new Date().toISOString(),
      symbol: form.symbol,
      direction: form.direction,
      entry: Number(form.entry),
      exit: Number(form.exit),
      stopLoss: Number(form.stopLoss),
      takeProfit: Number(form.takeProfit),
      contracts: Number(form.contracts),
      setup: form.setup,
      session: form.session,
      notes: form.notes,
      tags: [],
      emotions: { preTradeScore: 3 as const, postTradeScore: 3 as const, fomo: false, revenge: false, overConfident: false },
    }
    const { pnl, pnlPoints } = calcPnl(base)
    addTrade({ ...base, pnl, pnlPoints })
    setForm(defaultForm)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Journal de Trading</h1>
          <p className="text-slate-400 text-sm mt-1">{trades.length} trade(s) enregistré(s)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Nouveau trade
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-white">Ajouter un trade</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Symbole', field: 'symbol', options: ['NQ', 'MNQ'] },
              { label: 'Direction', field: 'direction', options: ['LONG', 'SHORT'] },
              { label: 'Session', field: 'session', options: ['ASIA', 'LONDON', 'NEW_YORK_AM', 'NEW_YORK_PM', 'OVERNIGHT'] },
              { label: 'Setup', field: 'setup', options: ['ICT_BPR', 'FVG', 'OB', 'BREAKER', 'LIQUIDITY_SWEEP', 'OPENING_RANGE', 'REJECTION', 'OTHER'] },
            ].map(({ label, field, options }) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">{label}</span>
                <select
                  value={(form as Record<string, string>)[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
            {[
              { label: 'Entrée', field: 'entry' },
              { label: 'Sortie', field: 'exit' },
              { label: 'Stop Loss', field: 'stopLoss' },
              { label: 'Take Profit', field: 'takeProfit' },
              { label: 'Contrats', field: 'contracts' },
            ].map(({ label, field }) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-xs text-slate-400">{label}</span>
                <input
                  type="number"
                  step="0.25"
                  value={(form as Record<string, string>)[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                  className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand-500"
                  required
                />
              </label>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-400">Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
            />
          </label>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium">
              Enregistrer
            </button>
          </div>
        </form>
      )}

      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {trades.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Aucun trade. Clique sur "+ Nouveau trade".</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-slate-400 text-xs uppercase">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Symbole</th>
                <th className="text-left p-3">Setup</th>
                <th className="text-left p-3">Dir.</th>
                <th className="text-right p-3">Entrée</th>
                <th className="text-right p-3">Sortie</th>
                <th className="text-right p-3">Points</th>
                <th className="text-right p-3">P&L</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t: Trade) => (
                <tr key={t.id} className="border-b border-surface-border/50 hover:bg-surface-hover/20">
                  <td className="p-3 text-slate-400 font-mono text-xs">{t.date.slice(0, 10)}</td>
                  <td className="p-3 text-slate-300">{t.symbol}</td>
                  <td className="p-3 text-slate-400 text-xs">{t.setup}</td>
                  <td className="p-3"><span className={t.direction === 'LONG' ? 'text-profit' : 'text-loss'}>{t.direction}</span></td>
                  <td className="p-3 text-right font-mono">{t.entry.toFixed(2)}</td>
                  <td className="p-3 text-right font-mono">{t.exit.toFixed(2)}</td>
                  <td className={`p-3 text-right font-mono ${t.pnlPoints >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {t.pnlPoints > 0 ? '+' : ''}{t.pnlPoints.toFixed(2)}
                  </td>
                  <td className={`p-3 text-right font-mono font-semibold ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatCurrency(t.pnl)}
                  </td>
                  <td className="p-3">
                    <button onClick={() => deleteTrade(t.id)} className="text-slate-600 hover:text-loss text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
