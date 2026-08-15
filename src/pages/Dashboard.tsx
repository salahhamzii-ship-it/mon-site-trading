import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { SessionSignals, ALNPattern, Inventory, AVWAPBias, IBClass, GEXBias, OTFDirection, SessionClassification } from '../types/methode'

// ─── Badge helpers ─────────────────────────────────────────────────────────────

function PatternBadge({ pattern }: { pattern: ALNPattern }) {
  const map: Record<string, { label: string; cls: string }> = {
    P1: { label: 'P1 — Engulf Total', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
    P2: { label: 'P2 — Inside Asia', cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
    P3: { label: 'P3 — Haussier', cls: 'bg-profit/20 text-profit border-profit/40' },
    P4: { label: 'P4 — Baissier', cls: 'bg-loss/20 text-loss border-loss/40' },
    MIXTE: { label: 'MIXTE', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  }
  if (!pattern) return <span className="px-2 py-1 rounded border border-slate-600 text-slate-500 text-xs">—</span>
  const { label, cls } = map[pattern] ?? { label: pattern, cls: '' }
  return <span className={`px-2 py-1 rounded border text-xs font-bold ${cls}`}>{label}</span>
}

function InventoryBadge({ inv }: { inv: Inventory }) {
  const cls = inv === 'LONG' ? 'text-profit' : inv === 'SHORT' ? 'text-loss' : 'text-slate-400'
  return <span className={`font-bold ${cls}`}>{inv}</span>
}

function AVWAPBadge({ bias }: { bias: AVWAPBias }) {
  if (bias === 'ABOVE') return <span className="text-profit font-bold">↑ ABOVE</span>
  if (bias === 'BELOW') return <span className="text-loss font-bold">↓ BELOW</span>
  return <span className="text-yellow-400 font-bold">~ AT</span>
}

function IBBadge({ cls }: { cls: IBClass | null }) {
  if (!cls) return <span className="text-slate-500">—</span>
  if (cls === 'BULLISH') return <span className="text-profit font-bold">BULLISH</span>
  if (cls === 'BEARISH') return <span className="text-loss font-bold">BEARISH</span>
  return <span className="text-yellow-400 font-bold">MITIGÉ</span>
}

function GEXBadge({ bias }: { bias: GEXBias | null }) {
  if (!bias) return <span className="text-slate-500">—</span>
  if (bias === 'SUPPORT') return <span className="text-profit font-bold">SUPPORT</span>
  if (bias === 'RESISTANCE') return <span className="text-loss font-bold">RÉSISTANCE</span>
  return <span className="text-slate-400 font-bold">NEUTRE</span>
}

function OTFBadge({ otf }: { otf: OTFDirection }) {
  if (otf === 'HIGHER') return <span className="text-profit font-bold">↑ OTF HIGHER</span>
  if (otf === 'LOWER') return <span className="text-loss font-bold">↓ OTF LOWER</span>
  return <span className="text-slate-400 font-bold">~ NEUTRAL</span>
}

function ClassifBadge({ cls }: { cls: SessionClassification }) {
  if (cls === 'ROTATIONNEL_85') return <span className="text-yellow-300 font-bold">85% ROTATIONNEL</span>
  if (cls === 'TREND_DAY_15') return <span className="text-profit font-bold">15% TREND DAY</span>
  return <span className="text-slate-400 font-bold">INDÉTERMINÉ</span>
}

// ─── Signal card ───────────────────────────────────────────────────────────────

function SignalCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="text-base">{children}</div>
    </div>
  )
}

// ─── Demo signals ──────────────────────────────────────────────────────────────

const demoSignals: SessionSignals = {
  alnPattern: 'P3',
  alnStats: {
    casseLondonHigh: 80.8,
    casseLondonLow: 44.4,
    casseLesDeuxPct: 25.3,
    ibConfirmation: 100,
    description: 'P3 — London engulf Asia vers le haut. Biais haussier fort.',
    signal: 'LONG privilege. Attendre confirmation IB bullish pour IBGW/IBGP.',
  },
  inventory: 'LONG',
  inventoryPts: 42,
  classification: 'ROTATIONNEL_85',
  ibClass: 'BULLISH',
  gexAttracteur: 21240,
  gexBias: 'SUPPORT',
  avwapBias: 'ABOVE',
  otf: 'HIGHER',
  activeRules: [
    {
      id: 'R3',
      label: 'Règle 3 — Inventaire LONG',
      detail: '+42 pts au-dessus du settle J-1. Biais acheteur.',
      severity: 'HIGH',
      color: 'profit',
    },
    {
      id: 'R4',
      label: 'Règle 4 — AVWAP 18h Chef',
      detail: 'Prix au-dessus AVWAP 18h. Long privilégié.',
      severity: 'HIGH',
      color: 'profit',
    },
    {
      id: 'R6',
      label: 'Règle 6 — P3 signal',
      detail: 'P3 détecté. casseLondonHigh 80.8% — signal fort.',
      severity: 'HIGH',
      color: 'profit',
    },
    {
      id: 'R8',
      label: 'Règle 8 — IB Bullish',
      detail: 'Close B > Mid IB. Attendre extension haussière.',
      severity: 'MEDIUM',
      color: 'profit',
    },
  ],
  scenarios: [
    {
      id: 'S1',
      condition: 'Prix > London High + IB Bullish confirmé',
      action: 'IBGW Long — target VAH J-1 puis GEX attracteur 21 240',
      type: 'LONG',
    },
    {
      id: 'S2',
      condition: 'Pullback sur London High après cassure',
      action: 'IBGP Long — entry close candle de rejet, stop sous London High',
      type: 'LONG',
    },
    {
      id: 'S3',
      condition: 'IB range > 1,5× IB moyen + OTF Higher',
      action: 'Attendre retracement 50% IB — extension long',
      type: 'LONG',
    },
    {
      id: 'S4',
      condition: 'Excess haut en pré-marché avec rejet fort',
      action: 'Règle 13 — Short sur excess haut, stop derrière, cible Mid IB',
      type: 'SHORT',
    },
  ],
  noonCurveSignal: {
    signal: 'AM_HIGH_PM_LOW',
    probability: 82.12,
    description: 'Q2 a cassé Q1 High sans casser Q1 Low → AM High probable. Vendre en PM.',
  },
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [signals] = useState<SessionSignals>(demoSignals)
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const severityBorder = {
    HIGH: 'border-l-profit',
    MEDIUM: 'border-l-yellow-400',
    LOW: 'border-l-slate-500',
  }
  const ruleTextColor = {
    profit: 'text-profit',
    loss: 'text-loss',
    neutral: 'text-slate-400',
    warning: 'text-yellow-400',
  }
  const scenarioColor = {
    LONG: 'bg-profit/10 border-profit/30 text-profit',
    SHORT: 'bg-loss/10 border-loss/30 text-loss',
    FADE: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    WAIT: 'bg-slate-600/10 border-slate-600/30 text-slate-400',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard — Méthode Salah</h1>
          <p className="text-slate-400 text-sm capitalize mt-0.5">{today}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-300 text-xs border border-yellow-500/30">
            DEMO — entrer les données via Analyseur
          </span>
          <Link
            to="/session"
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            Analyser la session →
          </Link>
        </div>
      </div>

      {/* Top signal grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SignalCard label="Pattern ALN">
          <PatternBadge pattern={signals.alnPattern} />
        </SignalCard>
        <SignalCard label="Inventaire OVN">
          <InventoryBadge inv={signals.inventory} />
          <span className="text-slate-400 text-xs ml-1">
            {signals.inventoryPts > 0 ? '+' : ''}{signals.inventoryPts} pts
          </span>
        </SignalCard>
        <SignalCard label="AVWAP 18h (Chef)">
          <AVWAPBadge bias={signals.avwapBias} />
        </SignalCard>
        <SignalCard label="OTF">
          <OTFBadge otf={signals.otf} />
        </SignalCard>
        <SignalCard label="Classification 85/15">
          <ClassifBadge cls={signals.classification} />
        </SignalCard>
        <SignalCard label="IB Classification">
          <IBBadge cls={signals.ibClass} />
        </SignalCard>
        <SignalCard label="GEX Attracteur">
          {signals.gexAttracteur
            ? <span className="font-bold text-brand-300">{signals.gexAttracteur.toLocaleString()}</span>
            : <span className="text-slate-500">—</span>}
        </SignalCard>
        <SignalCard label="GEX Bias">
          <GEXBadge bias={signals.gexBias} />
        </SignalCard>
      </div>

      {/* ALN Stats */}
      {signals.alnStats && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Statistiques ALN — {signals.alnPattern}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-500 text-xs">Casse London High</div>
              <div className="text-profit font-bold text-lg">{signals.alnStats.casseLondonHigh}%</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Casse London Low</div>
              <div className="text-loss font-bold text-lg">{signals.alnStats.casseLondonLow}%</div>
            </div>
            <div>
              <div className="text-slate-500 text-xs">Casse les deux</div>
              <div className="text-yellow-300 font-bold text-lg">{signals.alnStats.casseLesDeuxPct}%</div>
            </div>
            {signals.alnStats.ibConfirmation !== null && (
              <div>
                <div className="text-slate-500 text-xs">Conf. IB P3</div>
                <div className="text-brand-300 font-bold text-lg">{signals.alnStats.ibConfirmation}%</div>
              </div>
            )}
          </div>
          <p className="text-sm text-slate-300 border-t border-surface-border pt-3">{signals.alnStats.description}</p>
          <p className="text-sm text-brand-300 font-medium">{signals.alnStats.signal}</p>
          {signals.alnStats.warning && (
            <p className="text-xs text-yellow-400">{signals.alnStats.warning}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active rules */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Règles actives
          </h2>
          <div className="space-y-2">
            {signals.activeRules.map((rule) => (
              <div
                key={rule.id}
                className={`border-l-2 pl-3 py-1 ${severityBorder[rule.severity]}`}
              >
                <div className={`text-sm font-medium ${ruleTextColor[rule.color]}`}>{rule.label}</div>
                <div className="text-xs text-slate-400">{rule.detail}</div>
              </div>
            ))}
            {signals.activeRules.length === 0 && (
              <p className="text-slate-500 text-sm">Aucune règle active — entrer les données via Analyseur.</p>
            )}
          </div>
        </div>

        {/* Scenarios */}
        <div className="bg-surface-card border border-surface-border rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Scénarios du jour
          </h2>
          <div className="space-y-2">
            {signals.scenarios.map((s) => (
              <div
                key={s.id}
                className={`border rounded-lg px-3 py-2 text-xs ${scenarioColor[s.type]}`}
              >
                <div className="font-bold mb-0.5">{s.type} — {s.condition}</div>
                <div className="opacity-80">{s.action}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Noon Curve */}
      {signals.noonCurveSignal && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Noon Curve Signal
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${
              signals.noonCurveSignal.signal === 'AM_HIGH_PM_LOW'
                ? 'bg-profit/10 border-profit/40 text-profit'
                : signals.noonCurveSignal.signal === 'AM_LOW_PM_HIGH'
                ? 'bg-loss/10 border-loss/40 text-loss'
                : 'bg-slate-600/20 border-slate-500/40 text-slate-400'
            }`}>
              {signals.noonCurveSignal.signal.replace(/_/g, ' ')}
            </span>
            <span className="text-2xl font-bold text-brand-300">
              {signals.noonCurveSignal.probability}%
            </span>
            <p className="text-sm text-slate-400 flex-1">{signals.noonCurveSignal.description}</p>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/session', label: 'Analyser session', icon: '🧮', desc: 'Entrer RTH/OVN/ALN/GEX' },
          { to: '/gex', label: 'GEX Panel', icon: '⚡', desc: 'Options QQQ → NQ niveaux' },
          { to: '/journal', label: 'Journal', icon: '📓', desc: 'Enregistrer un trade' },
          { to: '/bible', label: 'Bible', icon: '📖', desc: '32 règles + Règles 13-26' },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="bg-surface-card border border-surface-border rounded-xl p-4 hover:border-brand-600/40 hover:bg-surface-hover transition-colors"
          >
            <div className="text-2xl mb-1">{link.icon}</div>
            <div className="text-sm font-medium text-white">{link.label}</div>
            <div className="text-xs text-slate-500 mt-0.5">{link.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
