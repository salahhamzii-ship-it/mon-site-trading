import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ALNSession, OVNData, RTHData, IBData, GEXStrike, SessionSignals } from '../types/methode'
import { computeSessionSignals } from '../utils/methodeCalc'

type Step = 'RTH' | 'OVN' | 'ALN' | 'IB' | 'GEX' | 'RESULT'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs text-slate-400 mb-1">{children}</label>
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="number"
      step="0.25"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? '0'}
      className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-600 placeholder-slate-600"
    />
  )
}

function StepHeader({ step, current }: { step: string; current: Step }) {
  const steps: Step[] = ['RTH', 'OVN', 'ALN', 'IB', 'GEX', 'RESULT']
  const idx = steps.indexOf(step as Step)
  const cur = steps.indexOf(current)
  const done = idx < cur
  const active = step === current
  return (
    <div className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
      done ? 'border-profit/30 text-profit bg-profit/10' :
      active ? 'border-brand-600/50 text-brand-300 bg-brand-600/20' :
      'border-surface-border text-slate-500'
    }`}>
      {step}
    </div>
  )
}

const steps: Step[] = ['RTH', 'OVN', 'ALN', 'IB', 'GEX', 'RESULT']

export default function SessionAnalyzer() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('RTH')
  const [signals, setSignals] = useState<SessionSignals | null>(null)

  const [rth, setRth] = useState({ open: '', high: '', low: '', settle: '', vah: '', val: '', poc: '' })
  const [ovn, setOvn] = useState({ currentPrice: '', avwap18h: '', overnightHigh: '', overnightLow: '' })
  const [aln, setAln] = useState({ asiaHigh: '', asiaLow: '', londonHigh: '', londonLow: '' })
  const [ib, setIb] = useState({ high: '', low: '', closeB: '', highFirst: 'true' })
  const [gexRows, setGexRows] = useState([
    { strike: '', callGamma: '', putGamma: '' },
    { strike: '', callGamma: '', putGamma: '' },
    { strike: '', callGamma: '', putGamma: '' },
  ])

  const n = (v: string) => parseFloat(v) || 0

  function compute() {
    const rthData: RTHData = {
      date: new Date().toISOString().slice(0, 10),
      open: n(rth.open), high: n(rth.high), low: n(rth.low),
      settle: n(rth.settle), vah: n(rth.vah), val: n(rth.val), poc: n(rth.poc),
    }
    const ovnData: OVNData = {
      currentPrice: n(ovn.currentPrice), avwap18h: n(ovn.avwap18h),
      overnightHigh: n(ovn.overnightHigh), overnightLow: n(ovn.overnightLow),
    }
    const alnData: ALNSession = {
      asiaHigh: n(aln.asiaHigh), asiaLow: n(aln.asiaLow),
      londonHigh: n(aln.londonHigh), londonLow: n(aln.londonLow),
    }
    const ibData: IBData = {
      high: n(ib.high), low: n(ib.low),
      closeB: n(ib.closeB), highFirst: ib.highFirst === 'true',
    }
    const gexStrikes: GEXStrike[] = gexRows
      .filter((r) => r.strike)
      .map((r) => ({ strike: n(r.strike), callGamma: n(r.callGamma), putGamma: n(r.putGamma) }))

    const result = computeSessionSignals(alnData, ovnData, rthData, ibData, gexStrikes, null, null)
    setSignals(result)
    setStep('RESULT')
  }

  function updateGexRow(i: number, field: string, value: string) {
    setGexRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function addGexRow() {
    setGexRows((r) => [...r, { strike: '', callGamma: '', putGamma: '' }])
  }

  const severityBorder = { HIGH: 'border-l-profit', MEDIUM: 'border-l-yellow-400', LOW: 'border-l-slate-500' }
  const ruleColor = { profit: 'text-profit', loss: 'text-loss', neutral: 'text-slate-400', warning: 'text-yellow-400' }
  const scenarioStyle = {
    LONG: 'bg-profit/10 border-profit/30 text-profit',
    SHORT: 'bg-loss/10 border-loss/30 text-loss',
    FADE: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    WAIT: 'bg-slate-600/10 border-slate-600/30 text-slate-400',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analyseur de session</h1>
        <p className="text-slate-400 text-sm mt-0.5">Entrer les données RTH J-1, OVN, ALN, IB, GEX pour générer les signaux Méthode Salah.</p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 flex-wrap">
        {steps.map((s) => <StepHeader key={s} step={s} current={step} />)}
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl p-6 space-y-4">

        {/* RTH J-1 */}
        {step === 'RTH' && (
          <>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">RTH J-1 — Données Sierra Chart</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Open', 'open'], ['High', 'high'], ['Low', 'low'], ['Settle', 'settle'],
                ['VAH', 'vah'], ['VAL', 'val'], ['POC', 'poc'],
              ].map(([label, key]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input value={rth[key as keyof typeof rth]} onChange={(v) => setRth((r) => ({ ...r, [key]: v }))} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* OVN */}
        {step === 'OVN' && (
          <>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">OVN — Overnight</h2>
            <div className="bg-surface rounded-lg p-3 text-xs text-brand-300 border border-brand-600/20">
              AVWAP 18h = ancré sur l'ouverture Globex 18h00 (Le Chef — règle absolue)
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Prix actuel', 'currentPrice'], ['AVWAP 18h', 'avwap18h'],
                ['OVN High', 'overnightHigh'], ['OVN Low', 'overnightLow'],
              ].map(([label, key]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input value={ovn[key as keyof typeof ovn]} onChange={(v) => setOvn((r) => ({ ...r, [key]: v }))} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* ALN */}
        {step === 'ALN' && (
          <>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">ALN — Asia / London / New York</h2>
            <div className="bg-surface rounded-lg p-3 text-xs text-slate-400 border border-surface-border space-y-1">
              <div>P3 : londonHigh &gt; asiaHigh ET londonLow &gt; asiaLow → Haussier (80.8% casse LH)</div>
              <div>P4 : londonHigh &lt; asiaHigh ET londonLow &lt; asiaLow → Baissier (68.6% casse LL)</div>
              <div>P1 : London englobe Asia → mixte</div>
              <div>P2 : London inside Asia → rotation</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Asia High', 'asiaHigh'], ['Asia Low', 'asiaLow'],
                ['London High', 'londonHigh'], ['London Low', 'londonLow'],
              ].map(([label, key]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input value={aln[key as keyof typeof aln]} onChange={(v) => setAln((r) => ({ ...r, [key]: v }))} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* IB */}
        {step === 'IB' && (
          <>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">IB — Initial Balance (9h30–10h30)</h2>
            <div className="bg-surface rounded-lg p-3 text-xs text-slate-400 border border-surface-border space-y-1">
              <div>BULLISH : close B &gt; mid IB — extension haussière attendue</div>
              <div>BEARISH : close B &lt; mid IB — extension baissière attendue</div>
              <div>MITIGÉ : close B ≈ mid IB (±3% range) — coin flip</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['IB High', 'high'], ['IB Low', 'low'], ['Close B (10h00)', 'closeB']].map(([label, key]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input value={ib[key as keyof typeof ib]} onChange={(v) => setIb((r) => ({ ...r, [key]: v }))} />
                </div>
              ))}
              <div>
                <Label>High avant Low dans l'IB ?</Label>
                <select
                  value={ib.highFirst}
                  onChange={(e) => setIb((r) => ({ ...r, highFirst: e.target.value }))}
                  className="w-full bg-surface border border-surface-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-600"
                >
                  <option value="true">Oui — H fait avant L</option>
                  <option value="false">Non — L fait avant H</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* GEX */}
        {step === 'GEX' && (
          <>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">GEX — Options QQQ</h2>
            <div className="bg-surface rounded-lg p-3 text-xs text-brand-300 border border-brand-600/20">
              Strike QQQ × 40 = NQ équivalent. Max gamma net = attracteur magnétique.
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 px-1">
              <span>Strike QQQ</span><span>Call Gamma ($M)</span><span>Put Gamma ($M)</span>
            </div>
            {gexRows.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-2">
                <Input value={row.strike} onChange={(v) => updateGexRow(i, 'strike', v)} placeholder="450" />
                <Input value={row.callGamma} onChange={(v) => updateGexRow(i, 'callGamma', v)} placeholder="1.2" />
                <Input value={row.putGamma} onChange={(v) => updateGexRow(i, 'putGamma', v)} placeholder="0.8" />
              </div>
            ))}
            <button
              onClick={addGexRow}
              className="text-xs text-brand-400 hover:text-brand-300 underline"
            >
              + Ajouter un strike
            </button>
          </>
        )}

        {/* Results */}
        {step === 'RESULT' && signals && (
          <>
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Résultats — Méthode Salah</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Pattern ALN', signals.alnPattern ?? '—'],
                ['Inventaire', `${signals.inventory} (${signals.inventoryPts > 0 ? '+' : ''}${signals.inventoryPts} pts)`],
                ['AVWAP 18h', signals.avwapBias],
                ['OTF', signals.otf],
                ['85/15', signals.classification],
                ['IB Class', signals.ibClass ?? '—'],
                ['GEX Attracteur', signals.gexAttracteur ? signals.gexAttracteur.toLocaleString() : '—'],
                ['GEX Bias', signals.gexBias ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface rounded-lg p-3">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="text-sm font-bold text-white mt-0.5">{value}</div>
                </div>
              ))}
            </div>

            {signals.alnStats && (
              <div className="bg-surface rounded-lg p-3 space-y-1">
                <div className="text-xs text-slate-500 mb-1">Signal ALN</div>
                <p className="text-sm text-slate-300">{signals.alnStats.description}</p>
                <p className="text-sm text-brand-300 font-medium">{signals.alnStats.signal}</p>
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Règles actives</div>
              {signals.activeRules.map((rule) => (
                <div key={rule.id} className={`border-l-2 pl-3 py-1 ${severityBorder[rule.severity]}`}>
                  <div className={`text-sm font-medium ${ruleColor[rule.color]}`}>{rule.label}</div>
                  <div className="text-xs text-slate-400">{rule.detail}</div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="text-xs text-slate-500 uppercase tracking-wider">Scénarios</div>
              {signals.scenarios.map((s) => (
                <div key={s.id} className={`border rounded-lg px-3 py-2 text-xs ${scenarioStyle[s.type]}`}>
                  <div className="font-bold mb-0.5">{s.type} — {s.condition}</div>
                  <div className="opacity-80">{s.action}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              Voir sur le Dashboard →
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      {step !== 'RESULT' && (
        <div className="flex justify-between">
          <button
            onClick={() => setStep(steps[steps.indexOf(step) - 1])}
            disabled={step === 'RTH'}
            className="px-4 py-2 rounded-lg border border-surface-border text-slate-400 text-sm hover:text-white hover:border-slate-500 disabled:opacity-30 transition-colors"
          >
            ← Retour
          </button>
          {step === 'GEX' ? (
            <button
              onClick={compute}
              className="px-6 py-2 rounded-lg bg-profit hover:bg-profit/80 text-black text-sm font-bold transition-colors"
            >
              Calculer les signaux →
            </button>
          ) : (
            <button
              onClick={() => setStep(steps[steps.indexOf(step) + 1])}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              Suivant →
            </button>
          )}
        </div>
      )}

      {step === 'RESULT' && (
        <button
          onClick={() => { setStep('RTH'); setSignals(null) }}
          className="text-xs text-slate-500 hover:text-slate-300 underline"
        >
          Recommencer une nouvelle session
        </button>
      )}
    </div>
  )
}
