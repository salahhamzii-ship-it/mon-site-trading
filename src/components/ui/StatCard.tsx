interface StatCardProps {
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: string
}

export function StatCard({ label, value, subValue, trend, icon }: StatCardProps) {
  const trendColor =
    trend === 'up' ? 'text-profit' : trend === 'down' ? 'text-loss' : 'text-slate-400'

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4 flex flex-col gap-1 hover:border-brand-500/40 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <span className={`text-2xl font-bold font-mono ${trendColor}`}>{value}</span>
      {subValue && <span className="text-xs text-slate-500">{subValue}</span>}
    </div>
  )
}
