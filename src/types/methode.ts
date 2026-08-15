// ─── Types — Méthode Salah NQ100 ─────────────────────────────────────────────

export type ALNPattern = 'P1' | 'P2' | 'P3' | 'P4' | 'MIXTE' | null

export type OTFDirection = 'HIGHER' | 'LOWER' | 'NEUTRAL'
export type SessionClassification = 'ROTATIONNEL_85' | 'TREND_DAY_15' | 'INDETERMINATE'
export type IBClass = 'BULLISH' | 'BEARISH' | 'MITIGE'
export type Inventory = 'LONG' | 'SHORT' | 'NEUTRAL'
export type AVWAPBias = 'ABOVE' | 'BELOW' | 'AT'
export type GEXBias = 'SUPPORT' | 'RESISTANCE' | 'NEUTRE'
export type ExcessType = 'EXCESS_HAUT' | 'EXCESS_BAS'
export type ExcessSignal = 'LONG' | 'SHORT' | null

export interface ALNSession {
  asiaHigh: number
  asiaLow: number
  londonHigh: number
  londonLow: number
}

export interface ALNStats {
  casseLondonHigh: number
  casseLondonLow: number
  casseLesDeuxPct: number
  ibConfirmation: number | null
  description: string
  signal: string
  warning?: string
}

export interface RTHData {
  date: string
  open: number
  high: number
  low: number
  settle: number
  vah: number
  val: number
  poc: number
}

export interface OVNData {
  currentPrice: number
  avwap18h: number
  overnightHigh: number
  overnightLow: number
}

export interface GEXStrike {
  strike: number      // QQQ strike
  callGamma: number
  putGamma: number
}

export interface GEXAnalysis {
  attracteur: number      // NQ equiv du strike max gamma
  callWall: number
  putWall: number
  zoneBasse: number       // put wall − zone
  zoneHaute: number       // call wall + zone
  bias: GEXBias
  ecartAvwap: number
}

export interface IBData {
  high: number
  low: number
  closeB: number        // clôture de la lettre B (10h00-10h30)
  highFirst: boolean    // true = H avant L dans l'IB
}

export interface ExcessSetup {
  type: ExcessType
  level: number         // niveau de l'excess
  rejectLevel: number   // niveau du rejet
  entry: number         // close de la bougie de rejet
  stop: number          // derrière l'excess
  riskPts: number
  signal: ExcessSignal
  cible1?: number
  ratio1?: number
}

export interface SessionSignals {
  alnPattern: ALNPattern
  alnStats: ALNStats | null
  inventory: Inventory
  inventoryPts: number
  classification: SessionClassification
  ibClass: IBClass | null
  gexAttracteur: number | null
  gexBias: GEXBias | null
  avwapBias: AVWAPBias
  otf: OTFDirection
  activeRules: ActiveRule[]
  scenarios: Scenario[]
  noonCurveSignal: NoonCurveSignal | null
}

export interface ActiveRule {
  id: string
  label: string
  detail: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  color: 'profit' | 'loss' | 'neutral' | 'warning'
}

export interface Scenario {
  id: string
  condition: string
  action: string
  type: 'LONG' | 'SHORT' | 'FADE' | 'WAIT'
}

export interface NoonCurveSignal {
  signal: 'AM_HIGH_PM_LOW' | 'AM_LOW_PM_HIGH' | 'COIN_FLIP'
  probability: number
  description: string
}

export interface SalahTrade {
  id: string
  date: string
  symbol: 'NQ' | 'MNQ'
  direction: 'LONG' | 'SHORT'
  entry: number
  exit?: number
  stopLoss: number
  takeProfit: number
  contracts: number
  pnl: number
  pnlPoints: number
  // Méthode Salah fields
  alnPattern: ALNPattern
  setup: SalahSetup
  excessLevel?: number
  stopOTF?: boolean
  ibClass?: IBClass
  session: 'ASIA' | 'LONDON' | 'NEW_YORK_AM' | 'NEW_YORK_PM' | 'OVERNIGHT'
  ratio?: number
  riskPts?: number
  notes: string
  // Émotions
  emotionPre: 1 | 2 | 3 | 4 | 5
  emotionPost: 1 | 2 | 3 | 4 | 5
  fomo: boolean
  revenge: boolean
  respectStop: boolean
  tags: string[]
}

export type SalahSetup =
  | 'EXCESS_REJET'      // Règle 13
  | 'IBGW'              // Initial Balance Go With
  | 'IBGP'              // Initial Balance Go With Pullback
  | 'XTFD'              // Extension Fade
  | 'STRUCTURE_CLEANUP' // Repair single prints
  | 'POST_TREND_DAY'    // Règle 14
  | 'COUNTER_AUCTION'   // 65% counter auction
  | 'P3_AM'             // P3 signal haussier AM
  | 'P4_FADE'           // P4 counter
  | 'GEX_ATTRACTEUR'    // Trade vers le point GEX
  | 'OTHER'

export interface DailyPlan {
  date: string
  // RTH n-1
  prevRTH: Partial<RTHData>
  // OVN
  ovn: Partial<OVNData>
  aln: Partial<ALNSession>
  // Plan
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | ''
  topDownTargets: string[]
  scenarios: string[]
  oneTradeSetup: string
  notes: string
  // Computed
  signals?: SessionSignals
}
