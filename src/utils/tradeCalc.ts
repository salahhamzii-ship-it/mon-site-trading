import type { Trade, DailyStats, AccountStats } from '../types'

const NQ_TICK_VALUE = 5   // $5 per point per contract (MNQ = $0.5)
const MNQ_TICK_VALUE = 0.5

export function calcPnl(trade: Omit<Trade, 'pnl' | 'pnlPoints'>): { pnl: number; pnlPoints: number } {
  const direction = trade.direction === 'LONG' ? 1 : -1
  const pnlPoints = (trade.exit - trade.entry) * direction
  const tickValue = trade.symbol === 'NQ' ? NQ_TICK_VALUE : MNQ_TICK_VALUE
  const pnl = pnlPoints * tickValue * trade.contracts
  return { pnl, pnlPoints }
}

export function calcWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0
  const winners = trades.filter((t) => t.pnl > 0).length
  return (winners / trades.length) * 100
}

export function calcProfitFactor(trades: Trade[]): number {
  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0))
  if (grossLoss === 0) return grossProfit > 0 ? 999 : 0
  return grossProfit / grossLoss
}

export function calcMaxDrawdown(trades: Trade[]): number {
  let peak = 0
  let running = 0
  let maxDD = 0
  for (const t of trades) {
    running += t.pnl
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  }
  return maxDD
}

export function calcDailyStats(trades: Trade[], date: string): DailyStats {
  const dayTrades = trades.filter((t) => t.date.startsWith(date))
  const winners = dayTrades.filter((t) => t.pnl > 0)
  const losers = dayTrades.filter((t) => t.pnl < 0)
  const avgWin = winners.length ? winners.reduce((s, t) => s + t.pnl, 0) / winners.length : 0
  const avgLoss = losers.length ? losers.reduce((s, t) => s + t.pnl, 0) / losers.length : 0

  return {
    date,
    totalPnl: dayTrades.reduce((s, t) => s + t.pnl, 0),
    totalTrades: dayTrades.length,
    winners: winners.length,
    losers: losers.length,
    winRate: calcWinRate(dayTrades),
    avgWin,
    avgLoss,
    profitFactor: calcProfitFactor(dayTrades),
    maxDrawdown: calcMaxDrawdown(dayTrades),
  }
}

export function calcAccountStats(trades: Trade[], startingBalance: number): AccountStats {
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0)
  const winners = trades.filter((t) => t.pnl > 0)
  const losers = trades.filter((t) => t.pnl < 0)

  const rrValues = trades.map((t) => {
    const riskPoints = Math.abs(t.entry - t.stopLoss)
    if (riskPoints === 0) return 0
    return Math.abs(t.pnlPoints) / riskPoints * (t.pnl > 0 ? 1 : -1)
  })
  const avgRR = rrValues.length ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0

  const dailyPnls = new Map<string, number>()
  for (const t of trades) {
    const day = t.date.slice(0, 10)
    dailyPnls.set(day, (dailyPnls.get(day) ?? 0) + t.pnl)
  }
  const dailyArr = Array.from(dailyPnls.values())
  const bestDay = dailyArr.length ? Math.max(...dailyArr) : 0
  const worstDay = dailyArr.length ? Math.min(...dailyArr) : 0

  let streak = 0
  for (let i = trades.length - 1; i >= 0; i--) {
    const isWin = trades[i].pnl > 0
    if (i === trades.length - 1) { streak = isWin ? 1 : -1; continue }
    if (isWin && streak > 0) streak++
    else if (!isWin && streak < 0) streak--
    else break
  }

  return {
    balance: startingBalance + totalPnl,
    startingBalance,
    totalPnl,
    winRate: calcWinRate(trades),
    profitFactor: calcProfitFactor(trades),
    totalTrades: trades.length,
    avgRR,
    maxDrawdown: calcMaxDrawdown(trades),
    currentStreak: streak,
    bestDay,
    worstDay,
  }
}
