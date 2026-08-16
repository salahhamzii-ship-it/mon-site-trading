interface StatCardProps {
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: string
}

export function StatCard({ label, value, subValue, trend, icon }: StatCardProps) {
  const valueColor =
    trend === 'up'   ? '#34d399' :
    trend === 'down' ? '#ef4444' :
                       '#d8cdb8'

  return (
    <div style={{
      background: '#090d15',
      border: '1px solid rgba(201,168,76,0.16)',
      borderTop: '2px solid #c9a84c',
      borderRadius: 4,
      padding: '10px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 7.5,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: '#7a6a50',
          textTransform: 'uppercase',
        }}>{label}</span>
        {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      </div>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 20,
        fontWeight: 700,
        color: valueColor,
        letterSpacing: '-0.02em',
      }}>{value}</span>
      {subValue && (
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          color: '#7a6a50',
        }}>{subValue}</span>
      )}
    </div>
  )
}
