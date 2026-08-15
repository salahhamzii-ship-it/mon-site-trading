import { useTrades } from '../hooks/useTrades'
import { calcAccountStats, calcDailyStats } from '../utils/tradeCalc'
import { formatCurrency, formatPercent } from '../utils/formatters'
import { StatCard } from '../components/ui/StatCard'

const STARTING_BALANCE = 50_000

export default function Stats() {
  const { trades } = useTrades()
  const stats = calcAccountStats(trades, STARTING_BALANCE)

  const uniqueDays = [...new Set(trades.map((t) => t.date.slice(0, 10)))].sort().reverse()
  const dailyStats = uniqueDays.map((d) => calcDailyStats(trades, d))

  const setupStats = trades.reduce<Record<string, { count: number; pnl: number; wins: number }>>((acc, t) => {
    if (!acc[t.setup]) acc[t.setup] = { count: 0, pnl: 0, wins: 0 }
    acc[t.setup].count++
    acc[t.setup].pnl += t.pnl
    if (t.pnl > 0) acc[t.setup].wins++
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Statistiques</h1>
        <p className="text-slate-400 text-sm mt-1">Analyse détaillée de ta performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Trades" value={String(stats.totalTrades)} icon="📊" trend="neutral" />
        <StatCard label="Win Rate" value={formatPercent(stats.winRate)} trend={stats.winRate >= 50 ? 'up' : 'down'} icon="🎯" />
        <StatCard label="Profit Factor" value={stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)} trend={stats.profitFactor >= 1.5 ? 'up' : 'down'} icon="⚖️" />
        <StatCard label="Avg RR" value={`${stats.avgRR.toFixed(2)}R`} trend={stats.avgRR >= 1 ? 'up' : 'down'} icon="📐" />
        <StatCard label="Best Day" value={formatCurrency(stats.bestDay)} trend="up" icon="🏆" />
        <StatCard label="Worst Day" value={formatCurrency(stats.worstDay)} trend="down" icon="💥" />
        <StatCard label="Max Drawdown" value={formatCurrency(-stats.maxDrawdown)} trend="down" icon="📉" />
        <StatCard label="P&L Net" value={formatCurrency(stats.totalPnl)} trend={stats.totalPnl >= 0 ? 'up' : 'down'} icon="💰" />
      </div>

      {/* Stats par setup */}
      {Object.keys(setupStats).length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Performance par Setup</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase border-b border-surface-border">
                <th className="text-left pb-2">Setup</th>
                <th className="text-right pb-2">Trades</th>
                <th className="text-right pb-2">Win%</th>
                <th className="text-right pb-2">P&L</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(setupStats).map(([setup, data]) => (
                <tr key={setup} className="border-b border-surface-border/50">
                  <td className="py-2 text-slate-300">{setup}</td>
                  <td className="py-2 text-right text-slate-400">{data.count}</td>
                  <td className={`py-2 text-right font-mono ${(data.wins / data.count) >= 0.5 ? 'text-profit' : 'text-loss'}`}>
                    {formatPercent((data.wins / data.count) * 100)}
                  </td>
                  <td className={`py-2 text-right font-mono font-semibold ${data.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatCurrency(data.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stats journalières */}
      {dailyStats.length > 0 && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Historique Journalier</h2>
          <div className="space-y-2">
            {dailyStats.slice(0, 14).map((d) => (
              <div key={d.date} className="flex items-center gap-4 py-2 border-b border-surface-border/50 text-sm">
                <span className="text-slate-400 font-mono w-24 text-xs">{d.date}</span>
                <span className="text-slate-400 text-xs w-16">{d.totalTrades} trade(s)</span>
                <div className="flex-1 flex gap-2 text-xs">
                  <span className="text-profit">{d.winners}W</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-loss">{d.losers}L</span>
                </div>
                <span className={`font-mono font-semibold w-24 text-right ${d.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatCurrency(d.totalPnl)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {trades.length === 0 && (
        <div className="bg-surface-card border border-surface-border rounded-xl p-10 text-center text-slate-500">
          Aucun trade. Commence par ajouter des trades dans le Journal.
        </div>
      )}
    </div>
  )
}
