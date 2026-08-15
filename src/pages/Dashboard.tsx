import { useEffect, useRef, useState, useMemo } from 'react'
import {
  Chart,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LineController,
  Filler,
} from 'chart.js'
import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial'
import 'chartjs-adapter-date-fns'
import { TRADES } from '../data/tradesData'
import { calcAccountStats } from '../utils/tradeCalc'
import { formatCurrency, formatPercent } from '../utils/formatters'
import type { Trade } from '../types'

Chart.register(
  LinearScale, TimeScale, Tooltip, Legend,
  LineElement, PointElement, LineController, Filler,
  CandlestickController, CandlestickElement,
)

// ─── Constantes ───────────────────────────────────────────────────────────────

const STARTING_BALANCE = 50_000

type ViewMode = 'equity' | 'candles'
type Period   = '1M' | '3M' | 'ALL'

const PERIODS: Period[] = ['1M', '3M', 'ALL']

// ─── Indicateurs techniques ───────────────────────────────────────────────────

function calcSMA(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null
    return values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period
  })
}

function calcRSI(values: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null)
  if (values.length < period + 1) return result

  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1]
    if (d > 0) avgGain += d; else avgLoss += Math.abs(d)
  }
  avgGain /= period; avgLoss /= period

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result[period] = 100 - 100 / (1 + rs)

  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1]
    const gain = d > 0 ? d : 0
    const loss = d < 0 ? Math.abs(d) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    result[i] = 100 - 100 / (1 + (avgLoss === 0 ? 100 : avgGain / avgLoss))
  }
  return result
}

function calcEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = Array(values.length).fill(null)
  if (values.length < period) return result
  const k = 2 / (period + 1)
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  result[period - 1] = ema
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k)
    result[i] = ema
  }
  return result
}

function calcMACD(values: number[]) {
  const ema12 = calcEMA(values, 12)
  const ema26 = calcEMA(values, 26)
  const macd  = values.map((_, i) => {
    const a = ema12[i], b = ema26[i]
    return a !== null && b !== null ? a - b : null
  })
  const signal = calcEMA(macd.map(v => v ?? 0), 9).map((v, i) =>
    macd[i] !== null ? v : null,
  )
  const hist = macd.map((m, i) => {
    const s = signal[i]
    return m !== null && s !== null ? m - s : null
  })
  return { macd, signal, hist }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function filterByPeriod(trades: Trade[], period: Period): Trade[] {
  const now  = new Date()
  const from = new Date(now)
  if (period === '1M') from.setMonth(from.getMonth() - 1)
  else if (period === '3M') from.setMonth(from.getMonth() - 3)
  else return [...trades]
  return trades.filter(t => new Date(t.date) >= from)
}

/** Série de prix d'entrée ordonnée → base des indicateurs techniques */
function priceSeriesFrom(trades: Trade[]): number[] {
  return trades.map(t => t.entry)
}

/** Courbe d'équité : solde cumulé après chaque trade */
function equityCurve(trades: Trade[], startBalance: number) {
  let balance = startBalance
  return trades.map(t => {
    balance += t.pnl
    return { x: new Date(t.date).getTime(), y: +balance.toFixed(2) }
  })
}

/** Chaque trade → bougie OHLC (entry=open, exit=close, SL=low/high, TP=high/low) */
function tradesToCandles(trades: Trade[]) {
  return trades.map(t => {
    const isLong = t.direction === 'LONG'
    return {
      x: new Date(t.date).getTime(),
      o: t.entry,
      c: t.exit,
      h: isLong ? Math.max(t.exit, t.takeProfit, t.entry) : Math.max(t.entry, t.stopLoss),
      l: isLong ? Math.min(t.entry, t.stopLoss)           : Math.min(t.exit, t.takeProfit, t.entry),
    }
  })
}

// ─── Sous-composants UI ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, trend }: {
  label: string; value: string; sub?: string; trend?: 'up' | 'down' | 'neutral'
}) {
  const color = trend === 'up' ? 'text-profit-light' : trend === 'down' ? 'text-loss-light' : 'text-slate-300'
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-mono">{label}</div>
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5 font-mono">{sub}</div>}
    </div>
  )
}

function RSIGauge({ value }: { value: number | null }) {
  const val   = value ?? 50
  const pct   = Math.min(100, Math.max(0, val))
  const color = val >= 70 ? '#ef4444' : val <= 30 ? '#22c55e' : '#94a3b8'
  const label = val >= 70 ? 'OVERBOUGHT' : val <= 30 ? 'OVERSOLD' : 'NEUTRAL'
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="text-[10px] text-slate-500 mb-3 font-mono uppercase tracking-wider">RSI (14)</div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl font-mono font-bold" style={{ color }}>{val.toFixed(1)}</span>
        <span className="text-[10px] px-2 py-0.5 rounded font-mono" style={{ background: `${color}20`, color }}>{label}</span>
      </div>
      <div className="relative h-2 bg-surface-hover rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="h-full bg-profit-light/30" style={{ width: '30%' }} />
          <div className="h-full bg-slate-600/30"   style={{ width: '40%' }} />
          <div className="h-full bg-loss-light/30"  style={{ width: '30%' }} />
        </div>
        <div className="absolute top-0 h-full w-0.5 -translate-x-1/2 rounded"
             style={{ left: `${pct}%`, background: color }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
        <span>0</span><span>30</span><span>70</span><span>100</span>
      </div>
    </div>
  )
}

function MACDPanel({ macd, signal, hist }: { macd: number | null; signal: number | null; hist: number | null }) {
  const hColor  = (hist ?? 0) >= 0 ? '#16a34a' : '#ef4444'
  const cross   = macd !== null && signal !== null
    ? (macd > signal ? 'BULLISH' : 'BEARISH') : '--'
  const cColor  = cross === 'BULLISH' ? '#22c55e' : cross === 'BEARISH' ? '#ef4444' : '#94a3b8'
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="text-[10px] text-slate-500 mb-3 font-mono uppercase tracking-wider">MACD (12,26,9)</div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        {([['MACD', macd, '#38bdf8'], ['SIGNAL', signal, '#f59e0b'], ['HIST', hist, hColor]] as const).map(
          ([lbl, val, col]) => (
            <div key={lbl} className="text-center">
              <div className="text-[10px] text-slate-600 mb-1 font-mono">{lbl}</div>
              <div className="font-mono font-semibold text-sm" style={{ color: col }}>
                {val !== null ? (val > 0 ? '+' : '') + val.toFixed(2) : '--'}
              </div>
            </div>
          ))}
      </div>
      <div className="pt-2 border-t border-surface-border/50 flex items-center justify-between">
        <span className="text-[10px] text-slate-600 font-mono">CROSS</span>
        <span className="text-xs font-mono font-semibold" style={{ color: cColor }}>{cross}</span>
      </div>
    </div>
  )
}

function SMAPanel({ prices, lastPrice }: { prices: number[]; lastPrice: number }) {
  const sma20  = calcSMA(prices, 20).findLast(v => v !== null) ?? null
  const sma50  = calcSMA(prices, 50).findLast(v => v !== null) ?? null
  const sma200 = calcSMA(prices, 200).findLast(v => v !== null) ?? null

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="text-[10px] text-slate-500 mb-3 font-mono uppercase tracking-wider">Moving Averages</div>
      <div className="space-y-2">
        {([['SMA 20', sma20], ['SMA 50', sma50], ['SMA 200', sma200]] as const).map(([lbl, val]) => {
          const above = val !== null && lastPrice > val
          const diff  = val !== null ? (lastPrice - val) / val * 100 : null
          return (
            <div key={lbl} className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono w-16">{lbl}</span>
              <span className="text-xs font-mono text-slate-300">
                {val !== null ? val.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '--'}
              </span>
              {diff !== null ? (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${above
                  ? 'bg-profit-light/10 text-profit-light'
                  : 'bg-loss-light/10 text-loss-light'}`}>
                  {above ? '▲' : '▼'} {Math.abs(diff).toFixed(2)}%
                </span>
              ) : <span className="text-[10px] text-slate-600">--</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Graphique courbe d'équité ─────────────────────────────────────────────

function EquityChart({ points }: { points: { x: number; y: number }[] }) {
  const ref  = useRef<HTMLCanvasElement>(null)
  const inst = useRef<Chart | null>(null)

  useEffect(() => {
    if (!ref.current || !points.length) return
    inst.current?.destroy()

    const startY  = points[0]?.y ?? STARTING_BALANCE
    const gradient = ref.current.getContext('2d')!.createLinearGradient(0, 0, 0, 300)
    gradient.addColorStop(0, 'rgba(14,165,233,0.25)')
    gradient.addColorStop(1, 'rgba(14,165,233,0)')

    inst.current = new Chart(ref.current, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Équité',
          data: points,
          borderColor: '#0ea5e9',
          borderWidth: 2,
          backgroundColor: gradient,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: points.map(p =>
            p.y >= (points[points.indexOf(p) - 1]?.y ?? startY) ? '#22c55e' : '#ef4444',
          ),
          pointBorderColor: 'transparent',
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#e2e8f0',
            titleFont: { family: 'JetBrains Mono, monospace', size: 11 },
            bodyFont:  { family: 'JetBrains Mono, monospace', size: 11 },
            callbacks: {
              title: ([ctx]) => new Date(ctx.parsed.x).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', year: 'numeric',
              }),
              label: (ctx) => `Équité : $${ctx.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            },
          },
        },
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'dd/MM/yyyy' },
            grid:  { color: '#1e293b' },
            ticks: { color: '#475569', font: { family: 'JetBrains Mono, monospace', size: 10 }, maxTicksLimit: 8 },
          },
          y: {
            position: 'right',
            grid:  { color: '#1e293b' },
            ticks: {
              color: '#475569',
              font:  { family: 'JetBrains Mono, monospace', size: 10 },
              callback: v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
            },
          },
        },
      },
    })
    return () => { inst.current?.destroy(); inst.current = null }
  }, [points])

  return <canvas ref={ref} />
}

// ─── Graphique bougies trades ──────────────────────────────────────────────

function TradesCandleChart({ candles }: {
  candles: { x: number; o: number; h: number; l: number; c: number }[]
}) {
  const ref  = useRef<HTMLCanvasElement>(null)
  const inst = useRef<Chart | null>(null)

  useEffect(() => {
    if (!ref.current || !candles.length) return
    inst.current?.destroy()

    inst.current = new Chart(ref.current, {
      type: 'candlestick',
      data: {
        datasets: [{
          type: 'candlestick' as const,
          label: 'Trades',
          data: candles,
          color: { up: '#22c55e', down: '#ef4444', unchanged: '#94a3b8' } as never,
          borderColor: { up: '#16a34a', down: '#dc2626', unchanged: '#64748b' } as never,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#e2e8f0',
            titleFont: { family: 'JetBrains Mono, monospace', size: 11 },
            bodyFont:  { family: 'JetBrains Mono, monospace', size: 11 },
            callbacks: {
              title: ([ctx]) => new Date((ctx.raw as { x: number }).x).toLocaleDateString('fr-FR'),
              label: (ctx) => {
                const r = ctx.raw as { o: number; h: number; l: number; c: number }
                const pnl = (r.c - r.o) * 5
                return [
                  `Entrée  : ${r.o.toFixed(2)}`,
                  `Sortie  : ${r.c.toFixed(2)}`,
                  `Écart   : ${(r.c - r.o > 0 ? '+' : '') + (r.c - r.o).toFixed(2)} pts`,
                  `P&L est.: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(0)}`,
                ]
              },
            },
          },
        },
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'dd/MM/yyyy HH:mm' },
            grid:  { color: '#1e293b' },
            ticks: { color: '#475569', font: { family: 'JetBrains Mono, monospace', size: 10 }, maxTicksLimit: 10 },
          },
          y: {
            position: 'right',
            grid:  { color: '#1e293b' },
            ticks: {
              color: '#475569',
              font:  { family: 'JetBrains Mono, monospace', size: 10 },
              callback: v => Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 }),
            },
          },
        },
      },
    })
    return () => { inst.current?.destroy(); inst.current = null }
  }, [candles])

  return <canvas ref={ref} />
}

// ─── Tableau des derniers trades ───────────────────────────────────────────

function TradeRow({ t }: { t: Trade }) {
  const isWin = t.pnl > 0
  const setup = t.setup.replace(/_/g, ' ')
  return (
    <tr className="border-b border-surface-border/40 hover:bg-surface-hover/20 transition-colors">
      <td className="p-3 text-slate-400 font-mono text-xs whitespace-nowrap">
        {new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
        {' '}
        <span className="text-slate-600">{new Date(t.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
      </td>
      <td className="p-3">
        <span className={`text-xs font-mono font-semibold ${t.direction === 'LONG' ? 'text-profit-light' : 'text-loss-light'}`}>
          {t.direction}
        </span>
      </td>
      <td className="p-3 text-slate-400 text-xs font-mono">{t.symbol}</td>
      <td className="p-3 text-slate-300 text-xs">{setup}</td>
      <td className="p-3 text-right font-mono text-xs text-slate-400">
        {t.entry.toFixed(2)} → {t.exit.toFixed(2)}
      </td>
      <td className={`p-3 text-right font-mono text-xs font-semibold ${isWin ? 'text-profit-light' : 'text-loss-light'}`}>
        {t.pnlPoints > 0 ? '+' : ''}{t.pnlPoints.toFixed(2)} pts
      </td>
      <td className={`p-3 text-right font-mono text-sm font-bold ${isWin ? 'text-profit-light' : 'text-loss-light'}`}>
        {t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(0)}
      </td>
      <td className="p-3 text-center">
        {isWin
          ? <span className="text-[10px] bg-profit-light/10 text-profit-light px-1.5 py-0.5 rounded font-mono">WIN</span>
          : <span className="text-[10px] bg-loss-light/10 text-loss-light px-1.5 py-0.5 rounded font-mono">LOSS</span>}
      </td>
    </tr>
  )
}

// ─── Dashboard principal ───────────────────────────────────────────────────

export default function Dashboard() {
  const [period,   setPeriod]   = useState<Period>('ALL')
  const [viewMode, setViewMode] = useState<ViewMode>('equity')

  const trades = useMemo(() => {
    const sorted = [...TRADES].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    return filterByPeriod(sorted, period)
  }, [period])

  const stats   = useMemo(() => calcAccountStats(trades, STARTING_BALANCE), [trades])
  const prices  = useMemo(() => priceSeriesFrom(trades), [trades])
  const equity  = useMemo(() => equityCurve(trades, STARTING_BALANCE), [trades])
  const candles = useMemo(() => tradesToCandles(trades), [trades])

  const rsiValues  = useMemo(() => calcRSI(prices), [prices])
  const currentRSI = rsiValues.findLast(v => v !== null) ?? null
  const { macd, signal, hist } = useMemo(() => calcMACD(prices), [prices])
  const lastPrice  = prices[prices.length - 1] ?? 0

  const todayStr   = new Date().toISOString().slice(0, 10)
  const todayTrades = trades.filter(t => t.date.startsWith(todayStr))
  const todayPnl    = todayTrades.reduce((s, t) => s + t.pnl, 0)

  return (
    <div className="min-h-screen bg-surface text-white font-sans px-4 py-6 max-w-screen-xl mx-auto">

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboard NQ100</h1>
          <p className="text-slate-500 text-xs mt-0.5">{trades.length} trades · balance départ ${STARTING_BALANCE.toLocaleString()}</p>
        </div>

        {/* Sélecteur de période */}
        <div className="flex gap-1 bg-surface-card border border-surface-border rounded-lg p-1">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                period === p ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <StatCard label="Balance"     value={`$${stats.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          sub={`${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(0)}`}
          trend={stats.totalPnl >= 0 ? 'up' : 'down'} />
        <StatCard label="Aujourd'hui" value={formatCurrency(todayPnl, 0)}
          sub={`${todayTrades.length} trade(s)`}
          trend={todayPnl >= 0 ? 'up' : 'down'} />
        <StatCard label="Win Rate"    value={formatPercent(stats.winRate)}
          trend={stats.winRate >= 50 ? 'up' : 'down'} />
        <StatCard label="Profit F."   value={stats.profitFactor >= 999 ? '∞' : stats.profitFactor.toFixed(2)}
          trend={stats.profitFactor >= 1.5 ? 'up' : 'down'} />
        <StatCard label="Avg R:R"     value={`${stats.avgRR.toFixed(2)}R`}
          trend={stats.avgRR >= 1 ? 'up' : 'down'} />
        <StatCard label="Max DD"      value={formatCurrency(-stats.maxDrawdown, 0)} trend="down" />
        <StatCard label="Trades"      value={String(stats.totalTrades)} trend="neutral" />
        <StatCard label="Streak"
          value={`${stats.currentStreak > 0 ? '+' : ''}${stats.currentStreak}`}
          sub={stats.currentStreak > 0 ? 'Gagnante' : stats.currentStreak < 0 ? 'Perdante' : '-'}
          trend={stats.currentStreak > 0 ? 'up' : stats.currentStreak < 0 ? 'down' : 'neutral'} />
      </div>

      {/* Toggle vue graphique */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setViewMode('equity')}
          className={`px-4 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
            viewMode === 'equity'
              ? 'bg-brand-600/20 border-brand-500/50 text-brand-300'
              : 'bg-surface-card border-surface-border text-slate-400 hover:text-white'
          }`}>
          Courbe d'équité
        </button>
        <button onClick={() => setViewMode('candles')}
          className={`px-4 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
            viewMode === 'candles'
              ? 'bg-brand-600/20 border-brand-500/50 text-brand-300'
              : 'bg-surface-card border-surface-border text-slate-400 hover:text-white'
          }`}>
          Bougies par trade
        </button>
        <span className="ml-auto text-xs font-mono text-slate-500 self-center">
          {trades.length > 0
            ? `${new Date(trades[0].date).toLocaleDateString('fr-FR')} → ${new Date(trades[trades.length - 1].date).toLocaleDateString('fr-FR')}`
            : 'Aucun trade'}
        </span>
      </div>

      {/* Graphique principal */}
      <div className="bg-surface-card border border-surface-border rounded-xl mb-4 overflow-hidden">
        <div className="relative h-[400px] p-3">
          {trades.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-mono">
              Aucun trade sur cette période.
            </div>
          ) : viewMode === 'equity' ? (
            <EquityChart points={equity} />
          ) : (
            <TradesCandleChart candles={candles} />
          )}
        </div>
        {viewMode === 'candles' && (
          <div className="px-4 pb-3 flex gap-4 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-profit-light inline-block" /> Long (gagnant)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-loss-light inline-block" /> Short ou perdant</span>
            <span className="text-slate-600">Chaque bougie = 1 trade · Ombre haute = TP · Ombre basse = SL</span>
          </div>
        )}
      </div>

      {/* Indicateurs techniques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <RSIGauge value={currentRSI} />
        <MACDPanel
          macd={macd.findLast(v => v !== null) ?? null}
          signal={signal.findLast(v => v !== null) ?? null}
          hist={hist.findLast(v => v !== null) ?? null}
        />
        <SMAPanel prices={prices} lastPrice={lastPrice} />
      </div>

      {/* Tableau des trades */}
      <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Trades récents</span>
          <span className="text-[10px] font-mono text-slate-600">{trades.length} trades affichés</span>
        </div>
        {trades.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm font-mono">
            Aucun trade sur cette période. Ajoute tes trades dans <code className="text-brand-400">src/data/tradesData.ts</code>.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-slate-500 text-[10px] uppercase font-mono tracking-wider">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Dir.</th>
                  <th className="text-left p-3">Sym.</th>
                  <th className="text-left p-3">Setup</th>
                  <th className="text-right p-3">Entrée → Sortie</th>
                  <th className="text-right p-3">Points</th>
                  <th className="text-right p-3">P&L</th>
                  <th className="text-center p-3">Résultat</th>
                </tr>
              </thead>
              <tbody>
                {[...trades].reverse().map(t => <TradeRow key={t.id} t={t} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
