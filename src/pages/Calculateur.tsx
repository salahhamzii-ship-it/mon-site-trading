import { useState, useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = 'NQ' | 'ES' | 'GC' | 'CL'
type OTF = 'Higher' | 'Lower' | 'Neutral' | ''
type Mig = 'Stable' | 'Ascendant' | 'Descendant' | ''

interface TD {
  mHigh: string; mLow: string; mPoc: string; mOtf: OTF; mVah: string; mVal: string
  wHigh: string; wLow: string; wPoc: string; wOtf: OTF; wVah: string; wVal: string
  csVah: string; csVal: string; csPoc: string
  crVah: string; crVal: string; crPoc: string
  lignes: string
  gapDay: boolean; excess: boolean; poorHigh: boolean; poorLow: boolean
  tpoOvnH: string; tpoOvnL: string; pocMig: Mig
  events: string; vix: string; petrole: string; yields: string
}
interface Instr {
  lastPx: string
  rOpen: string; rHigh: string; rLow: string; rSettle: string; rVah: string; rVal: string; rPoc: string
  oHigh: string; oLow: string; oClose: string
  ibHigh: string; ibLow: string; ibClose: string; ibOrdre: string; ibClass: string
  orbHigh: string; orbLow: string; orbClose: string
  alnBull: string; alnBear: string; alnVad: string; alnConf: string
  p9Atr: string; p9Align: string; p9Dir: string
  rSignal: string; rFiab: string; rEntry: string; rStop: string; rC1: string; rC2: string
}
interface Cfg {
  ibOffset: string; showNYIBBg: boolean; ibTextSize: string
  asiaMode: string; asiaStart: string; asiaEnd: string
  londonMode: string; londonStart: string; londonEnd: string
  nyMode: string; nyStart: string; nyEnd: string
  timezone: string
  showAsia: boolean; showLondon: boolean; showNY: boolean; showLabels: boolean
  nyBg: string; nyFH: string; tblBg: string; tblHd: string
  showOR: boolean; orDur: string; orSrc: string; orManual: string
  showORBg: boolean; orBgOp: string; showRot: boolean; rotSide: string
  autoStep: boolean; stepManual: string; rotColor: string; lineStyle: string
  emphNth: string; showORLbl: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS: Tab[]            = ['NQ', 'ES', 'GC', 'CL']
const IB_H: Record<Tab,string> = { NQ:'09:30–10:30 EST', ES:'09:30–10:30 EST', GC:'08:20–09:20 EST', CL:'09:00–10:00 EST' }
const OR_H: Record<Tab,string> = { NQ:'09:30–09:50 EST', ES:'09:30–09:50 EST', GC:'08:20–08:40 EST', CL:'09:00–09:20 EST' }
const TC: Record<Tab,string>   = { NQ:'#c9a84c', ES:'#1eb3bc', GC:'#d4af37', CL:'#ff8c42' }
const C = { gold:'#c9a84c', goldL:'#f0d070', up:'#00ff88', down:'#ff4444', teal:'#1eb3bc', amber:'#d4af37', muted:'#8899bb', sur:'rgba(10,14,24,0.85)', brd:'rgba(201,168,76,0.11)' }
const orb = (sz:number, w=700, ex?:CSSProperties):CSSProperties => ({ fontFamily:'Orbitron,monospace', fontSize:sz, fontWeight:w, ...ex })
const jb  = (sz:number, w=400, ex?:CSSProperties):CSSProperties => ({ fontFamily:'"JetBrains Mono",monospace', fontSize:sz, fontWeight:w, ...ex })
const pf  = (v:string) => parseFloat(v)||0
const fmt2 = (v:number) => isNaN(v) ? '—' : v.toFixed(2)

const mkI = (): Instr => ({ lastPx:'', rOpen:'', rHigh:'', rLow:'', rSettle:'', rVah:'', rVal:'', rPoc:'', oHigh:'', oLow:'', oClose:'', ibHigh:'', ibLow:'', ibClose:'', ibOrdre:'', ibClass:'', orbHigh:'', orbLow:'', orbClose:'', alnBull:'', alnBear:'', alnVad:'', alnConf:'', p9Atr:'', p9Align:'', p9Dir:'', rSignal:'', rFiab:'', rEntry:'', rStop:'', rC1:'', rC2:'' })
const mkTD = (): TD => ({ mHigh:'', mLow:'', mPoc:'', mOtf:'', mVah:'', mVal:'', wHigh:'', wLow:'', wPoc:'', wOtf:'', wVah:'', wVal:'', csVah:'', csVal:'', csPoc:'', crVah:'', crVal:'', crPoc:'', lignes:'', gapDay:false, excess:false, poorHigh:false, poorLow:false, tpoOvnH:'', tpoOvnL:'', pocMig:'', events:'', vix:'', petrole:'', yields:'' })
const mkC = (): Cfg => ({ ibOffset:'0', showNYIBBg:true, ibTextSize:'8', asiaMode:'Auto', asiaStart:'20:00', asiaEnd:'23:00', londonMode:'Auto', londonStart:'03:00', londonEnd:'04:00', nyMode:'Auto', nyStart:'09:30', nyEnd:'10:30', timezone:'America/New_York', showAsia:true, showLondon:true, showNY:true, showLabels:true, nyBg:'rgba(201,168,76,0.06)', nyFH:'rgba(201,168,76,0.10)', tblBg:'rgba(10,14,24,0.9)', tblHd:'rgba(201,168,76,0.15)', showOR:true, orDur:'20', orSrc:'First Bar', orManual:'', showORBg:true, orBgOp:'0.06', showRot:true, rotSide:'4', autoStep:true, stepManual:'', rotColor:'rgba(201,168,76,0.5)', lineStyle:'Dashed', emphNth:'4', showORLbl:true })

// ─── Presentational components ────────────────────────────────────────────────
const iS = (ro:boolean):CSSProperties => ({ width:'100%', background: ro ? 'rgba(201,168,76,0.05)' : 'rgba(255,255,255,0.04)', border:`1px solid ${ro ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.15)'}`, borderRadius:2, padding:'2px 5px', height:22, fontSize:10, color: ro ? C.gold : '#fff', fontFamily:'"JetBrains Mono",monospace', outline:'none', boxSizing:'border-box' })

function F({ l, v='', s, t, opts, ro, dv }: { l:string; v?:string; s?:(x:string)=>void; t?:string; opts?:string[]; ro?:boolean; dv?:string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <span style={jb(7, 400, { color:C.muted, textTransform:'uppercase', letterSpacing:'0.09em' })}>{l}</span>
      {ro ? <div style={iS(true)}>{dv ?? v ?? '—'}</div>
       : opts ? <select value={v} onChange={e=>s!(e.target.value)} style={{...iS(false),cursor:'pointer'}}><option value="">—</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
       : <input type={t||'number'} value={v} onChange={e=>s!(e.target.value)} style={iS(false)} />}
    </div>
  )
}

function Ck({ l, v, s }: { l:string; v:boolean; s:(x:boolean)=>void }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer' }}>
      <input type="checkbox" checked={v} onChange={e=>s(e.target.checked)} style={{ accentColor:C.gold, width:11, height:11 }} />
      <span style={jb(9, 400, { color:'#ccc' })}>{l}</span>
    </label>
  )
}

function Sec({ title, col=C.gold, mini, children }: { title:string; col?:string; mini?:boolean; children:ReactNode }) {
  return (
    <div style={{ border:`1px solid ${C.brd}`, borderRadius:3, overflow:'hidden' }}>
      <div style={{ padding: mini ? '3px 8px' : '4px 8px', borderLeft:`2px solid ${col}`, background:'rgba(201,168,76,0.04)', borderBottom:`1px solid ${C.brd}` }}>
        <span style={orb(mini?6.5:7.5, 700, { color:col, letterSpacing:'0.18em' })}>{title}</span>
      </div>
      <div style={{ padding: mini ? '6px 8px' : '8px 8px', display:'flex', flexDirection:'column', gap: mini ? 4 : 6, background:C.sur }}>
        {children}
      </div>
    </div>
  )
}

function G2({ ch }:{ ch:ReactNode }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>{ch}</div> }
function G3({ ch }:{ ch:ReactNode }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5 }}>{ch}</div> }
function G4({ ch }:{ ch:ReactNode }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:5 }}>{ch}</div> }

function Pill({ label, col }: { label:string; col:string }) {
  return <span style={{ display:'inline-block', padding:'1px 6px', borderRadius:2, fontSize:8, fontFamily:'Orbitron,monospace', background:`${col}18`, border:`1px solid ${col}40`, color:col, letterSpacing:'0.1em' }}>{label}</span>
}

function Btn({ label, active, col=C.muted, onClick }: { label:string; active:boolean; col?:string; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{ padding:'4px 10px', border:'none', borderRadius:2, cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, letterSpacing:'0.12em', background: active ? `${col}18` : 'transparent', outline:`1px solid ${active ? col+'50' : 'rgba(201,168,76,0.14)'}`, color: active ? col : 'rgba(136,153,187,0.65)', transition:'all 0.14s' }}>
      {label}
    </button>
  )
}

function TA({ v, s, ph }: { v:string; s:(x:string)=>void; ph:string }) {
  return (
    <textarea value={v} onChange={e=>s(e.target.value)} placeholder={ph} style={{ width:'100%', height:44, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(201,168,76,0.15)', borderRadius:2, padding:'4px 6px', fontSize:9, color:'#ccc', outline:'none', resize:'none', fontFamily:'"JetBrains Mono",monospace' }} />
  )
}

function Result({ signal, fiab, entry, stop, c1, c2, rr, col }: { signal:string; fiab:string; entry:string; stop:string; c1:string; c2:string; rr:string; col:string }) {
  const sc = signal==='ACHAT' ? C.up : signal==='VENTE' ? C.down : C.muted
  return (
    <div style={{ padding:'10px 12px', borderRadius:3, marginTop:2, background:`${col}08`, border:`1px solid ${col}28` }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
        {signal && <span style={{ width:8, height:8, borderRadius:'50%', background:sc, flexShrink:0, animation: signal==='ACHAT' ? 'pulseDot 1.8s infinite' : signal==='VENTE' ? 'pulseDotRed 1.8s infinite' : 'none' }} />}
        <span style={orb(22, 900, { color:sc, lineHeight:1, textShadow:`0 0 14px ${sc}` })}>{signal||'—'}</span>
        {fiab && <Pill label={`FIAB ${fiab}%`} col={sc} />}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
        {([['ENTRY',entry,C.gold],['STOP',stop,C.down],['CIB 1',c1,C.up],['CIB 2',c2,C.up],['R:R',rr,C.teal]] as [string,string,string][]).map(([lbl,val,c])=>(
          <div key={lbl}>
            <div style={jb(7, 400, { color:C.muted, marginBottom:1 })}>{lbl}</div>
            <div style={jb(12, 700, { color:c })}>{val||'—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Calculateur() {
  const [tab,    setTab]    = useState<Tab>('NQ')
  const [tdOpen, setTdOpen] = useState(true)
  const [trOpen, setTrOpen] = useState(false)
  const [stOpen, setStOpen] = useState(false)
  const [td,     setTd]     = useState<TD>(mkTD)
  const [II,     setII]     = useState<Record<Tab,Instr>>({ NQ:mkI(), ES:mkI(), GC:mkI(), CL:mkI() })
  const [cfg,    setCfg]    = useState<Cfg>(mkC)

  const upTD = <K extends keyof TD>(k:K, v:TD[K]) => setTd(p=>({...p,[k]:v}))
  const upI  = (t:Tab, k:keyof Instr, v:string)   => setII(p=>({...p,[t]:{...p[t],[k]:v}}))
  const upC  = <K extends keyof Cfg>(k:K, v:Cfg[K]) => setCfg(p=>({...p,[k]:v}))

  const I   = II[tab]
  const nq  = II.NQ
  const col = TC[tab]

  // ── Computed ──────────────────────────────────────────────────────────────
  const insideWeek = useMemo(() => {
    const wH=pf(td.wHigh), wL=pf(td.wLow), mH=pf(td.mHigh), mL=pf(td.mLow)
    return wH>0 && mH>0 && wH < mH && wL > mL
  }, [td.wHigh, td.wLow, td.mHigh, td.mLow])

  const ibDir = useMemo(():OTF => nq.ibOrdre==='HL' ? 'Higher' : nq.ibOrdre==='LH' ? 'Lower' : '', [nq.ibOrdre])

  const score = useMemo(() => {
    let s = 0
    if (ibDir) {
      if (td.mOtf === ibDir) s += 1
      if (td.wOtf === ibDir) s += 1
      if (td.gapDay) s += 1
      if (td.pocMig==='Ascendant'  && ibDir==='Higher') s += 1
      if (td.pocMig==='Descendant' && ibDir==='Lower')  s += 1
      const pNQ = II.NQ.p9Align
      if (pNQ==='Aligné') s += 1; else if (pNQ==='Contra') s -= 1
      const pES = II.ES.p9Align
      if (pES==='Aligné') s += 1; else if (pES==='Contra') s -= 1
    }
    if (insideWeek) s -= 1
    return Math.max(-9, Math.min(9, s))
  }, [td, II, ibDir, insideWeek])

  const halfBack = useMemo(() => { const h=pf(I.rHigh),l=pf(I.rLow); return h>0&&l>0 ? fmt2((h+l)/2) : '' }, [I.rHigh, I.rLow])
  const ibMid    = useMemo(() => { const h=pf(I.ibHigh),l=pf(I.ibLow); return h>0&&l>0 ? fmt2((h+l)/2) : '' }, [I.ibHigh, I.ibLow])
  const ovnVsS   = useMemo(() => {
    const oc=pf(I.oClose), se=pf(I.rSettle)
    if (!oc||!se) return ''
    const d=oc-se; if (Math.abs(d)<1) return 'BALANCE'
    return d>0 ? 'LONG' : 'SHORT'
  }, [I.oClose, I.rSettle])
  const orbPos   = useMemo(() => {
    const px=pf(I.lastPx), oh=pf(I.orbHigh), ol=pf(I.orbLow)
    if (!px||!oh||!ol) return ''
    return px>oh ? 'AU-DESSUS' : px<ol ? 'EN-DESSOUS' : 'DANS ORB'
  }, [I.lastPx, I.orbHigh, I.orbLow])
  const rr = useMemo(() => {
    const en=pf(I.rEntry), st=pf(I.rStop), c1=pf(I.rC1)
    if (!en||!st||!c1) return ''
    const risk=Math.abs(en-st), rew=Math.abs(c1-en)
    return risk>0 ? `1 : ${(rew/risk).toFixed(1)}` : ''
  }, [I.rEntry, I.rStop, I.rC1])

  const sc    = score
  const scCol = sc>0 ? C.up : sc<0 ? C.down : C.muted
  const scPct = Math.abs(sc)/9*100

  // ── Render: Top-Down Dalton ───────────────────────────────────────────────
  const renderTD = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <Sec title="MONTHLY" col={C.gold}>
          <G3 ch={<><F l="High" v={td.mHigh} s={v=>upTD('mHigh',v)} /><F l="Low" v={td.mLow} s={v=>upTD('mLow',v)} /><F l="POC" v={td.mPoc} s={v=>upTD('mPoc',v)} /></>}/>
          <G3 ch={<><F l="OTF" v={td.mOtf} s={v=>upTD('mOtf',v as OTF)} opts={['Higher','Lower','Neutral']} /><F l="VAH" v={td.mVah} s={v=>upTD('mVah',v)} /><F l="VAL" v={td.mVal} s={v=>upTD('mVal',v)} /></>}/>
        </Sec>
        <Sec title="WEEKLY" col={C.goldL}>
          <G3 ch={<><F l="High" v={td.wHigh} s={v=>upTD('wHigh',v)} /><F l="Low" v={td.wLow} s={v=>upTD('wLow',v)} /><F l="POC" v={td.wPoc} s={v=>upTD('wPoc',v)} /></>}/>
          <G3 ch={<><F l="OTF" v={td.wOtf} s={v=>upTD('wOtf',v as OTF)} opts={['Higher','Lower','Neutral']} /><F l="VAH" v={td.wVah} s={v=>upTD('wVah',v)} /><F l="VAL" v={td.wVal} s={v=>upTD('wVal',v)} /></>}/>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={jb(8, 400, { color:C.muted })}>Inside Week :</span>
            <Pill label={insideWeek ? 'OUI' : 'NON'} col={insideWeek ? C.down : C.up} />
          </div>
        </Sec>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        <Sec title="COMPOSITE SEMAINE" col={C.teal} mini>
          <G3 ch={<><F l="VAH" v={td.csVah} s={v=>upTD('csVah',v)} /><F l="VAL" v={td.csVal} s={v=>upTD('csVal',v)} /><F l="POC" v={td.csPoc} s={v=>upTD('csPoc',v)} /></>}/>
        </Sec>
        <Sec title="COMPOSITE RTH" col={C.teal} mini>
          <G3 ch={<><F l="VAH" v={td.crVah} s={v=>upTD('crVah',v)} /><F l="VAL" v={td.crVal} s={v=>upTD('crVal',v)} /><F l="POC" v={td.crPoc} s={v=>upTD('crPoc',v)} /></>}/>
        </Sec>
        <Sec title="PROFILS TPO" col={C.amber} mini>
          <G3 ch={<><F l="OVN High" v={td.tpoOvnH} s={v=>upTD('tpoOvnH',v)} /><F l="OVN Low" v={td.tpoOvnL} s={v=>upTD('tpoOvnL',v)} /><F l="POC Migration" v={td.pocMig} s={v=>upTD('pocMig',v as Mig)} opts={['Stable','Ascendant','Descendant']} /></>}/>
        </Sec>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:8 }}>
        <Sec title="DAILY BARS" col={C.down} mini>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <Ck l="Gap"       v={td.gapDay}   s={v=>upTD('gapDay',v)} />
            <Ck l="Excess"    v={td.excess}   s={v=>upTD('excess',v)} />
            <Ck l="Poor High" v={td.poorHigh} s={v=>upTD('poorHigh',v)} />
            <Ck l="Poor Low"  v={td.poorLow}  s={v=>upTD('poorLow',v)} />
          </div>
        </Sec>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <Sec title="CONTEXTE · ÉVÉNEMENTS" col={C.muted} mini>
            <TA v={td.events} s={v=>upTD('events',v)} ph="FOMC · NFP · CPI · Options Expiry..." />
            <G3 ch={<><F l="VIX" v={td.vix} s={v=>upTD('vix',v)} t="text" /><F l="Pétrole" v={td.petrole} s={v=>upTD('petrole',v)} t="text" /><F l="Yields" v={td.yields} s={v=>upTD('yields',v)} t="text" /></>}/>
          </Sec>
          <Sec title="MES LIGNES WE" col={C.goldL} mini>
            <TA v={td.lignes} s={v=>upTD('lignes',v)} ph="Niveaux hebdomadaires préparés..." />
          </Sec>
        </div>
      </div>
    </div>
  )

  // ── Render: Instrument Panel ──────────────────────────────────────────────
  const hasALN = tab === 'NQ'
  const hasP9  = tab === 'NQ' || tab === 'ES'

  const renderInstr = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <Sec title="RTH J-1" col={col}>
          <G4 ch={<><F l="Open" v={I.rOpen} s={v=>upI(tab,'rOpen',v)} /><F l="High" v={I.rHigh} s={v=>upI(tab,'rHigh',v)} /><F l="Low" v={I.rLow} s={v=>upI(tab,'rLow',v)} /><F l="Settle" v={I.rSettle} s={v=>upI(tab,'rSettle',v)} /></>}/>
          <G4 ch={<><F l="VAH" v={I.rVah} s={v=>upI(tab,'rVah',v)} /><F l="VAL" v={I.rVal} s={v=>upI(tab,'rVal',v)} /><F l="POC" v={I.rPoc} s={v=>upI(tab,'rPoc',v)} /><F l="Half Back" ro dv={halfBack} /></>}/>
        </Sec>
        <Sec title="OVN / RTH" col={col}>
          <G3 ch={<><F l="OVN High" v={I.oHigh} s={v=>upI(tab,'oHigh',v)} /><F l="OVN Low" v={I.oLow} s={v=>upI(tab,'oLow',v)} /><F l="OVN Close" v={I.oClose} s={v=>upI(tab,'oClose',v)} /></>}/>
          <div style={{ display:'flex', alignItems:'center', gap:8, paddingTop:2 }}>
            <span style={jb(8, 400, { color:C.muted })}>OVN vs Settle :</span>
            {ovnVsS ? <Pill label={ovnVsS} col={ovnVsS==='LONG'?C.up:ovnVsS==='SHORT'?C.down:C.muted} />
                    : <span style={jb(8, 400, { color:'rgba(136,153,187,0.35)' })}>—</span>}
          </div>
        </Sec>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <Sec title={`IB · ${IB_H[tab]}`} col={col}>
          <G4 ch={<><F l="IB High" v={I.ibHigh} s={v=>upI(tab,'ibHigh',v)} /><F l="IB Low" v={I.ibLow} s={v=>upI(tab,'ibLow',v)} /><F l="IB Close" v={I.ibClose} s={v=>upI(tab,'ibClose',v)} /><F l="IB Mid" ro dv={ibMid} /></>}/>
          <G2 ch={<><F l="Ordre HL" v={I.ibOrdre} s={v=>upI(tab,'ibOrdre',v)} opts={['HL','LH']} /><F l="Classification" v={I.ibClass} s={v=>upI(tab,'ibClass',v)} opts={['Normal','Wide IB','Narrow IB','Rotational']} /></>}/>
        </Sec>
        <Sec title={`ORB 20 MIN · ${OR_H[tab]}`} col={col}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
            <div style={{ flex:1 }}>
              <F l="Dernier prix" v={I.lastPx} s={v=>upI(tab,'lastPx',v)} />
            </div>
            {orbPos && <Pill label={orbPos} col={orbPos==='AU-DESSUS'?C.up:orbPos==='EN-DESSOUS'?C.down:C.muted} />}
          </div>
          <G3 ch={<><F l="ORB High" v={I.orbHigh} s={v=>upI(tab,'orbHigh',v)} /><F l="ORB Low" v={I.orbLow} s={v=>upI(tab,'orbLow',v)} /><F l="ORB Close" v={I.orbClose} s={v=>upI(tab,'orbClose',v)} /></>}/>
        </Sec>
      </div>

      {hasALN && (
        <Sec title="ALN · NIVEAUX (NQ uniquement)" col={C.amber}>
          <G4 ch={<><F l="Bull Level" v={I.alnBull} s={v=>upI(tab,'alnBull',v)} /><F l="Bear Level" v={I.alnBear} s={v=>upI(tab,'alnBear',v)} /><F l="VAD" v={I.alnVad} s={v=>upI(tab,'alnVad',v)} opts={['HAUSSE','BAISSE','NEUTRE']} /><F l="Conf %" v={I.alnConf} s={v=>upI(tab,'alnConf',v)} /></>}/>
        </Sec>
      )}

      {hasP9 && (
        <Sec title="§9 · SETUP (NQ / ES uniquement)" col={C.teal}>
          <G3 ch={<><F l="ATR (pts)" v={I.p9Atr} s={v=>upI(tab,'p9Atr',v)} /><F l="Alignement" v={I.p9Align} s={v=>upI(tab,'p9Align',v)} opts={['Aligné','Contra','Neutre']} /><F l="Direction" v={I.p9Dir} s={v=>upI(tab,'p9Dir',v)} opts={['LONG','SHORT','NEUTRE']} /></>}/>
        </Sec>
      )}

      <Sec title={`RÉSULTAT · ${tab}`} col={col}>
        <G4 ch={<><F l="Signal" v={I.rSignal} s={v=>upI(tab,'rSignal',v)} opts={['ACHAT','VENTE','NEUTRE']} /><F l="Fiabilité %" v={I.rFiab} s={v=>upI(tab,'rFiab',v)} /><F l="Entrée" v={I.rEntry} s={v=>upI(tab,'rEntry',v)} /><F l="Stop" v={I.rStop} s={v=>upI(tab,'rStop',v)} /></>}/>
        <G3 ch={<><F l="Cible 1" v={I.rC1} s={v=>upI(tab,'rC1',v)} /><F l="Cible 2" v={I.rC2} s={v=>upI(tab,'rC2',v)} /><F l="R:R" ro dv={rr} /></>}/>
        <Result signal={I.rSignal} fiab={I.rFiab} entry={I.rEntry} stop={I.rStop} c1={I.rC1} c2={I.rC2} rr={rr} col={col} />
      </Sec>
    </div>
  )

  // ── Render: Live Tracker ──────────────────────────────────────────────────
  const atr  = pf(I.p9Atr)
  const lp   = pf(I.lastPx)
  const sdP  = lp>0&&atr>0 ? fmt2(lp+atr) : '—'
  const sdM  = lp>0&&atr>0 ? fmt2(lp-atr) : '—'
  const oMid = td.tpoOvnH&&td.tpoOvnL ? fmt2((pf(td.tpoOvnH)+pf(td.tpoOvnL))/2) : '—'

  const renderTracker = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
        {([['LAST',I.lastPx||'—',C.gold,20],['OVN MID',oMid,C.amber,14],['POC J-1',I.rPoc||'—',C.teal,14],['SD +1',sdP,C.up,14],['SD -1',sdM,C.down,14]] as [string,string,string,number][]).map(([l,v,c,sz])=>(
          <div key={l}>
            <div style={jb(7, 400, { color:C.muted, marginBottom:3 })}>{l}</div>
            <div style={jb(sz, 700, { color:c })}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {lp>0&&pf(I.ibHigh)>0&&lp>pf(I.ibHigh) && <Alert msg={`▲ Prix au-dessus de l'IB High (${I.ibHigh})`} col={C.up} />}
        {lp>0&&pf(I.ibLow)>0 &&lp<pf(I.ibLow)  && <Alert msg={`▼ Prix en-dessous de l'IB Low (${I.ibLow})`}  col={C.down} />}
        {lp>0&&pf(I.rPoc)>0  &&Math.abs(lp-pf(I.rPoc))<2 && <Alert msg={`◈ Prix proche du POC J-1 (${I.rPoc})`} col={C.gold} />}
        {lp>0&&pf(I.orbHigh)>0&&lp>pf(I.orbHigh) && <Alert msg={`▲ Extension au-dessus de l'ORB High (${I.orbHigh})`} col={C.up} />}
        {lp>0&&pf(I.orbLow)>0 &&lp<pf(I.orbLow)  && <Alert msg={`▼ Cassure sous l'ORB Low (${I.orbLow})`} col={C.down} />}
        {(!lp || (!pf(I.ibHigh)&&!pf(I.ibLow))) && <span style={jb(8, 400, { color:'rgba(136,153,187,0.4)' })}>Saisir un dernier prix + IB pour activer les alertes.</span>}
      </div>
    </div>
  )

  // ── Render: Settings ─────────────────────────────────────────────────────
  const renderSettings = () => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
      <Sec title="IB · INITIAL BALANCE">
        <G2 ch={<><F l="IB Line Offset" v={cfg.ibOffset} s={v=>upC('ibOffset',v)} /><F l="Table Text Size" v={cfg.ibTextSize} s={v=>upC('ibTextSize',v)} /></>}/>
        <Ck l="Show NY IB Background" v={cfg.showNYIBBg} s={v=>upC('showNYIBBg',v)} />
        <Ck l="Show Labels"           v={cfg.showLabels} s={v=>upC('showLabels',v)} />
        <G2 ch={<><F l="NY IB Bg Color"     v={cfg.nyBg}  s={v=>upC('nyBg',v)}  t="text" /><F l="NY First Hour Color" v={cfg.nyFH}  s={v=>upC('nyFH',v)}  t="text" /></>}/>
        <G2 ch={<><F l="Table Bg Color"     v={cfg.tblBg} s={v=>upC('tblBg',v)} t="text" /><F l="Table Header Color"  v={cfg.tblHd} s={v=>upC('tblHd',v)} t="text" /></>}/>
      </Sec>
      <Sec title="SESSIONS · HORAIRES">
        <F l="Timezone" v={cfg.timezone} s={v=>upC('timezone',v)} t="text" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5 }}>
          <Ck l="Asia"   v={cfg.showAsia}   s={v=>upC('showAsia',v)} />
          <Ck l="London" v={cfg.showLondon} s={v=>upC('showLondon',v)} />
          <Ck l="NY"     v={cfg.showNY}     s={v=>upC('showNY',v)} />
        </div>
        {([['ASIA',C.teal,'asiaMode' as const,'asiaStart' as const,'asiaEnd' as const],['LONDON',C.amber,'londonMode' as const,'londonStart' as const,'londonEnd' as const],['NEW YORK',C.gold,'nyMode' as const,'nyStart' as const,'nyEnd' as const]] as [string,string,keyof Cfg,keyof Cfg,keyof Cfg][]).map(([n,c,mk,sk,ek])=>(
          <Sec key={n} title={`${n} IB`} col={c} mini>
            <F l="Mode"  v={cfg[mk] as string} s={v=>upC(mk,v)} opts={['Auto','Manual']} />
            <G2 ch={<><F l="Start" v={cfg[sk] as string} s={v=>upC(sk,v)} t="time" /><F l="End" v={cfg[ek] as string} s={v=>upC(ek,v)} t="time" /></>}/>
          </Sec>
        ))}
      </Sec>
      <Sec title="OPENING RANGE">
        <Ck l="Show Opening Range" v={cfg.showOR} s={v=>upC('showOR',v)} />
        <G2 ch={<><F l="OR Duration (min)" v={cfg.orDur} s={v=>upC('orDur',v)} /><F l="OR Source" v={cfg.orSrc} s={v=>upC('orSrc',v)} opts={['First Bar','Manual']} /></>}/>
        <F l="OR Manual Levels" v={cfg.orManual} s={v=>upC('orManual',v)} t="text" />
        <G2 ch={<><Ck l="Show OR Background" v={cfg.showORBg} s={v=>upC('showORBg',v)} /><F l="OR Bg Opacity" v={cfg.orBgOp} s={v=>upC('orBgOp',v)} /></>}/>
      </Sec>
      <Sec title="OR ROTATIONS">
        <Ck l="Show OR Rotations" v={cfg.showRot} s={v=>upC('showRot',v)} />
        <G2 ch={<><F l="Rotations Per Side" v={cfg.rotSide} s={v=>upC('rotSide',v)} /><F l="Emphasize Every Nth" v={cfg.emphNth} s={v=>upC('emphNth',v)} /></>}/>
        <Ck l="Auto Step By Product" v={cfg.autoStep} s={v=>upC('autoStep',v)} />
        <G2 ch={<><F l="Manual Step (pts)" v={cfg.stepManual} s={v=>upC('stepManual',v)} /><F l="Line Style" v={cfg.lineStyle} s={v=>upC('lineStyle',v)} opts={['Dashed','Solid','Dotted']} /></>}/>
        <G2 ch={<><F l="Rotation Color" v={cfg.rotColor} s={v=>upC('rotColor',v)} t="text" /><Ck l="Show Labels" v={cfg.showORLbl} s={v=>upC('showORLbl',v)} /></>}/>
      </Sec>
    </div>
  )

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div style={{ width:'100%', height:'100%', overflowY:'auto', overflowX:'hidden', padding:'10px 14px', display:'flex', flexDirection:'column', gap:10, fontFamily:'"JetBrains Mono",monospace' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', paddingBottom:2 }}>
        <span style={orb(9, 900, { color:C.gold, letterSpacing:'0.2em' })}>◈ ÉTUDE MULTI-INSTRUMENTS · MÉTHODE SALAH v2</span>
        <span style={{ flex:1 }} />
        <Btn label="▲ TOP-DOWN DALTON"   active={tdOpen} col={C.goldL} onClick={()=>setTdOpen(o=>!o)} />
        <Btn label="⊕ LIVE TRACKER"      active={trOpen} col={C.up}    onClick={()=>setTrOpen(o=>!o)} />
        <Btn label="⚙ RÉGLAGES IB/OR"   active={stOpen} col={C.muted}  onClick={()=>setStOpen(o=>!o)} />
      </div>

      {/* Score bar */}
      <div style={{ padding:'8px 14px', border:`1px solid ${C.brd}`, borderRadius:3, background:C.sur, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <span style={orb(8, 700, { color:C.muted, letterSpacing:'0.16em' })}>SCORE TOP-DOWN</span>
        <span style={orb(24, 900, { color:scCol, lineHeight:1, textShadow:`0 0 12px ${scCol}` })}>{sc>0?'+':''}{sc}<span style={orb(9, 700, { color:`${scCol}80` })}>/9</span></span>
        <div style={{ flex:1, minWidth:100, height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden', position:'relative' }}>
          <div style={{ position:'absolute', top:0, bottom:0, borderRadius:3, left: sc>=0 ? '50%' : `${50-scPct/2}%`, width:`${scPct/2}%`, background:scCol }} />
          <div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1, background:'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          <Pill label={`IB DIR: ${ibDir||'—'}`}                  col={ibDir==='Higher'?C.up:ibDir==='Lower'?C.down:C.muted} />
          <Pill label={`INSIDE WK: ${insideWeek?'OUI':'NON'}`}   col={insideWeek?C.down:C.muted} />
          {td.pocMig && <Pill label={`POC: ${td.pocMig}`}        col={td.pocMig==='Ascendant'?C.up:td.pocMig==='Descendant'?C.down:C.muted} />}
          {td.mOtf   && <Pill label={`MONTHLY: ${td.mOtf}`}      col={td.mOtf==='Higher'?C.up:td.mOtf==='Lower'?C.down:C.muted} />}
        </div>
      </div>

      {/* Top-Down Dalton */}
      {tdOpen && (
        <div style={{ border:`1px solid ${C.brd}`, borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'6px 12px', borderLeft:`3px solid ${C.gold}`, background:'rgba(201,168,76,0.05)', borderBottom:`1px solid ${C.brd}` }}>
            <span style={orb(8.5, 900, { color:C.gold, letterSpacing:'0.22em' })}>◈ TOP-DOWN DALTON · CONTEXTE MARCHÉ</span>
          </div>
          <div style={{ padding:'10px 12px', background:C.sur }}>
            {renderTD()}
          </div>
        </div>
      )}

      {/* Instrument tabs */}
      <div style={{ border:`1px solid ${C.brd}`, borderRadius:4, overflow:'hidden' }}>
        <div style={{ display:'flex', borderBottom:`1px solid ${C.brd}`, background:'rgba(7,10,18,0.6)' }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:'8px 4px', border:'none', cursor:'pointer', background: tab===t ? `${TC[t]}12` : 'transparent', borderBottom: tab===t ? `2px solid ${TC[t]}` : '2px solid transparent', transition:'all 0.14s' }}>
              <span style={orb(10, 900, { color: tab===t ? TC[t] : C.muted, letterSpacing:'0.18em' })}>{t}</span>
            </button>
          ))}
        </div>
        <div style={{ padding:'12px 12px', background:C.sur }}>
          {renderInstr()}
        </div>
      </div>

      {/* Live Tracker */}
      {trOpen && (
        <div style={{ border:`1px solid rgba(0,255,136,0.18)`, borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'6px 12px', borderLeft:`3px solid ${C.up}`, background:'rgba(0,255,136,0.04)', borderBottom:'1px solid rgba(0,255,136,0.14)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={orb(8.5, 900, { color:C.up, letterSpacing:'0.22em' })}>⊕ LIVE TRACKER · {tab}</span>
            <span style={{ width:7, height:7, borderRadius:'50%', background:C.up, animation:'pulseDot 1.8s infinite' }} />
          </div>
          <div style={{ padding:'12px 12px', background:C.sur }}>
            {renderTracker()}
          </div>
        </div>
      )}

      {/* Settings */}
      {stOpen && (
        <div style={{ border:'1px solid rgba(136,153,187,0.18)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'6px 12px', borderLeft:`3px solid ${C.muted}`, background:'rgba(136,153,187,0.04)', borderBottom:'1px solid rgba(136,153,187,0.14)' }}>
            <span style={orb(8.5, 900, { color:C.muted, letterSpacing:'0.22em' })}>⚙ RÉGLAGES IB / OR / SESSIONS</span>
          </div>
          <div style={{ padding:'10px 12px', background:C.sur }}>
            {renderSettings()}
          </div>
        </div>
      )}
    </div>
  )
}

function Alert({ msg, col }: { msg:string; col:string }) {
  return (
    <div style={{ padding:'4px 8px', background:`${col}08`, border:`1px solid ${col}22`, borderRadius:2 }}>
      <span style={jb(8.5, 600, { color:col })}>{msg}</span>
    </div>
  )
}
