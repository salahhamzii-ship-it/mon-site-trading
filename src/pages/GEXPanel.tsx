import { useState } from 'react'
import type { GEXStrike, GEXAnalysis } from '../types/methode'
import { analyzeGEX } from '../utils/methodeCalc'

interface GEXSession {
  date: string
  avwap18h: number
  currentPrice: number
  strikes: GEXStrike[]
  analysis: GEXAnalysis | null
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      step="0.25"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? '0'}
      className="w-full bg-surface border border-surface-border rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-600 placeholder-slate-600"
    />
  )
}

const n = (v: string) => parseFloat(v) || 0

export default function GEXPanel() {
  const [sessions, setSessions] = useState<GEXSession[]>([])
  const [avwap, setAvwap] = useState('')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState([
    { strike: '', callGamma: '', putGamma: '' },
    { strike: '', callGamma: '', putGamma: '' },
    { strike: '', callGamma: '', putGamma: '' },
    { strike: '', callGamma: '', putGamma: '' },
    { strike: '', callGamma: '', putGamma: '' },
  ])

  function updateRow(i: number, field: string, v: string) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: v } : row))
  }

  function addRow() {
    setRows((r) => [...r, { strike: '', callGamma: '', putGamma: '' }])
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i))
  }

  function analyzeSession() {
    const strikes: GEXStrike[] = rows
      .filter((r) => r.strike)
      .map((r) => ({ strike: n(r.strike), callGamma: n(r.callGamma), putGamma: n(r.putGamma) }))

    const analysis = analyzeGEX(strikes, n(avwap), n(price))
    const session: GEXSession = {
      date,
      avwap18h: n(avwap),
      currentPrice: n(price),
      strikes,
      analysis,
    }
    setSessions((prev) => [session, ...prev])
    // Reset for next session
    setRows([
      { strike: '', callGamma: '', putGamma: '' },
      { strike: '', callGamma: '', putGamma: '' },
      { strike: '', callGamma: '', putGamma: '' },
      { strike: '', callGamma: '', putGamma: '' },
      { strike: '', callGamma: '', putGamma: '' },
    ])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">GEX Panel</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Options QQQ → niveaux NQ. Strike QQQ × 40 = équivalent NQ.
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-surface-card border border-brand-600/20 rounded-xl p-4 text-sm text-slate-300 space-y-1">
        <div className="text-brand-300 font-medium mb-1">Règles GEX — Méthode Salah</div>
        <div>• Max gamma net (|call − put| max) = attracteur magnétique NQ</div>
        <div>• Call Wall = strike max call gamma × 40 → résistance</div>
        <div>• Put Wall = strike max put gamma × 40 → support</div>
        <div>• Si prix entre Put Wall et Call Wall → zone neutre GEX (pas de trade directionnel)</div>
        <div>• GEX positif fort = market maker hedge → compression volatilité</div>
      </div>

      {/* Entry form */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Nouvelle session</h2>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-brand-600"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Prix NQ actuel</label>
            <Input value={price} onChange={setPrice} placeholder="21000" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">AVWAP 18h (NQ)</label>
            <Input value={avwap} onChange={setAvwap} placeholder="20980" />
          </div>
        </div>

        {/* Strikes table */}
        <div>
          <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 px-1 mb-1">
            <span>Strike QQQ</span>
            <span>Call Gamma ($M)</span>
            <span>Put Gamma ($M)</span>
            <span>NQ equiv.</span>
          </div>
          <div className="space-y-1.5">
            {rows.map((row, i) => {
              const nqEquiv = row.strike ? (n(row.strike) * 40).toLocaleString() : '—'
              return (
                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                  <Input value={row.strike} onChange={(v) => updateRow(i, 'strike', v)} placeholder="450" />
                  <Input value={row.callGamma} onChange={(v) => updateRow(i, 'callGamma', v)} placeholder="1.2" />
                  <Input value={row.putGamma} onChange={(v) => updateRow(i, 'putGamma', v)} placeholder="0.8" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-300">{nqEquiv}</span>
                    {rows.length > 2 && (
                      <button onClick={() => removeRow(i)} className="text-slate-600 hover:text-loss text-xs">×</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={addRow} className="mt-2 text-xs text-brand-400 hover:text-brand-300 underline">
            + Ajouter un strike
          </button>
        </div>

        <button
          onClick={analyzeSession}
          className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
        >
          Analyser les niveaux GEX
        </button>
      </div>

      {/* Session results */}
      {sessions.map((session, idx) => (
        <div key={idx} className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              Session — {new Date(session.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <span className="text-xs text-slate-500">
              NQ {session.currentPrice.toLocaleString()} | AVWAP {session.avwap18h.toLocaleString()}
            </span>
          </div>

          {session.analysis ? (
            <>
              {/* Key levels */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Attracteur GEX', value: session.analysis.attracteur.toLocaleString(), cls: 'text-brand-300' },
                  { label: 'Call Wall (Résistance)', value: session.analysis.callWall.toLocaleString(), cls: 'text-loss' },
                  { label: 'Put Wall (Support)', value: session.analysis.putWall.toLocaleString(), cls: 'text-profit' },
                  { label: 'Zone Haute', value: session.analysis.zoneHaute.toLocaleString(), cls: 'text-yellow-300' },
                  { label: 'Zone Basse', value: session.analysis.zoneBasse.toLocaleString(), cls: 'text-yellow-300' },
                  { label: 'Écart AVWAP', value: `${session.analysis.ecartAvwap > 0 ? '+' : ''}${session.analysis.ecartAvwap} pts`, cls: session.analysis.ecartAvwap >= 0 ? 'text-profit' : 'text-loss' },
                ].map((item) => (
                  <div key={item.label} className="bg-surface rounded-lg p-3">
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className={`text-base font-bold mt-0.5 ${item.cls}`}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* GEX Bias */}
              <div className={`rounded-lg px-4 py-3 border text-sm font-medium ${
                session.analysis.bias === 'SUPPORT'
                  ? 'bg-profit/10 border-profit/30 text-profit'
                  : session.analysis.bias === 'RESISTANCE'
                  ? 'bg-loss/10 border-loss/30 text-loss'
                  : 'bg-slate-600/10 border-slate-600/30 text-slate-400'
              }`}>
                GEX Bias : {session.analysis.bias} — attracteur {session.analysis.attracteur.toLocaleString()}
                {session.analysis.bias === 'SUPPORT' && ' → biais haussier, prix cherche à monter vers attracteur'}
                {session.analysis.bias === 'RESISTANCE' && ' → biais baissier, prix cherche à descendre vers attracteur'}
                {session.analysis.bias === 'NEUTRE' && ' → prix entre Put Wall et Call Wall, range GEX'}
              </div>

              {/* Strikes table */}
              <div>
                <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Strikes saisis</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-surface-border">
                        <th className="text-left py-1.5 pr-4">Strike QQQ</th>
                        <th className="text-right py-1.5 pr-4">NQ equiv.</th>
                        <th className="text-right py-1.5 pr-4">Call Γ ($M)</th>
                        <th className="text-right py-1.5 pr-4">Put Γ ($M)</th>
                        <th className="text-right py-1.5">Net Γ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.strikes.map((s, i) => {
                        const net = s.callGamma - s.putGamma
                        return (
                          <tr key={i} className="border-b border-surface-border/50">
                            <td className="py-1.5 pr-4 text-white font-mono">{s.strike}</td>
                            <td className="py-1.5 pr-4 text-right text-brand-300 font-mono">{(s.strike * 40).toLocaleString()}</td>
                            <td className="py-1.5 pr-4 text-right text-profit">{s.callGamma.toFixed(2)}</td>
                            <td className="py-1.5 pr-4 text-right text-loss">{s.putGamma.toFixed(2)}</td>
                            <td className={`py-1.5 text-right font-bold ${net >= 0 ? 'text-profit' : 'text-loss'}`}>
                              {net >= 0 ? '+' : ''}{net.toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">Données insuffisantes pour analyser.</p>
          )}
        </div>
      ))}

      {sessions.length === 0 && (
        <div className="text-center py-16 text-slate-600">
          <div className="text-4xl mb-3">⚡</div>
          <div className="text-sm">Entrer les strikes QQQ et cliquer sur Analyser</div>
        </div>
      )}
    </div>
  )
}
