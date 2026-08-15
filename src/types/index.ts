export interface Trade {
  id: string
  date: string
  symbol: 'NQ' | 'MNQ'
  direction: 'LONG' | 'SHORT'
  entry: number
  exit: number
  stopLoss: number
  takeProfit: number
  contracts: number
  pnl: number
  pnlPoints: number
  setup: SetupType
  session: SessionType
  notes: string
  tags: string[]
  screenshot?: string
  emotions: EmotionRating
}

export type SetupType =
  | 'ICT_BPR'
  | 'FVG'
  | 'OB'
  | 'BREAKER'
  | 'LIQUIDITY_SWEEP'
  | 'OPENING_RANGE'
  | 'REJECTION'
  | 'OTHER'

export type SessionType = 'ASIA' | 'LONDON' | 'NEW_YORK_AM' | 'NEW_YORK_PM' | 'OVERNIGHT'

export interface EmotionRating {
  preTradeScore: 1 | 2 | 3 | 4 | 5
  postTradeScore: 1 | 2 | 3 | 4 | 5
  fomo: boolean
  revenge: boolean
  overConfident: boolean
}

export interface DailyStats {
  date: string
  totalPnl: number
  totalTrades: number
  winners: number
  losers: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxDrawdown: number
}

export interface WeeklyPlan {
  id: string
  weekStart: string
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  keyLevels: PriceLevel[]
  goals: string[]
  notes: string
  createdAt: string
}

export interface PriceLevel {
  price: number
  type: 'SUPPORT' | 'RESISTANCE' | 'PDH' | 'PDL' | 'PWH' | 'PWL' | 'PMH' | 'PML' | 'VWAP' | 'CUSTOM'
  label: string
  active: boolean
}

export interface Setup {
  id: string
  name: string
  description: string
  rules: string[]
  entryConditions: string[]
  exitConditions: string[]
  riskRewardMin: number
  examples: string[]
  tags: string[]
}

export interface AccountStats {
  balance: number
  startingBalance: number
  totalPnl: number
  winRate: number
  profitFactor: number
  totalTrades: number
  avgRR: number
  maxDrawdown: number
  currentStreak: number
  bestDay: number
  worstDay: number
}

export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}
