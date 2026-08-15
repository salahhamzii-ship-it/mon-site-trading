import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react'
import axios from 'axios'
import {
  Chart,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LineController,
} from 'chart.js'
import {
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement,
} from 'chartjs-chart-financial'
import 'chartjs-adapter-date-fns'

Chart.register(
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LineController,
  CandlestickController,
  CandlestickElement,
  OhlcController,
  OhlcElement,
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface Candle {
  x: number   // timestamp ms
  o: number
  h: number
  l: number
  c: number
}

type Interval = '1m' | '5m' | '15m' | '1h' | '1d'

// ─── Constants ────────────────────────────────────────────────────────────────

const INTERVALS: { label: string; value: Interval; range: string }[] = [
  { label: '1m',  value: '1m',  range: '1d'  },
  { label: '5m',  value: '5m',  range: '5d'  },
  { label: '15m', value: '15m', range: '5d'  },
  { label: '1h',  value: '1h',  range: '60d' },
  { label: '1D',  value: '1d',  range: '1y'  },
]

const SYMBOL = 'NQ=F'

// ─── Indicator math ───────────────────────────────────────────────────────────

function calcSMA(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null
    const slice = closes.slice(i - period + 1, i + 1)
    return slice.reduce((a, b) => a + b, 0) / period
  })
}

function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = Array(closes.length).fill(null)
  if (closes.length < period + 1) return result

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1]
    if (delta > 0) avgGain += delta
    else avgLoss += Math.abs(delta)
  }
  avgGain /= period
  avgLoss /= period

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  result[period] = 100 - 100 / (1 + rs)

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1]
    const gain = delta > 0 ? delta : 0
    const loss = delta < 0 ? Math.abs(delta) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    const r = avgLoss === 0 ? 100 : avgGain / avgLoss
    result[i] = 100 - 100 / (1 + r)
  }
  return result
}

function calcEMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = Array(closes.length).fill(null)
  if (closes.length < period) return result
  const k = 2 / (period + 1)

  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
  result[period - 1] = ema

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k)
    result[i] = ema
  }
  return result
}

function calcMACD(closes: number[]): {
  macd: (number | null)[]
  signal: (number | null)[]
  hist: (number | null)[]
} {
  const ema12 = calcEMA(closes, 12)
  const ema26 = calcEMA(closes, 26)

  const macd: (number | null)[] = closes.map((_, i) => {
    const a = ema12[i]
    const b = ema26[i]
    return a !== null && b !== null ? a - b : null
  })

  const macdValues = macd.map((v) => v ?? 0)
  const rawSignal = calcEMA(macdValues, 9)
  const signal: (number | null)[] = rawSignal.map((v, i) =>
    macd[i] !== null ? v : null,
  )

  const hist: (number | null)[] = macd.map((m, i) => {
    const s = signal[i]
    return m !== null && s !== null ? m - s : null
  })

  return { macd, signal, hist }
}

// ─── Demo data fallback ───────────────────────────────────────────────────────

function generateDemoCandles(count = 200): Candle[] {
  const candles: Candle[] = []
  const now = Date.now()
  let price = 21800 + Math.random() * 400

  for (let i = count; i >= 0; i--) {
    const ts = now - i * 5 * 60 * 1000
    const open = price + (Math.random() - 0.5) * 20
    const volatility = 15 + Math.random() * 25
    const close = open + (Math.random() - 0.48) * volatility
    const high = Math.max(open, close) + Math.random() * volatility * 0.5
    const low  = Math.min(open, close) - Math.random() * volatility * 0.5
    candles.push({ x: ts, o: +open.toFixed(2), h: +high.toFixed(2), l: +low.toFixed(2), c: +close.toFixed(2) })
    price = close
  }
  return candles
}

// ─── Yahoo Finance fetch ──────────────────────────────────────────────────────

async function fetchCandles(interval: Interval, range: string): Promise<Candle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(SYMBOL)}?interval=${interval}&range=${range}&includePrePost=false`
  const { data } = await axios.get(url, {
    headers: { 'Accept': 'application/json' },
    timeout: 10_000,
  })

  const result = data?.chart?.result?.[0]
  if (!result) throw new Error('No data')

  const timestamps: number[]  = result.timestamp
  const ohlcv = result.indicators.quote[0]

  return timestamps.map((t: number, i: number) => ({
    x: t * 1000,
    o: +ohlcv.open[i]?.toFixed(2)  ?? 0,
    h: +ohlcv.high[i]?.toFixed(2)  ?? 0,
    l: +ohlcv.low[i]?.toFixed(2)   ?? 0,
    c: +ohlcv.close[i]?.toFixed(2) ?? 0,
  })).filter((c: Candle) => c.o && c.h && c.l && c.c)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriceTicker({ candles, isDemo }: { candles: Candle[]; isDemo: boolean }) {
  if (!candles.length) return null

  const last  = candles[candles.length - 1]
  const prev  = candles[candles.length - 2]
  const change = prev ? last.c - prev.c : 0
  const pct    = prev ? (change / prev.c) * 100 : 0
  const up     = change >= 0

  const firstClose = candles[0].c
  const dayChange  = last.c - firstClose
  const dayPct     = (dayChange / firstClose) * 100

  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      <div>
        <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
          NQ100 FUTURES (NQ=F)
          {isDemo && (
            <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-mono">
              DEMO
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl font-mono font-bold ${up ? 'text-profit-light' : 'text-loss-light'}`}>
            {last.c.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <div className={`flex items-center gap-1 text-sm font-mono ${up ? 'text-profit-light' : 'text-loss-light'}`}>
            <span>{up ? '▲' : '▼'}</span>
            <span>{Math.abs(change).toFixed(2)}</span>
            <span>({up ? '+' : ''}{pct.toFixed(2)}%)</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 text-xs font-mono ml-auto text-slate-400">
        {[
          ['OPEN',  candles[0].o],
          ['HIGH',  Math.max(...candles.map(c => c.h))],
          ['LOW',   Math.min(...candles.map(c => c.l))],
        ].map(([label, val]) => (
          <div key={label as string} className="text-center">
            <div className="text-slate-600 mb-0.5">{label}</div>
            <div className="text-slate-300">{(val as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        ))}
        <div className="text-center">
          <div className="text-slate-600 mb-0.5">DAY</div>
          <div className={dayChange >= 0 ? 'text-profit-light' : 'text-loss-light'}>
            {dayChange >= 0 ? '+' : ''}{dayPct.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  )
}

function RSIGauge({ value }: { value: number | null }) {
  const val = value ?? 50
  const pct = Math.min(100, Math.max(0, val))
  const color = val >= 70 ? '#ef4444' : val <= 30 ? '#22c55e' : '#94a3b8'
  const label = val >= 70 ? 'OVERBOUGHT' : val <= 30 ? 'OVERSOLD' : 'NEUTRAL'

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-3 font-mono uppercase tracking-wider">RSI (14)</div>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl font-mono font-bold" style={{ color }}>{val.toFixed(1)}</span>
        <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ background: `${color}20`, color }}>{label}</span>
      </div>
      <div className="relative h-2 bg-surface-hover rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          <div className="h-full bg-profit-light/30" style={{ width: '30%' }} />
          <div className="h-full bg-slate-600/30" style={{ width: '40%' }} />
          <div className="h-full bg-loss-light/30"   style={{ width: '30%' }} />
        </div>
        <div
          className="absolute top-0 h-full w-0.5 -translate-x-1/2 rounded"
          style={{ left: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
        <span>0</span><span>30</span><span>70</span><span>100</span>
      </div>
    </div>
  )
}

interface MACDValues { macd: number | null; signal: number | null; hist: number | null }

function MACDPanel({ values }: { values: MACDValues }) {
  const { macd, signal, hist } = values
  const histColor = (hist ?? 0) >= 0 ? '#16a34a' : '#ef4444'
  const cross = macd !== null && signal !== null
    ? macd > signal ? 'BULLISH' : 'BEARISH'
    : '--'
  const crossColor = cross === 'BULLISH' ? '#22c55e' : cross === 'BEARISH' ? '#ef4444' : '#94a3b8'

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-3 font-mono uppercase tracking-wider">MACD (12,26,9)</div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'MACD',   val: macd,   color: '#38bdf8' },
          { label: 'SIGNAL', val: signal, color: '#f59e0b' },
          { label: 'HIST',   val: hist,   color: histColor  },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center">
            <div className="text-[10px] text-slate-600 mb-1 font-mono">{label}</div>
            <div className="font-mono font-semibold text-sm" style={{ color }}>
              {val !== null ? (val > 0 ? '+' : '') + val.toFixed(2) : '--'}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-surface-border/50 flex items-center justify-between">
        <span className="text-[10px] text-slate-600 font-mono">CROSS</span>
        <span className="text-xs font-mono font-semibold" style={{ color: crossColor }}>{cross}</span>
      </div>
    </div>
  )
}

function SMAPanel({ closes, candles }: { closes: number[]; candles: Candle[] }) {
  const last   = candles.length ? candles[candles.length - 1].c : 0
  const sma20  = calcSMA(closes, 20).findLast(v => v !== null) ?? null
  const sma50  = calcSMA(closes, 50).findLast(v => v !== null) ?? null
  const sma200 = calcSMA(closes, 200).findLast(v => v !== null) ?? null

  const rows = [
    { label: 'SMA 20',  val: sma20 },
    { label: 'SMA 50',  val: sma50 },
    { label: 'SMA 200', val: sma200 },
  ]

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-3 font-mono uppercase tracking-wider">Moving Averages</div>
      <div className="space-y-2">
        {rows.map(({ label, val }) => {
          const above = val !== null && last > val
          const diff  = val !== null ? ((last - val) / val * 100) : null
          return (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono w-16">{label}</span>
              <span className="text-xs font-mono text-slate-300">
                {val !== null ? val.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '--'}
              </span>
              {diff !== null ? (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${above ? 'bg-profit-light/10 text-profit-light' : 'bg-loss-light/10 text-loss-light'}`}>
                  {above ? '▲' : '▼'} {Math.abs(diff).toFixed(2)}%
                </span>
              ) : (
                <span className="text-[10px] text-slate-600">--</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main chart ───────────────────────────────────────────────────────────────

function CandlestickChart({
  candles,
  closes,
  showSMA,
}: {
  candles: Candle[]
  closes: number[]
  showSMA: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current || !candles.length) return

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const sma20  = calcSMA(closes, 20)
    const sma50  = calcSMA(closes, 50)
    const times  = candles.map(c => c.x)

    const smaDs = showSMA ? [
      {
        type: 'line' as const,
        label: 'SMA 20',
        data: times.map((x, i) => ({ x, y: sma20[i] })),
        borderColor: '#f59e0b',
        borderWidth: 1.2,
        pointRadius: 0,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'SMA 50',
        data: times.map((x, i) => ({ x, y: sma50[i] })),
        borderColor: '#818cf8',
        borderWidth: 1.2,
        pointRadius: 0,
        tension: 0.3,
        spanGaps: true,
        yAxisID: 'y',
      },
    ] : []

    chartRef.current = new Chart(canvasRef.current, {
      type: 'candlestick',
      data: {
        datasets: [
          {
            type: 'candlestick' as const,
            label: 'NQ100',
            data: candles,
            color: {
              up:   '#22c55e',
              down: '#ef4444',
              unchanged: '#94a3b8',
            } as never,
            borderColor: {
              up:   '#16a34a',
              down: '#dc2626',
              unchanged: '#64748b',
            } as never,
          },
          ...smaDs,
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: showSMA,
            labels: {
              color: '#94a3b8',
              font: { family: 'JetBrains Mono, monospace', size: 11 },
              boxWidth: 20,
              padding: 12,
            },
          },
          tooltip: {
            backgroundColor: '#1e293b',
            borderColor: '#334155',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#e2e8f0',
            titleFont: { family: 'JetBrains Mono, monospace', size: 11 },
            bodyFont:  { family: 'JetBrains Mono, monospace', size: 11 },
            callbacks: {
              label(ctx) {
                const raw = ctx.raw as Candle
                if (raw && 'o' in raw) {
                  return [
                    `O: ${raw.o.toFixed(2)}`,
                    `H: ${raw.h.toFixed(2)}`,
                    `L: ${raw.l.toFixed(2)}`,
                    `C: ${raw.c.toFixed(2)}`,
                  ]
                }
                const y = (ctx.raw as { y: number })?.y
                return `${ctx.dataset.label}: ${y !== null && y !== undefined ? y.toFixed(2) : '--'}`
              },
            },
          },
        },
        scales: {
          x: {
            type: 'time',
            time: { tooltipFormat: 'HH:mm dd/MM' },
            grid:  { color: '#1e293b' },
            ticks: { color: '#475569', font: { family: 'JetBrains Mono, monospace', size: 10 }, maxTicksLimit: 10 },
          },
          y: {
            position: 'right',
            grid:  { color: '#1e293b' },
            ticks: {
              color: '#475569',
              font:  { family: 'JetBrains Mono, monospace', size: 10 },
              callback: (v) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 }),
            },
          },
        },
      },
    })

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [candles, closes, showSMA])

  return <canvas ref={canvasRef} />
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [candles,  setCandles]  = useState<Candle[]>([])
  const [interval, setInterval] = useState<Interval>('5m')
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [isDemo,   setIsDemo]   = useState(false)
  const [showSMA,  setShowSMA]  = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const load = useCallback(async (iv: Interval) => {
    setLoading(true)
    setError(null)
    const conf = INTERVALS.find(i => i.value === iv)!
    try {
      const data = await fetchCandles(iv, conf.range)
      setCandles(data)
      setIsDemo(false)
    } catch {
      setCandles(generateDemoCandles(200))
      setIsDemo(true)
      setError('API Yahoo Finance inaccessible — données de démonstration affichées.')
    } finally {
      setLoading(false)
      setLastRefresh(new Date())
    }
  }, [])

  useEffect(() => { load(interval) }, [interval, load])

  // auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => load(interval), 60_000)
    return () => clearInterval(id)
  }, [interval, load])

  const closes = candles.map(c => c.c)

  const rsiValues  = calcRSI(closes)
  const currentRSI = rsiValues.findLast(v => v !== null) ?? null

  const { macd, signal, hist } = calcMACD(closes)
  const macdLast   = macd.findLast(v => v !== null) ?? null
  const signalLast = signal.findLast(v => v !== null) ?? null
  const histLast   = hist.findLast(v => v !== null) ?? null

  const last  = candles[candles.length - 1]
  const prev  = candles[candles.length - 2]
  const chg   = last && prev ? last.c - prev.c : 0
  const trend = chg >= 0 ? 'up' : 'down'

  return (
    <div className="min-h-screen bg-surface text-white font-sans px-4 py-6 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboard NQ100</h1>
          <p className="text-slate-500 text-xs mt-0.5">
            {lastRefresh
              ? `Mis à jour ${lastRefresh.toLocaleTimeString('fr-FR')}`
              : 'Chargement…'}
          </p>
        </div>
        <button
          onClick={() => load(interval)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface-card border border-surface-border rounded-lg text-xs text-slate-400 hover:text-white hover:border-brand-500 transition-colors disabled:opacity-40"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          Actualiser
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-mono">
          ⚠ {error}
        </div>
      )}

      {/* Price ticker */}
      {!loading && <PriceTicker candles={candles} isDemo={isDemo} />}

      {/* Interval selector + SMA toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-surface-card border border-surface-border rounded-lg p-1">
          {INTERVALS.map(i => (
            <button
              key={i.value}
              onClick={() => setInterval(i.value)}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                interval === i.value
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowSMA(v => !v)}
          className={`px-3 py-1 rounded-lg text-xs font-mono border transition-colors ${
            showSMA
              ? 'bg-brand-600/20 border-brand-500/50 text-brand-300'
              : 'bg-surface-card border-surface-border text-slate-400 hover:text-white'
          }`}
        >
          SMA 20/50
        </button>
        <span className={`ml-auto text-xs font-mono flex items-center gap-1.5 ${trend === 'up' ? 'text-profit-light' : 'text-loss-light'}`}>
          <span className={`w-2 h-2 rounded-full ${trend === 'up' ? 'bg-profit-light' : 'bg-loss-light'} animate-pulse`} />
          {trend === 'up' ? 'BULLISH' : 'BEARISH'}
        </span>
      </div>

      {/* Candlestick chart */}
      <div className="bg-surface-card border border-surface-border rounded-xl mb-4 overflow-hidden">
        <div className="relative h-[420px] p-2">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm font-mono">
              <div className="flex flex-col items-center gap-3">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Chargement des données…
              </div>
            </div>
          ) : (
            <CandlestickChart candles={candles} closes={closes} showSMA={showSMA} />
          )}
        </div>
      </div>

      {/* Indicators row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <RSIGauge value={currentRSI} />
        <MACDPanel values={{ macd: macdLast, signal: signalLast, hist: histLast }} />
        <SMAPanel closes={closes} candles={candles} />
      </div>
    </div>
  )
}
