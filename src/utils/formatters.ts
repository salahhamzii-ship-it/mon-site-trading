export function formatCurrency(value: number, decimals = 2): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : value > 0 ? '+' : ''
  return `${sign}$${abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
}

export function formatPoints(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)} pts`
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function pnlColor(value: number): string {
  if (value > 0) return 'text-profit'
  if (value < 0) return 'text-loss'
  return 'text-slate-400'
}

export function pnlBgColor(value: number): string {
  if (value > 0) return 'bg-profit/10 border-profit/30'
  if (value < 0) return 'bg-loss/10 border-loss/30'
  return 'bg-slate-700/30 border-slate-600'
}
