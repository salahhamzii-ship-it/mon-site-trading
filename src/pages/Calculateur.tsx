import { useState, useMemo } from 'react'

const ORB = "'Orbitron', monospace"
const JB  = "'JetBrains Mono', monospace"

const n   = (v: string) => parseFloat(v) || 0
const fmt = (v: number, d = 2) => v ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'

/* ── Presets ───────────────────────────────────────────────────────── */
const PRESETS: Record<string, {
  rth: Record<string, string>; ovn: Record<string, string>
  aln: Record<string, string>; ibS: Record<string, string>
  highFirst: boolean; gex: Record<string, string>
  esIb: Record<string, string>; esHighFirst: boolean
}> = {
  '13-août': {
    rth: { open:'29910.25', high:'30272.75', low:'29863.50', settle:'30194.75', vah:'30210', val:'29967', poc:'30050' },
    ovn: { open18h:'30194', avwap18h:'30220', high:'30280', low:'30175', close:'30275' },
    aln: { asiaHigh:'30280', asiaLow:'30175', londonHigh:'30272.75', londonLow:'29863.50' },
    ibS: { rthOpen:'29900', orbHigh:'30050', orbLow:'29880', orbClose:'30020', ibHigh:'30239.50', ibLow:'29863.50', ibClose:'30234.25' },
    highFirst: false,
    gex: { flip:'30150', callWall:'30600', putWall:'29600', vwap1030:'30150', atr:'150' },
    esIb: { ibHigh:'', ibLow:'', ibClose:'' }, esHighFirst: false,
  },
  '12-août': {
    rth: { open:'30050.00', high:'30180.00', low:'29950.00', settle:'30020.00', vah:'30120', val:'29980', poc:'30050' },
    ovn: { open18h:'30020', avwap18h:'30000', high:'30060', low:'29890', close:'29920' },
    aln: { asiaHigh:'30200', asiaLow:'30050', londonHigh:'30150', londonLow:'29940' },
    ibS: { rthOpen:'29930', orbHigh:'30020', orbLow:'29900', orbClose:'29940', ibHigh:'30050.00', ibLow:'29820.00', ibClose:'29900.00' },
    highFirst: true,
    gex: { flip:'30000', callWall:'30300', putWall:'29600', vwap1030:'29980', atr:'130' },
    esIb: { ibHigh:'', ibLow:'', ibClose:'' }, esHighFirst: false,
  },
}

/* ── Field ─────────────────────────────────────────────────────────── */
function Field({ label, value, onChange, ro, color, note, span }: {
  label: string; value: string; onChange?: (v: string) => void
  ro?: boolean; color?: string; note?: string; span?: number
}) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : undefined}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.13em', color:'rgba(136,153,187,0.5)' }}>{label}</span>
        {note && <span style={{ fontFamily:JB, fontSize:7, color:'rgba(136,153,187,0.35)' }}>{note}</span>}
      </div>
      <input
        value={value} readOnly={ro}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width:'100%', boxSizing:'border-box',
          background: ro ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.45)',
          border: ro ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(201,168,76,0.2)',
          borderRadius:3, padding:'5px 8px',
          fontFamily:JB, fontSize:12, fontWeight:600,
          color: ro ? (color ?? '#c9a84c') : '#e2e8f0',
          outline:'none', cursor: ro ? 'default' : 'text',
        } as React.CSSProperties}
        onFocus={e => { if (!ro) (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.55)' }}
        onBlur={e =>  { if (!ro) (e.target as HTMLInputElement).style.borderColor = 'rgba(201,168,76,0.2)' }}
      />
    </div>
  )
}

/* ── Section card ──────────────────────────────────────────────────── */
function Sec({ title, icon, accent, children }: {
  title: string; icon: string; accent: string; children: React.ReactNode
}) {
  return (
    <div style={{ background:'#141820', borderRadius:6, overflow:'hidden', border:'1px solid rgba(255,255,255,0.07)', borderTop:`2px solid ${accent}` }}>
      <div style={{ padding:'9px 16px', background:'rgba(0,0,0,0.2)', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:13, filter:`drop-shadow(0 0 5px ${accent}80)` }}>{icon}</span>
        <span style={{ fontFamily:ORB, fontSize:8, fontWeight:700, letterSpacing:'0.16em', color:accent }}>{title}</span>
      </div>
      <div style={{ padding:'12px 16px' }}>{children}</div>
    </div>
  )
}

function G({ cols=4, gap=8, children }: { cols?:number; gap?:number; children:React.ReactNode }) {
  return <div style={{ display:'grid', gridTemplateColumns:`repeat(${cols},1fr)`, gap }}>{children}</div>
}

/* ── IB Quarter bar ────────────────────────────────────────────────── */
function QuarterBar({ pct, zone }: { pct: number; zone: string }) {
  const zones = [
    { from:0,  to:25,  c:'rgba(255,107,107,0.12)', label:'IBL' },
    { from:25, to:50,  c:'rgba(201,168,76,0.08)',  label:'Q1' },
    { from:50, to:75,  c:'rgba(30,179,188,0.08)',  label:'MID' },
    { from:75, to:100, c:'rgba(0,255,136,0.12)',   label:'Q3' },
  ]
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.13em', color:'rgba(136,153,187,0.5)' }}>POSITION CLOSE — IB QUARTERS</span>
        <span style={{ fontFamily:JB, fontSize:8, color:'#c9a84c', fontWeight:700 }}>{zone}</span>
      </div>
      <div style={{ position:'relative', height:20, background:'rgba(0,0,0,0.35)', borderRadius:3, overflow:'hidden', border:'1px solid rgba(255,255,255,0.05)' }}>
        {zones.map(z => (
          <div key={z.from} style={{ position:'absolute', left:`${z.from}%`, width:`${z.to-z.from}%`, height:'100%', background:z.c, borderRight:'1px solid rgba(255,255,255,0.05)' }} />
        ))}
        {['IBL','Q1','MID','Q3','IBH'].map((lbl, i) => (
          <div key={lbl} style={{ position:'absolute', left:`${i*25}%`, top:'50%', transform:'translate(-50%,-50%)', fontFamily:JB, fontSize:7, color:'rgba(136,153,187,0.35)', pointerEvents:'none' }}>{lbl}</div>
        ))}
        <div style={{ position:'absolute', left:`${Math.max(0,Math.min(100,pct))}%`, top:0, bottom:0, width:2, background:'#c9a84c', transform:'translateX(-50%)', boxShadow:'0 0 6px rgba(201,168,76,0.9)' }} />
      </div>
      <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.4)', marginTop:3, textAlign:'right' }}>{pct.toFixed(1)}% dans l'IB</div>
    </div>
  )
}

/* ── CSV import parser ─────────────────────────────────────────────── */
function parseCSV(text: string): Partial<Record<string, string>> {
  const lines = text.trim().split('\n').filter(Boolean)
  const last = lines[lines.length - 1].split(',')
  // Try to detect Sierra Chart format: Date,Time,Open,High,Low,Close[,Vol]
  // or simple: Open,High,Low,Close
  if (last.length >= 6) {
    const [, , open, high, low, close] = last
    return { open: open?.trim(), high: high?.trim(), low: low?.trim(), settle: close?.trim() }
  }
  if (last.length >= 4) {
    const [open, high, low, close] = last
    return { open: open?.trim(), high: high?.trim(), low: low?.trim(), settle: close?.trim() }
  }
  return {}
}

/* ── Main ──────────────────────────────────────────────────────────── */
export default function Calculateur() {
  const P = PRESETS['13-août']

  const [rth, setRth] = useState(P.rth)
  const [ovn, setOvn] = useState(P.ovn)
  const [aln, setAln] = useState(P.aln)
  const [ibS, setIbS] = useState(P.ibS)
  const [highFirst, setHighFirst] = useState(P.highFirst)
  const [gex, setGex] = useState(P.gex)
  const [esIb, setEsIb] = useState(P.esIb)
  const [esHF, setEsHF] = useState(P.esHighFirst)
  const [activePreset, setActivePreset] = useState('13-août')

  const loadPreset = (key: string) => {
    const p = PRESETS[key]
    if (!p) return
    setRth(p.rth); setOvn(p.ovn); setAln(p.aln); setIbS(p.ibS)
    setHighFirst(p.highFirst); setGex(p.gex); setEsIb(p.esIb); setEsHF(p.esHighFirst)
    setActivePreset(key)
  }

  const upRth = (k: keyof typeof rth, v: string) => setRth(s => ({ ...s, [k]: v }))
  const upOvn = (k: keyof typeof ovn, v: string) => setOvn(s => ({ ...s, [k]: v }))
  const upAln = (k: keyof typeof aln, v: string) => setAln(s => ({ ...s, [k]: v }))
  const upIb  = (k: keyof typeof ibS, v: string) => setIbS(s => ({ ...s, [k]: v }))
  const upGex = (k: keyof typeof gex, v: string) => setGex(s => ({ ...s, [k]: v }))
  const upEs  = (k: keyof typeof esIb, v: string) => setEsIb(s => ({ ...s, [k]: v }))

  /* ── RTH ─────────────────────────────────────────────────────────── */
  const rthC = useMemo(() => ({ halfBack: (n(rth.high) + n(rth.low)) / 2 }), [rth])

  /* ── OVN ─────────────────────────────────────────────────────────── */
  const ovnC = useMemo(() => {
    const diff = n(ovn.close) - n(rth.settle)
    const biais = diff > 5 ? 'LONG' : diff < -5 ? 'SHORT' : 'BALANCE'
    return { diff, biais, bc: biais === 'LONG' ? '#00ff88' : biais === 'SHORT' ? '#ff4444' : '#f0d070' }
  }, [ovn.close, rth.settle])

  /* ── 85/15 ───────────────────────────────────────────────────────── */
  const rule8515 = useMemo(() => {
    const oh = n(ovn.high), ol = n(ovn.low)
    const rh = n(rth.high), rl = n(rth.low)
    if (oh > 0 && ol > 0 && oh <= rh && ol >= rl) {
      return { type:'ROTATIONNEL', pct:'85%', c:'#1eb3bc', action:'Fade les extrêmes · Target Half Back · IBR' }
    }
    return { type:'TREND DAY', pct:'15%', c:'#f0d070', action:'Go With momentum · IBGW · #TRCT' }
  }, [ovn.high, ovn.low, rth.high, rth.low])

  /* ── ALN ─────────────────────────────────────────────────────────── */
  const alnC = useMemo(() => {
    const ah = n(aln.asiaHigh), al = n(aln.asiaLow)
    const lh = n(aln.londonHigh), ll = n(aln.londonLow)
    if (lh > ah && ll > al)  return { p:'P3', c:'#00ff88', desc:'London H/L > Asia → Haussier', rel:'80.8%' }
    if (lh < ah && ll < al)  return { p:'P4', c:'#ff4444', desc:'London H/L < Asia → Baissier', rel:'68.6%' }
    if (lh >= ah && ll <= al) return { p:'P1', c:'#f0d070', desc:'London englobe Asia → Mixte',   rel:'—' }
    if (lh <= ah && ll >= al) return { p:'P2', c:'#1eb3bc', desc:'London inside Asia → Rotation', rel:'—' }
    return { p:'?', c:'rgba(255,255,255,0.4)', desc:'Inconclusive', rel:'—' }
  }, [aln])

  /* ── IB ──────────────────────────────────────────────────────────── */
  const ibC = useMemo(() => {
    const h = n(ibS.ibHigh), l = n(ibS.ibLow), c = n(ibS.ibClose)
    const range = h - l, mid = (h + l) / 2, tol = range * 0.03
    let cls = '', cc = '', desc = ''
    if (Math.abs(c - mid) <= tol)   { cls='MITIGÉ'; cc='#f0d070'; desc='Close ≈ Mid ±3%' }
    else if (!highFirst && c > mid) { cls='BULL A'; cc='#00ff88'; desc='Low First + Close > Mid' }
    else if (highFirst  && c > mid) { cls='BULL B'; cc='#1eb3bc'; desc='High First + Close > Mid' }
    else if (highFirst  && c < mid) { cls='BEAR A'; cc='#ff4444'; desc='High First + Close < Mid' }
    else                             { cls='BEAR B'; cc='#ff6b6b'; desc='Low First + Close < Mid' }
    const pct = range > 0 ? Math.max(0, Math.min(100, ((c - l) / range) * 100)) : 0
    let zone = ''
    if      (pct < 25) zone = 'ZONE Q1 (0–25%)'
    else if (pct < 50) zone = 'ZONE Q2 (25–50%)'
    else if (pct < 75) zone = 'ZONE Q3 (50–75%)'
    else               zone = 'ZONE Q4 (75–100%)'
    return { range, mid, q1: l + range*0.25, q3: l + range*0.75, cls, cc, desc, pct, zone }
  }, [ibS, highFirst])

  /* ── §9 NQ+ES alignment ──────────────────────────────────────────── */
  const s9 = useMemo(() => {
    if (!esIb.ibHigh || !esIb.ibLow || !esIb.ibClose) return { cls:'—', status:'—', sc:'rgba(136,153,187,0.4)', aligned:false }
    const h = n(esIb.ibHigh), l = n(esIb.ibLow), c = n(esIb.ibClose)
    const range = h - l, mid = (h + l) / 2, tol = range * 0.03
    let cls = ''
    if (Math.abs(c - mid) <= tol)  cls = 'MITIGÉ'
    else if (!esHF && c > mid)      cls = 'BULL A'
    else if (esHF  && c > mid)      cls = 'BULL B'
    else if (esHF  && c < mid)      cls = 'BEAR A'
    else                             cls = 'BEAR B'
    const nqBull = ibC.cls.startsWith('BULL')
    const esBull = cls.startsWith('BULL')
    const nqBear = ibC.cls.startsWith('BEAR')
    const esBear = cls.startsWith('BEAR')
    const aligned = (nqBull && esBull) || (nqBear && esBear)
    const divergent = (nqBull && esBear) || (nqBear && esBull)
    return {
      cls,
      status: ibC.cls === 'MITIGÉ' || cls === 'MITIGÉ' ? 'MITIGÉ' : aligned ? 'ALIGNÉ ✓' : divergent ? 'DIVERGENT ⚠' : '—',
      sc: aligned ? '#00ff88' : divergent ? '#ff4444' : '#f0d070',
      aligned,
    }
  }, [esIb, esHF, ibC])

  /* ── GEX ─────────────────────────────────────────────────────────── */
  const gexC = useMemo(() => {
    const vw = n(gex.vwap1030), se = n(rth.settle), atr = n(gex.atr)
    return {
      v1u:vw+atr, v1d:vw-atr, v2u:vw+2*atr, v2d:vw-2*atr,
      s1u:se+atr, s1d:se-atr, s2u:se+2*atr, s2d:se-2*atr,
    }
  }, [gex, rth.settle])

  /* ── SIGNAL ──────────────────────────────────────────────────────── */
  const res = useMemo(() => {
    let score = 0
    if (ovnC.biais === 'LONG')  score += 2; else if (ovnC.biais === 'SHORT') score -= 2
    if (alnC.p === 'P3')        score += 2; else if (alnC.p === 'P4')        score -= 2
    if (ibC.cls === 'BULL A')   score += 3; else if (ibC.cls === 'BEAR A')   score -= 3
    else if (ibC.cls === 'BULL B') score += 1; else if (ibC.cls === 'BEAR B') score -= 1
    if (n(ovn.close) > n(ovn.avwap18h)) score += 1; else score -= 1
    // §9: adjust if ES data provided
    if (esIb.ibHigh) { if (s9.aligned) score += 1; else score -= 1 }

    let sig='', fid='', sc=''
    if      (score >=  5) { sig='HAUSSIER'; fid='ÉLEVÉE';  sc='#00ff88' }
    else if (score >=  3) { sig='HAUSSIER'; fid='MODÉRÉE'; sc='#1eb3bc' }
    else if (score >=  1) { sig='HAUSSIER'; fid='FAIBLE';  sc='rgba(0,255,136,0.6)' }
    else if (score <= -5) { sig='BAISSIER'; fid='ÉLEVÉE';  sc='#ff4444' }
    else if (score <= -3) { sig='BAISSIER'; fid='MODÉRÉE'; sc='#ff6b6b' }
    else if (score <= -1) { sig='BAISSIER'; fid='FAIBLE';  sc='rgba(255,68,68,0.6)' }
    else                  { sig='NEUTRE';   fid='—';       sc='#f0d070' }

    const up = score > 0
    const ibH = n(ibS.ibHigh), ibL = n(ibS.ibLow), mid = ibC.mid
    const cw = n(gex.callWall), pw = n(gex.putWall)
    const stopVal = up ? ibL - 10 : ibH + 10
    const rr = up
      ? ((ibH - mid) / (mid - stopVal)).toFixed(1)
      : ((mid - ibL) / (stopVal - mid)).toFixed(1)
    return {
      score, sig, fid, sc, rr,
      entree: up ? `Pullback Mid (${fmt(mid)})` : `Rallye Mid (${fmt(mid)})`,
      stop: fmt(stopVal), c1: up ? fmt(ibH) : fmt(ibL), c2: up ? fmt(cw) : fmt(pw),
      scenario: up
        ? `${alnC.p} + ${ibC.cls} (${alnC.rel}) → casse IBH ${fmt(ibH)} · Call Wall ${fmt(cw)}`
        : `${alnC.p} + ${ibC.cls} (${alnC.rel}) → casse IBL ${fmt(ibL)} · Put Wall ${fmt(pw)}`,
    }
  }, [ovnC, alnC, ibC, s9, ovn, ibS, gex, esIb.ibHigh])

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div style={{ padding:0 }}>
      {/* Header */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:18 }}>⚙</span>
            <div style={{
              fontFamily:ORB, fontSize:'clamp(14px,2vw,20px)', fontWeight:900, letterSpacing:'0.2em',
              background:'linear-gradient(135deg,#c9a84c,#f0d070)',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
            } as React.CSSProperties}>SESSION CALCULATOR</div>
            <div style={{ padding:'3px 10px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:3, fontSize:8, letterSpacing:'0.14em', color:'rgba(201,168,76,0.7)', fontFamily:ORB }}>MÉTHODE SALAH v2</div>
          </div>
          {/* Preset + CSV buttons */}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            {Object.keys(PRESETS).map(key => (
              <button key={key} onClick={() => loadPreset(key)} style={{
                padding:'4px 10px', cursor:'pointer', borderRadius:3,
                fontFamily:JB, fontSize:9, fontWeight:700,
                background: activePreset === key ? 'rgba(201,168,76,0.18)' : 'rgba(0,0,0,0.4)',
                border:`1px solid ${activePreset === key ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.07)'}`,
                color: activePreset === key ? '#c9a84c' : 'rgba(136,153,187,0.5)',
              }}>{key}</button>
            ))}
            <label style={{
              padding:'4px 10px', cursor:'pointer', borderRadius:3,
              fontFamily:JB, fontSize:9, fontWeight:700,
              background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.07)',
              color:'rgba(136,153,187,0.5)', display:'inline-block',
            }}>
              CSV
              <input type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={e => {
                const f = e.target.files?.[0]; if (!f) return
                const r = new FileReader()
                r.onload = ev => {
                  const parsed = parseCSV(ev.target?.result as string)
                  if (parsed.open) setRth(s => ({ ...s, ...(parsed as Record<string, string>) }))
                }
                r.readAsText(f)
              }} />
            </label>
          </div>
        </div>
        <div style={{ fontSize:10, color:'rgba(136,153,187,0.5)', letterSpacing:'0.08em', fontFamily:JB }}>
          RTH J-1 → OVN → ALN → IB → GEX → §9 → RÉSULTAT
        </div>
        <div style={{ marginTop:6, height:1, background:'linear-gradient(90deg,rgba(201,168,76,0.3),rgba(30,179,188,0.2),transparent)' }} />
      </div>

      {/* Row 1: RTH + OVN */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <Sec title="RTH J-1" icon="📊" accent="#c9a84c">
          <G cols={4}>
            <Field label="OPEN"   value={rth.open}   onChange={v => upRth('open', v)} />
            <Field label="HIGH"   value={rth.high}   onChange={v => upRth('high', v)} />
            <Field label="LOW"    value={rth.low}    onChange={v => upRth('low', v)} />
            <Field label="SETTLE" value={rth.settle} onChange={v => upRth('settle', v)} />
            <Field label="VAH"    value={rth.vah}    onChange={v => upRth('vah', v)} />
            <Field label="VAL"    value={rth.val}    onChange={v => upRth('val', v)} />
            <Field label="POC"    value={rth.poc}    onChange={v => upRth('poc', v)} />
            <Field label="HALF BACK" value={fmt(rthC.halfBack)} ro color="#c9a84c" note="(H+L)÷2" />
          </G>
        </Sec>

        <Sec title="OVERNIGHT (OVN)" icon="🌙" accent="#1eb3bc">
          <G cols={3}>
            <Field label="OPEN 18H GLOBEX" value={ovn.open18h}  onChange={v => upOvn('open18h', v)} />
            <Field label="AVWAP 18H"       value={ovn.avwap18h} onChange={v => upOvn('avwap18h', v)} />
            <Field label="OVN HIGH"        value={ovn.high}     onChange={v => upOvn('high', v)} />
            <Field label="OVN LOW"         value={ovn.low}      onChange={v => upOvn('low', v)} />
            <Field label="OVN CLOSE"       value={ovn.close}    onChange={v => upOvn('close', v)} />
            <div>
              <span style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.13em', color:'rgba(136,153,187,0.5)', display:'block', marginBottom:3 }}>OVN VS SETTLE</span>
              <div style={{ padding:'6px 8px', borderRadius:3, textAlign:'center', background:`${ovnC.bc}15`, border:`1px solid ${ovnC.bc}45`, fontFamily:ORB, fontSize:14, fontWeight:900, color:ovnC.bc, letterSpacing:'0.1em', textShadow:`0 0 10px ${ovnC.bc}80` }}>{ovnC.biais}</div>
              <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.4)', textAlign:'center', marginTop:3 }}>{ovnC.diff>=0?'+':''}{fmt(ovnC.diff)} pts vs Settle</div>
            </div>
          </G>
        </Sec>
      </div>

      {/* Row 2: ALN + IB */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <Sec title="ALIGNMENT (ALN)" icon="🧭" accent="#d4af37">
          <G cols={2}>
            <Field label="ASIA HIGH"   value={aln.asiaHigh}   onChange={v => upAln('asiaHigh', v)} />
            <Field label="ASIA LOW"    value={aln.asiaLow}    onChange={v => upAln('asiaLow', v)} />
            <Field label="LONDON HIGH" value={aln.londonHigh} onChange={v => upAln('londonHigh', v)} />
            <Field label="LONDON LOW"  value={aln.londonLow}  onChange={v => upAln('londonLow', v)} />
          </G>
          <div style={{ marginTop:10, padding:'10px 12px', borderRadius:4, background:`${alnC.c}10`, border:`1px solid ${alnC.c}30` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
              <span style={{ fontFamily:ORB, fontSize:22, fontWeight:900, color:alnC.c, letterSpacing:'0.1em' }}>{alnC.p}</span>
              <span style={{ fontFamily:JB, fontSize:13, fontWeight:700, color:alnC.c }}>{alnC.rel}</span>
            </div>
            <span style={{ fontSize:10, color:'rgba(200,190,165,0.7)', fontFamily:JB }}>{alnC.desc}</span>
          </div>
          <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
            {[
              { p:'P3', d:'LH/LL > Asia · Haussier', c:'#00ff88' },
              { p:'P4', d:'LH/LL < Asia · Baissier',  c:'#ff4444' },
              { p:'P1', d:'London englobe · Mixte',    c:'#f0d070' },
              { p:'P2', d:'London inside · Rotation',  c:'#1eb3bc' },
            ].map(row => (
              <div key={row.p} style={{ display:'flex', gap:5, alignItems:'center', padding:'3px 6px', background:alnC.p===row.p?`${row.c}15`:'rgba(0,0,0,0.2)', borderRadius:3, border:`1px solid ${alnC.p===row.p?row.c+'40':'rgba(255,255,255,0.04)'}` }}>
                <span style={{ fontFamily:ORB, fontSize:8, color:row.c, fontWeight:700, flexShrink:0 }}>{row.p}</span>
                <span style={{ fontFamily:JB, fontSize:7, color:'rgba(136,153,187,0.5)' }}>{row.d}</span>
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="INITIAL BALANCE (IB)" icon="⚡" accent="#f0d070">
          <G cols={4} gap={8}>
            <Field label="RTH OPEN"  value={ibS.rthOpen}  onChange={v => upIb('rthOpen', v)} />
            <Field label="ORB HIGH"  value={ibS.orbHigh}  onChange={v => upIb('orbHigh', v)} note="9h30–9h50" />
            <Field label="ORB LOW"   value={ibS.orbLow}   onChange={v => upIb('orbLow', v)} />
            <Field label="ORB CLOSE" value={ibS.orbClose} onChange={v => upIb('orbClose', v)} />
          </G>
          <div style={{ height:6 }} />
          <G cols={4} gap={8}>
            <Field label="IB HIGH"   value={ibS.ibHigh}   onChange={v => upIb('ibHigh', v)} />
            <Field label="IB LOW"    value={ibS.ibLow}    onChange={v => upIb('ibLow', v)} />
            <Field label="IB CLOSE"  value={ibS.ibClose}  onChange={v => upIb('ibClose', v)} />
            <Field label="RANGE"     value={fmt(ibC.range)} ro color="rgba(136,153,187,0.6)" />
            <Field label="Q1 (25%)"  value={fmt(ibC.q1)}  ro color="#ff6b6b" />
            <Field label="MID (50%)" value={fmt(ibC.mid)} ro color="#c9a84c" />
            <Field label="Q3 (75%)"  value={fmt(ibC.q3)}  ro color="#1eb3bc" />
            <Field label="Q4 (100%)" value={fmt(n(ibS.ibHigh))} ro color="#00ff88" note="= IBH" />
          </G>
          {/* Quarter bar */}
          <QuarterBar pct={ibC.pct} zone={ibC.zone} />
          {/* HL toggle + classification */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
            <div>
              <span style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.13em', color:'rgba(136,153,187,0.5)', display:'block', marginBottom:5 }}>ORDRE HL</span>
              <div style={{ display:'flex', gap:5 }}>
                {([{label:'LOW FIRST',v:false,c:'#00ff88'},{label:'HIGH FIRST',v:true,c:'#ff4444'}] as const).map(opt => (
                  <button key={opt.label} onClick={() => setHighFirst(opt.v)} style={{ flex:1, padding:'5px 4px', cursor:'pointer', borderRadius:3, fontFamily:JB, fontSize:9, fontWeight:700, letterSpacing:'0.04em', background:highFirst===opt.v?`${opt.c}18`:'rgba(0,0,0,0.3)', border:`1px solid ${highFirst===opt.v?opt.c+'55':'rgba(255,255,255,0.07)'}`, color:highFirst===opt.v?opt.c:'rgba(136,153,187,0.4)' }}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div style={{ padding:'8px 10px', borderRadius:4, background:`${ibC.cc}12`, border:`1px solid ${ibC.cc}35` }}>
              <div style={{ fontFamily:ORB, fontSize:14, fontWeight:900, color:ibC.cc, letterSpacing:'0.08em', marginBottom:2 }}>{ibC.cls}</div>
              <div style={{ fontFamily:JB, fontSize:9, color:'rgba(200,190,165,0.6)' }}>{ibC.desc}</div>
            </div>
          </div>
        </Sec>
      </div>

      {/* Row 3: GEX + §9/85-15 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <Sec title="GEX · OPTIONS FLOW" icon="🎯" accent="#f0d070">
          <G cols={2} gap={8}>
            <Field label="GEX FLIP"       value={gex.flip}      onChange={v => upGex('flip', v)} />
            <Field label="VWAP 10H30"     value={gex.vwap1030}  onChange={v => upGex('vwap1030', v)} />
            <Field label="CALL WALL"      value={gex.callWall}  onChange={v => upGex('callWall', v)} />
            <Field label="PUT WALL"       value={gex.putWall}   onChange={v => upGex('putWall', v)} />
            <Field label="ATR JOUR (pts)" value={gex.atr}       onChange={v => upGex('atr', v)} note="≈ 1 SD" />
          </G>
          <div style={{ marginTop:10 }}>
            <div style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.13em', color:'rgba(136,153,187,0.5)', marginBottom:6 }}>SD NIVEAUX — VWAP 10H30 / SETTLEMENT</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
              {([
                { label:'SD +2 VWAP', val:gexC.v2u, color:'#ff4444' },
                { label:'SD +2 SETT', val:gexC.s2u, color:'#ff6b6b' },
                { label:'SD +1 VWAP', val:gexC.v1u, color:'#f0d070' },
                { label:'SD +1 SETT', val:gexC.s1u, color:'#f0d070' },
                { label:'SD -1 VWAP', val:gexC.v1d, color:'#1eb3bc' },
                { label:'SD -1 SETT', val:gexC.s1d, color:'#1eb3bc' },
                { label:'SD -2 VWAP', val:gexC.v2d, color:'#00ff88' },
                { label:'SD -2 SETT', val:gexC.s2d, color:'#00ff88' },
              ] as const).map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', background:'rgba(0,0,0,0.25)', borderRadius:3 }}>
                  <span style={{ fontFamily:JB, fontSize:9, color:'rgba(136,153,187,0.5)' }}>{r.label}</span>
                  <span style={{ fontFamily:JB, fontSize:10, fontWeight:700, color:r.color }}>{fmt(r.val)}</span>
                </div>
              ))}
            </div>
          </div>
        </Sec>

        {/* 85/15 + §9 */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <Sec title="85/15 — ROTATIONNEL VS TREND DAY" icon="🔄" accent="#1eb3bc">
            <div style={{ padding:'10px 12px', borderRadius:4, background:`${rule8515.c}10`, border:`1px solid ${rule8515.c}30`, marginBottom:10 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
                <span style={{ fontFamily:ORB, fontSize:14, fontWeight:900, color:rule8515.c, letterSpacing:'0.08em' }}>{rule8515.type}</span>
                <span style={{ fontFamily:JB, fontSize:12, fontWeight:700, color:rule8515.c }}>{rule8515.pct}</span>
              </div>
              <span style={{ fontFamily:JB, fontSize:10, color:'rgba(200,190,165,0.7)' }}>{rule8515.action}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {[
                { label:'OVN HIGH vs RTH HIGH', ok: n(ovn.high)<=n(rth.high), a:fmt(n(ovn.high)), b:fmt(n(rth.high)) },
                { label:'OVN LOW vs RTH LOW',   ok: n(ovn.low)>=n(rth.low),   a:fmt(n(ovn.low)),  b:fmt(n(rth.low)) },
              ].map(row => (
                <div key={row.label} style={{ padding:'6px 8px', background:'rgba(0,0,0,0.25)', borderRadius:3, borderLeft:`2px solid ${row.ok?'#1eb3bc':'#ff4444'}` }}>
                  <div style={{ fontFamily:JB, fontSize:7, color:'rgba(136,153,187,0.4)', marginBottom:2 }}>{row.label}</div>
                  <div style={{ fontFamily:JB, fontSize:9, color:row.ok?'#1eb3bc':'#ff4444', fontWeight:700 }}>
                    {row.a} {row.ok?'≤':'>'} {row.b} {row.ok?'✓':'✗'}
                  </div>
                </div>
              ))}
            </div>
          </Sec>

          <Sec title="§9 — NQ + ES ALIGNMENT" icon="⚖" accent={s9.sc}>
            <G cols={3} gap={8}>
              <Field label="ES IB HIGH"  value={esIb.ibHigh}  onChange={v => upEs('ibHigh', v)} />
              <Field label="ES IB LOW"   value={esIb.ibLow}   onChange={v => upEs('ibLow', v)} />
              <Field label="ES IB CLOSE" value={esIb.ibClose} onChange={v => upEs('ibClose', v)} />
            </G>
            <div style={{ display:'flex', gap:5, marginTop:6 }}>
              {([{label:'ES LOW FIRST',v:false,c:'#00ff88'},{label:'ES HIGH FIRST',v:true,c:'#ff4444'}] as const).map(opt => (
                <button key={opt.label} onClick={() => setEsHF(opt.v)} style={{ flex:1, padding:'4px 4px', cursor:'pointer', borderRadius:3, fontFamily:JB, fontSize:8, fontWeight:700, background:esHF===opt.v?`${opt.c}18`:'rgba(0,0,0,0.3)', border:`1px solid ${esHF===opt.v?opt.c+'55':'rgba(255,255,255,0.07)'}`, color:esHF===opt.v?opt.c:'rgba(136,153,187,0.4)' }}>{opt.label}</button>
              ))}
            </div>
            {/* Alignment result */}
            <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {[
                { label:'NQ IB', val:ibC.cls, c:ibC.cc },
                { label:'ES IB', val:s9.cls,  c:s9.sc  },
              ].map(r => (
                <div key={r.label} style={{ padding:'6px 8px', background:'rgba(0,0,0,0.25)', borderRadius:3, textAlign:'center' }}>
                  <div style={{ fontFamily:JB, fontSize:7, color:'rgba(136,153,187,0.4)', marginBottom:2 }}>{r.label}</div>
                  <div style={{ fontFamily:ORB, fontSize:12, fontWeight:900, color:r.c }}>{r.val || '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:8, padding:'8px 10px', borderRadius:4, background:`${s9.sc}12`, border:`1px solid ${s9.sc}35`, textAlign:'center' }}>
              <span style={{ fontFamily:ORB, fontSize:13, fontWeight:900, color:s9.sc, letterSpacing:'0.08em' }}>{s9.status}</span>
              {!esIb.ibHigh && <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.35)', marginTop:2 }}>Entrer les données ES</div>}
            </div>
          </Sec>
        </div>
      </div>

      {/* ── RÉSULTAT ─────────────────────────────────────────────────── */}
      <div style={{ background:`${res.sc}08`, border:`1px solid ${res.sc}35`, borderTop:`3px solid ${res.sc}`, borderRadius:6, padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <div>
              <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.5)', letterSpacing:'0.1em', marginBottom:2 }}>SIGNAL</div>
              <div style={{ fontFamily:ORB, fontSize:30, fontWeight:900, color:res.sc, letterSpacing:'0.08em', lineHeight:1, textShadow:`0 0 20px ${res.sc}80` }}>{res.sig}</div>
            </div>
            <div>
              <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.5)', letterSpacing:'0.1em', marginBottom:2 }}>FIABILITÉ</div>
              <div style={{ fontFamily:ORB, fontSize:18, fontWeight:700, color:res.sc }}>{res.fid}</div>
            </div>
            <div style={{ width:1, height:40, background:'rgba(255,255,255,0.06)' }} />
            <div style={{ fontFamily:JB, fontSize:9, color:'rgba(136,153,187,0.5)', lineHeight:1.9 }}>
              <div>OVN <span style={{ color:ovnC.bc, fontWeight:700 }}>{ovnC.biais}</span></div>
              <div>85/15 <span style={{ color:rule8515.c, fontWeight:700 }}>{rule8515.type}</span></div>
              <div>ALN <span style={{ color:alnC.c, fontWeight:700 }}>{alnC.p} ({alnC.rel})</span></div>
              <div>IB <span style={{ color:ibC.cc, fontWeight:700 }}>{ibC.cls}</span> <span style={{ color:'rgba(136,153,187,0.4)', fontWeight:400 }}>({ibC.zone})</span></div>
              {esIb.ibHigh && <div>§9 <span style={{ color:s9.sc, fontWeight:700 }}>{s9.status}</span></div>}
            </div>
          </div>
          <div style={{ padding:'12px 20px', background:`${res.sc}15`, border:`1px solid ${res.sc}45`, borderRadius:4, textAlign:'center' }}>
            <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.5)', letterSpacing:'0.1em', marginBottom:2 }}>SCORE</div>
            <div style={{ fontFamily:ORB, fontSize:26, fontWeight:900, color:res.sc }}>{res.score>0?'+':''}{res.score}</div>
            <div style={{ fontFamily:JB, fontSize:7, color:'rgba(136,153,187,0.4)', marginTop:1 }}>/ ±{esIb.ibHigh?9:8} max</div>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginBottom:12 }}>
          {[
            { k:'ENTRÉE',  v:res.entree, c:'#c9a84c' },
            { k:'STOP',    v:res.stop,   c:'#ff4444' },
            { k:'CIBLE 1', v:res.c1,     c:'#00ff88' },
            { k:'CIBLE 2', v:res.c2,     c:'#1eb3bc' },
            { k:'R:R',     v:`${res.rr}:1`, c:res.sc },
          ].map(r => (
            <div key={r.k} style={{ background:'rgba(0,0,0,0.3)', borderRadius:4, padding:'8px 10px' }}>
              <div style={{ fontFamily:JB, fontSize:7, color:'rgba(136,153,187,0.4)', letterSpacing:'0.1em', marginBottom:4 }}>{r.k}</div>
              <div style={{ fontFamily:JB, fontSize:11, fontWeight:700, color:r.c, lineHeight:1.3 }}>{r.v}</div>
            </div>
          ))}
        </div>

        <div style={{ padding:'8px 12px', background:'rgba(0,0,0,0.3)', borderRadius:4, borderLeft:`3px solid ${res.sc}60`, marginBottom:14 }}>
          <span style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.14em', color:'rgba(136,153,187,0.5)', marginRight:10 }}>SCÉNARIO</span>
          <span style={{ fontFamily:JB, fontSize:10, color:'rgba(200,190,165,0.85)' }}>{res.scenario}</span>
        </div>

        {/* Recap table */}
        <div>
          <div style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.18em', color:'rgba(201,168,76,0.45)', marginBottom:8 }}>TABLEAU RÉCAPITULATIF</div>
          <div style={{ border:'1px solid rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
            {[
              { e:'RTH J-1',  c:`High/Low/Settle/HB`, v:`${rth.high} · ${rth.low} · ${rth.settle} · ${fmt(rthC.halfBack)}`, s:'—' },
              { e:'OVN',      c:`Open18h/AVWAP/Close`, v:`${ovn.open18h} · ${ovn.avwap18h} · ${ovn.close}`, s:ovnC.biais },
              { e:'85/15',    c:`OVN vs RTH range`,    v:rule8515.action, s:rule8515.type },
              { e:'ALN',      c:`Pattern ${alnC.p}`,   v:alnC.desc, s:alnC.rel },
              { e:'IB',       c:`${ibC.cls} · ${ibC.zone}`, v:`H ${ibS.ibHigh} · L ${ibS.ibLow} · C ${ibS.ibClose} · Mid ${fmt(ibC.mid)}`, s:ibC.desc },
              { e:'GEX',      c:`Flip/Call/Put/VWAP`,  v:`${gex.flip} · ${gex.callWall} · ${gex.putWall} · ${gex.vwap1030}`, s:'—' },
              { e:'§9',       c:`NQ ${ibC.cls} / ES ${s9.cls}`, v:s9.status, s:esIb.ibHigh?s9.status:'non renseigné' },
              { e:'RÉSULTAT', c:`${res.sig} · ${res.fid}`, v:`Entrée ${res.entree} · C1 ${res.c1} · C2 ${res.c2}`, s:`${res.score>0?'+':''}${res.score}` },
            ].map((row, i) => (
              <div key={row.e} style={{ display:'grid', gridTemplateColumns:'68px 150px 1fr 80px', padding:'5px 12px', gap:8, alignItems:'center', background:i%2===0?'rgba(0,0,0,0.2)':'transparent', borderBottom:i<7?'1px solid rgba(255,255,255,0.03)':'none' }}>
                <span style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.1em', color:'rgba(201,168,76,0.7)' }}>{row.e}</span>
                <span style={{ fontFamily:JB, fontSize:9, color:'rgba(136,153,187,0.6)' }}>{row.c}</span>
                <span style={{ fontFamily:JB, fontSize:9, color:'rgba(200,190,165,0.8)' }}>{row.v}</span>
                <span style={{ fontFamily:JB, fontSize:9, color:res.sc, textAlign:'right', fontWeight:700 }}>{row.s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
