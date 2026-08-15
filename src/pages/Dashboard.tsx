import { StatCard } from '../components/ui/StatCard'
import { useTrades } from '../hooks/useTrades'
import { calcAccountStats } from '../utils/tradeCalc'
import { formatCurrency, formatPercent } from '../utils/formatters'

const STARTING_BALANCE = 50_000

export default function Dashboard() {
  const { trades } = useTrades()
  const stats = calcAccountStats(trades, STARTING_BALANCE)
  const today = new Date().toISOString().slice(0, 10)
  const todayTrades = trades.filter((t) => t.date.startsWith(today))
  const todayPnl = todayTrades.reduce((s, t) => s + t.pnl, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard NQ100</h1>
        <p className="text-slate-400 text-sm mt-1">Vue d'ensemble de ta performance</p>
      </div>

      {/* Compte */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Compte</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Balance"
            value={`$${stats.balance.toLocaleString()}`}
            subValue={`Départ: $${stats.startingBalance.toLocaleString()}`}
            trend={stats.totalPnl >= 0 ? 'up' : 'down'}
            icon="💰"
          />
          <StatCard
            label="P&L Total"
            value={formatCurrency(stats.totalPnl)}
            trend={stats.totalPnl >= 0 ? 'up' : 'down'}
            icon="📈"
          />
          <StatCard
            label="Aujourd'hui"
            value={formatCurrency(todayPnl)}
            subValue={`${todayTrades.length} trade(s)`}
            trend={todayPnl >= 0 ? 'up' : 'down'}
            icon="📅"
          />
          <StatCard
            label="Streak"
            value={`${stats.currentStreak > 0 ? '+' : ''}${stats.currentStreak}`}
            subValue={stats.currentStreak > 0 ? 'Série gagnante' : stats.currentStreak < 0 ? 'Série perdante' : '-'}
            trend={stats.currentStreak > 0 ? 'up' : stats.currentStreak < 0 ? 'down' : 'neutral'}
            icon="🔥"
          />
        </div>
      </section>

      {/* Stats */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Win Rate"
            value={formatPercent(stats.winRate)}
            trend={stats.winRate >= 50 ? 'up' : 'down'}
            icon="🎯"
          />
          <StatCard
            label="Profit Factor"
            value={stats.profitFactor === 999 ? '∞' : stats.profitFactor.toFixed(2)}
            trend={stats.profitFactor >= 1.5 ? 'up' : 'down'}
            icon="⚖️"
          />
          <StatCard
            label="Avg R:R"
            value={`${stats.avgRR.toFixed(2)}R`}
            trend={stats.avgRR >= 1 ? 'up' : 'down'}
            icon="📐"
          />
          <StatCard
            label="Max Drawdown"
            value={formatCurrency(-stats.maxDrawdown)}
            trend="down"
            icon="📉"
          />
        </div>
      </section>

      {/* Derniers trades */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Derniers trades</h2>
        {trades.length === 0 ? (
          <div className="bg-surface-card border border-surface-border rounded-xl p-8 text-center text-slate-500">
            Aucun trade enregistré. Va dans le Journal pour ajouter ton premier trade.
          </div>
        ) : (
          <div className="bg-surface-card border border-surface-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-slate-400 text-xs uppercase">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Setup</th>
                  <th className="text-left p-3">Dir.</th>
                  <th className="text-right p-3">Points</th>
                  <th className="text-right p-3">P&L</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 8).map((t) => (
                  <tr key={t.id} className="border-b border-surface-border/50 hover:bg-surface-hover/30">
                    <td className="p-3 text-slate-400 font-mono text-xs">{t.date.slice(0, 10)}</td>
                    <td className="p-3 text-slate-300">{t.setup}</td>
                    <td className="p-3">
                      <span className={t.direction === 'LONG' ? 'text-profit' : 'text-loss'}>
                        {t.direction}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-mono ${t.pnlPoints >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {t.pnlPoints > 0 ? '+' : ''}{t.pnlPoints.toFixed(2)}
                    </td>
                    <td className={`p-3 text-right font-mono font-semibold ${t.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {t.pnl > 0 ? '+' : ''}${t.pnl.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
