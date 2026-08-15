import { useState } from 'react'
import type { SalahTrade, ALNPattern, SalahSetup, IBClass } from '../types/methode'
import { calcNQPnl } from '../utils/methodeCalc'

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const ALN_PATTERNS: ALNPattern[] = ['P1', 'P2', 'P3', 'P4', 'MIXTE', null]
const SETUPS: SalahSetup[] = [
  'EXCESS_REJET', 'IBGW', 'IBGP', 'XTFD', 'STRUCTURE_CLEANUP',
  'POST_TREND_DAY', 'COUNTER_AUCTION', 'P3_AM', 'P4_FADE', 'GEX_ATTRACTEUR', 'OTHER',
]
const SESSIONS = ['ASIA', 'LONDON', 'NEW_YORK_AM', 'NEW_YORK_PM', 'OVERNIGHT'] as const
const IB_CLASSES: (IBClass | '')[] = ['', 'BULLISH', 'BEARISH', 'MITIGE']

const defaultForm = {
  symbol: 'MNQ' as 'NQ' | 'MNQ',
  direction: 'LONG' as 'LONG' | 'SHORT',
  entry: '',
  exit: '',
  stopLoss: '',
  takeProfit: '',
  contracts: '1',
  setup: 'EXCESS_REJET' as SalahSetup,
  session: 'NEW_YORK_AM' as typeof SESSIONS[number],
  alnPattern: null as ALNPattern,
  ibClass: '' as IBClass | '',
  excessLevel: '',
  riskPts: '',
  stopOTF: false,
  emotionPre: '3' as string,
  emotionPost: '3' as string,
  fomo: false,
  revenge: false,
  respectStop: true,
  notes: '',
  tags: '',
}

function EmotionPicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(String(n))}
            className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
              value === String(n)
                ? n <= 2 ? 'bg-loss text-white' : n >= 4 ? 'bg-profit text-black' : 'bg-yellow-500 text-black'
                : 'bg-surface border border-surface-border text-slate-400 hover:text-white'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

function NumInput({ value, onChange, placeholder, step = '0.25' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; step?: string
}) {
  return (
    <input
      type="number"
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand-600"
    />
  )
}

export default function Journal() {
  const [trades, setTrades] = useState<SalahTrade[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)
  const [filter, setFilter] = useState<'ALL' | 'LONG' | 'SHORT' | 'WIN' | 'LOSS'>('ALL')

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = (s: string) => parseFloat(s) || 0
    const { pnl, pnlPoints } = calcNQPnl(
      form.direction, n(form.entry), n(form.exit), n(form.contracts), form.symbol
    )
    const trade: SalahTrade = {
      id: uid(),
      date: new Date().toISOString().slice(0, 10),
      symbol: form.symbol,
      direction: form.direction,
      entry: n(form.entry),
      exit: n(form.exit),
      stopLoss: n(form.stopLoss),
      takeProfit: n(form.takeProfit),
      contracts: n(form.contracts),
      pnl,
      pnlPoints,
      alnPattern: form.alnPattern,
      setup: form.setup,
      session: form.session,
      ibClass: (form.ibClass || undefined) as IBClass | undefined,
      excessLevel: form.excessLevel ? n(form.excessLevel) : undefined,
      riskPts: form.riskPts ? n(form.riskPts) : undefined,
      stopOTF: form.stopOTF,
      ratio: form.riskPts && form.exit && form.entry
        ? Math.abs(n(form.exit) - n(form.entry)) / n(form.riskPts)
        : undefined,
      emotionPre: parseInt(form.emotionPre) as 1 | 2 | 3 | 4 | 5,
      emotionPost: parseInt(form.emotionPost) as 1 | 2 | 3 | 4 | 5,
      fomo: form.fomo,
      revenge: form.revenge,
      respectStop: form.respectStop,
      notes: form.notes,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }
    setTrades((prev) => [trade, ...prev])
    setForm(defaultForm)
    setShowForm(false)
  }

  const filtered = trades.filter((t) => {
    if (filter === 'LONG') return t.direction === 'LONG'
    if (filter === 'SHORT') return t.direction === 'SHORT'
    if (filter === 'WIN') return t.pnl >= 0
    if (filter === 'LOSS') return t.pnl < 0
    return true
  })

  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
  const wins = trades.filter((t) => t.pnl >= 0).length
  const winRate = trades.length ? ((wins / trades.length) * 100).toFixed(1) : '—'
  const avgRatio = trades.filter((t) => t.ratio).reduce((s, t, _, a) => s + (t.ratio ?? 0) / a.length, 0)

  const setupLabel: Partial<Record<SalahSetup, string>> = {
    EXCESS_REJET: 'Excess Rejet',
    IBGW: 'IBGW',
    IBGP: 'IBGP',
    XTFD: 'XTFD',
    STRUCTURE_CLEANUP: 'Structure',
    POST_TREND_DAY: 'Post TD',
    COUNTER_AUCTION: '65% Counter',
    P3_AM: 'P3 AM',
    P4_FADE: 'P4 Fade',
    GEX_ATTRACTEUR: 'GEX Attr.',
    OTHER: 'Autre',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Journal — Méthode Salah</h1>
          <p className="text-slate-400 text-sm mt-0.5">{trades.length} trade(s) enregistré(s)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Nouveau trade
        </button>
      </div>

      {/* Stats bar */}
      {trades.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'P&L Total', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)}`, cls: totalPnl >= 0 ? 'text-profit' : 'text-loss' },
            { label: 'Win Rate', value: `${winRate}%`, cls: 'text-white' },
            { label: 'Trades', value: `${wins}W / ${trades.length - wins}L`, cls: 'text-white' },
            { label: 'Ratio Moy.', value: avgRatio ? `${avgRatio.toFixed(2)}:1` : '—', cls: 'text-white' },
          ].map((s) => (
            <div key={s.label} className="bg-surface-card border border-surface-border rounded-xl p-3">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className={`text-lg font-bold mt-0.5 ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-5">
          <h2 className="font-semibold text-white">Nouveau trade — Méthode Salah</h2>

          {/* Base fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Symbole</label>
              <select value={form.symbol} onChange={(e) => set('symbol', e.target.value as 'NQ' | 'MNQ')}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
                <option>NQ</option><option>MNQ</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Direction</label>
              <select value={form.direction} onChange={(e) => set('direction', e.target.value as 'LONG' | 'SHORT')}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
                <option>LONG</option><option>SHORT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Session</label>
              <select value={form.session} onChange={(e) => set('session', e.target.value as typeof form.session)}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
                {SESSIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Contrats</label>
              <NumInput value={form.contracts} onChange={(v) => set('contracts', v)} step="1" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Entrée</label>
              <NumInput value={form.entry} onChange={(v) => set('entry', v)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sortie</label>
              <NumInput value={form.exit} onChange={(v) => set('exit', v)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Stop Loss</label>
              <NumInput value={form.stopLoss} onChange={(v) => set('stopLoss', v)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Take Profit</label>
              <NumInput value={form.takeProfit} onChange={(v) => set('takeProfit', v)} />
            </div>
          </div>

          {/* Méthode Salah fields */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-surface-border pt-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Setup (Bible)</label>
              <select value={form.setup} onChange={(e) => set('setup', e.target.value as SalahSetup)}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
                {SETUPS.map((s) => <option key={s} value={s}>{setupLabel[s] ?? s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pattern ALN</label>
              <select value={form.alnPattern ?? ''} onChange={(e) => set('alnPattern', (e.target.value || null) as ALNPattern)}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
                <option value="">—</option>
                {ALN_PATTERNS.filter(Boolean).map((p) => <option key={p!} value={p!}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">IB Class</label>
              <select value={form.ibClass} onChange={(e) => set('ibClass', e.target.value as IBClass | '')}
                className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600">
                {IB_CLASSES.map((c) => <option key={String(c)} value={c}>{c || '—'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Risk Pts</label>
              <NumInput value={form.riskPts} onChange={(v) => set('riskPts', v)} placeholder="ex: 12" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Niveau Excess</label>
              <NumInput value={form.excessLevel} onChange={(v) => set('excessLevel', v)} />
            </div>
            <div className="flex flex-col justify-center gap-2 pt-3">
              {[
                { key: 'stopOTF', label: 'Stop OTF' },
                { key: 'fomo', label: 'FOMO' },
                { key: 'revenge', label: 'Revenge' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key as 'fomo' | 'revenge' | 'stopOTF']}
                    onChange={(e) => set(key as 'fomo', e.target.checked)}
                    className="accent-brand-500"
                  />
                  {label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.respectStop}
                  onChange={(e) => set('respectStop', e.target.checked)}
                  className="accent-profit"
                />
                Respect du stop
              </label>
            </div>
          </div>

          {/* Emotions */}
          <div className="grid grid-cols-2 gap-4 border-t border-surface-border pt-4">
            <EmotionPicker value={form.emotionPre} onChange={(v) => set('emotionPre', v)} label="Émotion pré-trade (1=peur, 5=confiant)" />
            <EmotionPicker value={form.emotionPost} onChange={(v) => set('emotionPost', v)} label="Émotion post-trade (1=frustration, 5=calme)" />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Contexte, raison d'entrée, ce qui s'est passé…"
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tags (séparés par virgule)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="ex: bien executé, news day, patience"
              className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-600"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">
              Annuler
            </button>
            <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-sm font-medium">
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      {trades.length > 0 && (
        <div className="flex gap-2">
          {(['ALL', 'LONG', 'SHORT', 'WIN', 'LOSS'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                filter === f
                  ? 'bg-brand-600/30 text-brand-300 border-brand-600/50'
                  : 'border-surface-border text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Trades table */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            {trades.length === 0 ? 'Aucun trade. Cliquer sur "+ Nouveau trade".' : 'Aucun trade pour ce filtre.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-surface-border text-slate-400 text-xs uppercase">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Sym.</th>
                  <th className="text-left p-3">Setup</th>
                  <th className="text-left p-3">ALN</th>
                  <th className="text-left p-3">Dir.</th>
                  <th className="text-right p-3">Entrée</th>
                  <th className="text-right p-3">Sortie</th>
                  <th className="text-right p-3">Risk</th>
                  <th className="text-right p-3">Ratio</th>
                  <th className="text-right p-3">Points</th>
                  <th className="text-right p-3">P&L</th>
                  <th className="text-center p-3">Emo</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-surface-border/50 hover:bg-surface-hover/20">
                    <td className="p-3 text-slate-400 font-mono text-xs">{t.date}</td>
                    <td className="p-3 text-slate-300 text-xs">{t.symbol}</td>
                    <td className="p-3 text-xs text-slate-400">{setupLabel[t.setup] ?? t.setup}</td>
                    <td className="p-3 text-xs">
                      {t.alnPattern && (
                        <span className={`font-bold ${
                          t.alnPattern === 'P3' ? 'text-profit' :
                          t.alnPattern === 'P4' ? 'text-loss' : 'text-yellow-300'
                        }`}>{t.alnPattern}</span>
                      ) || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3">
                      <span className={t.direction === 'LONG' ? 'text-profit font-bold text-xs' : 'text-loss font-bold text-xs'}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-xs">{t.entry.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-xs">{t.exit?.toFixed(2) ?? '—'}</td>
                    <td className="p-3 text-right text-xs text-slate-400">{t.riskPts ? `${t.riskPts}pt` : '—'}</td>
                    <td className={`p-3 text-right text-xs font-medium ${t.ratio && t.ratio >= 2 ? 'text-profit' : 'text-slate-400'}`}>
                      {t.ratio ? `${t.ratio.toFixed(1)}:1` : '—'}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs ${t.pnlPoints >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {t.pnlPoints > 0 ? '+' : ''}{t.pnlPoints.toFixed(1)}
                    </td>
                    <td className={`p-3 text-right font-mono text-xs font-semibold ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(0)}
                    </td>
                    <td className="p-3 text-center text-xs">
                      <span title={`Pré: ${t.emotionPre} | Post: ${t.emotionPost}${t.fomo ? ' | FOMO' : ''}${t.revenge ? ' | Revenge' : ''}`}>
                        {t.emotionPre}/{t.emotionPost}
                        {(!t.respectStop || t.fomo || t.revenge) && <span className="text-yellow-400 ml-1">⚠</span>}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => setTrades((prev) => prev.filter((x) => x.id !== t.id))}
                        className="text-slate-600 hover:text-loss text-xs"
                      >✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
