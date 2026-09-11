import { useApp } from '../context/AppContext'
import { useState, useEffect } from 'react'

const JB  = "'JetBrains Mono', monospace"
const ORB = "'Orbitron', monospace"

function n(v: unknown): number {
  const f = parseFloat(String(v ?? ''))
  return isNaN(f) ? 0 : f
}
function fmt(v: unknown, dec = 2): string {
  const f = n(v)
  return f === 0 ? '—' : f.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function pts(v: number): string {
  if (v === 0) return '—'
  const s = v > 0 ? '+' : ''
  return `${s}${v.toFixed(2)} pts`
}

interface Bar {
  time: string
  open: string
  high: string
  low: string
  close: string
  vol?: number | string
  bid?: number | string
  ask?: number | string
  delta?: number | null
  vwap?: string
  sd1h?: string
  sd1l?: string
  sd2h?: string
  sd2l?: string
}

function alnPattern(asiaH: number, asiaL: number, lonH: number, lonL: number): { code: string; desc: string; bias: string; stat: string } {
  if (!asiaH || !asiaL || !lonH || !lonL) return { code: '—', desc: 'Données manquantes', bias: '—', stat: '—' }
  const hUp = lonH > asiaH
  const lUp = lonL > asiaL
  if (hUp && !lUp)  return { code: 'P3', desc: 'Partial Engulf Up', bias: 'HAUSSIER AM', stat: 'London High cassé 80.8% · IB Bull 100%' }
  if (!hUp && lUp)  return { code: 'P4', desc: 'Partial Engulf Down', bias: 'BAISSIER AM', stat: 'London Low cassé 75% · IB Bull 56%' }
  if (hUp && lUp)   return { code: 'P1', desc: 'Outside / Engulf', bias: 'SYMÉTRIQUE', stat: 'Cassure H: 71.5% · Cassure L: 70.4%' }
  return              { code: 'P2', desc: 'Inside', bias: 'RANGE', stat: 'Rotation probable' }
}

function ibClassify(bars: Bar[]): { type: string; high: number; low: number; mid: number; close: number; range: number } {
  const ib = bars.filter(b => {
    const m = b.time.split(':')
    const mins = parseInt(m[0], 10) * 60 + parseInt(m[1] || '0', 10)
    return mins >= 570 && mins < 630  // 09:30 → 10:30
  })
  if (!ib.length) return { type: '—', high: 0, low: 0, mid: 0, close: 0, range: 0 }
  const high  = Math.max(...ib.map(b => n(b.high)).filter(v => v > 0))
  const low   = Math.min(...ib.map(b => n(b.low)).filter(v => v > 0))
  const close = n(ib[ib.length - 1].close)
  const mid   = (high + low) / 2
  const range = high - low
  const type  = close > mid ? 'Bull' : close < mid ? 'Bear' : 'Neutre'
  return { type, high, low, mid, close, range }
}

function Row({ label, value, accent = false, dim = false, warn = false }: {
  label: string; value: string; accent?: boolean; dim?: boolean; warn?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 3, alignItems: 'baseline' }}>
      <span style={{ fontFamily: JB, fontSize: 11, color: 'rgba(136,153,187,0.45)', width: 200, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontFamily: JB, fontSize: 12, fontWeight: accent ? 700 : 400,
        color: warn ? '#ff8c50' : accent ? '#f0d070' : dim ? 'rgba(136,153,187,0.5)' : 'rgba(220,210,180,0.85)',
        textShadow: accent ? '0 0 8px rgba(240,208,112,0.3)' : 'none',
      }}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: ORB, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
        color: 'rgba(201,168,76,0.6)', marginBottom: 8,
        borderBottom: '1px solid rgba(201,168,76,0.1)', paddingBottom: 6,
      }}>─── {title}</div>
      {children}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: JB, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
      padding: '3px 10px', borderRadius: 4,
      border: `1px solid ${color}40`,
      background: `${color}15`,
      color: color,
    }}>{label}</span>
  )
}

function ZoneLine({ stars, price, role, highlight = false }: {
  stars: string; price: string; role: string; highlight?: boolean
}) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4,
      padding: '3px 6px', borderRadius: 3,
      background: highlight ? 'rgba(240,208,112,0.06)' : 'transparent',
    }}>
      <span style={{ fontFamily: JB, fontSize: 11, color: '#f0d070', width: 24, flexShrink: 0 }}>{stars}</span>
      <span style={{ fontFamily: JB, fontSize: 12, fontWeight: 700, color: highlight ? '#f0d070' : 'rgba(220,210,180,0.9)', width: 90, flexShrink: 0 }}>{price}</span>
      <span style={{ fontFamily: JB, fontSize: 10, color: 'rgba(136,153,187,0.6)' }}>{role}</span>
    </div>
  )
}

export default function TopDown() {
  const { bridge, bridgeOnline, bridgeLastFetch } = useApp()
  const [clock, setClock] = useState('')
  const [, setTick] = useState(0)

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false
    }) + ' ET')
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(iv)
  }, [])

  const raw = bridge.NQ as Record<string, unknown> | undefined

  if (!raw) {
    return (
      <div style={{ padding: '48px 40px', fontFamily: JB, color: 'rgba(136,153,187,0.5)', textAlign: 'center' }}>
        <div style={{ fontSize: 14, marginBottom: 8 }}>Aucune donnée NQ</div>
        <div style={{ fontSize: 11 }}>{bridgeOnline ? 'Bridge connecté — CSV en attente' : 'Bridge hors ligne — démarrer sc_bridge.js'}</div>
      </div>
    )
  }

  // ── Données brutes ──
  const last    = n(raw.last)
  const j1High  = n(raw.j1_high)
  const j1Low   = n(raw.j1_low)
  const j1Settle = n(raw.j1_settle)
  const j1Open  = n(raw.j1_open)
  const poc     = n(raw.poc)
  const vah     = n(raw.vah)
  const val     = n(raw.val)
  const vwap    = n(raw.vwap)
  const sd1h    = n(raw.sd1h)
  const sd1l    = n(raw.sd1l)
  const sd2h    = n(raw.sd2h)
  const sd2l    = n(raw.sd2l)
  const sd3h    = n(raw.ovn_sd3h || raw.sd3h)
  const ovnHigh = n(raw.ovn_high)
  const ovnLow  = n(raw.ovn_low)
  const ovnClose = n(raw.ovn_close)
  const asiaH   = n(raw.asia_high)
  const asiaL   = n(raw.asia_low)
  const lonH    = n(raw.lon_high)
  const lonL    = n(raw.lon_low)
  const atrAuto = n(raw.atr_auto)

  const barsToday  = (raw.bars_today  as Bar[] | undefined) || []
  const barsJ1     = (raw.bars_j1     as Bar[] | undefined) || []
  const barsAsia   = (raw.bars_asia   as Bar[] | undefined) || []
  const barsLondon = (raw.bars_london as Bar[] | undefined) || []
  const lafSd2     = !!raw.laf_sd2
  const lbfSd2     = !!raw.lbf_sd2
  const avwapSide  = String(raw.avwap_side || '')
  const lastCsvDate = String(raw.last_csv_date || '—')
  const j1Date      = String(raw.j1_date || '—')

  // ── ALN Pattern ──
  const aln = alnPattern(asiaH, asiaL, lonH, lonL)

  // ── IB ──
  const ib = ibClassify(barsToday)

  // ── Inventaire OVN ──
  const ovnInv = j1Settle > 0 && ovnClose > 0 ? ovnClose - j1Settle : 0
  const invDir = ovnInv > 30 ? 'LONG' : ovnInv < -30 ? 'SHORT' : 'NEUTRE'
  const invColor = ovnInv > 30 ? '#00ff88' : ovnInv < -30 ? '#ff4444' : '#f0d070'

  // ── Position OVN vs J-1 Value ──
  let ovnPos = '—'
  if (ovnClose > 0 && vah > 0 && val > 0) {
    if (ovnClose > vah) ovnPos = 'Outside (au-dessus VAH)'
    else if (ovnClose < val) ovnPos = 'Outside (en dessous VAL)'
    else ovnPos = 'Inside J-1 Value Area'
  }

  // ── Gap RTH ──
  const rthOpen = barsToday.length ? n(barsToday[0].open) : 0
  let gapType = '—', gapPts = 0
  if (rthOpen > 0 && j1High > 0 && j1Low > 0) {
    if (rthOpen > j1High) { gapType = 'Gap UP'; gapPts = rthOpen - j1High }
    else if (rthOpen < j1Low) { gapType = 'Gap DOWN'; gapPts = rthOpen - j1Low }
    else { gapType = 'No Gap (Inside)'; gapPts = 0 }
  }
  const gapColor = gapType.includes('UP') ? '#00ff88' : gapType.includes('DOWN') ? '#ff4444' : 'rgba(136,153,187,0.6)'

  // ── J-1 type & excès ──
  const j1Range = j1High - j1Low
  let j1Type = '—'
  if (j1Range > 0 && atrAuto > 0) {
    j1Type = j1Range > atrAuto * 1.4 ? 'Trend Day' : j1Range < atrAuto * 0.7 ? 'Balance' : 'Rotational'
  } else if (j1Range > 250) {
    j1Type = 'Trend Day'
  } else if (j1Range > 0) {
    j1Type = 'Rotational'
  }

  let j1Excess = 'Aucun'
  if (j1Settle > 0 && j1High > 0 && j1Low > 0) {
    const distHigh = j1High - j1Settle
    const distLow  = j1Settle - j1Low
    if (distHigh > distLow * 1.5 && distHigh > 80) j1Excess = 'Haut (Excess + rejet probable)'
    else if (distLow > distHigh * 1.5 && distLow > 80) j1Excess = 'Bas (Excess + rejet probable)'
    else j1Excess = 'Aucun évident'
  }

  // ── AVWAP position ──
  const avwapAbove = avwapSide === 'above'
  const noShort = avwapAbove
  const noLong  = !avwapAbove && avwapSide === 'below'

  // ── Zones clés (triées) ──
  const zones: { price: number; role: string; stars: string; prio: number }[] = []
  const add = (p: number, role: string, stars: string, prio: number) => {
    if (p > 0) zones.push({ price: p, role, stars, prio })
  }

  if (sd2h > 0) add(sd2h, 'SD+2 — Questionable High (R34)', '★★★', 1)
  if (sd3h > 0) add(sd3h, 'SD+3 — Extrême (Short obligatoire)', '★★★', 0)
  if (sd1h > 0) add(sd1h, 'SD+1', '★★', 3)
  if (vwap > 0) add(vwap, '👑 AVWAP 18h — Référence principale', '★★★', 2)
  if (sd1l > 0) add(sd1l, 'SD-1', '★★', 4)
  if (sd2l > 0) add(sd2l, 'SD-2 — Questionable Low (R35)', '★★★', 1)
  if (vah > 0)  add(vah,  'VAH J-1 — Résistance', '★★', 3)
  if (poc > 0)  add(poc,  'POC J-1 — Pivot', '★★', 4)
  if (val > 0)  add(val,  'VAL J-1 — Support', '★★', 4)
  if (j1High > 0) add(j1High, 'High J-1', '★', 5)
  if (j1Low > 0)  add(j1Low,  'Low J-1', '★', 5)
  if (ib.high > 0) add(ib.high, 'IB High', '★★', 3)
  if (ib.low > 0)  add(ib.low,  'IB Low', '★★', 3)
  if (ovnHigh > 0) add(ovnHigh, 'OVN High', '★★', 3)
  if (ovnLow > 0)  add(ovnLow,  'OVN Low', '★★', 4)

  zones.sort((a, b) => b.price - a.price)

  // ── Scénarios ──
  const longCond   = lbfSd2 ? `LBF SD-2 (${fmt(sd2l)}) confirmé` : `Rejet VAL (${fmt(val)}) + Above AVWAP`
  const longTarget = sd1h > 0 ? fmt(sd1h) : fmt(vah)
  const shortCond  = lafSd2 ? `LAF SD+2 (${fmt(sd2h)}) confirmé` : `Rejet VAH (${fmt(vah)}) + Below AVWAP`
  const shortTarget = sd1l > 0 ? fmt(sd1l) : fmt(val)

  // ── Règles pertinentes ──
  const rules: string[] = []
  if (aln.code === 'P3') { rules.push('R17 — P3 Haussier AM 80.8% · IB Bull 100% — attendre IB'); rules.push('R13 — Excess Haut PM → Short si rejet confirmé') }
  if (aln.code === 'P4') { rules.push('R17 — P4 Baissier AM · IB Bear 56% · Counter Auction 44%'); rules.push('NE PAS shorter automatiquement P4 — attendre IB') }
  if (lafSd2) rules.push('R34 — LAF SD+2 actif → SHORT setup confirmé · Stop au-dessus du High')
  if (lbfSd2) rules.push('R35 — LBF SD-2 actif → LONG setup confirmé · Stop en dessous du Low')
  if (gapType.includes('UP'))   rules.push('R27 — Gap UP : si non comblé rapidement → GO WITH UP')
  if (gapType.includes('DOWN')) rules.push('R27 — Gap DOWN : si non comblé rapidement → GO WITH DOWN')
  if (!rules.length) rules.push('R41 — Attendre 1ère barre 30min RTH pour confirmer direction')

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div style={{ padding: '28px 40px', maxWidth: 900, margin: '0 auto', fontFamily: JB }}>

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{
            fontFamily: ORB, fontWeight: 900, fontSize: 20, letterSpacing: '0.2em',
            background: 'linear-gradient(135deg, #f0d070, #c9a84c)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>TOP DOWN NQ</div>
          <div style={{ fontSize: 12, color: 'rgba(136,153,187,0.6)', letterSpacing: '0.1em', marginTop: 4 }}>
            {today.toUpperCase()} · {clock}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(136,153,187,0.35)', marginTop: 3 }}>
            CSV: {lastCsvDate} · J-1 ref: {j1Date}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#f0d070', textShadow: '0 0 14px rgba(240,208,112,0.5)' }}>
            {fmt(last)}
          </div>
          <div style={{ fontSize: 11, color: avwapAbove ? '#00ff88' : '#ff4444', marginTop: 3 }}>
            {avwapAbove ? '▲ Above AVWAP' : '▼ Below AVWAP'}
          </div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
            {lafSd2 && <Badge label="🔴 LAF SD+2" color="#ff4444" />}
            {lbfSd2 && <Badge label="🟢 LBF SD-2" color="#00ff88" />}
            {!bridgeOnline && <Badge label="OFFLINE" color="#ff8c50" />}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          {/* J-1 RTH */}
          <Section title="J-1 RTH">
            <Row label="High" value={fmt(j1High)} accent />
            <Row label="Low" value={fmt(j1Low)} accent />
            <Row label="Settle" value={fmt(j1Settle)} accent />
            <Row label="VAH" value={fmt(vah)} />
            <Row label="VAL" value={fmt(val)} />
            <Row label="POC" value={fmt(poc)} />
            <Row label="Type" value={j1Type} accent={j1Type === 'Trend Day'} />
            <Row label="Excès" value={j1Excess} warn={j1Excess.includes('Excess')} />
            {atrAuto > 0 && <Row label="ATR auto (10j)" value={`${atrAuto} pts`} dim />}
          </Section>

          {/* OVN */}
          <Section title="OVN (18h → 09h30)">
            <Row label="High" value={fmt(ovnHigh)} />
            <Row label="Low" value={fmt(ovnLow)} />
            <Row label="Close" value={fmt(ovnClose)} />
            <Row label="Inventaire vs Settle" value={ovnInv !== 0 ? `${pts(ovnInv)} → ` : '—'} />
            <div style={{ marginBottom: 6, marginLeft: 212 }}>
              <Badge label={invDir} color={invColor} />
            </div>
            <Row label="Position vs J-1 Value" value={ovnPos} />
            <Row label="Asie — High / Low" value={`${fmt(asiaH)} / ${fmt(asiaL)}`} />
            <Row label="Londres — High / Low" value={`${fmt(lonH)} / ${fmt(lonL)}`} />
            <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(201,168,76,0.05)', borderRadius: 5, border: '1px solid rgba(201,168,76,0.15)' }}>
              <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4 }}>
                ALN PATTERN : {aln.code} — {aln.desc}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(136,153,187,0.65)', marginBottom: 2 }}>Biais : {aln.bias}</div>
              <div style={{ fontSize: 10, color: 'rgba(136,153,187,0.5)' }}>{aln.stat}</div>
            </div>
          </Section>

          {/* RTH Setup */}
          <Section title="RTH SETUP">
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontFamily: JB, fontSize: 11, color: 'rgba(136,153,187,0.45)', marginRight: 12 }}>Gap</span>
              <span style={{ fontFamily: JB, fontSize: 12, fontWeight: 700, color: gapColor }}>{gapType}</span>
              {gapPts !== 0 && <span style={{ fontFamily: JB, fontSize: 11, color: gapColor, marginLeft: 8 }}>({Math.abs(gapPts).toFixed(2)} pts)</span>}
            </div>
            <Row label="Ouverture RTH" value={rthOpen > 0 ? fmt(rthOpen) : '—'} />
            <Row label="OVN aligné" value={
              (ovnInv > 0 && gapType.includes('UP')) || (ovnInv < 0 && gapType.includes('DOWN'))
                ? 'OUI ✓' : gapType.includes('No Gap') ? 'N/A' : 'NON — divergence'
            } />
            <div style={{ marginTop: 10, marginBottom: 10, height: 1, background: 'rgba(201,168,76,0.08)' }} />
            <Row label="SD+2" value={fmt(sd2h)} accent />
            <Row label="SD+1" value={fmt(sd1h)} />
            <Row label="👑 AVWAP 18h" value={fmt(vwap)} accent />
            <Row label="SD-1" value={fmt(sd1l)} />
            <Row label="SD-2" value={fmt(sd2l)} accent />
            <div style={{ marginTop: 10, marginBottom: 10, height: 1, background: 'rgba(201,168,76,0.08)' }} />
            {ib.range > 0 && (
              <>
                <Row label="IB High / Low" value={`${fmt(ib.high)} / ${fmt(ib.low)}`} />
                <Row label="IB Range" value={`${ib.range.toFixed(2)} pts`} />
                <Row label="IB Mid" value={fmt(ib.mid)} />
                <Row label="IB Close" value={fmt(ib.close)} />
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  <Badge
                    label={`${ib.type} A`}
                    color={ib.type === 'Bull' ? '#00ff88' : ib.type === 'Bear' ? '#ff4444' : '#f0d070'}
                  />
                </div>
              </>
            )}
          </Section>
        </div>

        <div>
          {/* Zones Clés */}
          <Section title="ZONES CLÉS">
            {zones.length === 0 && <div style={{ fontSize: 11, color: 'rgba(136,153,187,0.4)' }}>Aucune donnée disponible</div>}
            {zones.map((z, i) => (
              <ZoneLine
                key={i}
                stars={z.stars}
                price={fmt(z.price)}
                role={z.role}
                highlight={Math.abs(z.price - last) < 20}
              />
            ))}
          </Section>

          {/* Scénarios */}
          <Section title="SCÉNARIOS">
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#00ff88', fontSize: 13 }}>📈</span>
                <span style={{ fontFamily: ORB, fontSize: 8, fontWeight: 700, color: '#00ff88', letterSpacing: '0.14em' }}>LONG</span>
              </div>
              <div style={{ fontFamily: JB, fontSize: 11, color: 'rgba(220,210,180,0.85)', marginLeft: 20, marginBottom: 3 }}>
                {noShort ? '✓ Above AVWAP — biais LONG' : '⚠ Below AVWAP — LONG contre-tendance'}
              </div>
              <div style={{ fontFamily: JB, fontSize: 11, color: 'rgba(136,153,187,0.65)', marginLeft: 20, marginBottom: 3 }}>
                Condition : {longCond}
              </div>
              <div style={{ fontFamily: JB, fontSize: 11, color: '#00ff88', marginLeft: 20 }}>
                → Cible : {longTarget}
              </div>
            </div>

            <div style={{ height: 1, background: 'rgba(201,168,76,0.08)', marginBottom: 14 }} />

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#ff4444', fontSize: 13 }}>📉</span>
                <span style={{ fontFamily: ORB, fontSize: 8, fontWeight: 700, color: '#ff4444', letterSpacing: '0.14em' }}>SHORT</span>
              </div>
              {noShort && !lafSd2 ? (
                <div style={{ fontFamily: JB, fontSize: 11, color: '#ff8c50', marginLeft: 20 }}>
                  NO SHORT — Above AVWAP · attendre LAF SD+2 ou LBF échoué
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: JB, fontSize: 11, color: 'rgba(220,210,180,0.85)', marginLeft: 20, marginBottom: 3 }}>
                    {!noShort ? '✓ Below AVWAP — biais SHORT' : '⚠ Above AVWAP — SHORT sur LAF SD+2 seulement'}
                  </div>
                  <div style={{ fontFamily: JB, fontSize: 11, color: 'rgba(136,153,187,0.65)', marginLeft: 20, marginBottom: 3 }}>
                    Condition : {shortCond}
                  </div>
                  <div style={{ fontFamily: JB, fontSize: 11, color: '#ff4444', marginLeft: 20 }}>
                    → Cible : {shortTarget}
                  </div>
                </>
              )}
            </div>
          </Section>

          {/* Règles du jour */}
          <Section title="RÈGLES DU JOUR">
            {rules.map((r, i) => (
              <div key={i} style={{ fontFamily: JB, fontSize: 11, color: 'rgba(220,210,180,0.8)', marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid rgba(201,168,76,0.3)' }}>
                {r}
              </div>
            ))}
          </Section>

          {/* Delta live */}
          {barsToday.length > 0 && (() => {
            const last3 = barsToday.slice(-3)
            const hasDelta = last3.some(b => b.delta !== null && b.delta !== undefined)
            if (!hasDelta) return null
            return (
              <Section title="BARRES RECENTES — DELTA">
                <div style={{ display: 'grid', gridTemplateColumns: '60px 80px 80px 70px 70px', gap: 4, marginBottom: 4 }}>
                  {['Heure', 'High', 'Low', 'Close', 'Delta'].map(h => (
                    <div key={h} style={{ fontFamily: JB, fontSize: 9, color: 'rgba(136,153,187,0.4)', letterSpacing: '0.1em' }}>{h}</div>
                  ))}
                </div>
                {last3.map((b, i) => {
                  const d = b.delta as number | null | undefined
                  const dColor = (d ?? 0) > 200 ? '#00ff88' : (d ?? 0) < -200 ? '#ff4444' : 'rgba(220,210,180,0.7)'
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 80px 80px 70px 70px', gap: 4, marginBottom: 3 }}>
                      <span style={{ fontFamily: JB, fontSize: 11, color: 'rgba(136,153,187,0.6)' }}>{b.time}</span>
                      <span style={{ fontFamily: JB, fontSize: 11, color: 'rgba(220,210,180,0.8)' }}>{fmt(n(b.high))}</span>
                      <span style={{ fontFamily: JB, fontSize: 11, color: 'rgba(220,210,180,0.8)' }}>{fmt(n(b.low))}</span>
                      <span style={{ fontFamily: JB, fontSize: 11, color: '#f0d070' }}>{fmt(n(b.close))}</span>
                      <span style={{ fontFamily: JB, fontSize: 11, fontWeight: 700, color: dColor }}>
                        {d !== null && d !== undefined ? (d > 0 ? '+' : '') + d : '—'}
                      </span>
                    </div>
                  )
                })}
              </Section>
            )
          })()}

          {/* Footer refresh */}
          <div style={{ fontSize: 10, color: 'rgba(136,153,187,0.3)', borderTop: '1px solid rgba(201,168,76,0.07)', paddingTop: 12, marginTop: 12 }}>
            Actualisation : {bridgeLastFetch ? bridgeLastFetch.toLocaleTimeString('fr-FR') : '—'} · Intervalle 10s
          </div>
        </div>
      </div>
    </div>
  )
}
