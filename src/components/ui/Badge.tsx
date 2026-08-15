interface BadgeProps {
  label: string
  variant?: 'default' | 'profit' | 'loss' | 'neutral' | 'brand'
}

const variantClasses = {
  default: 'bg-slate-700 text-slate-200',
  profit: 'bg-profit/20 text-profit border border-profit/30',
  loss: 'bg-loss/20 text-loss border border-loss/30',
  neutral: 'bg-slate-600/30 text-slate-300 border border-slate-600',
  brand: 'bg-brand-600/20 text-brand-300 border border-brand-600/30',
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]}`}>
      {label}
    </span>
  )
}
