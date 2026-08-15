// ─── Calculs — Méthode Salah NQ100 ──────────────────────────────────────────
import type {
  ALNPattern, ALNSession, ALNStats, GEXStrike, GEXAnalysis,
  IBData, IBClass, Inventory, AVWAPBias, SessionClassification,
  OTFDirection, ActiveRule, Scenario, NoonCurveSignal,
  SessionSignals, RTHData, OVNData, GEXBias,
} from '../types/methode'

// ─── ALN Pattern ──────────────────────────────────────────────────────────────

export function detectALNPattern(aln: ALNSession): ALNPattern {
  const { asiaHigh, asiaLow, londonHigh, londonLow } = aln
  if (!asiaHigh || !asiaLow || !londonHigh || !londonLow) return null

  const lEngH = londonHigh > asiaHigh
  const lEngL = londonLow < asiaLow

  // P1 : London Engulfs Asia
  if (lEngH && lEngL) return 'P1'
  // P2 : Asia Engulfs London
  if (!lEngH && !lEngL && londonHigh < asiaHigh && londonLow > asiaLow) return 'P2'
  // P3 : Partial Engulf Up (London H > Asia H ET London L > Asia L)
  if (lEngH && londonLow > asiaLow) return 'P3'
  // P4 : Partial Engulf Down (London H < Asia H ET London L < Asia L)
  if (!lEngH && lEngL) return 'P4'

  return 'MIXTE'
}

export function getALNStats(pattern: ALNPattern): ALNStats | null {
  switch (pattern) {
    case 'P1':
      return {
        casseLondonHigh: 81,
        casseLondonLow: 75,
        casseLesDeuxPct: 57,
        ibConfirmation: null,
        description: 'Londres engulf Asie — two-sided. Pas de biais directionnel clair.',
        signal: 'NEUTRE — attendre IB avant tout trade',
        warning: 'Pattern dominant (46%). Labo non complété — prudence.',
      }
    case 'P2':
      return {
        casseLondonHigh: 60,
        casseLondonLow: 60,
        casseLesDeuxPct: 30,
        ibConfirmation: null,
        description: 'Asie engulf Londres — compression extrême. Très rare (1%).',
        signal: 'RARE — pas de statistique fiable. Attendre IB.',
        warning: 'Quasi inexistant. Traiter comme cas limite.',
      }
    case 'P3':
      return {
        casseLondonHigh: 80.8,
        casseLondonLow: 65.5,
        casseLesDeuxPct: 47.6,
        ibConfirmation: 100,
        description: 'Partial Engulf Up — signal haussier AM. Le plus fiable du labo.',
        signal: 'HAUSSIER AM (80.8%) — attendre Excess Haut pour Short PM',
      }
    case 'P4':
      return {
        casseLondonHigh: 68.6,
        casseLondonLow: 75,
        casseLesDeuxPct: 44.6,
        ibConfirmation: 56,
        description: 'Partial Engulf Down — signal baissier nocturne. IB confirme seulement 56%.',
        signal: 'AMBIGU — Counter Auction 65% possible. Toujours attendre IB.',
        warning: '44% : RTH fait le contraire → piège classique.',
      }
    default:
      return null
  }
}

// ─── Overnight Inventory ──────────────────────────────────────────────────────

export function computeInventory(currentPrice: number, prevSettle: number): {
  type: Inventory; pts: number
} {
  if (!currentPrice || !prevSettle) return { type: 'NEUTRAL', pts: 0 }
  const pts = currentPrice - prevSettle
  if (Math.abs(pts) < 5) return { type: 'NEUTRAL', pts }
  return { type: pts > 0 ? 'LONG' : 'SHORT', pts }
}

// ─── AVWAP Bias ───────────────────────────────────────────────────────────────

export function computeAVWAPBias(price: number, avwap: number): AVWAPBias {
  if (!price || !avwap) return 'AT'
  const diff = ((price - avwap) / avwap) * 100
  if (diff > 0.05) return 'ABOVE'
  if (diff < -0.05) return 'BELOW'
  return 'AT'
}

// ─── 85/15 Classification ─────────────────────────────────────────────────────

export function classify8515(
  ovn: OVNData,
  prevRTH: RTHData,
  inventory: Inventory,
  avwapBias: AVWAPBias,
): SessionClassification {
  if (!ovn.overnightHigh || !ovn.overnightLow || !prevRTH.high || !prevRTH.low) {
    return 'INDETERMINATE'
  }

  const ovnInsidePrevRTH =
    ovn.overnightHigh <= prevRTH.high && ovn.overnightLow >= prevRTH.low

  let trendSignals = 0
  let rotSignals = 0

  // OVN inside → rotationnel
  if (ovnInsidePrevRTH) rotSignals += 2
  else trendSignals += 2

  // Inventory fort et unidirectionnel → trend
  if (inventory === 'LONG' && Math.abs(ovn.currentPrice - (prevRTH.settle || 0)) > 100) trendSignals++
  else if (inventory === 'SHORT' && Math.abs(ovn.currentPrice - (prevRTH.settle || 0)) > 100) trendSignals++
  else rotSignals++

  // AVWAP : prix s'éloigne → trend
  if (avwapBias !== 'AT') trendSignals++
  else rotSignals++

  if (trendSignals >= 3) return 'TREND_DAY_15'
  if (rotSignals >= 2) return 'ROTATIONNEL_85'
  return 'INDETERMINATE'
}

// ─── IB Classification ───────────────────────────────────────────────────────

export function classifyIB(ib: IBData): IBClass {
  if (!ib.high || !ib.low || !ib.closeB) return 'MITIGE'
  const mid = (ib.high + ib.low) / 2
  const diff = ib.closeB - mid
  const range = ib.high - ib.low
  const pct = Math.abs(diff) / range

  // Seuil de mitigation : écart Close/Mid < 3% du range
  if (pct < 0.03) return 'MITIGE'
  if (diff > 0) return 'BULLISH'
  return 'BEARISH'
}

// ─── OTF ─────────────────────────────────────────────────────────────────────

export function computeOTF(prevRTH: RTHData, currentRTH: Partial<RTHData>): OTFDirection {
  if (!prevRTH.high || !prevRTH.low) return 'NEUTRAL'
  if (!currentRTH.high && !currentRTH.low) return 'NEUTRAL'

  const higherHigh = currentRTH.high ? currentRTH.high > prevRTH.high : false
  const higherLow  = currentRTH.low  ? currentRTH.low  > prevRTH.low  : false
  const lowerHigh  = currentRTH.high ? currentRTH.high < prevRTH.high : false
  const lowerLow   = currentRTH.low  ? currentRTH.low  < prevRTH.low  : false

  if (higherHigh && higherLow) return 'HIGHER'
  if (lowerHigh  && lowerLow)  return 'LOWER'
  return 'NEUTRAL'
}

// ─── GEX Analysis ────────────────────────────────────────────────────────────

export function analyzeGEX(strikes: GEXStrike[], avwap18h: number, currentPrice: number): GEXAnalysis | null {
  if (!strikes.length) return null

  const withTotal = strikes.map(s => ({ ...s, total: s.callGamma + s.putGamma }))
  const maxStrike = withTotal.reduce((a, b) => (a.total > b.total ? a : b))

  const attracteur = maxStrike.strike * 40
  const callWall   = Math.max(...withTotal.map(s => s.callGamma)) === maxStrike.callGamma
    ? maxStrike.strike * 40
    : withTotal.reduce((a, b) => a.callGamma > b.callGamma ? a : b).strike * 40
  const putWall    = withTotal.reduce((a, b) => a.putGamma > b.putGamma ? a : b).strike * 40

  const bias: GEXAnalysis['bias'] = currentPrice > attracteur
    ? 'RESISTANCE'
    : currentPrice < attracteur
    ? 'SUPPORT'
    : 'NEUTRE'

  return {
    attracteur,
    callWall,
    putWall,
    zoneBasse: putWall - 40,
    zoneHaute: callWall + 40,
    bias,
    ecartAvwap: avwap18h ? Math.abs(attracteur - avwap18h) : 0,
  }
}

// ─── Noon Curve Signal ────────────────────────────────────────────────────────

export function computeNoonCurve(
  q1High: number, q1Low: number,
  q2High: number, q2Low: number,
): NoonCurveSignal | null {
  if (!q1High || !q1Low || !q2High || !q2Low) return null

  const casseHigh = q2High > q1High
  const casseLow  = q2Low  < q1Low

  if (casseHigh && !casseLow) {
    return {
      signal: 'AM_HIGH_PM_LOW',
      probability: 82.12,
      description: 'Q2 casse Q1 High uniquement → AM=Low / PM=High : 82.12%',
    }
  }
  if (casseLow && !casseHigh) {
    return {
      signal: 'AM_LOW_PM_HIGH',
      probability: 72.42,
      description: 'Q2 casse Q1 Low uniquement → AM=High / PM=Low : 72.42%',
    }
  }
  return {
    signal: 'COIN_FLIP',
    probability: 50,
    description: 'Q2 casse les deux ou aucun → coin flip, pas de signal.',
  }
}

// ─── Active Rules Detector ────────────────────────────────────────────────────

export function detectActiveRules(params: {
  pattern: ALNPattern
  inventory: Inventory
  inventoryPts: number
  classification: SessionClassification
  ibClass: IBClass | null
  avwapBias: AVWAPBias
  gexBias: GEXBias | null
  otf: OTFDirection
}): ActiveRule[] {
  const rules: ActiveRule[] = []
  const { pattern, inventory, inventoryPts, classification, ibClass, avwapBias, gexBias, otf } = params

  // Règle 85/15
  if (classification === 'ROTATIONNEL_85') {
    rules.push({
      id: 'r85',
      label: '85% — Rotationnel',
      detail: 'OVN inside previous RTH → Fade les extrêmes, IBGP/XTFD applicables',
      severity: 'HIGH',
      color: 'neutral',
    })
  }
  if (classification === 'TREND_DAY_15') {
    rules.push({
      id: 'r15',
      label: '15% — Trend Day',
      detail: 'OVN casse le RTH précédent → Go With, IBGW, #TRCT',
      severity: 'HIGH',
      color: 'warning',
    })
  }

  // P3 — signal haussier AM
  if (pattern === 'P3') {
    rules.push({
      id: 'p3',
      label: 'P3 — Haussier AM (80.8%)',
      detail: 'NY casse London High dans 80.8% des cas. IB confirme 100% sur le labo.',
      severity: 'HIGH',
      color: 'profit',
    })
  }
  // P4 — ambigu
  if (pattern === 'P4') {
    rules.push({
      id: 'p4',
      label: 'P4 — Ambigu (IB 56%)',
      detail: 'Counter Auction 65% — ne pas shorter automatiquement. Attendre IB.',
      severity: 'HIGH',
      color: 'warning',
    })
  }

  // Inventory 100% → Counter Auction Dalton
  if (inventory !== 'NEUTRAL' && Math.abs(inventoryPts) > 150) {
    rules.push({
      id: 'counter',
      label: `Counter Auction 65% (Inventory ${inventory})`,
      detail: `OVN 100% ${inventory} (${inventoryPts > 0 ? '+' : ''}${inventoryPts.toFixed(0)} pts) → probabilité 65% de rebond opposé au RTH`,
      severity: 'MEDIUM',
      color: inventory === 'LONG' ? 'loss' : 'profit',
    })
  }

  // IB Mitigé → AVWAP 18h + GEX priment
  if (ibClass === 'MITIGE') {
    rules.push({
      id: 'ib_mitige',
      label: 'IB Mitigé — non prédictif',
      detail: 'IB perd sa valeur prédictive. AVWAP 18h + GEX + Structure priment (validé 8/7 et 9/7)',
      severity: 'HIGH',
      color: 'warning',
    })
  }

  // AVWAP bias
  if (avwapBias === 'ABOVE') {
    rules.push({
      id: 'avwap_above',
      label: 'Prix au-dessus AVWAP 18h (Le Chef)',
      detail: 'Biais haussier net depuis Open Globex',
      severity: 'MEDIUM',
      color: 'profit',
    })
  }
  if (avwapBias === 'BELOW') {
    rules.push({
      id: 'avwap_below',
      label: 'Prix en dessous AVWAP 18h (Le Chef)',
      detail: 'Biais baissier net depuis Open Globex',
      severity: 'MEDIUM',
      color: 'loss',
    })
  }

  // GEX
  if (gexBias === 'SUPPORT') {
    rules.push({
      id: 'gex_sup',
      label: 'GEX : Dealers achètent (Support)',
      detail: 'Prix sous le GEX attracteur → market makers en position acheteuse',
      severity: 'MEDIUM',
      color: 'profit',
    })
  }
  if (gexBias === 'RESISTANCE') {
    rules.push({
      id: 'gex_res',
      label: 'GEX : Dealers vendent (Résistance)',
      detail: 'Prix au-dessus du GEX attracteur → market makers en position vendeuse',
      severity: 'MEDIUM',
      color: 'loss',
    })
  }

  // OTF
  if (otf === 'HIGHER') {
    rules.push({
      id: 'otf_higher',
      label: 'OTF Higher confirmé',
      detail: 'Higher High + Higher Low vs session précédente',
      severity: 'LOW',
      color: 'profit',
    })
  }
  if (otf === 'LOWER') {
    rules.push({
      id: 'otf_lower',
      label: 'OTF Lower confirmé',
      detail: 'Lower High + Lower Low vs session précédente',
      severity: 'LOW',
      color: 'loss',
    })
  }

  return rules
}

// ─── Scenarios Generator ──────────────────────────────────────────────────────

export function generateScenarios(params: {
  classification: SessionClassification
  pattern: ALNPattern
  ibClass: IBClass | null
  avwapBias: AVWAPBias
  inventory: Inventory
  gexAttracteur: number | null
  prevVAH: number
  prevVAL: number
  prevPOC: number
}): Scenario[] {
  const { classification, pattern, ibClass, avwapBias, inventory, gexAttracteur, prevVAH, prevVAL, prevPOC } = params
  const scenarios: Scenario[] = []

  // Scénario principal basé sur la classification
  if (classification === 'ROTATIONNEL_85') {
    if (ibClass === 'BULLISH' || (pattern === 'P3' && avwapBias !== 'BELOW')) {
      scenarios.push({
        id: 's1',
        condition: `Retour vers VAL ${prevVAL || '?'} ou POC ${prevPOC || '?'}`,
        action: 'IBGP — Long sur pullback vers DVPOC. Cible VAH / extrême IB',
        type: 'LONG',
      })
      if (gexAttracteur) {
        scenarios.push({
          id: 's2',
          condition: `Excess Haut près du GEX ${gexAttracteur}`,
          action: 'XTFD — Fade l\'excess haut, retour vers DVPOC / VAL',
          type: 'FADE',
        })
      }
    } else if (ibClass === 'BEARISH' || (pattern === 'P4' && avwapBias !== 'ABOVE')) {
      scenarios.push({
        id: 's1',
        condition: `Retour vers VAH ${prevVAH || '?'} ou POC ${prevPOC || '?'}`,
        action: 'IBGP — Short sur pullback vers DVPOC. Cible VAL / extrême IB',
        type: 'SHORT',
      })
      scenarios.push({
        id: 's2',
        condition: 'Excess Bas rejeté par la période suivante',
        action: 'Règle 13 — Long sur close de la bougie de rejet. Stop sous l\'excess.',
        type: 'LONG',
      })
    } else {
      // IB Mitigé
      scenarios.push({
        id: 's1',
        condition: 'IB mitigé — attendre cassure nette d\'un côté',
        action: 'Fade l\'extrême si excess visible. Sinon ne pas trader.',
        type: 'WAIT',
      })
    }
  }

  if (classification === 'TREND_DAY_15') {
    const trendDir = (inventory === 'LONG' || avwapBias === 'ABOVE') ? 'LONG' : 'SHORT'
    scenarios.push({
      id: 'trend1',
      condition: 'IB étendu + 50% range disponible',
      action: `IBGW — ${trendDir} dans le sens du trend day. Cible 1.5× IB`,
      type: trendDir,
    })
    scenarios.push({
      id: 'trend2',
      condition: 'Stop OTF confirmé (G+H)',
      action: 'Règle 13 — Entrée Close lettre de rejet. Min 3× ratio visé.',
      type: trendDir,
    })
  }

  // GEX attracteur
  if (gexAttracteur) {
    scenarios.push({
      id: 'gex',
      condition: `Prix éloigné du GEX attracteur (${gexAttracteur})`,
      action: `GEX agit comme aimant magnétique → cible ${gexAttracteur}`,
      type: 'WAIT',
    })
  }

  if (!scenarios.length) {
    scenarios.push({
      id: 'wait',
      condition: 'Données insuffisantes',
      action: 'Compléter les données de session pour générer les scénarios.',
      type: 'WAIT',
    })
  }

  return scenarios
}

// ─── Full Signal Computation ──────────────────────────────────────────────────

export function computeSessionSignals(
  aln: Partial<ALNSession>,
  ovn: Partial<OVNData>,
  prevRTH: Partial<RTHData>,
  ib: Partial<IBData> | null,
  gexStrikes: GEXStrike[],
  q1: { high: number; low: number } | null,
  q2: { high: number; low: number } | null,
): SessionSignals {
  const alnData = aln as ALNSession
  const ovnData = ovn as OVNData
  const prevData = prevRTH as RTHData

  const pattern     = detectALNPattern(alnData)
  const alnStats    = getALNStats(pattern)
  const { type: inventory, pts: inventoryPts } = computeInventory(ovnData.currentPrice, prevData.settle)
  const avwapBias   = computeAVWAPBias(ovnData.currentPrice, ovnData.avwap18h)
  const classification = classify8515(ovnData, prevData, inventory, avwapBias)
  const ibClass     = ib ? classifyIB(ib as IBData) : null
  const gexAnalysis = analyzeGEX(gexStrikes, ovnData.avwap18h, ovnData.currentPrice)
  const otf         = computeOTF(prevData, {})
  const noonCurveSignal = q1 && q2 ? computeNoonCurve(q1.high, q1.low, q2.high, q2.low) : null

  const activeRules = detectActiveRules({
    pattern, inventory, inventoryPts, classification,
    ibClass, avwapBias, gexBias: gexAnalysis?.bias ?? null, otf,
  })

  const scenarios = generateScenarios({
    classification, pattern, ibClass, avwapBias, inventory,
    gexAttracteur: gexAnalysis?.attracteur ?? null,
    prevVAH: prevData.vah, prevVAL: prevData.val, prevPOC: prevData.poc,
  })

  return {
    alnPattern: pattern,
    alnStats,
    inventory,
    inventoryPts,
    classification,
    ibClass,
    gexAttracteur: gexAnalysis?.attracteur ?? null,
    gexBias: gexAnalysis?.bias ?? null,
    avwapBias,
    otf,
    activeRules,
    scenarios,
    noonCurveSignal,
  }
}

// ─── Excess helper ────────────────────────────────────────────────────────────

export function computeExcessSetup(
  excessLevel: number,
  rejectLevel: number,
  type: 'EXCESS_HAUT' | 'EXCESS_BAS',
  cible1: number,
): {
  entry: number; stop: number; riskPts: number; ratio1: number; signal: 'LONG' | 'SHORT'
} {
  const isHaut = type === 'EXCESS_HAUT'
  const entry = rejectLevel  // close de la bougie de rejet
  const stop  = isHaut ? excessLevel + 1 : excessLevel - 1
  const riskPts = Math.abs(entry - stop)
  const gainPts = Math.abs(cible1 - entry)
  const ratio1  = riskPts > 0 ? gainPts / riskPts : 0
  return { entry, stop, riskPts, ratio1, signal: isHaut ? 'SHORT' : 'LONG' }
}

// ─── P&L NQ/MNQ ──────────────────────────────────────────────────────────────

export function calcNQPnl(
  direction: 'LONG' | 'SHORT',
  entry: number, exit: number,
  contracts: number, symbol: 'NQ' | 'MNQ',
): { pnl: number; pnlPoints: number } {
  const dir = direction === 'LONG' ? 1 : -1
  const pnlPoints = (exit - entry) * dir
  const tickValue = symbol === 'NQ' ? 5 : 0.5
  return { pnl: pnlPoints * tickValue * contracts, pnlPoints }
}
