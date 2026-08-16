import { useState, useMemo } from 'react'

const ORB = "'Orbitron', monospace"
const JB  = "'JetBrains Mono', monospace"

const n   = (v: string) => parseFloat(v) || 0
const fmt = (v: number, d = 2) => v ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'

/* ── Field ─────────────────────────────────────────────────────────── */
function Field({ label, value, onChange, ro, color, note }: {
  label: string; value: string; onChange?: (v: string) => void
  ro?: boolean; color?: string; note?: string
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: ORB, fontSize: 7, letterSpacing: '0.13em', color: 'rgba(136,153,187,0.5)' }}>{label}</span>
        {note && <span style={{ fontFamily: JB, fontSize: 7, color: 'rgba(136,153,187,0.35)' }}>{note}</span>}
      </div>
      <input
        value={value} readOnly={ro}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: ro ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.45)',
          border: ro ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(201,168,76,0.2)',
          borderRadius: 3, padding: '5px 8px',
          fontFamily: JB, fontSize: 12, fontWeight: 600,
          color: ro ? (color ?? '#c9a84c') : '#e2e8f0',
          outline: 'none', cursor: ro ? 'default' : 'text',
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
    <div style={{
      background: '#141820', borderRadius: 6, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.07)',
      borderTop: `2px solid ${accent}`,
    }}>
      <div style={{
        padding: '9px 16px', background: 'rgba(0,0,0,0.2)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 13, filter: `drop-shadow(0 0 5px ${accent}80)` }}>{icon}</span>
        <span style={{ fontFamily: ORB, fontSize: 8, fontWeight: 700, letterSpacing: '0.16em', color: accent }}>{title}</span>
      </div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  )
}

/* ── Grid helper ───────────────────────────────────────────────────── */
function G({ cols = 4, gap = 8, children }: { cols?: number; gap?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
      {children}
    </div>
  )
}

/* ── Badge ─────────────────────────────────────────────────────────── */
function Badge({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div style={{ padding: '8px 10px', borderRadius: 4, background: `${color}12`, border: `1px solid ${color}35` }}>
      <div style={{ fontFamily: JB, fontSize: 8, color: 'rgba(136,153,187,0.45)', letterSpacing: '0.1em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: ORB, fontSize: 14, fontWeight: 900, color, letterSpacing: '0.08em', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: JB, fontSize: 8, color: 'rgba(200,190,165,0.5)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

/* ── Main ──────────────────────────────────────────────────────────── */
export default function Calculateur() {
  /* State per section */
  const [rth, setRth] = useState({ open:'29910.25', high:'30272.75', low:'29863.50', settle:'30194.75', vah:'30210', val:'29967', poc:'30050' })
  const [ovn, setOvn] = useState({ open18h:'30194', avwap18h:'30220', high:'30280', low:'30175', close:'30275' })
  const [aln, setAln] = useState({ asiaHigh:'30280', asiaLow:'30175', londonHigh:'30272.75', londonLow:'29863.50' })
  const [ibS, setIbS] = useState({ rthOpen:'29900', orbHigh:'30050', orbLow:'29880', orbClose:'30020', ibHigh:'30239.50', ibLow:'29863.50', ibClose:'30234.25' })
  const [highFirst, setHighFirst] = useState(false)
  const [gex, setGex] = useState({ flip:'30150', callWall:'30600', putWall:'29600', vwap1030:'30150', atr:'150' })

  const upRth = (k: keyof typeof rth, v: string) => setRth(s => ({ ...s, [k]: v }))
  const upOvn = (k: keyof typeof ovn, v: string) => setOvn(s => ({ ...s, [k]: v }))
  const upAln = (k: keyof typeof aln, v: string) => setAln(s => ({ ...s, [k]: v }))
  const upIb  = (k: keyof typeof ibS, v: string) => setIbS(s => ({ ...s, [k]: v }))
  const upGex = (k: keyof typeof gex, v: string) => setGex(s => ({ ...s, [k]: v }))

  /* ── RTH ─────────────────────────────────────────────────────────── */
  const rthC = useMemo(() => ({
    halfBack: (n(rth.high) + n(rth.low)) / 2,
  }), [rth])

  /* ── OVN ─────────────────────────────────────────────────────────── */
  const ovnC = useMemo(() => {
    const diff = n(ovn.close) - n(rth.settle)
    const biais = diff > 5 ? 'LONG' : diff < -5 ? 'SHORT' : 'BALANCE'
    return { diff, biais, bc: biais === 'LONG' ? '#00ff88' : biais === 'SHORT' ? '#ff4444' : '#f0d070' }
  }, [ovn.close, rth.settle])

  /* ── ALN ─────────────────────────────────────────────────────────── */
  const alnC = useMemo(() => {
    const ah = n(aln.asiaHigh), al = n(aln.asiaLow)
    const lh = n(aln.londonHigh), ll = n(aln.londonLow)
    if (lh > ah && ll > al)  return { p:'P3', c:'#00ff88', desc:'London High/Low > Asia → Haussier', rel:'80.8%' }
    if (lh < ah && ll < al)  return { p:'P4', c:'#ff4444', desc:'London High/Low < Asia → Baissier', rel:'68.6%' }
    if (lh >= ah && ll <= al) return { p:'P1', c:'#f0d070', desc:'London englobe Asia → Mixte',        rel:'—' }
    if (lh <= ah && ll >= al) return { p:'P2', c:'#1eb3bc', desc:'London inside Asia → Rotation',      rel:'—' }
    return { p:'?', c:'rgba(255,255,255,0.4)', desc:'Inconclusive', rel:'—' }
  }, [aln])

  /* ── IB ──────────────────────────────────────────────────────────── */
  const ibC = useMemo(() => {
    const h = n(ibS.ibHigh), l = n(ibS.ibLow), c = n(ibS.ibClose)
    const range = h - l, mid = (h + l) / 2, tol = range * 0.03
    let cls = '', cc = '', desc = ''
    if (Math.abs(c - mid) <= tol)     { cls = 'MITIGÉ'; cc = '#f0d070'; desc = 'Close ≈ Mid ±3%' }
    else if (!highFirst && c > mid)   { cls = 'BULL A'; cc = '#00ff88'; desc = 'Low First + Close > Mid' }
    else if (highFirst  && c > mid)   { cls = 'BULL B'; cc = '#1eb3bc'; desc = 'High First + Close > Mid' }
    else if (highFirst  && c < mid)   { cls = 'BEAR A'; cc = '#ff4444'; desc = 'High First + Close < Mid' }
    else                               { cls = 'BEAR B'; cc = '#ff6b6b'; desc = 'Low First + Close < Mid' }
    return { range, mid, q1: l + range * 0.25, q3: l + range * 0.75, cls, cc, desc }
  }, [ibS, highFirst])

  /* ── GEX ─────────────────────────────────────────────────────────── */
  const gexC = useMemo(() => {
    const vw = n(gex.vwap1030), se = n(rth.settle), atr = n(gex.atr)
    return {
      v1u: vw + atr, v1d: vw - atr, v2u: vw + 2 * atr, v2d: vw - 2 * atr,
      s1u: se + atr, s1d: se - atr, s2u: se + 2 * atr, s2d: se - 2 * atr,
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

    let sig = '', fid = '', sc = ''
    if      (score >=  5) { sig = 'HAUSSIER'; fid = 'ÉLEVÉE';  sc = '#00ff88' }
    else if (score >=  3) { sig = 'HAUSSIER'; fid = 'MODÉRÉE'; sc = '#1eb3bc' }
    else if (score >=  1) { sig = 'HAUSSIER'; fid = 'FAIBLE';  sc = 'rgba(0,255,136,0.6)' }
    else if (score <= -5) { sig = 'BAISSIER'; fid = 'ÉLEVÉE';  sc = '#ff4444' }
    else if (score <= -3) { sig = 'BAISSIER'; fid = 'MODÉRÉE'; sc = '#ff6b6b' }
    else if (score <= -1) { sig = 'BAISSIER'; fid = 'FAIBLE';  sc = 'rgba(255,68,68,0.6)' }
    else                  { sig = 'NEUTRE';   fid = '—';       sc = '#f0d070' }

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
      stop:   fmt(stopVal),
      c1:     up ? fmt(ibH) : fmt(ibL),
      c2:     up ? fmt(cw)  : fmt(pw),
      scenario: up
        ? `${alnC.p} + ${ibC.cls} (${alnC.rel}) → casse IBH ${fmt(ibH)} · Call Wall ${fmt(cw)}`
        : `${alnC.p} + ${ibC.cls} (${alnC.rel}) → casse IBL ${fmt(ibL)} · Put Wall ${fmt(pw)}`,
    }
  }, [ovnC, alnC, ibC, ovn, ibS, gex])

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div style={{ padding: 0 }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>⚙</span>
          <div style={{
            fontFamily: ORB, fontSize: 'clamp(14px,2vw,22px)', fontWeight: 900, letterSpacing: '0.2em',
            background: 'linear-gradient(135deg,#c9a84c,#f0d070)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          } as React.CSSProperties}>SESSION CALCULATOR</div>
          <div style={{ padding:'3px 10px', background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:3, fontSize:8, letterSpacing:'0.14em', color:'rgba(201,168,76,0.7)', fontFamily:ORB }}>MÉTHODE SALAH</div>
        </div>
        <div style={{ fontSize:10, color:'rgba(136,153,187,0.5)', letterSpacing:'0.08em', fontFamily:JB }}>
          RTH J-1 → OVN → ALN → IB → GEX → RÉSULTAT · Pré-rempli: 13 août 2026
        </div>
        <div style={{ marginTop:8, height:1, background:'linear-gradient(90deg,rgba(201,168,76,0.3),rgba(30,179,188,0.2),transparent)' }} />
      </div>

      {/* Row 1: RTH + OVN */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <Sec title="RTH J-1" icon="📊" accent="#c9a84c">
          <G cols={4}>
            <Field label="OPEN"      value={rth.open}   onChange={v => upRth('open', v)} />
            <Field label="HIGH"      value={rth.high}   onChange={v => upRth('high', v)} />
            <Field label="LOW"       value={rth.low}    onChange={v => upRth('low', v)} />
            <Field label="SETTLE"    value={rth.settle} onChange={v => upRth('settle', v)} />
            <Field label="VAH"       value={rth.vah}    onChange={v => upRth('vah', v)} />
            <Field label="VAL"       value={rth.val}    onChange={v => upRth('val', v)} />
            <Field label="POC"       value={rth.poc}    onChange={v => upRth('poc', v)} />
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
            {/* OVN vs Settle computed */}
            <div>
              <span style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.13em', color:'rgba(136,153,187,0.5)', display:'block', marginBottom:3 }}>OVN VS SETTLE</span>
              <div style={{
                padding:'6px 8px', borderRadius:3, textAlign:'center',
                background:`${ovnC.bc}15`, border:`1px solid ${ovnC.bc}45`,
                fontFamily:ORB, fontSize:14, fontWeight:900,
                color:ovnC.bc, letterSpacing:'0.1em',
                textShadow:`0 0 10px ${ovnC.bc}80`,
              }}>{ovnC.biais}</div>
              <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.4)', textAlign:'center', marginTop:3 }}>
                {ovnC.diff >= 0 ? '+' : ''}{fmt(ovnC.diff)} pts vs Settle
              </div>
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
          {/* Pattern display */}
          <div style={{ marginTop:10, padding:'10px 12px', borderRadius:4, background:`${alnC.c}10`, border:`1px solid ${alnC.c}30` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
              <span style={{ fontFamily:ORB, fontSize:22, fontWeight:900, color:alnC.c, letterSpacing:'0.1em' }}>{alnC.p}</span>
              <span style={{ fontFamily:JB, fontSize:13, fontWeight:700, color:alnC.c }}>{alnC.rel}</span>
            </div>
            <span style={{ fontSize:10, color:'rgba(200,190,165,0.7)', fontFamily:JB }}>{alnC.desc}</span>
          </div>
          {/* Pattern legend */}
          <div style={{ marginTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
            {[
              { p:'P3', d:'LH/LL > Asia · Haussier', c:'#00ff88', r:'80.8%' },
              { p:'P4', d:'LH/LL < Asia · Baissier',  c:'#ff4444', r:'68.6%' },
              { p:'P1', d:'London englobe · Mixte',    c:'#f0d070', r:'—' },
              { p:'P2', d:'London inside · Rotation',  c:'#1eb3bc', r:'—' },
            ].map(row => (
              <div key={row.p} style={{
                display:'flex', gap:5, alignItems:'center', padding:'3px 6px',
                background: alnC.p === row.p ? `${row.c}15` : 'rgba(0,0,0,0.2)',
                borderRadius:3,
                border:`1px solid ${alnC.p === row.p ? row.c + '40' : 'rgba(255,255,255,0.04)'}`,
              }}>
                <span style={{ fontFamily:ORB, fontSize:8, color:row.c, fontWeight:700, flexShrink:0 }}>{row.p}</span>
                <span style={{ fontFamily:JB, fontSize:7, color:'rgba(136,153,187,0.5)' }}>{row.d}</span>
              </div>
            ))}
          </div>
        </Sec>

        <Sec title="INITIAL BALANCE (IB)" icon="⚡" accent="#f0d070">
          {/* ORB row */}
          <G cols={4} gap={8}>
            <Field label="RTH OPEN"  value={ibS.rthOpen}  onChange={v => upIb('rthOpen', v)} />
            <Field label="ORB HIGH"  value={ibS.orbHigh}  onChange={v => upIb('orbHigh', v)} note="9h30–9h50" />
            <Field label="ORB LOW"   value={ibS.orbLow}   onChange={v => upIb('orbLow', v)} />
            <Field label="ORB CLOSE" value={ibS.orbClose} onChange={v => upIb('orbClose', v)} />
          </G>
          <div style={{ height:6 }} />
          {/* IB + computed */}
          <G cols={4} gap={8}>
            <Field label="IB HIGH"  value={ibS.ibHigh}  onChange={v => upIb('ibHigh', v)} />
            <Field label="IB LOW"   value={ibS.ibLow}   onChange={v => upIb('ibLow', v)} />
            <Field label="IB CLOSE" value={ibS.ibClose} onChange={v => upIb('ibClose', v)} />
            <Field label="RANGE"    value={fmt(ibC.range)} ro color="rgba(136,153,187,0.6)" />
            <Field label="Q1 (25%)" value={fmt(ibC.q1)} ro color="#1eb3bc" />
            <Field label="MID (50%)" value={fmt(ibC.mid)} ro color="#c9a84c" />
            <Field label="Q3 (75%)" value={fmt(ibC.q3)} ro color="#1eb3bc" />
          </G>
          {/* HL order + classification */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
            <div>
              <span style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.13em', color:'rgba(136,153,187,0.5)', display:'block', marginBottom:5 }}>ORDRE HL</span>
              <div style={{ display:'flex', gap:5 }}>
                {([
                  { label:'LOW FIRST',  v:false, c:'#00ff88' },
                  { label:'HIGH FIRST', v:true,  c:'#ff4444' },
                ] as const).map(opt => (
                  <button key={opt.label} onClick={() => setHighFirst(opt.v)} style={{
                    flex:1, padding:'5px 4px', cursor:'pointer', borderRadius:3,
                    fontFamily:JB, fontSize:9, fontWeight:700, letterSpacing:'0.04em',
                    background: highFirst === opt.v ? `${opt.c}18` : 'rgba(0,0,0,0.3)',
                    border:`1px solid ${highFirst === opt.v ? opt.c + '55' : 'rgba(255,255,255,0.07)'}`,
                    color: highFirst === opt.v ? opt.c : 'rgba(136,153,187,0.4)',
                  }}>{opt.label}</button>
                ))}
              </div>
            </div>
            <Badge label="CLASSIFICATION" value={ibC.cls} color={ibC.cc} sub={ibC.desc} />
          </div>
        </Sec>
      </div>

      {/* Row 3: GEX */}
      <div style={{ marginBottom:12 }}>
        <Sec title="GEX · OPTIONS FLOW" icon="🎯" accent="#f0d070">
          <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:16 }}>
            <G cols={2} gap={8}>
              <Field label="GEX FLIP"       value={gex.flip}      onChange={v => upGex('flip', v)} />
              <Field label="VWAP 10H30"     value={gex.vwap1030}  onChange={v => upGex('vwap1030', v)} />
              <Field label="CALL WALL"      value={gex.callWall}  onChange={v => upGex('callWall', v)} />
              <Field label="PUT WALL"       value={gex.putWall}   onChange={v => upGex('putWall', v)} />
              <Field label="ATR JOUR (pts)" value={gex.atr}       onChange={v => upGex('atr', v)} note="≈ 1 SD" />
            </G>
            <div>
              <div style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.13em', color:'rgba(136,153,187,0.5)', marginBottom:8 }}>
                NIVEAUX SD — VWAP 10H30 ET SETTLEMENT
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4 }}>
                {([
                  { label:'SD +2 VWAP',   val:gexC.v2u, color:'#ff4444' },
                  { label:'SD +2 SETTLE', val:gexC.s2u, color:'#ff6b6b' },
                  { label:'SD +1 VWAP',   val:gexC.v1u, color:'#f0d070' },
                  { label:'SD +1 SETTLE', val:gexC.s1u, color:'#f0d070' },
                  { label:'SD -1 VWAP',   val:gexC.v1d, color:'#1eb3bc' },
                  { label:'SD -1 SETTLE', val:gexC.s1d, color:'#1eb3bc' },
                  { label:'SD -2 VWAP',   val:gexC.v2d, color:'#00ff88' },
                  { label:'SD -2 SETTLE', val:gexC.s2d, color:'#00ff88' },
                ] as const).map(r => (
                  <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 8px', background:'rgba(0,0,0,0.25)', borderRadius:3 }}>
                    <span style={{ fontFamily:JB, fontSize:9, color:'rgba(136,153,187,0.5)' }}>{r.label}</span>
                    <span style={{ fontFamily:JB, fontSize:10, fontWeight:700, color:r.color }}>{fmt(r.val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Sec>
      </div>

      {/* ── RÉSULTAT ─────────────────────────────────────────────────── */}
      <div style={{
        background:`${res.sc}08`, border:`1px solid ${res.sc}35`,
        borderTop:`3px solid ${res.sc}`, borderRadius:6, padding:'18px 20px',
      }}>
        {/* Signal header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <div>
              <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.5)', letterSpacing:'0.1em', marginBottom:2 }}>SIGNAL</div>
              <div style={{ fontFamily:ORB, fontSize:32, fontWeight:900, color:res.sc, letterSpacing:'0.08em', lineHeight:1, textShadow:`0 0 20px ${res.sc}80` }}>{res.sig}</div>
            </div>
            <div>
              <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.5)', letterSpacing:'0.1em', marginBottom:2 }}>FIABILITÉ</div>
              <div style={{ fontFamily:ORB, fontSize:18, fontWeight:700, color:res.sc }}>{res.fid}</div>
            </div>
            <div style={{ width:1, height:40, background:'rgba(255,255,255,0.06)' }} />
            <div style={{ fontFamily:JB, fontSize:9, color:'rgba(136,153,187,0.5)', lineHeight:1.8 }}>
              <div>OVN <span style={{ color:ovnC.bc, fontWeight:700 }}>{ovnC.biais}</span></div>
              <div>ALN <span style={{ color:alnC.c, fontWeight:700 }}>{alnC.p} ({alnC.rel})</span></div>
              <div>IB  <span style={{ color:ibC.cc, fontWeight:700 }}>{ibC.cls}</span></div>
            </div>
          </div>
          <div style={{ padding:'12px 20px', background:`${res.sc}15`, border:`1px solid ${res.sc}45`, borderRadius:4, textAlign:'center' }}>
            <div style={{ fontFamily:JB, fontSize:8, color:'rgba(136,153,187,0.5)', letterSpacing:'0.1em', marginBottom:2 }}>SCORE</div>
            <div style={{ fontFamily:ORB, fontSize:26, fontWeight:900, color:res.sc }}>{res.score > 0 ? '+' : ''}{res.score}</div>
            <div style={{ fontFamily:JB, fontSize:7, color:'rgba(136,153,187,0.4)', marginTop:1 }}>/ ±8 max</div>
          </div>
        </div>

        {/* Levels row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:8, marginBottom:12 }}>
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

        {/* Scenario */}
        <div style={{ padding:'8px 12px', background:'rgba(0,0,0,0.3)', borderRadius:4, borderLeft:`3px solid ${res.sc}60`, marginBottom:14 }}>
          <span style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.14em', color:'rgba(136,153,187,0.5)', marginRight:10 }}>SCÉNARIO</span>
          <span style={{ fontFamily:JB, fontSize:10, color:'rgba(200,190,165,0.85)' }}>{res.scenario}</span>
        </div>

        {/* Recap table */}
        <div>
          <div style={{ fontFamily:ORB, fontSize:7, letterSpacing:'0.18em', color:'rgba(201,168,76,0.45)', marginBottom:8 }}>TABLEAU RÉCAPITULATIF</div>
          <div style={{ border:'1px solid rgba(255,255,255,0.06)', borderRadius:4, overflow:'hidden' }}>
            {[
              { e:'RTH J-1',   c:`Open / High / Low / Settle / HB`,       v:`${rth.open} · ${rth.high} · ${rth.low} · ${rth.settle} · ${fmt(rthC.halfBack)}`, s:'—' },
              { e:'OVN',       c:`Open 18h / AVWAP / Close`,               v:`${ovn.open18h} · ${ovn.avwap18h} · ${ovn.close}`,                               s:ovnC.biais },
              { e:'ALN',       c:`Pattern ${alnC.p}`,                       v:alnC.desc,                                                                       s:alnC.rel },
              { e:'IB',        c:`${ibC.cls} · Mid ${fmt(ibC.mid)}`,        v:`H ${ibS.ibHigh} · L ${ibS.ibLow} · C ${ibS.ibClose}`,                           s:ibC.desc },
              { e:'GEX',       c:`Flip / Call / Put / VWAP`,               v:`${gex.flip} · ${gex.callWall} · ${gex.putWall} · ${gex.vwap1030}`,               s:'—' },
              { e:'RÉSULTAT',  c:`${res.sig} · ${res.fid}`,                v:`Entrée ${res.entree} · C1 ${res.c1} · C2 ${res.c2}`,                            s:`${res.score > 0 ? '+' : ''}${res.score}` },
            ].map((row, i) => (
              <div key={row.e} style={{
                display:'grid', gridTemplateColumns:'72px 180px 1fr 60px',
                padding:'6px 12px', gap:8, alignItems:'center',
                background: i % 2 === 0 ? 'rgba(0,0,0,0.2)' : 'transparent',
                borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              }}>
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
