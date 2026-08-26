import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import type { CSSProperties, ReactNode, ChangeEvent } from 'react'

type Tab = 'NQ' | 'ES' | 'GC' | 'CL'
type OTF = 'Higher' | 'Lower' | 'Neutral' | ''
type Mig = 'Stable' | 'Ascendant' | 'Descendant' | ''
type Pat = 'P1' | 'P2' | 'P3' | 'P4' | ''

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
  vwap18h: string; atr: string
  asiaHigh: string; asiaLow: string; asiaClose: string
  londonHigh: string; londonLow: string; londonClose: string
  alnPattern: Pat; alnFiab: string
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

const TABS: Tab[]              = ['NQ', 'ES', 'GC', 'CL']
const IB_H: Record<Tab,string> = { NQ:'09:30–10:30 EST', ES:'09:30–10:30 EST', GC:'08:20–09:20 EST', CL:'09:00–10:00 EST' }
const OR_H: Record<Tab,string> = { NQ:'09:30–09:50 EST', ES:'09:30–09:50 EST', GC:'08:20–08:40 EST', CL:'09:00–09:20 EST' }
const IB_RANGE:  Record<Tab,[string,string]> = { NQ:['09:30','10:30'], ES:['09:30','10:30'], GC:['08:20','09:20'], CL:['09:00','10:00'] }
const ORB_RANGE: Record<Tab,[string,string]> = { NQ:['09:30','09:50'], ES:['09:30','09:50'], GC:['08:20','08:40'], CL:['09:00','09:20'] }
const TC: Record<Tab,string>   = { NQ:'#c9a84c', ES:'#1eb3bc', GC:'#d4af37', CL:'#ff8c42' }
const C = { gold:'#c9a84c', goldL:'#f0d070', up:'#00ff88', down:'#ff4444', teal:'#1eb3bc', amber:'#d4af37', muted:'#8899bb', sur:'#141b2d', brd:'rgba(201,168,76,0.14)', pg:'#0b1120' }
const orb = (sz:number, w=700, ex?:CSSProperties):CSSProperties => ({ fontFamily:'Orbitron,monospace', fontSize:sz, fontWeight:w, ...ex })
const jb  = (sz:number, w=400, ex?:CSSProperties):CSSProperties => ({ fontFamily:'"JetBrains Mono",monospace', fontSize:sz, fontWeight:w, ...ex })
const normNum = (v:string) => v.replace(/,/g, '.')
const pf      = (v:string) => parseFloat(normNum(v))||0
const fmt2    = (v:number) => isNaN(v) ? '—' : v.toFixed(2)

const mkI = (): Instr => ({
  lastPx:'', rOpen:'', rHigh:'', rLow:'', rSettle:'', rVah:'', rVal:'', rPoc:'',
  oHigh:'', oLow:'', oClose:'',
  ibHigh:'', ibLow:'', ibClose:'', ibOrdre:'', ibClass:'',
  orbHigh:'', orbLow:'', orbClose:'',
  vwap18h:'', atr:'',
  asiaHigh:'', asiaLow:'', asiaClose:'', londonHigh:'', londonLow:'', londonClose:'',
  alnPattern:'', alnFiab:'',
  rSignal:'', rFiab:'', rEntry:'', rStop:'', rC1:'', rC2:''
})
const mkTD = (): TD => ({ mHigh:'', mLow:'', mPoc:'', mOtf:'', mVah:'', mVal:'', wHigh:'', wLow:'', wPoc:'', wOtf:'', wVah:'', wVal:'', csVah:'', csVal:'', csPoc:'', crVah:'', crVal:'', crPoc:'', lignes:'', gapDay:false, excess:false, poorHigh:false, poorLow:false, tpoOvnH:'', tpoOvnL:'', pocMig:'', events:'', vix:'', petrole:'', yields:'' })
const mkC = (): Cfg => ({ ibOffset:'0', showNYIBBg:true, ibTextSize:'8', asiaMode:'Auto', asiaStart:'20:00', asiaEnd:'02:00', londonMode:'Auto', londonStart:'02:00', londonEnd:'08:00', nyMode:'Auto', nyStart:'09:30', nyEnd:'10:30', timezone:'America/New_York', showAsia:true, showLondon:true, showNY:true, showLabels:true, nyBg:'rgba(201,168,76,0.06)', nyFH:'rgba(201,168,76,0.10)', tblBg:'rgba(10,14,24,0.9)', tblHd:'rgba(201,168,76,0.15)', showOR:true, orDur:'20', orSrc:'First Bar', orManual:'', showORBg:true, orBgOp:'0.06', showRot:true, rotSide:'4', autoStep:true, stepManual:'', rotColor:'rgba(201,168,76,0.5)', lineStyle:'Dashed', emphNth:'4', showORLbl:true })

interface RthRow { id:string; heure:string; open:string; high:string; low:string; close:string; vwap:string; sp1:string; sm1:string; sp2:string; sm2:string }
const RTH_TIMES: Record<Tab, string[]> = {
  NQ: ['09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'],
  ES: ['09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'],
  GC: ['09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'],
  CL: ['09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'],
}
const mkRthRowsForTab = (t:Tab): RthRow[] => RTH_TIMES[t].map(h=>({ id:h, heure:h, open:'', high:'', low:'', close:'', vwap:'', sp1:'', sm1:'', sp2:'', sm2:'' }))
const mkRthRows = (): Record<Tab, RthRow[]> => ({ NQ:mkRthRowsForTab('NQ'), ES:mkRthRowsForTab('ES'), GC:mkRthRowsForTab('GC'), CL:mkRthRowsForTab('CL') })

const TICK_SZ: Record<Tab, number> = { NQ:0.25, ES:0.25, GC:0.10, CL:0.01 }
interface TpoLetter { id:string; letter:string; high:string; low:string; poc:string; vah:string; val:string }
const mkTpoLetters = (): Record<Tab, TpoLetter[]> => ({ NQ:[], ES:[], GC:[], CL:[] })

interface SierraRow { time:string; open:string; high:string; low:string; last:string; vwap:string; sp1:string; sm1:string; sp2:string; sm2:string; tpoPoc:string; tpoVah:string; tpoVal:string }
function parseSierraCSV(text:string): { rows:SierraRow[]; error?:string } {
  // Strip BOM and normalize line endings (handles \r\n, \n, \r)
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = clean.split('\n').filter(l=>l.trim())
  if (lines.length < 2) return { rows:[], error:'Fichier vide ou trop court.' }
  // Auto-detect delimiter from header line
  const hdrLine = lines[0]
  const cntSemi  = (hdrLine.match(/;/g)||[]).length
  const cntComma = (hdrLine.match(/,/g)||[]).length
  const cntTab   = (hdrLine.match(/\t/g)||[]).length
  const sep = cntSemi>cntComma && cntSemi>cntTab ? ';' : cntTab>cntComma ? '\t' : ','
  const splitLine = (l:string) => l.split(sep).map(c=>c.trim().replace(/^"|"$/g,''))
  const raw = splitLine(hdrLine).map(h=>h.toLowerCase().replace(/\s+/g,' '))
  const find = (...names:string[]) => { for (const n of names) { const i=raw.findIndex(h=>h===n||h.replace(/\s/g,'')===n.replace(/\s/g,'')); if (i>=0) return i } return -1 }
  // 'time' before 'date' so the Time column wins over the Date column
  const idxTime = find('time','heure','date/time','datetime','date time','timestamp')
  const idxDate = find('date') // separate Date column fallback
  const idxOpen = find('open')
  const idxHigh = find('high')
  const idxLow  = find('low')
  const idxLast = find('last','close','clôture','cloture')
  const idxVwap = find('vwap')
  const idxSp1  = find('sd+1','sd +1','vwap sd+1','vwap sd +1','+1sd')
  const idxSm1  = find('sd-1','sd -1','vwap sd-1','vwap sd -1','-1sd')
  const idxSp2  = find('sd+2','sd +2','vwap sd+2','vwap sd +2','+2sd')
  const idxSm2  = find('sd-2','sd -2','vwap sd-2','vwap sd -2','-2sd')
  const idxPoc  = find('tpo poc')
  const idxVah  = find('tpo vah')
  const idxVal  = find('tpo val')
  const timeCol = idxTime >= 0 ? idxTime : idxDate
  const sepName = sep===',' ? 'virgule' : sep===';' ? 'point-virgule' : 'tab'
  if (timeCol < 0) return { rows:[], error:`Colonne horaire introuvable (${sepName}). En-têtes : ${raw.slice(0,8).join(' | ')}` }
  // Extract HH:MM from any time string: HH:MM[:SS], H:MM[:SS], HHMM, HH:MM AM/PM
  const extractTime = (s:string): string => {
    s = s.trim()
    if (s.includes(' ')) s = s.split(' ').slice(-1)[0] // remove date prefix
    // HH:MM or H:MM (with optional :SS suffix)
    const m = s.match(/^(\d{1,2}):(\d{2})/)
    if (m) return m[1].padStart(2,'0') + ':' + m[2]
    // French format 09H30 or 09h30
    const mH = s.match(/^(\d{1,2})[Hh](\d{2})/)
    if (mH) return mH[1].padStart(2,'0') + ':' + mH[2]
    // HHMM with no separator (e.g. "0930")
    const m2 = s.match(/^(\d{2})(\d{2})$/)
    if (m2) return m2[1] + ':' + m2[2]
    return ''
  }
  const rows:SierraRow[] = []
  let firstTimeRaw = ''
  let firstTimeParsed = ''
  for (let i=1;i<lines.length;i++) {
    const cols = splitLine(lines[i])
    const get = (j:number) => j>=0&&j<cols.length ? normNum(cols[j]) : ''
    const timeRaw = get(timeCol)
    if (!timeRaw) continue
    if (i===1) firstTimeRaw = timeRaw
    const time = extractTime(timeRaw)
    if (i===1) firstTimeParsed = time
    if (!time) continue
    rows.push({ time, open:get(idxOpen), high:get(idxHigh), low:get(idxLow), last:get(idxLast), vwap:get(idxVwap), sp1:get(idxSp1), sm1:get(idxSm1), sp2:get(idxSp2), sm2:get(idxSm2), tpoPoc:get(idxPoc), tpoVah:get(idxVah), tpoVal:get(idxVal) })
  }
  if (!rows.length) return { rows:[], error:`Aucune heure valide. Colonne ${timeCol} (${raw[timeCol]}), valeur brute : "${firstTimeRaw}", parsé : "${firstTimeParsed}"` }
  return { rows }
}

// Distribution utilisée uniquement pour MGI Module 2 (buying/selling tail, excess, bimodal)
function buildDist(letters: TpoLetter[], tick: number): Map<number, number> {
  const dist = new Map<number, number>()
  for (const l of letters) {
    const h = parseFloat(l.high) || 0, lo = parseFloat(l.low) || 0
    if (!h || !lo || h < lo) continue
    const steps = Math.round((h - lo) / tick)
    for (let i = 0; i <= steps; i++) {
      const price = Math.round((lo + i * tick) * 1e6) / 1e6
      dist.set(price, (dist.get(price) ?? 0) + 1)
    }
  }
  return dist
}

const LS_KEY = 'cmc-calc-v1'
const loadLS = () => { try { const r=localStorage.getItem(LS_KEY); return r?JSON.parse(r):null } catch { return null } }

const iS = (ro:boolean):CSSProperties => ({ width:'100%', background: ro ? 'rgba(201,168,76,0.07)' : '#1a2236', border:`1px solid ${ro ? 'rgba(201,168,76,0.30)' : 'rgba(201,168,76,0.30)'}`, borderRadius:3, padding:'6px 10px', minHeight:32, fontSize:14, fontWeight:500, color: ro ? C.gold : '#fff', fontFamily:'"JetBrains Mono",monospace', outline:'none', boxSizing:'border-box', boxShadow:'inset 0 1px 3px rgba(0,0,0,0.35)' })

function F({ l, v='', s, t, opts, ro, dv }: { l:string; v?:string; s?:(x:string)=>void; t?:string; opts?:string[]; ro?:boolean; dv?:string }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2, minWidth:0 }}>
      <span style={jb(12, 500, { color:'#b4c2d9', letterSpacing:'0.02em', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:3, lineHeight:1.1 })}>{l}</span>
      {ro ? <div style={iS(true)}>{dv ?? v ?? '—'}</div>
       : opts ? <select value={v} onChange={e=>s!(e.target.value)} style={{...iS(false),cursor:'pointer',paddingRight:30}}><option value="">—</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
       : <input
           type="text"
           inputMode={(!t || t==='number') ? 'decimal' : 'text'}
           value={v}
           onChange={e=>s!((!t||t==='number') ? normNum(e.target.value) : e.target.value)}
           style={iS(false)}
         />}
    </div>
  )
}

function Ck({ l, v, s }: { l:string; v:boolean; s:(x:boolean)=>void }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer' }}>
      <input type="checkbox" checked={v} onChange={e=>s(e.target.checked)} style={{ accentColor:C.goldL, width:17, height:17, minHeight:17, flexShrink:0 }} />
      <span style={jb(13, 400, { color:'#d4dced' })}>{l}</span>
    </label>
  )
}

function Sec({ title, col=C.gold, mini, children }: { title:string; col?:string; mini?:boolean; children:ReactNode }) {
  return (
    <div style={{ border:`1px solid ${C.brd}`, borderRadius:4, overflow:'hidden' }}>
      <div style={{ padding: mini ? '4px 10px' : '6px 12px', borderLeft:`2px solid ${col}`, background:'rgba(201,168,76,0.08)', borderBottom:`1px solid rgba(201,168,76,0.20)` }}>
        <span style={orb(mini?9:12, 700, { color:'#f0d070', letterSpacing:'0.12em', lineHeight:1.2 })}>{title}</span>
      </div>
      <div style={{ padding: mini ? '6px 8px' : '10px 12px', display:'flex', flexDirection:'column', gap: mini ? 4 : 8, background:C.sur }}>
        {children}
      </div>
    </div>
  )
}

function G2({ ch }:{ ch:ReactNode }) { return <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', rowGap:8, columnGap:12 }}>{ch}</div> }
function G3({ ch }:{ ch:ReactNode }) { return <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', rowGap:8, columnGap:12 }}>{ch}</div> }
function G4({ ch }:{ ch:ReactNode }) { return <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', rowGap:8, columnGap:12 }}>{ch}</div> }

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
    <textarea value={v} onChange={e=>s(e.target.value)} placeholder={ph} rows={2} style={{ width:'100%', minHeight:48, background:'#1a2236', border:'1px solid rgba(201,168,76,0.30)', borderRadius:3, padding:'6px 10px', fontSize:13, fontWeight:400, color:'#fff', outline:'none', resize:'none', fontFamily:'"JetBrains Mono",monospace', boxSizing:'border-box', boxShadow:'inset 0 1px 3px rgba(0,0,0,0.35)' }} />
  )
}

function Result({ signal, fiab, entry, stop, c1, c2, rr, col }: { signal:string; fiab:string; entry:string; stop:string; c1:string; c2:string; rr:string; col:string }) {
  const sc = (signal==='LONG') ? C.up : (signal==='SHORT') ? C.down : signal==='ATTENTE' ? C.amber : signal==='SETUP INCOMPLET' ? '#ff9966' : C.muted
  const pulsing = signal==='LONG' || signal==='SHORT'
  return (
    <div style={{ padding:'10px 12px', borderRadius:3, marginTop:2, background:`${col}08`, border:`1px solid ${col}28` }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
        {signal && <span style={{ width:8, height:8, borderRadius:'50%', background:sc, flexShrink:0, animation: pulsing ? (signal==='LONG' ? 'pulseDot 1.8s infinite' : 'pulseDotRed 1.8s infinite') : 'none' }} />}
        <span style={orb(signal==='ATTENTE'||signal==='SETUP INCOMPLET'?14:22, 900, { color:sc, lineHeight:1, textShadow:`0 0 14px ${sc}` })}>{signal||'—'}</span>
        {fiab && <Pill label={`FIAB ${fiab}%`} col={sc} />}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:6 }}>
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

function Alert({ msg, col }: { msg:string; col:string }) {
  return (
    <div style={{ padding:'4px 8px', background:`${col}08`, border:`1px solid ${col}22`, borderRadius:2 }}>
      <span style={jb(8.5, 600, { color:col })}>{msg}</span>
    </div>
  )
}

function VwapPosBadge({ px, vw }: { px:number; vw:number }) {
  if (!px || !vw) return null
  const d = Math.abs(px - vw)
  const pos = d < 0.5 ? 'AT' : px > vw ? 'ABOVE' : 'BELOW'
  const col = pos === 'AT' ? C.muted : pos === 'ABOVE' ? C.up : C.down
  return <Pill label={pos} col={col} />
}

export default function Calculateur() {
  const [tab,      setTab]       = useState<Tab>(()=>{ const s=loadLS(); return (s?.tab as Tab)??'NQ' })
  const [tdOpen,   setTdOpen]    = useState<boolean>(()=>{ const s=loadLS(); return s?.tdOpen??true })
  const [trOpen,   setTrOpen]    = useState<boolean>(()=>{ const s=loadLS(); return s?.trOpen??false })
  const [stOpen,   setStOpen]    = useState<boolean>(()=>{ const s=loadLS(); return s?.stOpen??false })
  const [td,       setTd]        = useState<TD>(()=>{ const s=loadLS(); return s?.td?{...mkTD(),...s.td}:mkTD() })
  const [II,       setII]        = useState<Record<Tab,Instr>>(()=>{ const s=loadLS(); if(!s?.II) return {NQ:mkI(),ES:mkI(),GC:mkI(),CL:mkI()}; return {NQ:{...mkI(),...s.II.NQ},ES:{...mkI(),...s.II.ES},GC:{...mkI(),...s.II.GC},CL:{...mkI(),...s.II.CL}} })
  const [cfg,      setCfg]       = useState<Cfg>(()=>{ const s=loadLS(); return s?.cfg?{...mkC(),...s.cfg}:mkC() })
  const [rthRows,      setRthRows]      = useState<Record<Tab,RthRow[]>>(()=>{ const s=loadLS(); return s?.rthRows??mkRthRows() })
  const [rthRowsJ1,   setRthRowsJ1]   = useState<Record<Tab,RthRow[]>>(()=>{ const s=loadLS(); return s?.rthRowsJ1??mkRthRows() })
  const [tpoLetters,  setTpoLetters]  = useState<Record<Tab,TpoLetter[]>>(()=>{ const s=loadLS(); return s?.tpoLetters??mkTpoLetters() })
  const [tpoLettersJ1,setTpoLettersJ1]= useState<Record<Tab,TpoLetter[]>>(()=>{ const s=loadLS(); return s?.tpoLettersJ1??mkTpoLetters() })
  const [showSaved,   setShowSaved]   = useState(false)
  const [csvMsg,      setCsvMsg]      = useState<{text:string;ok:boolean}|null>(null)
  const [wsSc,        setWsSc]        = useState<'live'|'off'>('off')
  const [nyTime,      setNyTime]      = useState('')

  const saveTimer       = useRef<ReturnType<typeof setTimeout>>(undefined)
  const csvTimer        = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wsRef           = useRef<WebSocket|null>(null)
  const wsReconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const mounted         = useRef(false)

  const triggerSaved = useCallback(() => {
    setShowSaved(true)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setShowSaved(false), 1500)
  }, [])

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    try { localStorage.setItem(LS_KEY, JSON.stringify({ tab, tdOpen, trOpen, stOpen, td, II, cfg, rthRows, rthRowsJ1, tpoLetters, tpoLettersJ1 })) } catch {}
    triggerSaved()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tdOpen, trOpen, stOpen, td, II, cfg, rthRows, rthRowsJ1, tpoLetters, tpoLettersJ1])

  // SC Bridge — WebSocket vers serveur Python local ws://localhost:8765
  useEffect(() => {
    const connect = () => {
      clearTimeout(wsReconnectTimer.current)
      try {
        const ws = new WebSocket('ws://localhost:8765')
        wsRef.current = ws
        ws.onopen = () => setWsSc('live')
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data as string)
            setII(prev => {
              let changed = false
              const next = { ...prev }
              for (const t of TABS) {
                const d = data[t]
                if (!d) continue
                const u: Partial<Instr> = {}
                if (d.last != null) u.lastPx = String(d.last)
                if (d.high != null) u.rHigh  = String(d.high)
                if (d.low  != null) u.rLow   = String(d.low)
                if (d.poc  != null) u.rPoc   = String(d.poc)
                if (d.vah  != null) u.rVah   = String(d.vah)
                if (d.val  != null) u.rVal   = String(d.val)
                if (d.settle != null) u.rSettle = String(d.settle)
                if (Object.keys(u).length) { next[t] = { ...next[t], ...u }; changed = true }
              }
              return changed ? next : prev
            })
          } catch {}
        }
        ws.onerror = () => setWsSc('off')
        ws.onclose = () => {
          setWsSc('off')
          wsReconnectTimer.current = setTimeout(connect, 3000)
        }
      } catch {
        setWsSc('off')
        wsReconnectTimer.current = setTimeout(connect, 3000)
      }
    }
    connect()
    return () => {
      clearTimeout(wsReconnectTimer.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })
    const tick = () => setNyTime(fmt.format(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleReset = () => {
    localStorage.removeItem(LS_KEY)
    setTab('NQ'); setTdOpen(true); setTrOpen(false); setStOpen(false)
    setTd(mkTD()); setII({NQ:mkI(),ES:mkI(),GC:mkI(),CL:mkI()}); setCfg(mkC()); setRthRows(mkRthRows()); setRthRowsJ1(mkRthRows()); setTpoLetters(mkTpoLetters()); setTpoLettersJ1(mkTpoLetters())
  }

  const upTD = <K extends keyof TD>(k:K, v:TD[K]) => setTd(p=>({...p,[k]:v}))
  const upI  = (t:Tab, k:keyof Instr, v:string)   => setII(p=>({...p,[t]:{...p[t],[k]:v}}))
  const upC  = <K extends keyof Cfg>(k:K, v:Cfg[K]) => setCfg(p=>({...p,[k]:v}))

  const upRthRow  = (t:Tab, id:string, k:keyof RthRow, v:string) => setRthRows(p=>({...p,[t]:p[t].map(r=>r.id===id?{...r,[k]:v}:r)}))
  const upRthRowJ1= (t:Tab, id:string, k:keyof RthRow, v:string) => setRthRowsJ1(p=>({...p,[t]:p[t].map(r=>r.id===id?{...r,[k]:v}:r)}))

  const TPO_RTH_LETTERS = 'ABCDEFGHIJKLM'
  const addTpoLetter = (t:Tab) => {
    if (tpoLetters[t].length >= 13) return
    const used = tpoLetters[t].map(l => l.letter.toUpperCase())
    const next = TPO_RTH_LETTERS.split('').find(c => !used.includes(c)) || '?'
    setTpoLetters(p=>({...p,[t]:[...p[t],{id:Date.now().toString(),letter:next,high:'',low:'',poc:'',vah:'',val:''}]}))
  }
  const upTpoLetter  = (t:Tab, id:string, k:keyof TpoLetter, v:string) => setTpoLetters(p=>({...p,[t]:p[t].map(r=>r.id===id?{...r,[k]:v}:r)}))
  const delTpoLetter = (t:Tab, id:string) => setTpoLetters(p=>({...p,[t]:p[t].filter(r=>r.id!==id)}))

  const addTpoLetterJ1 = (t:Tab) => {
    if (tpoLettersJ1[t].length >= 13) return
    const used = tpoLettersJ1[t].map(l => l.letter.toUpperCase())
    const next = TPO_RTH_LETTERS.split('').find(c => !used.includes(c)) || '?'
    setTpoLettersJ1(p=>({...p,[t]:[...p[t],{id:(Date.now()+1).toString(),letter:next,high:'',low:'',poc:'',vah:'',val:''}]}))
  }
  const upTpoLetterJ1  = (t:Tab, id:string, k:keyof TpoLetter, v:string) => setTpoLettersJ1(p=>({...p,[t]:p[t].map(r=>r.id===id?{...r,[k]:v}:r)}))
  const delTpoLetterJ1 = (t:Tab, id:string) => setTpoLettersJ1(p=>({...p,[t]:p[t].filter(r=>r.id!==id)}))

  const csvInputRef  = useRef<HTMLInputElement>(null)
  const csvSectionRef = useRef<'rthJ1'|'tpoJ1'|'ovnNQ'|'ovnES'|'ovnGC'|'ovnCL'>('rthJ1')
  const csvTabRef    = useRef<Tab>('NQ')

  const triggerCsvImport = (section:'rthJ1'|'tpoJ1'|'ovnNQ'|'ovnES'|'ovnGC'|'ovnCL') => {
    csvSectionRef.current = section
    csvTabRef.current = tab
    csvInputRef.current?.click()
  }

  const showCsvMsg = (text:string, ok:boolean) => {
    setCsvMsg({text,ok})
    clearTimeout(csvTimer.current)
    csvTimer.current = setTimeout(()=>setCsvMsg(null), ok ? 5000 : 9000)
  }

  const handleCsvFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    const section = csvSectionRef.current
    const t = csvTabRef.current
    reader.onload = ev => {
      const text = ev.target?.result as string
      if (!text) { showCsvMsg('Fichier illisible.', false); return }
      const { rows, error } = parseSierraCSV(text)
      if (error || !rows.length) { showCsvMsg(error ?? 'Aucune ligne valide.', false); return }
      if (section === 'rthJ1') {
        setRthRowsJ1(prev => {
          const updated = prev[t].map(row => {
            const match = rows.find(r=>r.time===row.heure)
            if (!match) return row
            return { ...row,
              open:  match.open  || row.open,
              high:  match.high  || row.high,
              low:   match.low   || row.low,
              close: match.last  || row.close,
              vwap:  match.vwap  || row.vwap,
              sp1:   match.sp1   || row.sp1,
              sm1:   match.sm1   || row.sm1,
              sp2:   match.sp2   || row.sp2,
              sm2:   match.sm2   || row.sm2,
            }
          })
          return {...prev, [t]:updated}
        })
        const last = rows[rows.length-1]
        if (last.tpoPoc) upI(t,'rPoc',last.tpoPoc)
        if (last.tpoVah) upI(t,'rVah',last.tpoVah)
        if (last.tpoVal) upI(t,'rVal',last.tpoVal)

        // ---- Auto-compute IB and ORB from CSV rows ----
        const t2m = (s:string) => { const [h,m] = s.split(':').map(Number); return h*60+(m||0) }
        const [ibS,ibE]   = IB_RANGE[t]
        const [orbS,orbE] = ORB_RANGE[t]
        const ibRows  = rows.filter(r => { const m=t2m(r.time); return m>=t2m(ibS)&&m<t2m(ibE) })
        const orbRows = rows.filter(r => { const m=t2m(r.time); return m>=t2m(orbS)&&m<t2m(orbE) })
        // Detect bar interval (minutes) from first two timestamps
        let barMin = 30
        if (rows.length>=2) { const d=t2m(rows[1].time)-t2m(rows[0].time); if(d>0) barMin=d }
        const maxH = (rs:SierraRow[]) => rs.reduce((a,r)=>{ const v=pf(r.high); return v>a?v:a }, 0)
        const minL = (rs:SierraRow[]) => { const vs=rs.map(r=>pf(r.low)).filter(v=>v>0); return vs.length?Math.min(...vs):0 }
        const lastC= (rs:SierraRow[]) => rs.length ? pf(rs[rs.length-1].last) : 0
        const instrUp: Partial<Instr> = {}
        if (ibRows.length) {
          const h=maxH(ibRows),l=minL(ibRows),c=lastC(ibRows)
          if (h>0) instrUp.ibHigh  = String(h)
          if (l>0) instrUp.ibLow   = String(l)
          if (c>0) instrUp.ibClose = String(c)
        }
        // ORB exact only when bar interval <= 10 min (5 or 10 min bars fully fit in 20-min window)
        const orbExact = barMin <= 10
        if (orbRows.length) {
          const h=maxH(orbRows),l=minL(orbRows),c=lastC(orbRows)
          if (h>0) instrUp.orbHigh  = String(h)
          if (l>0) instrUp.orbLow   = String(l)
          if (c>0) instrUp.orbClose = String(c)
        }
        if (Object.keys(instrUp).length) setII(prev=>({...prev,[t]:{...prev[t],...instrUp}}))

        let msg = `✓ ${rows.length} barres importées (RTH J-1 ${t})`
        if (ibRows.length)  msg += ` · IB auto (${ibRows.length}b)`
        else                msg += ` · IB ⚠ non détecté (hors plage ?)`
        if (orbRows.length) msg += orbExact ? ` · ORB exact (${orbRows.length}b)` : ` · ORB PROXY ⚠ barres ${barMin}min`
        else                msg += ` · ORB non détecté`
        showCsvMsg(msg, true)
      } else if (section === 'tpoJ1') {
        let cumH=-Infinity, cumL=Infinity
        const letters:TpoLetter[] = rows.slice(0,13).map((r,i)=>{
          const h=parseFloat(r.high)||0, l=parseFloat(r.low)||0
          if (h>0&&h>cumH) cumH=h
          if (l>0&&l<cumL) cumL=l
          return { id:`csv-${Date.now()}-${i}`, letter:TPO_RTH_LETTERS[i]||'?', high:cumH>-Infinity?String(cumH):'', low:cumL<Infinity?String(cumL):'', poc:r.tpoPoc, vah:r.tpoVah, val:r.tpoVal }
        })
        setTpoLettersJ1(prev=>({...prev,[t]:letters}))
        showCsvMsg(`✓ ${letters.length} lettres TPO importées (${t})`, true)
      } else if (section === 'ovnNQ' || section === 'ovnES' || section === 'ovnGC' || section === 'ovnCL') {
        const t2 = (section === 'ovnNQ' ? 'NQ' : section === 'ovnES' ? 'ES' : section === 'ovnGC' ? 'GC' : 'CL') as Tab
        const isAsia   = (r: SierraRow) => r.time >= '18:00' || r.time < '02:00'
        const isLondon = (r: SierraRow) => r.time >= '02:00' && r.time < '08:00'
        const asiaRows   = rows.filter(isAsia)
        const londonRows = rows.filter(isLondon)
        const aggH = (rs: SierraRow[]) => { const v=Math.max(...rs.map(r=>parseFloat(r.high)||0)); return v>0?String(v):'' }
        const aggL = (rs: SierraRow[]) => { const vs=rs.map(r=>parseFloat(r.low)||Infinity).filter(v=>v<1e9); const v=Math.min(...vs); return vs.length&&v>0?String(v):'' }
        const aggC = (rs: SierraRow[]) => rs.length>0 ? rs[rs.length-1].last : ''
        const updates: Partial<Instr> = {}
        const aH=aggH(asiaRows);   if (aH) updates.asiaHigh   = aH
        const aL=aggL(asiaRows);   if (aL) updates.asiaLow    = aL
        const aC=aggC(asiaRows);   if (aC) updates.asiaClose   = aC
        const lH=aggH(londonRows); if (lH) updates.londonHigh  = lH
        const lL=aggL(londonRows); if (lL) updates.londonLow   = lL
        const lC=aggC(londonRows); if (lC) updates.londonClose  = lC
        const oH=aggH(rows);       if (oH) updates.oHigh       = oH
        const oL=aggL(rows);       if (oL) updates.oLow        = oL
        const oC=aggC(rows);       if (oC) updates.oClose      = oC
        if (Object.keys(updates).length) {
          setII(prev=>({...prev,[t2]:{...prev[t2],...updates}}))
          showCsvMsg(`✓ ${rows.length} barres OVN importées (${t2})`, true)
        } else {
          showCsvMsg('Aucune donnée OVN extraite du fichier.', false)
        }
      }
    }
    reader.readAsText(file)
    e.target.value=''
  }

  const I   = II[tab]
  const col = TC[tab]

  const insideWeek = useMemo(() => {
    const wH=pf(td.wHigh), wL=pf(td.wLow), mH=pf(td.mHigh), mL=pf(td.mLow)
    return wH>0 && mH>0 && wH < mH && wL > mL
  }, [td.wHigh, td.wLow, td.mHigh, td.mLow])

  const ibDir = useMemo(():OTF => II.NQ.ibOrdre==='HL' ? 'Higher' : II.NQ.ibOrdre==='LH' ? 'Lower' : '', [II.NQ.ibOrdre])

  const p9Align = useMemo(() => {
    const nqO = II.NQ.ibOrdre, esO = II.ES.ibOrdre
    if (!nqO || !esO) return ''
    return nqO === esO ? 'Aligné' : 'Divergent'
  }, [II.NQ.ibOrdre, II.ES.ibOrdre])

  const score = useMemo(() => {
    let s = 0
    if (ibDir) {
      if (td.mOtf === ibDir) s += 1
      if (td.wOtf === ibDir) s += 1
      if (td.gapDay) s += 1
      if (td.pocMig==='Ascendant'  && ibDir==='Higher') s += 1
      if (td.pocMig==='Descendant' && ibDir==='Lower')  s += 1
    }
    if (p9Align==='Aligné')   s += 1
    else if (p9Align==='Divergent') s -= 1
    if (insideWeek) s -= 1
    return Math.max(-9, Math.min(9, s))
  }, [td, ibDir, insideWeek, p9Align])

  const halfBack = useMemo(() => { const h=pf(I.rHigh),l=pf(I.rLow); return h>0&&l>0 ? fmt2((h+l)/2) : '' }, [I.rHigh, I.rLow])
  const ibMid    = useMemo(() => { const h=pf(I.ibHigh),l=pf(I.ibLow); return h>0&&l>0 ? fmt2((h+l)/2) : '' }, [I.ibHigh, I.ibLow])

  const ovnVsS = useMemo(() => {
    const oc=pf(I.oClose), se=pf(I.rSettle)
    if (!oc||!se) return ''
    const d=oc-se; if (Math.abs(d)<1) return 'BALANCE'
    return d>0 ? 'LONG' : 'SHORT'
  }, [I.oClose, I.rSettle])

  const orbPos = useMemo(() => {
    const px=pf(I.lastPx), oh=pf(I.orbHigh), ol=pf(I.orbLow)
    if (!px||!oh||!ol) return ''
    return px>oh ? 'AU-DESSUS' : px<ol ? 'EN-DESSOUS' : 'DANS ORB'
  }, [I.lastPx, I.orbHigh, I.orbLow])

  const sdVals = useMemo(() => {
    const vw=pf(I.vwap18h), at=pf(I.atr)
    if (!vw||!at) return { sp1:'', sm1:'', sp2:'', sm2:'' }
    return { sp1:fmt2(vw+at), sm1:fmt2(vw-at), sp2:fmt2(vw+2*at), sm2:fmt2(vw-2*at) }
  }, [I.vwap18h, I.atr])

  const cSig = useMemo(() => {
    const lp2 = pf(I.lastPx)
    const ibH2 = pf(I.ibHigh), ibL2 = pf(I.ibLow), ibC2 = pf(I.ibClose)
    const mid2 = ibH2>0&&ibL2>0 ? (ibH2+ibL2)/2 : 0
    const vw18_2 = pf(I.vwap18h)
    const orbH2 = pf(I.orbHigh), orbL2 = pf(I.orbLow)

    let ib = 0, ibCls = ''
    if (mid2>0 && ibC2>0) {
      if      (ibC2>mid2 && I.ibOrdre==='LH') { ibCls='Bull A'; ib= 1 }
      else if (ibC2>mid2 && I.ibOrdre==='HL') { ibCls='Bull B'; ib= 1 }
      else if (ibC2<mid2 && I.ibOrdre==='HL') { ibCls='Bear A'; ib=-1 }
      else if (ibC2<mid2 && I.ibOrdre==='LH') { ibCls='Bear B'; ib=-1 }
    }

    let vwap = 0
    if (lp2>0 && vw18_2>0)
      vwap = lp2>vw18_2 ? 1 : lp2<vw18_2 ? -1 : 0

    let orb2 = 0
    if (lp2>0 && orbH2>0 && orbL2>0)
      orb2 = lp2>orbH2 ? 1 : lp2<orbL2 ? -1 : 0

    let aln2 = 0
    if (tab==='NQ' && I.alnPattern)
      aln2 = I.alnPattern==='P3' ? 1 : I.alnPattern==='P4' ? -1 : 0

    const s9 = p9Align==='Aligné' ? 1 : p9Align==='Divergent' ? -1 : 0

    const active = [mid2>0&&ibC2>0?1:0, lp2>0&&vw18_2>0?1:0, lp2>0&&orbH2>0&&orbL2>0?1:0, tab==='NQ'&&!!I.alnPattern?1:0, !!p9Align?1:0].reduce((a:number,b:number)=>a+b,0)
    const total  = ib+vwap+orb2+aln2+s9
    const signal = total>0?'LONG':total<0?'SHORT':'NEUTRE'
    const fiab   = active>0 ? Math.round(Math.abs(total)/active*100) : 0
    return { signal, fiab, ib, ibCls, vwap, orb:orb2, aln:aln2, s9 }
  }, [I, tab, p9Align])

  const cLevels = useMemo(() => {
    const lp2  = pf(I.lastPx)
    const ibH2 = pf(I.ibHigh), ibL2 = pf(I.ibLow)
    const mid2 = ibH2>0&&ibL2>0 ? (ibH2+ibL2)/2 : 0
    const orbH2 = pf(I.orbHigh), orbL2 = pf(I.orbLow)
    // Fallbacks pré-RTH : J-1 VAH/VAL/POC pour Asie / Londres
    const rVah2 = pf(I.rVah), rVal2 = pf(I.rVal), rPoc2 = pf(I.rPoc)
    const vw18_2 = pf(I.vwap18h)

    const pickEntry = (a:number, b:number): number => {
      if (!a && !b) return 0
      if (!a) return b; if (!b) return a
      if (!lp2) return a
      const chosen = Math.abs(lp2-a) <= Math.abs(lp2-b) ? a : b
      return Math.abs(lp2-chosen) < 2 ? lp2 : chosen
    }
    const ok  = (e:string,s:string,c1:string,c2:string,rr:string) => ({ entry:e, stop:s, c1, c2, rr, invalid:false, invalidReason:'', effectiveSignal:e&&s ? cSig.signal : 'ATTENTE', effectiveFiab:e&&s ? cSig.fiab : 0 })
    const bad = (reason:string,e='',s='',c1='',c2='',rr='') => ({ entry:e, stop:s, c1, c2, rr, invalid:true, invalidReason:reason, effectiveSignal:'SETUP INCOMPLET', effectiveFiab:0 })
    const none = () => ({ entry:'', stop:'', c1:'', c2:'', rr:'', invalid:false, invalidReason:'', effectiveSignal: cSig.signal !== 'NEUTRE' ? 'ATTENTE' : 'NEUTRE', effectiveFiab:0 })

    if (cSig.signal === 'LONG') {
      // Entrée : IB mid ou ORB High; sinon pré-RTH → VWAP18h ou POC J-1 ou VAH J-1
      const entry = pickEntry(mid2, orbH2) || pickEntry(vw18_2, rPoc2) || rVah2
      // Stop : IB Low; sinon VAL J-1
      const stop  = ibL2 > 0 ? ibL2 : rVal2
      // Cible : SD+1 ou VAH J-1
      const c1n   = pf(sdVals.sp1) || rVah2
      const c1s   = sdVals.sp1 || (rVah2 > 0 ? fmt2(rVah2) : '')
      const c2s   = sdVals.sp2
      if (!entry || !stop || !c1n) return none()
      if (entry <= stop) return bad('Entrée sous le stop')
      if (c1n <= entry)  return bad('C1 sous l\'entrée · SD+1 trop bas')
      const rrN = (c1n - entry) / (entry - stop)
      const [e,s,rrS] = [fmt2(entry), fmt2(stop), `1 : ${rrN.toFixed(1)}`]
      if (rrN < 1) return bad('R:R < 1 · Setup invalide', e, s, c1s, c2s, rrS)
      return ok(e, s, c1s, c2s, rrS)
    }

    if (cSig.signal === 'SHORT') {
      // Entrée : IB mid ou ORB Low; sinon VWAP18h ou POC J-1 ou VAL J-1
      const entry = pickEntry(mid2, orbL2) || pickEntry(vw18_2, rPoc2) || rVal2
      // Stop : IB High; sinon VAH J-1
      const stop  = ibH2 > 0 ? ibH2 : rVah2
      // Cible : SD-1 ou VAL J-1
      const c1n   = pf(sdVals.sm1) || rVal2
      const c1s   = sdVals.sm1 || (rVal2 > 0 ? fmt2(rVal2) : '')
      const c2s   = sdVals.sm2
      if (!entry || !stop || !c1n) return none()
      if (stop <= entry) return bad('Stop sous l\'entrée · IB High trop bas')
      if (c1n >= entry)  return bad('C1 au-dessus de l\'entrée · SD-1 trop haut')
      if (lp2 > 0 && lp2 < entry) return bad('Prix déjà sous l\'entrée · Setup manqué')
      const rrN = (entry - c1n) / (stop - entry)
      const [e,s,rrS] = [fmt2(entry), fmt2(stop), `1 : ${rrN.toFixed(1)}`]
      if (rrN < 1) return bad('R:R < 1 · Setup invalide', e, s, c1s, c2s, rrS)
      return ok(e, s, c1s, c2s, rrS)
    }

    return none()
  }, [cSig.signal, cSig.fiab, I.lastPx, I.ibHigh, I.ibLow, I.orbHigh, I.orbLow, I.rVah, I.rVal, I.rPoc, I.vwap18h, sdVals])

  const dayType = useMemo(() => {
    if (!pf(I.ibClose)) return '' // IB non terminé → pas d'affichage avant 10h30
    const ibH = pf(I.ibHigh), ibL = pf(I.ibLow), lp = pf(I.lastPx)
    if (!ibH || !ibL || !lp) return ''
    const orbC = pf(I.orbClose), orbH = pf(I.orbHigh), orbL = pf(I.orbLow)
    const rVah = pf(I.rVah),     rVal = pf(I.rVal)

    const up = lp > ibH, dn = lp < ibL

    // Prix dans l'IB → ROTATIONNEL
    if (!up && !dn) return 'ROTATIONNEL'

    // Acceptation : ORB close confirme le break du même côté
    const accepted = (up && orbC > 0 && orbC > ibH) || (dn && orbC > 0 && orbC < ibL)
    if (!accepted) return up ? 'IB CASSÉ ▲' : 'IB CASSÉ ▼'

    // OTF continu : ibOrdre aligne avec la direction (LH = haussier, HL = baissier)
    const otf = (up && I.ibOrdre === 'LH') || (dn && I.ibOrdre === 'HL')

    // Clôture vers l'extrême : prix au-delà du range ORB
    const toExt = (up && orbH > 0 && lp >= orbH) || (dn && orbL > 0 && lp <= orbL)

    // Hors Value area J-1
    const outVal = rVah > 0 && rVal > 0 && (lp > rVah || lp < rVal)

    // TREND DAY : cassé + accepté + OTF + (clôture vers extrême ou hors value)
    if (otf && (toExt || outVal)) return up ? 'TREND DAY ▲' : 'TREND DAY ▼'

    // Accepté mais OTF ou extrême manquant
    return up ? 'IB ACC. ▲' : 'IB ACC. ▼'
  }, [I.lastPx, I.ibHigh, I.ibLow, I.ibClose, I.ibOrdre, I.orbHigh, I.orbLow, I.orbClose, I.rVah, I.rVal])

  const zoneAlerts = useMemo(() => {
    const lp   = pf(I.lastPx)
    if (!lp) return []
    const atr  = pf(I.atr)
    const thresh = atr > 0 ? atr / 3 : tab === 'NQ' ? 5 : tab === 'ES' ? 1 : 0.5
    const settle = pf(I.rSettle) || pf(I.oClose)
    const ibH  = pf(I.ibHigh), ibL = pf(I.ibLow)
    const rH   = pf(I.rHigh),  rL  = pf(I.rLow)
    const rO   = pf(I.rOpen)

    const lvs: { label:string; price:number }[] = []

    if (td.lignes) {
      ;(td.lignes.match(/\d+\.?\d*/g) ?? []).forEach(n => {
        const v = parseFloat(n)
        if (v > 0 && lp > 0 && Math.abs(v - lp) / lp < 0.03)
          lvs.push({ label:`Ligne WE · ${fmt2(v)}`, price:v })
      })
    }
    if (td.poorHigh && rH > 0) lvs.push({ label:`Poor High J-1 · ${I.rHigh}`, price:rH })
    if (td.poorLow  && rL > 0) lvs.push({ label:`Poor Low J-1 · ${I.rLow}`,   price:rL })
    if (td.gapDay && rO > 0 && settle > 0) {
      const gH = Math.max(rO, settle), gL = Math.min(rO, settle)
      lvs.push({ label:`Gap Zone Haut · ${fmt2(gH)}`, price:gH })
      lvs.push({ label:`Gap Zone Bas · ${fmt2(gL)}`,  price:gL })
    }
    if (td.excess) {
      if (rH > 0) lvs.push({ label:`Excess High · ${I.rHigh}`, price:rH })
      if (rL > 0) lvs.push({ label:`Excess Low · ${I.rLow}`,   price:rL })
    }

    const out: { msg:string; col:string }[] = []
    const seen = new Set<string>()
    lvs.forEach(({ label, price }) => {
      if (!price || seen.has(label)) return
      seen.add(label)
      const diff   = Math.abs(lp - price)
      const isRes  = settle > 0 ? price > settle : price > lp
      if (diff <= thresh) {
        out.push({ msg:`◈ ZONE CLÉ ATTEINTE · ${label} · Rejet ou acceptation ?`, col:C.amber })
      } else if (isRes && lp > price + thresh) {
        out.push({ msg:`▲ ZONE CASSÉE HAUT · ${label}`, col:C.down })
      } else if (!isRes && lp < price - thresh) {
        out.push({ msg:`▼ ZONE CASSÉE BAS · ${label}`, col:C.down })
      } else if (isRes && ibH >= price - thresh && lp < price - thresh) {
        out.push({ msg:`✓ REJET CONFIRMÉ · ${label} · Résistance tenue`, col:C.up })
      } else if (!isRes && ibL <= price + thresh && lp > price + thresh) {
        out.push({ msg:`✓ REJET CONFIRMÉ · ${label} · Support tenu`, col:C.up })
      }
    })
    return out
  }, [tab, td.lignes, td.poorHigh, td.poorLow, td.gapDay, td.excess, I.lastPx, I.rHigh, I.rLow, I.rOpen, I.rSettle, I.oClose, I.atr, I.ibHigh, I.ibLow])

  const tpoAnalysis = useMemo(() => {
    const letters = tpoLetters[tab]
    const tick = TICK_SZ[tab]
    if (letters.length === 0) return null

    // MODULE 1 — saisie manuelle : ΔPOC et verdict calculés automatiquement
    interface Step { label:string; high:number; low:number; poc:number; vah:number; val:number; delta:number|null; verdict:string }
    const steps: Step[] = []
    let prevPoc: number | null = null

    for (let i = 0; i < letters.length; i++) {
      const subset = letters.slice(0, i + 1)
      const label  = subset.map(l => l.letter || '?').join('')
      const poc    = pf(letters[i].poc)
      const vah    = pf(letters[i].vah)
      const val    = pf(letters[i].val)
      const high   = pf(letters[i].high)
      const low    = pf(letters[i].low)
      const delta  = prevPoc !== null && poc > 0 ? Math.round((poc - prevPoc) * 100) / 100 : null
      const verdict = delta === null ? '' : delta > 0 ? '▲ Ascendant' : delta < 0 ? '▼ Descendant' : '= Stable'
      steps.push({ label, high, low, poc, vah, val, delta, verdict })
      if (poc > 0) prevPoc = poc
    }

    // MODULE 2 — MGI : distribution H/L par lettre (inchangé)
    const dist = buildDist(letters, tick)
    const prices = Array.from(dist.keys()).sort((a, b) => a - b)
    if (prices.length === 0) return { steps, mgi:null }
    const dayHigh = prices[prices.length - 1]
    const dayLow  = prices[0]

    // POC/VAH/VAL pour affichage biais = dernière étape avec valeurs saisies
    const lastStep = steps[steps.length - 1]
    const poc = lastStep?.poc || 0
    const vah = lastStep?.vah || 0
    const val = lastStep?.val || 0

    let buyTailN = 0
    for (const p of prices) { if ((dist.get(p)??0)===1) buyTailN++; else break }
    const buyingTail = buyTailN >= 2

    let sellTailN = 0
    for (let i = prices.length-1; i >= 0; i--) { if ((dist.get(prices[i])??0)===1) sellTailN++; else break }
    const sellingTail = sellTailN >= 2

    const excessHigh = (dist.get(dayHigh)??0) === 1
    const excessLow  = (dist.get(dayLow)??0)  === 1

    const lastL = letters[letters.length-1]
    const poorHigh = lastL && parseFloat(lastL.high) > 0 && Math.abs(parseFloat(lastL.high) - dayHigh) < tick * 0.5
    const poorLow  = lastL && parseFloat(lastL.low)  > 0 && Math.abs(parseFloat(lastL.low)  - dayLow)  < tick * 0.5

    const vaRange = vah - val, dayRange = dayHigh - dayLow
    const acceptance = letters.length >= 3 && dayRange > 0 && vaRange / dayRange < 0.4

    let trendDay = false
    if (letters.length >= 4) {
      const allHUp = letters.every((l,i) => i===0 || parseFloat(l.high) >= parseFloat(letters[i-1].high))
      const allLDn = letters.every((l,i) => i===0 || parseFloat(l.low)  <= parseFloat(letters[i-1].low))
      trendDay = allHUp || allLDn
    }

    let rotationnel = false
    if (letters.length >= 4) {
      let mH = 0, mL = 0
      for (let i=1; i<letters.length; i++) {
        if (parseFloat(letters[i].high) > parseFloat(letters[i-1].high)) mH++
        if (parseFloat(letters[i].low)  < parseFloat(letters[i-1].low))  mL++
      }
      rotationnel = mH > 1 && mL > 1
    }

    let bimodal = false
    if (prices.length >= 6) {
      const mid = Math.floor(prices.length/2)
      const midAvg = [prices[mid-1],prices[mid],prices[mid+1]].reduce((a,p)=>a+(dist.get(p)??0),0)/3
      const topAvg = prices.slice(-3).reduce((a,p)=>a+(dist.get(p)??0),0)/3
      const botAvg = prices.slice(0,3).reduce((a,p)=>a+(dist.get(p)??0),0)/3
      bimodal = midAvg < (topAvg+botAvg)/2*0.5
    }

    let excessShort: {entry:string;stop:string}|null = null
    let excessLong:  {entry:string;stop:string}|null = null
    if (excessHigh) {
      const rej = letters.slice().reverse().find(l => Math.abs(parseFloat(l.high)-dayHigh) < tick*0.5)
      if (rej && parseFloat(rej.low)>0) excessShort = { entry:fmt2(parseFloat(rej.low)), stop:fmt2(dayHigh) }
    }
    if (excessLow) {
      const rej = letters.slice().reverse().find(l => Math.abs(parseFloat(l.low)-dayLow) < tick*0.5)
      if (rej && parseFloat(rej.high)>0) excessLong = { entry:fmt2(parseFloat(rej.high)), stop:fmt2(dayLow) }
    }

    // Biais basé sur la migration du POC (Dalton) : 2+ mouvements consécutifs dans le même sens
    const deltas = steps.filter(s => s.delta !== null).map(s => s.delta as number)
    let maxUp = 0, maxDn = 0, curUp = 0, curDn = 0
    for (const d of deltas) {
      if (d > 0) { curUp++; curDn = 0 } else if (d < 0) { curDn++; curUp = 0 } else { curUp = 0; curDn = 0 }
      if (curUp > maxUp) maxUp = curUp
      if (curDn > maxDn) maxDn = curDn
    }
    const bias    = maxUp >= 2 && maxUp >= maxDn ? 'HAUSSIER' : maxDn >= 2 && maxDn > maxUp ? 'BAISSIER' : 'NEUTRE'
    const biasCol = bias==='HAUSSIER' ? C.up : bias==='BAISSIER' ? C.down : C.muted

    return { steps, mgi:{ buyingTail, sellingTail, excessHigh, excessLow, poorHigh:!!poorHigh, poorLow:!!poorLow, acceptance, trendDay, rotationnel, bimodal, excessShort, excessLong, bias, biasCol, poc, vah, val, dayHigh, dayLow } }
  }, [tab, tpoLetters])

  // TPO J-1 : Module 1 uniquement (pas de MGI)
  const tpoStepsJ1 = useMemo(() => {
    const letters = tpoLettersJ1[tab]
    if (letters.length === 0) return []
    interface Step { label:string; high:number; low:number; poc:number; vah:number; val:number; delta:number|null; verdict:string }
    const steps: Step[] = []
    let prevPoc: number | null = null
    for (let i = 0; i < letters.length; i++) {
      const subset = letters.slice(0, i + 1)
      const label  = subset.map(l => l.letter || '?').join('')
      const poc    = pf(letters[i].poc)
      const vah    = pf(letters[i].vah)
      const val    = pf(letters[i].val)
      const high   = pf(letters[i].high)
      const low    = pf(letters[i].low)
      const delta  = prevPoc !== null && poc > 0 ? Math.round((poc - prevPoc) * 100) / 100 : null
      const verdict = delta === null ? '' : delta > 0 ? '▲ Ascendant' : delta < 0 ? '▼ Descendant' : '= Stable'
      steps.push({ label, high, low, poc, vah, val, delta, verdict })
      if (poc > 0) prevPoc = poc
    }
    return steps
  }, [tab, tpoLettersJ1])

  // VALUE AREA J vs J-1
  const vaAnalysis = useMemo(() => {
    const vahJ1 = pf(I.rVah), valJ1 = pf(I.rVal), pocJ1 = pf(I.rPoc)
    const rH = pf(I.rHigh), rL = pf(I.rLow)
    const hbJ1 = rH > 0 && rL > 0 ? (rH + rL) / 2 : 0
    const jourLetters = tpoLetters[tab]
    let vahJ = 0, valJ = 0, pocJ = 0
    for (let i = jourLetters.length - 1; i >= 0; i--) {
      if (pf(jourLetters[i].vah) > 0) {
        vahJ = pf(jourLetters[i].vah); valJ = pf(jourLetters[i].val); pocJ = pf(jourLetters[i].poc); break
      }
    }
    if (!vahJ1 || !valJ1 || !vahJ || !valJ) return null
    let position = '', posCol = C.muted
    if (valJ > vahJ1)                          { position = 'HIGHER';              posCol = C.up }
    else if (vahJ > vahJ1 && valJ > valJ1)     { position = 'OVERLAPPING HIGHER';  posCol = '#66ff99' }
    else if (vahJ <= vahJ1 && valJ >= valJ1)   { position = 'INSIDE (Acceptance)'; posCol = C.teal }
    else if (vahJ < vahJ1 && valJ < valJ1)     { position = 'OVERLAPPING LOWER';   posCol = '#ff9966' }
    else                                        { position = 'LOWER';               posCol = C.down }
    const pocDelta = pocJ > 0 && pocJ1 > 0 ? Math.round((pocJ - pocJ1) * 100) / 100 : null
    const pocDir   = pocDelta === null ? '—' : pocDelta > 0 ? `▲ +${fmt2(pocDelta)} pts` : pocDelta < 0 ? `▼ ${fmt2(Math.abs(pocDelta))} pts` : '= Ancrage'
    const pocDirCol= pocDelta === null ? C.muted : pocDelta > 0 ? C.up : pocDelta < 0 ? C.down : C.muted
    const lpNum = pf(I.lastPx)
    const excessHaut = lpNum > 0 && vahJ1 > 0 && lpNum > vahJ1
    const excessBas  = lpNum > 0 && valJ1 > 0 && lpNum < valJ1
    return { position, posCol, pocDir, pocDirCol, excessHaut, excessBas, hbJ1, vahJ1, valJ1, pocJ1, vahJ, valJ, pocJ }
  }, [tab, tpoLetters, I.rVah, I.rVal, I.rPoc, I.rHigh, I.rLow, I.lastPx])

  const sc    = score
  const scCol = sc>0 ? C.up : sc<0 ? C.down : C.muted
  const scPct = Math.abs(sc)/9*100
  const lp    = pf(I.lastPx)
  const vw18  = pf(I.vwap18h)
  const oMid  = td.tpoOvnH&&td.tpoOvnL ? fmt2((pf(td.tpoOvnH)+pf(td.tpoOvnL))/2) : '—'

  const hasP9  = tab === 'NQ' || tab === 'ES'

  const renderTD = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:8 }}>
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

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8 }}>
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

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:8 }}>
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

  const rthInStyle: CSSProperties = { width:'100%', background:'#1a2236', border:'1px solid rgba(201,168,76,0.22)', borderRadius:2, padding:'3px 6px', height:26, fontSize:11, color:'#fff', fontFamily:'"JetBrains Mono",monospace', outline:'none', boxSizing:'border-box' }

  const rthTableBlock = (
    rows: RthRow[],
    times: string[],
    upRow: (id:string, k:keyof RthRow, v:string)=>void,
  ) => {
    const DATA_COLS: (keyof RthRow)[] = ['open','high','low','close','vwap','sp1','sm1','sp2','sm2']
    const DATA_HDRS = ['Open','High','Low','Close','VWAP','SD+1','SD-1','SD+2','SD-2']
    // index rows by time slot; existing rows matched by heure, then by index
    const rowByTime: Record<string, RthRow> = {}
    rows.forEach(r => { rowByTime[r.heure] = r })
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        <div style={{ overflowX:'auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'78px repeat(9,minmax(68px,1fr))', gap:3, minWidth:720, marginBottom:4 }}>
            <div style={jb(7,600,{color:C.muted,letterSpacing:'0.05em'})}>Heure</div>
            {DATA_HDRS.map(h=><div key={h} style={jb(7,600,{color:C.muted,letterSpacing:'0.05em'})}>{h}</div>)}
          </div>
          {times.map((t,i)=>{
            const row = rowByTime[t] ?? rows[i]
            if (!row) return null
            return (
              <div key={t} style={{ display:'grid', gridTemplateColumns:'78px repeat(9,minmax(68px,1fr))', gap:3, minWidth:720, marginBottom:3 }}>
                <div style={{...rthInStyle, display:'flex', alignItems:'center', fontWeight:700, color:C.amber, fontSize:11, background:'rgba(201,168,76,0.07)', borderColor:'rgba(201,168,76,0.25)'}}>
                  {t.replace(':','H')}
                </div>
                {DATA_COLS.map(k=>(
                  <input key={k} type="text" inputMode="decimal" value={row[k]} onChange={e=>upRow(row.id,k,normNum(e.target.value))} style={rthInStyle} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderRth = () => {
    const freq = '30 MIN'
    const times = RTH_TIMES[tab]
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <Sec title={`SUIVI RTH J-1 · ${tab} · ${freq}`} col={col}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
            <button onClick={()=>triggerCsvImport('rthJ1')} style={{ padding:'5px 14px', border:`1px solid rgba(201,168,76,0.55)`, borderRadius:2, background:'rgba(201,168,76,0.10)', color:C.gold, cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700, letterSpacing:'0.14em', boxShadow:'0 0 8px rgba(201,168,76,0.10)' }}>⬆ IMPORTER CSV RTH J-1</button>
          </div>
          {rthTableBlock(rthRowsJ1[tab], times, (id,k,v)=>upRthRowJ1(tab,id,k,v))}
        </Sec>
        <Sec title={`SUIVI RTH DU JOUR · ${tab} · ${freq}`} col={col}>
          {rthTableBlock(rthRows[tab], times, (id,k,v)=>upRthRow(tab,id,k,v))}
        </Sec>
      </div>
    )
  }

  const tpoInputBlock = (
    letters: TpoLetter[],
    addLetter: ()=>void,
    upLetter: (id:string, k:keyof TpoLetter, v:string)=>void,
    delLetter: (id:string)=>void,
    colAcc: string
  ) => {
    const atLimit = letters.length >= 13
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {letters.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'minmax(52px,auto) 1fr 1fr 1fr 1fr 1fr 26px', gap:3, marginBottom:2 }}>
            {(['Lettres','High','Low','POC','VAH','VAL',''] as string[]).map((h,i)=>(
              <div key={i} title={h==='High'||h==='Low' ? 'Borne cumulée depuis le début de la session (ex: AB = max/min des lettres A+B)' : undefined} style={jb(7,600,{color:C.muted,cursor:h==='High'||h==='Low'?'help':undefined,textDecoration:h==='High'||h==='Low'?'underline dotted':'none',textUnderlineOffset:2})}>{h}</div>
            ))}
          </div>
        )}
        {letters.map((row,idx)=>{
          const cumLabel = letters.slice(0,idx+1).map(l=>l.letter).join('')
          return (
            <div key={row.id} style={{ display:'grid', gridTemplateColumns:'minmax(52px,auto) 1fr 1fr 1fr 1fr 1fr 26px', gap:3 }}>
              <div style={{...rthInStyle,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:colAcc,fontSize:9,letterSpacing:'-0.02em',padding:'2px 4px'}}>{cumLabel}</div>
              <input type="text" inputMode="decimal" value={row.high} onChange={e=>upLetter(row.id,'high',normNum(e.target.value))} style={rthInStyle} />
              <input type="text" inputMode="decimal" value={row.low}  onChange={e=>upLetter(row.id,'low', normNum(e.target.value))} style={rthInStyle} />
              <input type="text" inputMode="decimal" value={row.poc}  onChange={e=>upLetter(row.id,'poc', normNum(e.target.value))} style={{...rthInStyle,color:C.gold}} />
              <input type="text" inputMode="decimal" value={row.vah}  onChange={e=>upLetter(row.id,'vah', normNum(e.target.value))} style={{...rthInStyle,color:C.up}} />
              <input type="text" inputMode="decimal" value={row.val}  onChange={e=>upLetter(row.id,'val', normNum(e.target.value))} style={{...rthInStyle,color:C.down}} />
              <button onClick={()=>delLetter(row.id)} style={{ background:'rgba(255,68,68,0.08)', border:'1px solid rgba(255,68,68,0.18)', borderRadius:2, color:'rgba(255,100,100,0.7)', cursor:'pointer', fontSize:9, padding:'0 4px' }}>✕</button>
            </div>
          )
        })}
        {letters.length===0 && <span style={jb(8,400,{color:'rgba(136,153,187,0.4)'})}>Aucune lettre — cliquez &quot;+ AJOUTER&quot; (A→M, 13 lettres max = session RTH complète).</span>}
        {atLimit
          ? <span style={jb(8,600,{color:C.amber,marginTop:4})}>Fin de session RTH · 13 lettres (A–M) atteintes</span>
          : <button onClick={addLetter} style={{ alignSelf:'flex-start', padding:'5px 12px', border:`1px solid ${colAcc}50`, borderRadius:2, background:`${colAcc}0d`, color:colAcc, cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, letterSpacing:'0.12em', marginTop:4 }}>+ AJOUTER LETTRE</button>
        }
        <div style={{ marginTop:6, padding:'5px 10px', background:'rgba(136,153,187,0.05)', border:'1px solid rgba(136,153,187,0.10)', borderRadius:2 }}>
          <span style={jb(7.5,400,{color:C.muted,lineHeight:1.5})}>
            <span style={{color:C.amber,fontWeight:600}}>High / Low</span> = bornes cumulées depuis le début de la session (A, AB, ABC…).
          </span>
        </div>
      </div>
    )
  }

  const tpoMod1Block = (steps: {label:string;high:number;low:number;poc:number;vah:number;val:number;delta:number|null;verdict:string}[], colAcc: string) => {
    if (steps.length === 0) return null
    return (
      <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:4 }}>
        <div style={orb(8,700,{color:C.amber,letterSpacing:'0.12em',marginBottom:4})}>MODULE 1 · POC MIGRATION</div>
        <div style={{ overflowX:'auto' }}>
          <div style={{ minWidth:600 }}>
            <div style={{ display:'grid', gridTemplateColumns:'70px repeat(7,minmax(62px,1fr))', gap:3, marginBottom:4 }}>
              {['Lettres','High','Low','POC','VAH','VAL','ΔPOC','Verdict'].map(h=><div key={h} style={jb(7,600,{color:C.muted})}>{h}</div>)}
            </div>
            {steps.map((step,i)=>(
              <div key={i} style={{ display:'grid', gridTemplateColumns:'70px repeat(7,minmax(62px,1fr))', gap:3, marginBottom:3, padding:'2px 0', borderBottom:'1px solid rgba(201,168,76,0.06)' }}>
                <div style={jb(9,700,{color:colAcc})}>{step.label}</div>
                <div style={jb(9,400,{color:C.muted})}>{step.high>0?fmt2(step.high):'—'}</div>
                <div style={jb(9,400,{color:C.muted})}>{step.low>0?fmt2(step.low):'—'}</div>
                <div style={jb(9,600,{color:C.gold})}>{step.poc>0?fmt2(step.poc):'—'}</div>
                <div style={jb(9,500,{color:C.up})}>{step.vah>0?fmt2(step.vah):'—'}</div>
                <div style={jb(9,500,{color:C.down})}>{step.val>0?fmt2(step.val):'—'}</div>
                <div style={jb(9,500,{color:step.delta!==null&&step.delta>0?C.up:step.delta!==null&&step.delta<0?C.down:C.muted})}>
                  {step.delta!==null ? (step.delta>0?'+':'')+fmt2(step.delta) : '—'}
                </div>
                <div style={jb(8,500,{color:step.verdict.includes('▲')?C.up:step.verdict.includes('▼')?C.down:C.muted})}>
                  {step.verdict||'—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderVaBlock = () => {
    const va = vaAnalysis
    if (!va) return (
      <div style={{ padding:'8px 12px', background:'rgba(136,153,187,0.04)', border:'1px solid rgba(136,153,187,0.10)', borderRadius:3 }}>
        <span style={jb(8,400,{color:'rgba(136,153,187,0.4)'})}>VALUE AREA J vs J-1 — saisissez VAH/VAL/POC J-1 (section RTH J-1) et les lettres TPO DU JOUR pour activer l&apos;analyse.</span>
      </div>
    )
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {/* Position */}
        <div style={{ padding:'10px 14px', background:`${va.posCol}0a`, border:`1px solid ${va.posCol}30`, borderRadius:3, display:'flex', gap:20, alignItems:'center', flexWrap:'wrap' }}>
          <div>
            <div style={jb(7,400,{color:C.muted,marginBottom:3})}>POSITION VALUE AREA J / J-1</div>
            <span style={orb(13,900,{color:va.posCol})}>{va.position}</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(70px,1fr))', gap:12 }}>
            {([['VAH J',fmt2(va.vahJ),C.up],['VAL J',fmt2(va.valJ),C.down],['POC J',fmt2(va.pocJ),C.gold]] as [string,string,string][]).map(([l,v,c])=>(
              <div key={l}><div style={jb(7,400,{color:C.muted,marginBottom:2})}>{l}</div><span style={jb(11,700,{color:c})}>{v}</span></div>
            ))}
            {([['VAH J-1',fmt2(va.vahJ1),C.up],['VAL J-1',fmt2(va.valJ1),C.down],['POC J-1',fmt2(va.pocJ1),C.gold]] as [string,string,string][]).map(([l,v,c])=>(
              <div key={l}><div style={jb(7,400,{color:C.muted,marginBottom:2})}>{l}</div><span style={jb(11,600,{color:c,opacity:0.65})}>{v}</span></div>
            ))}
          </div>
        </div>

        {/* POC migration + Half Back + Excess */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:6 }}>
          <div style={{ padding:'8px 12px', background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.18)', borderRadius:3 }}>
            <div style={jb(7,400,{color:C.muted,marginBottom:4})}>MIGRATION POC vs J-1</div>
            <span style={jb(12,700,{color:va.pocDirCol})}>{va.pocDir}</span>
          </div>
          <div style={{ padding:'8px 12px', background:'rgba(30,179,188,0.06)', border:'1px solid rgba(30,179,188,0.18)', borderRadius:3 }}>
            <div style={jb(7,400,{color:C.muted,marginBottom:4})}>HALF BACK J-1</div>
            <span style={jb(12,700,{color:C.teal})}>{va.hbJ1 > 0 ? fmt2(va.hbJ1) : '—'}</span>
          </div>
          {va.excessHaut && (
            <div style={{ padding:'8px 12px', background:'rgba(255,68,68,0.07)', border:'1px solid rgba(255,68,68,0.28)', borderRadius:3 }}>
              <div style={jb(7,400,{color:C.muted,marginBottom:4})}>EXCÈS DETECÉ</div>
              <span style={jb(10,700,{color:C.down})}>EXCESS HAUT J-1</span>
              <div style={jb(7,400,{color:C.muted,marginTop:3})}>Prix &gt; VAH J-1 ({fmt2(va.vahJ1)})</div>
            </div>
          )}
          {va.excessBas && (
            <div style={{ padding:'8px 12px', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.22)', borderRadius:3 }}>
              <div style={jb(7,400,{color:C.muted,marginBottom:4})}>EXCÈS DETECÉ</div>
              <span style={jb(10,700,{color:C.up})}>EXCESS BAS J-1</span>
              <div style={jb(7,400,{color:C.muted,marginTop:3})}>Prix &lt; VAL J-1 ({fmt2(va.valJ1)})</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderTPO = () => {
    const analysis = tpoAnalysis
    const mgiItems: [string,boolean,string][] = analysis?.mgi ? [
      ['Buying Tail',  analysis.mgi.buyingTail,  C.up],
      ['Selling Tail', analysis.mgi.sellingTail, C.down],
      ['Trend Day',    analysis.mgi.trendDay,    C.amber],
      ['Rotationnel',  analysis.mgi.rotationnel, C.teal],
      ['Bimodal',      analysis.mgi.bimodal,     C.muted],
      ['Poor High',    analysis.mgi.poorHigh,    C.down],
      ['Poor Low',     analysis.mgi.poorLow,     C.up],
      ['Acceptance',   analysis.mgi.acceptance,  C.teal],
      ['Excess High',  analysis.mgi.excessHigh,  C.down],
      ['Excess Low',   analysis.mgi.excessLow,   C.up],
    ] : []
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {/* A — TPO J-1 */}
        <Sec title={`TPO J-1 · ${tab}`} col={col}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
            <button onClick={()=>triggerCsvImport('tpoJ1')} style={{ padding:'4px 10px', border:`1px solid rgba(30,179,188,0.40)`, borderRadius:2, background:'rgba(30,179,188,0.07)', color:C.teal, cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, letterSpacing:'0.12em' }}>⬆ IMPORTER CSV</button>
          </div>
          {tpoInputBlock(tpoLettersJ1[tab], ()=>addTpoLetterJ1(tab), (id,k,v)=>upTpoLetterJ1(tab,id,k,v), id=>delTpoLetterJ1(tab,id), col)}
          {tpoMod1Block(tpoStepsJ1, col)}
        </Sec>

        {/* VALUE AREA J vs J-1 */}
        <Sec title={`VALUE AREA J vs J-1 · ${tab} · Dalton`} col={C.amber}>
          {renderVaBlock()}
        </Sec>

        {/* B — TPO DU JOUR */}
        <Sec title={`TPO DU JOUR · ${tab}`} col={col}>
          {tpoInputBlock(tpoLetters[tab], ()=>addTpoLetter(tab), (id,k,v)=>upTpoLetter(tab,id,k,v), id=>delTpoLetter(tab,id), col)}
          {tpoMod1Block(analysis?.steps ?? [], col)}

          {/* Module 2 : MGI Dalton */}
          {analysis?.mgi && (
            <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
              <div style={orb(8,700,{color:C.teal,letterSpacing:'0.12em'})}>MODULE 2 · MGI DALTON</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:5 }}>
                {mgiItems.map(([label,active,activeCol])=>(
                  <div key={label} style={{ padding:'5px 8px', borderRadius:2, background:active?`${activeCol}10`:'rgba(136,153,187,0.03)', border:`1px solid ${active?activeCol+'30':'rgba(136,153,187,0.10)'}` }}>
                    <div style={jb(7,400,{color:C.muted,marginBottom:3})}>{label}</div>
                    <Pill label={active?'OUI':'NON'} col={active?activeCol:'rgba(136,153,187,0.45)'} />
                  </div>
                ))}
              </div>

              {(analysis.mgi.excessShort||analysis.mgi.excessLong) && (
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  <div style={orb(7,700,{color:C.amber,letterSpacing:'0.10em'})}>RÈGLE 13 · SETUP EXCESS</div>
                  {analysis.mgi.excessShort && (
                    <div style={{ padding:'6px 10px', background:'rgba(255,68,68,0.07)', border:'1px solid rgba(255,68,68,0.25)', borderRadius:3, display:'flex', gap:10, alignItems:'center' }}>
                      <span style={jb(9,700,{color:C.down})}>SHORT</span>
                      <span style={jb(8,400,{color:C.muted})}>Entrée</span>
                      <span style={jb(9,700,{color:C.gold})}>{analysis.mgi.excessShort.entry}</span>
                      <span style={jb(8,400,{color:C.muted})}>Stop</span>
                      <span style={jb(9,700,{color:C.down})}>{analysis.mgi.excessShort.stop}</span>
                    </div>
                  )}
                  {analysis.mgi.excessLong && (
                    <div style={{ padding:'6px 10px', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.22)', borderRadius:3, display:'flex', gap:10, alignItems:'center' }}>
                      <span style={jb(9,700,{color:C.up})}>LONG</span>
                      <span style={jb(8,400,{color:C.muted})}>Entrée</span>
                      <span style={jb(9,700,{color:C.gold})}>{analysis.mgi.excessLong.entry}</span>
                      <span style={jb(8,400,{color:C.muted})}>Stop</span>
                      <span style={jb(9,700,{color:C.up})}>{analysis.mgi.excessLong.stop}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding:'8px 12px', background:`${analysis.mgi.biasCol}08`, border:`1px solid ${analysis.mgi.biasCol}28`, borderRadius:3, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <div>
                  <div style={jb(7,400,{color:C.muted,marginBottom:2})}>BIAIS MGI</div>
                  <span style={orb(16,900,{color:analysis.mgi.biasCol})}>{analysis.mgi.bias}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(60px,1fr))', gap:10, flex:1 }}>
                  {([['POC',fmt2(analysis.mgi.poc),C.gold],['VAH',fmt2(analysis.mgi.vah),C.up],['VAL',fmt2(analysis.mgi.val),C.down],['Haut',fmt2(analysis.mgi.dayHigh),C.muted],['Bas',fmt2(analysis.mgi.dayLow),C.muted]] as [string,string,string][]).map(([l,v,c])=>(
                    <div key={l}>
                      <div style={jb(7,400,{color:C.muted,marginBottom:2})}>{l}</div>
                      <span style={jb(11,700,{color:c})}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Sec>
      </div>
    )
  }

  const renderOVN = () => {
    const isNQ = tab === 'NQ'
    const t2 = tab
    const inst = II[t2]
    const ovnCol = TC[t2]
    const ovnSection = (tab === 'NQ' ? 'ovnNQ' : tab === 'ES' ? 'ovnES' : tab === 'GC' ? 'ovnGC' : 'ovnCL') as 'ovnNQ'|'ovnES'|'ovnGC'|'ovnCL'
    const subHdr = (label: string, c: string) => (
      <div style={{ padding:'3px 10px', borderLeft:`2px solid ${c}`, background:`${c}0a`, borderBottom:`1px solid ${c}18`, marginBottom:8 }}>
        <span style={orb(8,700,{color:c,letterSpacing:'0.14em'})}>{label}</span>
      </div>
    )
    return (
      <div style={{ border:`1px solid rgba(136,153,187,0.18)`, borderRadius:4, overflow:'hidden', display:'flex', flexDirection:'column', gap:0 }}>
        {/* Header */}
        <div style={{ padding:'6px 12px', borderLeft:`3px solid ${ovnCol}`, background:`${ovnCol}0a`, borderBottom:`1px solid ${ovnCol}22`, display:'flex', alignItems:'center', gap:10 }}>
          <span style={orb(10,900,{color:ovnCol,letterSpacing:'0.20em'})}>OVN {t2} · DÉTAIL SESSION</span>
          <span style={{ flex:1 }}/>
          <button onClick={()=>triggerCsvImport(ovnSection)} style={{ padding:'4px 10px', border:`1px solid rgba(30,179,188,0.40)`, borderRadius:2, background:'rgba(30,179,188,0.07)', color:C.teal, cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, letterSpacing:'0.12em' }}>⬆ IMPORTER CSV OVN</button>
        </div>

        {/* 3 session columns */}
        <div style={{ padding:'10px 12px', background:C.sur, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:8 }}>

            {/* Asia */}
            <div style={{ border:`1px solid rgba(30,179,188,0.20)`, borderRadius:3, overflow:'hidden' }}>
              {subHdr('ASIE 18H–02H', C.teal)}
              <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:6, background:C.sur }}>
                <G3 ch={<>
                  <F l="High"  v={inst.asiaHigh}  s={v=>upI(t2,'asiaHigh',v)} />
                  <F l="Low"   v={inst.asiaLow}   s={v=>upI(t2,'asiaLow',v)} />
                  <F l="Close" v={inst.asiaClose} s={v=>upI(t2,'asiaClose',v)} />
                </>}/>
              </div>
            </div>

            {/* London */}
            <div style={{ border:`1px solid rgba(212,175,55,0.20)`, borderRadius:3, overflow:'hidden' }}>
              {subHdr('LONDON 02H–08H', C.amber)}
              <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:6, background:C.sur }}>
                <G3 ch={<>
                  <F l="High"  v={inst.londonHigh}  s={v=>upI(t2,'londonHigh',v)} />
                  <F l="Low"   v={inst.londonLow}   s={v=>upI(t2,'londonLow',v)} />
                  <F l="Close" v={inst.londonClose} s={v=>upI(t2,'londonClose',v)} />
                </>}/>
              </div>
            </div>

            {/* OVN aggregate */}
            <div style={{ border:`1px solid ${ovnCol}22`, borderRadius:3, overflow:'hidden' }}>
              {subHdr('OVN 18H–08H', ovnCol)}
              <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:6, background:C.sur }}>
                <G3 ch={<>
                  <F l="High"  v={inst.oHigh}  s={v=>upI(t2,'oHigh',v)} />
                  <F l="Low"   v={inst.oLow}   s={v=>upI(t2,'oLow',v)} />
                  <F l="Close" v={inst.oClose} s={v=>upI(t2,'oClose',v)} />
                </>}/>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                  <span style={jb(8,400,{color:C.muted})}>vs Settle :</span>
                  {ovnVsS ? <Pill label={ovnVsS} col={ovnVsS==='LONG'?C.up:ovnVsS==='SHORT'?C.down:C.muted} />
                           : <span style={jb(8,400,{color:'rgba(136,153,187,0.35)'})}>—</span>}
                </div>
              </div>
            </div>
          </div>

          {/* ALN + Pattern — NQ only */}
          {isNQ && (
            <div style={{ border:`1px solid rgba(212,175,55,0.20)`, borderRadius:3, overflow:'hidden' }}>
              {subHdr('ALN · ASIA / LONDON', C.amber)}
              <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:6, background:C.sur }}>
                <G4 ch={<>
                  <F l="Asia High"   v={inst.asiaHigh}   s={v=>upI(t2,'asiaHigh',v)} />
                  <F l="Asia Low"    v={inst.asiaLow}    s={v=>upI(t2,'asiaLow',v)} />
                  <F l="London High" v={inst.londonHigh} s={v=>upI(t2,'londonHigh',v)} />
                  <F l="London Low"  v={inst.londonLow}  s={v=>upI(t2,'londonLow',v)} />
                </>}/>
                <G2 ch={<>
                  <F l="Pattern" v={inst.alnPattern} s={v=>upI(t2,'alnPattern',v as Pat)} opts={['P1','P2','P3','P4']} />
                  <F l="Fiabilité %" v={inst.alnFiab} s={v=>upI(t2,'alnFiab',v)} />
                </>}/>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderInstr = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:8 }}>
        <Sec title="RTH J-1" col={col}>
          <G4 ch={<><F l="Open" v={I.rOpen} s={v=>upI(tab,'rOpen',v)} /><F l="High" v={I.rHigh} s={v=>upI(tab,'rHigh',v)} /><F l="Low" v={I.rLow} s={v=>upI(tab,'rLow',v)} /><F l="Settle" v={I.rSettle} s={v=>upI(tab,'rSettle',v)} /></>}/>
          <G4 ch={<><F l="VAH" v={I.rVah} s={v=>upI(tab,'rVah',v)} /><F l="VAL" v={I.rVal} s={v=>upI(tab,'rVal',v)} /><F l="POC" v={I.rPoc} s={v=>upI(tab,'rPoc',v)} /><F l="Half Back" ro dv={halfBack} /></>}/>
        </Sec>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:8 }}>
        <Sec title={`IB · ${IB_H[tab]}`} col={col}>
          <G4 ch={<><F l="IB High" v={I.ibHigh} s={v=>upI(tab,'ibHigh',v)} /><F l="IB Low" v={I.ibLow} s={v=>upI(tab,'ibLow',v)} /><F l="IB Close" v={I.ibClose} s={v=>upI(tab,'ibClose',v)} /><F l="IB Mid" ro dv={ibMid} /></>}/>
          <G2 ch={<><F l="Ordre HL" v={I.ibOrdre} s={v=>upI(tab,'ibOrdre',v)} opts={['HL','LH']} /><F l="Classification" v={I.ibClass} s={v=>upI(tab,'ibClass',v)} opts={['Normal','Wide IB','Narrow IB','Rotational']} /></>}/>
        </Sec>
        <Sec title={`ORB · ${OR_H[tab]}`} col={col}>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:100 }}>
              <F l="Dernier prix" v={I.lastPx} s={v=>upI(tab,'lastPx',v)} />
            </div>
            {orbPos && <Pill label={orbPos} col={orbPos==='AU-DESSUS'?C.up:orbPos==='EN-DESSOUS'?C.down:C.muted} />}
          </div>
          <G3 ch={<><F l="ORB High" v={I.orbHigh} s={v=>upI(tab,'orbHigh',v)} /><F l="ORB Low" v={I.orbLow} s={v=>upI(tab,'orbLow',v)} /><F l="ORB Close" v={I.orbClose} s={v=>upI(tab,'orbClose',v)} /></>}/>
        </Sec>
      </div>

      {/* VWAP / SD */}
      <Sec title={`VWAP / SD · ${tab}`} col={col}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <G2 ch={<><F l="VWAP 18h" v={I.vwap18h} s={v=>upI(tab,'vwap18h',v)} /><F l="ATR (pts)" v={I.atr} s={v=>upI(tab,'atr',v)} /></>}/>
            <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
              <span style={jb(11, 400, { color:C.muted, lineHeight:1.2 })}>vs VWAP 18h :</span>
              <VwapPosBadge px={lp} vw={vw18} />
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <G4 ch={<>
              <F l="SD +1" ro dv={sdVals.sp1||'—'} />
              <F l="SD -1" ro dv={sdVals.sm1||'—'} />
              <F l="SD +2" ro dv={sdVals.sp2||'—'} />
              <F l="SD -2" ro dv={sdVals.sm2||'—'} />
            </>}/>
            {!pf(I.vwap18h) && <span style={jb(11, 400, { color:'rgba(136,153,187,0.4)', marginTop:4, lineHeight:1.2 })}>Entrez VWAP 18h + ATR pour calculer les SD.</span>}
          </div>
        </div>
      </Sec>

      {/* OVN dédié NQ/ES */}
      {renderOVN()}

      {/* §9 — NQ / ES */}
      {hasP9 && (
        <Sec title="§9 · ALIGNEMENT NQ / ES" col={C.teal}>
          {tab === 'NQ' ? (
            <>
              <div style={jb(7.5, 400, { color:C.muted, marginBottom:2 })}>ES IB (lecture croisée)</div>
              <G3 ch={<>
                <F l="ES IB High"  ro dv={II.ES.ibHigh||'—'} />
                <F l="ES IB Low"   ro dv={II.ES.ibLow||'—'} />
                <F l="ES IB Close" ro dv={II.ES.ibClose||'—'} />
              </>}/>
              <G2 ch={<>
                <F l="ES Ordre HL"     ro dv={II.ES.ibOrdre||'—'} />
                <F l="ES Classification" ro dv={II.ES.ibClass||'—'} />
              </>}/>
            </>
          ) : (
            <>
              <div style={jb(7.5, 400, { color:C.muted, marginBottom:2 })}>NQ IB (lecture croisée)</div>
              <G3 ch={<>
                <F l="NQ IB High"  ro dv={II.NQ.ibHigh||'—'} />
                <F l="NQ IB Low"   ro dv={II.NQ.ibLow||'—'} />
                <F l="NQ IB Close" ro dv={II.NQ.ibClose||'—'} />
              </>}/>
              <G2 ch={<>
                <F l="NQ Ordre HL"       ro dv={II.NQ.ibOrdre||'—'} />
                <F l="NQ Classification" ro dv={II.NQ.ibClass||'—'} />
              </>}/>
            </>
          )}
          <div style={{ display:'flex', gap:12, alignItems:'center', paddingTop:2, flexWrap:'wrap' }}>
            <div>
              <div style={jb(7, 400, { color:C.muted, marginBottom:2 })}>ALIGNEMENT NQ/ES</div>
              {p9Align
                ? <Pill label={p9Align} col={p9Align==='Aligné'?C.up:C.down} />
                : <span style={jb(8, 400, { color:'rgba(136,153,187,0.35)' })}>Remplis IB Ordre NQ + ES</span>}
            </div>
            <div>
              <div style={jb(7, 400, { color:C.muted, marginBottom:2 })}>IMPACT §9</div>
              <span style={jb(12, 700, { color: p9Align==='Aligné'?C.up:p9Align==='Divergent'?C.down:C.muted })}>
                {p9Align==='Aligné' ? '+1' : p9Align==='Divergent' ? '-1' : '—'}
              </span>
            </div>
          </div>
        </Sec>
      )}

      {zoneAlerts.length > 0 && (
        <div style={{ border:`1px solid rgba(212,175,55,0.35)`, borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'5px 12px', borderLeft:`2px solid ${C.amber}`, background:'rgba(212,175,55,0.07)', borderBottom:`1px solid rgba(212,175,55,0.2)` }}>
            <span style={orb(9, 700, { color:C.amber, letterSpacing:'0.14em' })}>⚠ ZONES CLÉS · {tab}</span>
          </div>
          <div style={{ padding:'8px 12px', display:'flex', flexDirection:'column', gap:4, background:C.sur }}>
            {zoneAlerts.map((a,i) => <Alert key={i} msg={a.msg} col={a.col} />)}
          </div>
        </div>
      )}

      <Sec title={`RÉSULTAT · ${tab}`} col={col}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {cSig.ibCls && <><span style={jb(8,400,{color:C.muted})}>IB</span><Pill label={cSig.ibCls} col={cSig.ib>0?C.up:C.down}/></>}
          {(cSig.vwap!==0) && <><span style={jb(8,400,{color:C.muted})}>VWAP</span><Pill label={cSig.vwap>0?'Bull':'Bear'} col={cSig.vwap>0?C.up:C.down}/></>}
          {(cSig.orb!==0) && <><span style={jb(8,400,{color:C.muted})}>ORB</span><Pill label={cSig.orb>0?'Bull':'Bear'} col={cSig.orb>0?C.up:C.down}/></>}
          {(cSig.aln!==0) && <><span style={jb(8,400,{color:C.muted})}>ALN</span><Pill label={cSig.aln>0?'Bull':'Bear'} col={cSig.aln>0?C.up:C.down}/></>}
          {(cSig.s9!==0) && <><span style={jb(8,400,{color:C.muted})}>§9</span><Pill label={cSig.s9>0?'+1':'-1'} col={cSig.s9>0?C.up:C.down}/></>}
          {dayType && <Pill label={dayType} col={dayType.startsWith('TREND DAY')?(dayType.includes('▲')?C.up:C.down):dayType==='ROTATIONNEL'?C.teal:C.amber} />}
        </div>
        {cLevels.invalid && cLevels.invalidReason && (
          <Alert msg={`⚠ ${cLevels.invalidReason}`} col={C.amber} />
        )}
        <G4 ch={<>
          <F l="Signal AUTO" ro dv={cLevels.effectiveSignal} />
          <F l="Fiabilité AUTO" ro dv={cLevels.effectiveFiab>0?`${cLevels.effectiveFiab}%`:'—'} />
          <F l="Entrée AUTO" ro dv={cLevels.entry||'—'} />
          <F l="Stop AUTO" ro dv={cLevels.stop||'—'} />
        </>}/>
        <G3 ch={<><F l="Cible 1 AUTO" ro dv={cLevels.c1||'—'} /><F l="Cible 2 AUTO" ro dv={cLevels.c2||'—'} /><F l="R:R AUTO" ro dv={cLevels.rr||'—'} /></>}/>
        <Result signal={cLevels.effectiveSignal} fiab={cLevels.effectiveFiab>0?`${cLevels.effectiveFiab}`:''} entry={cLevels.entry} stop={cLevels.stop} c1={cLevels.c1} c2={cLevels.c2} rr={cLevels.rr} col={col} />
      </Sec>

      {renderRth()}
      {renderTPO()}
    </div>
  )

  const renderTracker = () => {
    const sdHit = (level:string) => {
      const lv = pf(level); return lp>0 && lv>0 && Math.abs(lp-lv)<0.5
    }
    const items: [string,string,string,number][] = [
      ['LAST',    I.lastPx||'—',   C.gold,  20],
      ['HIGH J-1',I.rHigh||'—',   C.up,    14],
      ['LOW J-1', I.rLow||'—',    C.down,  14],
      ['OVN MID', oMid,            C.amber, 14],
      ['VWAP 18h',I.vwap18h||'—', C.teal,  14],
      ['POC J-1', I.rPoc||'—',    C.gold,  14],
      ['VAH J-1', I.rVah||'—',    C.gold,  14],
      ['VAL J-1', I.rVal||'—',    C.gold,  14],
    ]
    const sdItems: [string,string][] = [
      ['SD +2', sdVals.sp2],
      ['SD +1', sdVals.sp1],
      ['SD -1', sdVals.sm1],
      ['SD -2', sdVals.sm2],
    ]
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))', gap:8 }}>
          {items.map(([l,v,c,sz])=>(
            <div key={l}>
              <div style={jb(7, 400, { color:C.muted, marginBottom:3 })}>{l}</div>
              <div style={jb(sz, 700, { color:c })}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:6, padding:'8px', background:'rgba(30,179,188,0.04)', border:'1px solid rgba(30,179,188,0.15)', borderRadius:3 }}>
          {sdItems.map(([l,v])=>(
            <div key={l} style={{ textAlign:'center' }}>
              <div style={jb(7, 400, { color:C.muted, marginBottom:3 })}>{l}</div>
              <div style={jb(13, 700, { color: sdHit(v) ? C.amber : C.teal, textShadow: sdHit(v) ? `0 0 8px ${C.amber}` : 'none' })}>{v||'—'}</div>
              {sdHit(v) && <div style={{ marginTop:2 }}><Pill label="TOUCHÉ" col={C.amber} /></div>}
            </div>
          ))}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
          {lp>0&&pf(I.ibHigh)>0&&lp>pf(I.ibHigh)     && <Alert msg={`▲ Prix au-dessus de l'IB High (${I.ibHigh})`}    col={C.up} />}
          {lp>0&&pf(I.ibLow)>0&&lp<pf(I.ibLow)        && <Alert msg={`▼ Prix en-dessous de l'IB Low (${I.ibLow})`}     col={C.down} />}
          {lp>0&&pf(I.rPoc)>0&&Math.abs(lp-pf(I.rPoc))<2 && <Alert msg={`◈ Prix proche du POC J-1 (${I.rPoc})`}       col={C.gold} />}
          {lp>0&&pf(I.orbHigh)>0&&lp>pf(I.orbHigh)    && <Alert msg={`▲ Extension au-dessus de l'ORB High (${I.orbHigh})`} col={C.up} />}
          {lp>0&&pf(I.orbLow)>0&&lp<pf(I.orbLow)      && <Alert msg={`▼ Cassure sous l'ORB Low (${I.orbLow})`}        col={C.down} />}
          {lp>0&&vw18>0&&lp>vw18                       && <Alert msg={`▲ Prix au-dessus du VWAP 18h (${I.vwap18h})`}   col={C.teal} />}
          {lp>0&&vw18>0&&lp<vw18                       && <Alert msg={`▼ Prix en-dessous du VWAP 18h (${I.vwap18h})`} col={C.down} />}
          {sdVals.sp1&&sdHit(sdVals.sp1)               && <Alert msg={`⚡ SD +1 touché (${sdVals.sp1})`}              col={C.amber} />}
          {sdVals.sm1&&sdHit(sdVals.sm1)               && <Alert msg={`⚡ SD -1 touché (${sdVals.sm1})`}              col={C.amber} />}
          {sdVals.sp2&&sdHit(sdVals.sp2)               && <Alert msg={`⚡ SD +2 touché (${sdVals.sp2})`}              col={C.down} />}
          {sdVals.sm2&&sdHit(sdVals.sm2)               && <Alert msg={`⚡ SD -2 touché (${sdVals.sm2})`}              col={C.down} />}
          {(!lp || (!pf(I.ibHigh)&&!pf(I.ibLow)&&!vw18)) && (
            <span style={jb(8, 400, { color:'rgba(136,153,187,0.4)' })}>Saisir un dernier prix + IB / VWAP pour activer les alertes.</span>
          )}
          {zoneAlerts.length > 0 && (
            <>
              <div style={jb(7.5, 600, { color:C.amber, letterSpacing:'0.10em', marginTop:4 })}>ZONES CLÉS</div>
              {zoneAlerts.map((a,i) => <Alert key={i} msg={a.msg} col={a.col} />)}
            </>
          )}
        </div>
      </div>
    )
  }

  const renderSettings = () => (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
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

  return (
    <div style={{ width:'100%', height:'100%', overflowY:'auto', overflowX:'hidden', padding:'10px 14px', display:'flex', flexDirection:'column', gap:10, fontFamily:'"JetBrains Mono",monospace', boxSizing:'border-box', background:C.pg }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', paddingBottom:2 }}>
        <span style={orb(9, 900, { color:C.gold, letterSpacing:'0.2em' })}>◈ ÉTUDE MULTI-INSTRUMENTS · MÉTHODE SALAH v3</span>
        <span style={{ flex:1 }} />
        {showSaved && (
          <span style={jb(9, 600, { color:C.up, letterSpacing:'0.12em', opacity:0.9, animation:'fadeIn 0.15s ease-out' })}>✓ SAUVEGARDÉ</span>
        )}
        {/* NY real-time clock */}
        {nyTime && (
          <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:2, background:'rgba(201,168,76,0.06)', outline:'1px solid rgba(201,168,76,0.22)' }}>
            <span style={orb(7, 400, { color:C.muted, letterSpacing:'0.10em' })}>NY</span>
            <span style={orb(10, 900, { color:C.gold, letterSpacing:'0.14em', fontVariantNumeric:'tabular-nums' })}>{nyTime}</span>
          </div>
        )}
        {/* SC Bridge status — always visible */}
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:2, background: wsSc==='live' ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,68,0.06)', outline:`1px solid ${wsSc==='live' ? 'rgba(0,255,136,0.30)' : 'rgba(255,68,68,0.20)'}` }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background: wsSc==='live' ? C.up : C.down, flexShrink:0, animation: wsSc==='live' ? 'pulseDot 1.8s infinite' : 'none' }} />
          <span style={orb(7, 700, { color: wsSc==='live' ? C.up : C.down, letterSpacing:'0.14em' })}>{wsSc==='live' ? 'SC LIVE' : 'SC OFF'}</span>
        </div>
        <Btn label="▲ TOP-DOWN DALTON"  active={tdOpen} col={C.goldL} onClick={()=>setTdOpen(o=>!o)} />
        <Btn label="⊕ LIVE TRACKER"     active={trOpen} col={C.up}    onClick={()=>setTrOpen(o=>!o)} />
        <Btn label="⚙ RÉGLAGES IB/OR"  active={stOpen} col={C.muted}  onClick={()=>setStOpen(o=>!o)} />
        <button onClick={handleReset} style={{ padding:'4px 10px', border:'none', borderRadius:2, cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, letterSpacing:'0.12em', background:'rgba(255,68,68,0.08)', outline:'1px solid rgba(255,68,68,0.25)', color:'rgba(255,100,100,0.75)', transition:'all 0.14s' }}>
          ↺ RESET
        </button>
      </div>

      {/* Score bar */}
      <div style={{ padding:'8px 14px', border:`1px solid ${C.brd}`, borderRadius:3, background:C.sur, display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <span style={orb(8, 700, { color:C.muted, letterSpacing:'0.16em' })}>SCORE TOP-DOWN</span>
        <span style={orb(24, 900, { color:scCol, lineHeight:1, textShadow:`0 0 12px ${scCol}` })}>{sc>0?'+':''}{sc}<span style={orb(9, 700, { color:`${scCol}80` })}>/9</span></span>
        <div style={{ flex:1, minWidth:80, height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden', position:'relative' }}>
          <div style={{ position:'absolute', top:0, bottom:0, borderRadius:3, left: sc>=0 ? '50%' : `${50-scPct/2}%`, width:`${scPct/2}%`, background:scCol }} />
          <div style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1, background:'rgba(255,255,255,0.2)' }} />
        </div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          <Pill label={`IB DIR: ${ibDir||'—'}`}                 col={ibDir==='Higher'?C.up:ibDir==='Lower'?C.down:C.muted} />
          <Pill label={`INSIDE WK: ${insideWeek?'OUI':'NON'}`}  col={insideWeek?C.down:C.muted} />
          {p9Align && <Pill label={`§9: ${p9Align}`}            col={p9Align==='Aligné'?C.up:C.down} />}
          {td.pocMig && <Pill label={`POC: ${td.pocMig}`}       col={td.pocMig==='Ascendant'?C.up:td.pocMig==='Descendant'?C.down:C.muted} />}
          {td.mOtf   && <Pill label={`MONTHLY: ${td.mOtf}`}    col={td.mOtf==='Higher'?C.up:td.mOtf==='Lower'?C.down:C.muted} />}
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
        <div style={{ display:'flex', borderBottom:`1px solid ${C.brd}`, background:'rgba(7,10,18,0.6)', overflowX:'auto' }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ flex:1, minWidth:52, padding:'8px 0', border:'none', cursor:'pointer', background: tab===t ? `${TC[t]}12` : 'transparent', borderBottom: tab===t ? `2px solid ${TC[t]}` : '2px solid transparent', transition:'all 0.14s' }}>
              <span style={orb(14, 900, { color: tab===t ? '#f0d070' : '#8f9fbd', letterSpacing:'0.18em' })}>{t}</span>
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
            <span style={{ width:7, height:7, borderRadius:'50%', background:C.up, animation:'pulseDot 1.8s infinite', flexShrink:0 }} />
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

      <input ref={csvInputRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleCsvFile} />

      {csvMsg && (
        <div style={{ position:'fixed', bottom:16, right:16, zIndex:9999, maxWidth:380, padding:'8px 14px', borderRadius:4, background: csvMsg.ok ? 'rgba(0,255,136,0.12)' : 'rgba(255,68,68,0.12)', border:`1px solid ${csvMsg.ok ? 'rgba(0,255,136,0.4)' : 'rgba(255,68,68,0.4)'}`, backdropFilter:'blur(4px)' }}>
          <span style={jb(11.5, 600, { color: csvMsg.ok ? C.up : C.down, whiteSpace:'pre-wrap' })}>{csvMsg.text}</span>
        </div>
      )}
    </div>
  )
}
