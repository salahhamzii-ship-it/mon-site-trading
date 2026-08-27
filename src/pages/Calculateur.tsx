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
  boxHigh: string; boxLow: string
  rSignal: string; rFiab: string; rEntry: string; rStop: string; rC1: string; rC2: string
  _liveDay: string
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
const IB_RANGE:    Record<Tab,[string,string]> = { NQ:['09:30','10:30'], ES:['09:30','10:30'], GC:['08:20','09:20'], CL:['09:00','10:00'] }
const ORB_RANGE:   Record<Tab,[string,string]> = { NQ:['09:30','09:50'], ES:['09:30','09:50'], GC:['08:20','08:40'], CL:['09:00','09:20'] }
// Two 30-min bars that form the IB; ORB = first bar
const IB_BAR_TIMES:Record<Tab,[string,string]> = { NQ:['09:30','10:00'], ES:['09:30','10:00'], GC:['08:20','08:50'], CL:['09:00','09:30'] }
const ORB_BAR_TIME:Record<Tab,string>          = { NQ:'09:30', ES:'09:30', GC:'08:20', CL:'09:00' }
const TC: Record<Tab,string>   = { NQ:'#c9a84c', ES:'#1eb3bc', GC:'#d4af37', CL:'#ff8c42' }
const C = { gold:'#c9a84c', goldL:'#f0d070', up:'#00ff88', down:'#ff4444', teal:'#1eb3bc', amber:'#d4af37', muted:'#8899bb', sur:'#141b2d', brd:'rgba(201,168,76,0.14)', pg:'#0b1120' }
const orb = (sz:number, w=700, ex?:CSSProperties):CSSProperties => ({ fontFamily:'Orbitron,monospace', fontSize:sz, fontWeight:w, ...ex })
const jb  = (sz:number, w=400, ex?:CSSProperties):CSSProperties => ({ fontFamily:'"JetBrains Mono",monospace', fontSize:sz, fontWeight:w, ...ex })
const normNum = (v:string) => v.replace(/,/g, '.')
const pf      = (v:string) => parseFloat(normNum(v))||0
const fmt2    = (v:number) => isNaN(v) ? '—' : v.toFixed(2)
interface ScBar { time:string; open:string; high:string; low:string; close:string; vwap?:string; sd1h?:string; sd1l?:string; sd2h?:string; sd2l?:string }

const mkI = (): Instr => ({
  lastPx:'', rOpen:'', rHigh:'', rLow:'', rSettle:'', rVah:'', rVal:'', rPoc:'',
  oHigh:'', oLow:'', oClose:'',
  ibHigh:'', ibLow:'', ibClose:'', ibOrdre:'', ibClass:'',
  orbHigh:'', orbLow:'', orbClose:'',
  vwap18h:'', atr:'',
  asiaHigh:'', asiaLow:'', asiaClose:'', londonHigh:'', londonLow:'', londonClose:'',
  alnPattern:'', alnFiab:'',
  boxHigh:'', boxLow:'',
  rSignal:'', rFiab:'', rEntry:'', rStop:'', rC1:'', rC2:'',
  _liveDay: ''
})
const mkTD = (): TD => ({ mHigh:'', mLow:'', mPoc:'', mOtf:'', mVah:'', mVal:'', wHigh:'', wLow:'', wPoc:'', wOtf:'', wVah:'', wVal:'', csVah:'', csVal:'', csPoc:'', crVah:'', crVal:'', crPoc:'', lignes:'', gapDay:false, excess:false, poorHigh:false, poorLow:false, tpoOvnH:'', tpoOvnL:'', pocMig:'', events:'', vix:'', petrole:'', yields:'' })
const mkC = (): Cfg => ({ ibOffset:'0', showNYIBBg:true, ibTextSize:'8', asiaMode:'Auto', asiaStart:'20:00', asiaEnd:'02:00', londonMode:'Auto', londonStart:'02:00', londonEnd:'08:00', nyMode:'Auto', nyStart:'09:30', nyEnd:'10:30', timezone:'America/New_York', showAsia:true, showLondon:true, showNY:true, showLabels:true, nyBg:'rgba(201,168,76,0.06)', nyFH:'rgba(201,168,76,0.10)', tblBg:'rgba(10,14,24,0.9)', tblHd:'rgba(201,168,76,0.15)', showOR:true, orDur:'20', orSrc:'First Bar', orManual:'', showORBg:true, orBgOp:'0.06', showRot:true, rotSide:'4', autoStep:true, stepManual:'', rotColor:'rgba(201,168,76,0.5)', lineStyle:'Dashed', emphNth:'4', showORLbl:true })

interface RthRow { id:string; heure:string; open:string; high:string; low:string; close:string; vwap:string; sp1:string; sm1:string; sp2:string; sm2:string }
const RTH_TIMES: Record<Tab, string[]> = {
  NQ: ['09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'],
  ES: ['09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30'],
  GC: ['08:20','08:50','09:20','09:50','10:20','10:50','11:20','11:50','12:20','12:50','13:20'],
  CL: ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00'],
}
const mkRthRowsForTab = (t:Tab): RthRow[] => RTH_TIMES[t].map(h=>({ id:h, heure:h, open:'', high:'', low:'', close:'', vwap:'', sp1:'', sm1:'', sp2:'', sm2:'' }))
const mkRthRows = (): Record<Tab, RthRow[]> => ({ NQ:mkRthRowsForTab('NQ'), ES:mkRthRowsForTab('ES'), GC:mkRthRowsForTab('GC'), CL:mkRthRowsForTab('CL') })

// Clear IB/ORB/signal only when a NEW RTH session starts (09:30 ET).
// During OVN phases (Asie 18h-02h, Londres 02h-08h, pré-RTH 08h-09h30) the
// previous session's levels stay visible as reference.
function sanitizeInstr(instr: Instr): Instr {
  // Current time in ET
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', hour12:false
  }).formatToParts(new Date())
  const gp = (t:string) => Number(etParts.find(p=>p.type===t)?.value??'0')
  const etMins   = gp('hour') * 60 + gp('minute')
  const rthStarted = etMins >= 9 * 60 + 30  // 09:30 ET = début RTH
  const etToday  = `${gp('year')}-${String(gp('month')).padStart(2,'0')}-${String(gp('day')).padStart(2,'0')}`

  // Only clear if RTH has started AND stored _liveDay is from a different trading date
  const isNewRTHDay = rthStarted && !!instr._liveDay && instr._liveDay !== etToday

  // Also clear on cross-instrument scale mismatch (ES prices in NQ state, etc.)
  const lp = pf(instr.lastPx)
  const badScale = lp > 0 && (
    (pf(instr.ibHigh) > 0 && (pf(instr.ibHigh) < lp * 0.5 || pf(instr.ibHigh) > lp * 2)) ||
    (pf(instr.ibLow)  > 0 && (pf(instr.ibLow)  < lp * 0.5 || pf(instr.ibLow)  > lp * 2)) ||
    (pf(instr.orbHigh)> 0 && (pf(instr.orbHigh)< lp * 0.5 || pf(instr.orbHigh)> lp * 2)) ||
    (pf(instr.orbLow) > 0 && (pf(instr.orbLow) < lp * 0.5 || pf(instr.orbLow) > lp * 2))
  )

  if (isNewRTHDay || badScale) {
    return { ...instr,
      ibHigh:'', ibLow:'', ibClose:'', ibOrdre:'' as never, ibClass:'',
      orbHigh:'', orbLow:'', orbClose:'',
      rSignal:'', rFiab:'', rEntry:'', rStop:'', rC1:'', rC2:'',
    }
  }
  return instr
}

const TICK_SZ: Record<Tab, number> = { NQ:0.25, ES:0.25, GC:0.10, CL:0.01 }
interface TpoLetter { id:string; letter:string; high:string; low:string; poc:string; vah:string; val:string }
const mkTpoLetters = (): Record<Tab, TpoLetter[]> => ({ NQ:[], ES:[], GC:[], CL:[] })

interface SierraRow { time:string; open:string; high:string; low:string; last:string; vwap:string; sp1:string; sm1:string; sp2:string; sm2:string; tpoPoc:string; tpoVah:string; tpoVal:string }
interface BtBar   { date:string; time:string; open:number; high:number; low:number; close:number; vwap:number; sp1:number; sm1:number; sp2:number; sm2:number }
interface BtTrade { date:string; entryTime:string; entry:number; stop:number; c1:number; c2:number; c3:number; hitC1:boolean; hitC2:boolean; hitC3:boolean; exitPrice:number; result:number; win:boolean }
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

function parseBtCsv(text: string): { bars: BtBar[]; error?: string } {
  const clean = text.replace(/^﻿/, '').replace(/\r\n|\r/g, '\n')
  const lines = clean.split('\n').filter(l => l.trim())
  if (lines.length < 2) return { bars: [], error: 'Fichier vide.' }
  const hdrLine = lines[0]
  const cS = (hdrLine.match(/;/g)||[]).length, cT = (hdrLine.match(/\t/g)||[]).length, cC = (hdrLine.match(/,/g)||[]).length
  const sep = cS > cC && cS > cT ? ';' : cT > cC ? '\t' : ','
  const sp  = (l: string) => l.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
  const raw = sp(hdrLine).map(h => h.toLowerCase().trim())
  const fi  = (...ns: string[]) => { for (const n of ns) { const i = raw.findIndex(h => h === n || h.replace(/\s/g,'') === n.replace(/\s/g,'')); if (i >= 0) return i } return -1 }
  const iDate = fi('date'); const iTime = fi('time','heure','date/time','datetime','timestamp')
  const iOpen = fi('open'); const iHigh = fi('high'); const iLow = fi('low'); const iLast = fi('last','close')
  const iVwap = fi('vwap')
  const iSp1 = fi('sd+1','sd +1','vwap sd+1','+1sd'); const iSm1 = fi('sd-1','sd -1','vwap sd-1','-1sd')
  const iSp2 = fi('sd+2','sd +2','vwap sd+2','+2sd'); const iSm2 = fi('sd-2','sd -2','vwap sd-2','-2sd')
  if (iDate < 0 && iTime < 0) return { bars: [], error: `Colonnes Date/Time introuvables. En-têtes: ${raw.slice(0,8).join(' | ')}` }
  const pDate = (s: string) => { const m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` : s }
  const pTime = (s: string) => { s = s.trim(); if (s.includes(' ')) s = s.split(' ').pop()!; const m = s.match(/^(\d{1,2}):(\d{2})/); return m ? m[1].padStart(2,'0')+':'+m[2] : '' }
  const bars: BtBar[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = sp(lines[i])
    const g  = (j: number) => j >= 0 && j < cols.length ? cols[j].replace(',', '.') : ''
    const gn = (j: number) => parseFloat(g(j)) || 0
    let date = '', time = ''
    if (iDate >= 0 && iTime >= 0) { date = pDate(g(iDate)); time = pTime(g(iTime)) }
    else if (iTime >= 0) { const r = g(iTime); if (r.includes(' ')) { const [d,t] = r.split(' '); date = pDate(d); time = pTime(t) } else time = pTime(r) }
    else if (iDate >= 0) { const r = g(iDate); if (r.includes(' ')) { const [d,t] = r.split(' '); date = pDate(d); time = pTime(t) } }
    if (!time || !date) continue
    bars.push({ date, time, open:gn(iOpen), high:gn(iHigh), low:gn(iLow), close:gn(iLast), vwap:gn(iVwap), sp1:gn(iSp1), sm1:gn(iSm1), sp2:gn(iSp2), sm2:gn(iSm2) })
  }
  return bars.length ? { bars } : { bars:[], error:'Aucune barre parsée — vérifiez le format CSV.' }
}

function runBacktest(bars: BtBar[]): BtTrade[] {
  const sorted = [...bars].sort((a, b) => (a.date+a.time) < (b.date+b.time) ? -1 : 1)
  const trades: BtTrade[] = []
  const usedAsRej = new Set<number>()
  for (let i = 0; i < sorted.length - 1; i++) {
    if (usedAsRej.has(i)) continue
    const bar = sorted[i]
    // OVN window complète 18:00→09:30 (Globex open → RTH open)
    // Timings typiques : 2-3h post-Globex, 05:30-07:00 London, post-10:30 IB extension
    const isOVN = bar.time >= '18:00' || bar.time < '09:30'
    if (!isOVN) continue
    // Condition 1 — touche ou passe sous SD-2
    if (bar.sm2 <= 0 || bar.low > bar.sm2) continue
    // Condition 2 — bougie suivante ferme au-dessus du low excess
    const rej = sorted[i + 1]
    if (!rej || rej.close <= bar.low) continue
    const entry = rej.close
    const stop  = parseFloat((bar.low - 10).toFixed(2))
    const c1 = rej.vwap, c2 = rej.sp1, c3 = rej.sp2
    if (!c1 || !c2 || !c3) continue
    usedAsRej.add(i + 1)
    let hitC1 = false, hitC2 = false, hitC3 = false, exitPrice = 0, win = false
    for (let j = i + 2; j < Math.min(i + 60, sorted.length); j++) {
      const fb = sorted[j]
      if (fb.low <= stop) { exitPrice = stop; win = false; break }
      if (!hitC1 && fb.high >= c1) hitC1 = true
      if (hitC1 && !hitC2 && fb.high >= c2) hitC2 = true
      if (hitC2 && !hitC3 && fb.high >= c3) { hitC3 = true; exitPrice = c3; win = true; break }
    }
    if (!exitPrice) {
      if (hitC2) { exitPrice = c2; win = true }
      else if (hitC1) { exitPrice = c1; win = true }
      else { exitPrice = entry; win = false }
    }
    trades.push({ date:bar.date, entryTime:rej.time, entry, stop, c1, c2, c3, hitC1, hitC2, hitC3, exitPrice, result:parseFloat((exitPrice-entry).toFixed(2)), win })
    i++
  }
  return trades
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
  const [II,       setII]        = useState<Record<Tab,Instr>>(()=>{ const s=loadLS(); if(!s?.II) return {NQ:mkI(),ES:mkI(),GC:mkI(),CL:mkI()}; return {NQ:sanitizeInstr({...mkI(),...s.II.NQ}),ES:sanitizeInstr({...mkI(),...s.II.ES}),GC:sanitizeInstr({...mkI(),...s.II.GC}),CL:sanitizeInstr({...mkI(),...s.II.CL})} })
  const [cfg,      setCfg]       = useState<Cfg>(()=>{ const s=loadLS(); return s?.cfg?{...mkC(),...s.cfg}:mkC() })
  const [rthRows,      setRthRows]      = useState<Record<Tab,RthRow[]>>(()=>{ const s=loadLS(); return s?.rthRows??mkRthRows() })
  const [rthRowsJ1,   setRthRowsJ1]   = useState<Record<Tab,RthRow[]>>(()=>{ const s=loadLS(); return s?.rthRowsJ1??mkRthRows() })
  const [tpoLetters,  setTpoLetters]  = useState<Record<Tab,TpoLetter[]>>(()=>{ const s=loadLS(); return s?.tpoLetters??mkTpoLetters() })
  const [tpoLettersJ1,setTpoLettersJ1]= useState<Record<Tab,TpoLetter[]>>(()=>{ const s=loadLS(); return s?.tpoLettersJ1??mkTpoLetters() })
  const [showSaved,   setShowSaved]   = useState(false)
  const [csvMsg,      setCsvMsg]      = useState<{text:string;ok:boolean}|null>(null)
  const [wsSc,        setWsSc]        = useState<'live'|'off'>('off')
  const [nyTime,      setNyTime]      = useState('')
  const [btOpen,   setBtOpen]   = useState(false)
  const [btBars,   setBtBars]   = useState<BtBar[]>([])
  const [btTrades, setBtTrades] = useState<BtTrade[]>([])
  const [btFile,   setBtFile]   = useState('')
  const [slOpen,   setSlOpen]   = useState(true)
  const [posOpen,  setPosOpen]  = useState(false)
  const [posMode,  setPosMode]  = useState<'OVN'|'RTH'|null>(null)
  const [posEntry, setPosEntry] = useState('')
  const [posStop,  setPosStop]  = useState('')
  const [posSize,  setPosSize]  = useState('1')
  const [posDir,   setPosDir]   = useState<'LONG'|'SHORT'>('LONG')

  const saveTimer       = useRef<ReturnType<typeof setTimeout>>(undefined)
  const csvTimer        = useRef<ReturnType<typeof setTimeout>>(undefined)
  const bridgePollTimer = useRef<ReturnType<typeof setInterval>>(undefined)
  const mounted         = useRef(false)
  const btCsvRef        = useRef<HTMLInputElement|null>(null)

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

  // SC Bridge — HTTP polling vers Vercel proxy (évite mixed-content ws:// sur HTTPS)
  useEffect(() => {
    const BRIDGE_URL = 'https://salah-tataouine-terminal.vercel.app/api/bridge-data'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyData = (data: Record<string, any>) => {
      try {

            // --- Instr fields (live prices + IB/ORB + J-1) ---
            setII(prev => {
              let changed = false
              const next = { ...prev }
              for (const t of TABS) {
                const d = data[t]; if (!d) continue
                const cur = prev[t]
                const u: Partial<Instr> = {}
                // sv: set field only if empty (force=true always overwrites)
                const sv = (f: keyof Instr, v: string|number|null|undefined, force=false) => {
                  if (v == null || v === '') return
                  const s = String(v)
                  if (force || !cur[f]) (u as Record<string,string>)[f] = s
                }
                sv('lastPx',  d.last,       true) // live price always
                sv('rHigh',   d.j1_high)
                sv('rLow',    d.j1_low)
                sv('rOpen',   d.j1_open)
                sv('rSettle', d.j1_settle)
                sv('rPoc',    d.poc)
                sv('rVah',    d.vah)
                sv('rVal',    d.val)

                // IB + ORB from bars_today
                if (Array.isArray(d.bars_today) && d.bars_today.length) {
                  const bars: ScBar[] = d.bars_today
                  // Day-reset: if bars are from a new day, force-update all intraday fields
                  const todayISO = new Date().toISOString().slice(0, 10)
                  const isNewDay = cur._liveDay !== todayISO
                  if (isNewDay) u._liveDay = todayISO
                  const [ibTA, ibTB] = IB_BAR_TIMES[t]
                  const barA = bars.find(b=>b.time===ibTA)
                  const barB = bars.find(b=>b.time===ibTB)
                  if (barA || barB) {
                    const set = ([barA,barB].filter(Boolean)) as ScBar[]
                    const ibH = Math.max(...set.map(b=>pf(b.high)))
                    const ibLs = set.map(b=>pf(b.low)).filter(v=>v>0)
                    const ibL = ibLs.length ? Math.min(...ibLs) : 0
                    const ibC = barB ? pf(barB.close) : barA ? pf(barA.close) : 0
                    sv('ibHigh',  ibH>0 ? ibH.toFixed(2) : '', isNewDay)
                    sv('ibLow',   ibL>0 ? ibL.toFixed(2) : '', isNewDay)
                    sv('ibClose', ibC>0 ? ibC.toFixed(2) : '', isNewDay)
                    // IB ordre from first bar direction (open vs midpoint)
                    if ((isNewDay || !cur.ibOrdre) && barA) {
                      const bH=pf(barA.high), bL=pf(barA.low), bO=pf(barA.open)
                      if (bH>0 && bL>0 && bO>0) u.ibOrdre = bO>=(bH+bL)/2 ? 'HL' : 'LH'
                    }
                    // Classification (needs ATR already filled)
                    if (isNewDay || !cur.ibClass) {
                      const atr=pf(cur.atr), rng=ibH-ibL
                      if (atr>0 && rng>0) u.ibClass = rng>2*atr ? 'Wide IB' : rng<0.5*atr ? 'Narrow IB' : 'Normal'
                    }
                  } else if (isNewDay) {
                    // Nouveau jour mais barres IB/ORB pas encore disponibles (pré-09h30)
                    // → vider les valeurs stales d'hier immédiatement
                    ;(['ibHigh','ibLow','ibClose','ibClass','orbHigh','orbLow','orbClose'] as (keyof Instr)[])
                      .forEach(f => { (u as Record<string,string>)[f] = '' })
                    u.ibOrdre = '' as never
                  }
                  // ORB = first RTH bar
                  const orbBar = bars.find(b=>b.time===ORB_BAR_TIME[t])
                  if (orbBar) {
                    sv('orbHigh',  pf(orbBar.high)>0  ? pf(orbBar.high).toFixed(2) : '', isNewDay)
                    sv('orbLow',   pf(orbBar.low)>0   ? pf(orbBar.low).toFixed(2) : '', isNewDay)
                    sv('orbClose', pf(orbBar.close)>0 ? pf(orbBar.close).toFixed(2) : '', isNewDay)
                  }
                  // VWAP session = last bar's vwap
                  const lastBar = bars[bars.length-1]
                  if (lastBar?.vwap) sv('vwap18h', lastBar.vwap, isNewDay)
                }

                // J-1 open/high/low/settle from bars_j1
                if (Array.isArray(d.bars_j1) && d.bars_j1.length) {
                  const bj: ScBar[] = d.bars_j1
                  const firstJ1 = bj[0], lastJ1 = bj[bj.length-1]
                  sv('rOpen',   firstJ1.open)
                  sv('rSettle', lastJ1.close)
                  if (!cur.rHigh) {
                    const h = Math.max(...bj.map(b=>pf(b.high)))
                    if (h>0) u.rHigh = String(h)
                  }
                  if (!cur.rLow) {
                    const ls = bj.map(b=>pf(b.low)).filter(v=>v>0)
                    if (ls.length) u.rLow = String(Math.min(...ls))
                  }
                }

                // Asia + London OVN bars → ALN fields (all instruments, NQ priority)
                if (Array.isArray(d.bars_asia) && d.bars_asia.length) {
                  const bars: ScBar[] = d.bars_asia
                  const hs = bars.map(b=>pf(b.high)).filter(v=>v>0)
                  const ls = bars.map(b=>pf(b.low)).filter(v=>v>0)
                  if (hs.length) sv('asiaHigh',  Math.max(...hs).toFixed(2))
                  if (ls.length) sv('asiaLow',   Math.min(...ls).toFixed(2))
                  const last = bars[bars.length-1]
                  if (last?.close) sv('asiaClose', last.close)
                }
                if (Array.isArray(d.bars_london) && d.bars_london.length) {
                  const bars: ScBar[] = d.bars_london
                  const hs = bars.map(b=>pf(b.high)).filter(v=>v>0)
                  const ls = bars.map(b=>pf(b.low)).filter(v=>v>0)
                  if (hs.length) sv('londonHigh',  Math.max(...hs).toFixed(2))
                  if (ls.length) sv('londonLow',   Math.min(...ls).toFixed(2))
                  const last = bars[bars.length-1]
                  if (last?.close) sv('londonClose', last.close)
                }

                if (Object.keys(u).length) { next[t] = { ...cur, ...u }; changed = true }
              }
              return changed ? next : prev
            })

            // --- Fill RTH table rows (don't overwrite non-empty cells) ---
            const fillRth = (
              setter: typeof setRthRows,
              barsKey: 'bars_today'|'bars_j1'
            ) => {
              let hasData = false
              for (const t of TABS) { if (Array.isArray(data[t]?.[barsKey]) && data[t][barsKey].length) { hasData=true; break } }
              if (!hasData) return
              setter(prev => {
                let changed = false
                const next = { ...prev }
                for (const t of TABS) {
                  const bars: ScBar[] | undefined = data[t]?.[barsKey]
                  if (!Array.isArray(bars) || !bars.length) continue
                  const updated = prev[t].map(row => {
                    const bar = bars.find(b=>b.time===row.heure)
                    if (!bar) return row
                    const p: Partial<RthRow> = {}
                    const sc = (k:keyof RthRow, v:string|undefined) => { if (v && !row[k]) (p as Record<string,string>)[k]=v }
                    sc('open',bar.open); sc('high',bar.high); sc('low',bar.low); sc('close',bar.close)
                    sc('vwap',bar.vwap); sc('sp1',bar.sd1h); sc('sm1',bar.sd1l); sc('sp2',bar.sd2h); sc('sm2',bar.sd2l)
                    if (!Object.keys(p).length) return row
                    changed = true; return { ...row, ...p }
                  })
                  next[t] = updated
                }
                return changed ? next : prev
              })
            }
            fillRth(setRthRows,    'bars_today')
            fillRth(setRthRowsJ1,  'bars_j1')

      } catch(e) { console.warn('SC Bridge:', e) }
    }

    const poll = async () => {
      try {
        const r = await fetch(BRIDGE_URL, { cache: 'no-store' })
        if (!r.ok) throw new Error('offline')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await r.json() as Record<string, any>
        if (data?.error) throw new Error('offline')
        setWsSc('live')
        applyData(data)
      } catch {
        setWsSc('off')
      }
    }

    poll()
    bridgePollTimer.current = setInterval(poll, 10_000)
    return () => clearInterval(bridgePollTimer.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone:'America/New_York', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })
    const tick = () => setNyTime(fmt.format(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Auto-reload silencieux quand une nouvelle version est déployée
  useEffect(() => {
    let currentV = ''
    const check = async () => {
      try {
        const r = await fetch(`/version.json?_=${Date.now()}`)
        if (!r.ok) return
        const { v } = await r.json() as { v: string }
        if (!currentV) { currentV = v; return }
        if (v !== currentV) window.location.reload()
      } catch { /* offline ou dev */ }
    }
    check()
    const id = setInterval(check, 5 * 60 * 1000) // toutes les 5 min
    return () => clearInterval(id)
  }, [])

  // ALN auto-computation NQ — après 08h00 ET uniquement
  useEffect(() => {
    const nq  = II['NQ']
    const aH  = pf(nq.asiaHigh),   aL  = pf(nq.asiaLow)
    const lH  = pf(nq.londonHigh), lL  = pf(nq.londonLow)
    if (!aH || !aL || !lH || !lL) return
    const parts = nyTime.split(':')
    const totalMin = parseInt(parts[0]||'0')*60 + parseInt(parts[1]||'0')
    if (totalMin < 8*60) return   // pas avant 08h00 ET
    let pat: Pat, fiab: string
    if      (lH > aH && lL < aL)  { pat='P1'; fiab='52' }   // London englobe Asia
    else if (lH <= aH && lL >= aL) { pat='P2'; fiab='60' }   // London intérieur Asia
    else if (lH > aH)              { pat='P3'; fiab='65' }   // London casse le haut
    else                           { pat='P4'; fiab='65' }   // London casse le bas
    setII(prev => {
      const cur = prev['NQ']
      if (cur.alnPattern === pat && cur.alnFiab === fiab) return prev
      return { ...prev, NQ: { ...cur, alnPattern: pat, alnFiab: fiab } }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [II['NQ'].asiaHigh, II['NQ'].asiaLow, II['NQ'].londonHigh, II['NQ'].londonLow, nyTime])

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
  const boxMid   = useMemo(() => { const h=pf(I.boxHigh),l=pf(I.boxLow); return h>0&&l>0 ? fmt2((h+l)/2) : '' }, [I.boxHigh, I.boxLow])

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

    const boxH2 = pf(I.boxHigh), boxL2 = pf(I.boxLow)
    let box = 0
    let boxPos: 'BREAKOUT HAUSSIER'|'BREAKOUT BAISSIER'|'ROTATIONNEL'|'' = ''
    if (lp2>0 && boxH2>0 && boxL2>0) {
      if (lp2>boxH2)      { box = 1;  boxPos = 'BREAKOUT HAUSSIER' }
      else if (lp2<boxL2) { box = -1; boxPos = 'BREAKOUT BAISSIER' }
      else                 { box = 0;  boxPos = 'ROTATIONNEL' }
    }

    const active = [mid2>0&&ibC2>0?1:0, lp2>0&&vw18_2>0?1:0, lp2>0&&orbH2>0&&orbL2>0?1:0, tab==='NQ'&&!!I.alnPattern?1:0, !!p9Align?1:0, lp2>0&&boxH2>0&&boxL2>0?1:0].reduce((a:number,b:number)=>a+b,0)
    const total  = ib+vwap+orb2+aln2+s9+box
    const signal = total>0?'LONG':total<0?'SHORT':'NEUTRE'
    const fiab   = active>0 ? Math.round(Math.abs(total)/active*100) : 0
    return { signal, fiab, ib, ibCls, vwap, orb:orb2, aln:aln2, s9, box, boxPos }
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

    const boxH = pf(I.boxHigh), boxL = pf(I.boxLow)
    if (boxH>0) lvs.push({ label:`BOX High · ${I.boxHigh}`, price:boxH })
    if (boxL>0) lvs.push({ label:`BOX Low · ${I.boxLow}`,   price:boxL })
    if (boxH>0&&boxL>0) {
      const bMid = (boxH+boxL)/2
      lvs.push({ label:`BOX Mid · ${fmt2(bMid)}`, price:bMid })
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
  }, [tab, td.lignes, td.poorHigh, td.poorLow, td.gapDay, td.excess, I.lastPx, I.rHigh, I.rLow, I.rOpen, I.rSettle, I.oClose, I.atr, I.ibHigh, I.ibLow, I.boxHigh, I.boxLow])

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
                {inst.alnPattern && (() => {
                  const biais = inst.alnPattern==='P3' ? 'HAUSSIER' : inst.alnPattern==='P4' ? 'BAISSIER' : 'NEUTRE'
                  const desc  = inst.alnPattern==='P1' ? 'London englobe Asia — volatile' : inst.alnPattern==='P2' ? 'London intérieur Asia — attente RTH' : inst.alnPattern==='P3' ? 'London casse le haut — biais acheteur' : 'London casse le bas — biais vendeur'
                  const col   = inst.alnPattern==='P3' ? C.up : inst.alnPattern==='P4' ? C.down : C.muted
                  return (
                    <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:2 }}>
                      <span style={jb(8, 400, { color:C.muted, letterSpacing:'0.08em' })}>BIAIS</span>
                      <span style={orb(9, 900, { color:col })}>{biais}</span>
                      <span style={{ flex:1 }} />
                      <span style={jb(8, 400, { color:'rgba(136,153,187,0.7)', fontStyle:'italic' })}>{desc}</span>
                    </div>
                  )
                })()}
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

      {/* BOX RTH */}
      <Sec title="BOX RTH · ZONE BALANCÉE" col="#00d4ff">
        <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div style={{ flex:1 }}>
            <G3 ch={<><F l="BOX High" v={I.boxHigh} s={v=>upI(tab,'boxHigh',v)} /><F l="BOX Low" v={I.boxLow} s={v=>upI(tab,'boxLow',v)} /><F l="BOX Mid" ro dv={boxMid||'—'} /></>}/>
          </div>
          {cSig.boxPos && <Pill label={cSig.boxPos} col={cSig.boxPos==='BREAKOUT HAUSSIER'?C.up:cSig.boxPos==='BREAKOUT BAISSIER'?C.down:'#00d4ff'} />}
        </div>
      </Sec>

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
          {cSig.boxPos && <><span style={jb(8,400,{color:C.muted})}>BOX</span><Pill label={cSig.boxPos} col={cSig.boxPos==='BREAKOUT HAUSSIER'?C.up:cSig.boxPos==='BREAKOUT BAISSIER'?C.down:'#00d4ff'}/></>}
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

        {/* BOX RTH block */}
        {(pf(I.boxHigh)>0||pf(I.boxLow)>0) && (() => {
          const bH = pf(I.boxHigh), bL = pf(I.boxLow)
          const bM = bH>0&&bL>0 ? (bH+bL)/2 : 0
          const boxLabel = cSig.boxPos || (lp>0&&bH>0&&bL>0 ? (lp>bH?'BREAKOUT HAUSSIER':lp<bL?'BREAKOUT BAISSIER':'ROTATIONNEL') : '')
          const posLabel = bH>0&&bL>0&&lp>0 ? (lp>bH ? 'Au-dessus' : lp<bL ? 'En-dessous' : lp>bM ? 'Dans BOX (haut)' : 'Dans BOX (bas)') : '—'
          const posCol   = lp>bH?C.up:lp<bL?C.down:'#00d4ff'
          const dH = bH>0&&lp>0 ? Math.abs(lp-bH) : 0
          const dL = bL>0&&lp>0 ? Math.abs(lp-bL) : 0
          return (
            <div style={{ padding:'8px 10px', background:'rgba(0,212,255,0.04)', border:'1px solid rgba(0,212,255,0.18)', borderRadius:3 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <span style={jb(7.5, 600, { color:'#00d4ff', letterSpacing:'0.10em' })}>BOX RTH ACTIF</span>
                {boxLabel && <Pill label={boxLabel} col={posCol} />}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(80px,1fr))', gap:6 }}>
                {bH>0&&<div><div style={jb(7,400,{color:C.muted,marginBottom:2})}>BOX HIGH</div><div style={jb(12,700,{color:C.up})}>{I.boxHigh}</div></div>}
                {bL>0&&<div><div style={jb(7,400,{color:C.muted,marginBottom:2})}>BOX LOW</div><div style={jb(12,700,{color:C.down})}>{I.boxLow}</div></div>}
                {bM>0&&<div><div style={jb(7,400,{color:C.muted,marginBottom:2})}>MILIEU</div><div style={jb(12,700,{color:'#00d4ff'})}>{fmt2(bM)}</div></div>}
                <div><div style={jb(7,400,{color:C.muted,marginBottom:2})}>POSITION</div><div style={jb(10,700,{color:posCol})}>{posLabel}</div></div>
                {dH>0&&<div><div style={jb(7,400,{color:C.muted,marginBottom:2})}>Δ HIGH</div><div style={jb(12,700,{color:C.muted,fontVariantNumeric:'tabular-nums'})}>{fmt2(dH)}</div></div>}
                {dL>0&&<div><div style={jb(7,400,{color:C.muted,marginBottom:2})}>Δ LOW</div><div style={jb(12,700,{color:C.muted,fontVariantNumeric:'tabular-nums'})}>{fmt2(dL)}</div></div>}
              </div>
            </div>
          )
        })()}

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

  const renderBacktest = () => {
    const wins   = btTrades.filter(t => t.win)
    const losses = btTrades.filter(t => !t.win)
    const wr     = btTrades.length ? Math.round(wins.length / btTrades.length * 100) : 0
    const c1Rate = btTrades.length ? Math.round(btTrades.filter(t=>t.hitC1).length / btTrades.length * 100) : 0
    const c2Rate = btTrades.length ? Math.round(btTrades.filter(t=>t.hitC2).length / btTrades.length * 100) : 0
    const c3Rate = btTrades.length ? Math.round(btTrades.filter(t=>t.hitC3).length / btTrades.length * 100) : 0
    const avgWin  = wins.length   ? wins.reduce((s,t)=>s+t.result,0)/wins.length   : 0
    const avgLoss = losses.length ? losses.reduce((s,t)=>s+t.result,0)/losses.length : 0
    const ratio   = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0
    const best    = btTrades.length ? Math.max(...btTrades.map(t=>t.result)) : 0
    const worst   = btTrades.length ? Math.min(...btTrades.map(t=>t.result)) : 0

    const statBox = (label: string, value: string, col = C.gold) => (
      <div style={{ textAlign:'center', padding:'8px 6px', background:'rgba(0,0,0,0.25)', borderRadius:3 }}>
        <div style={jb(8, 400, { color:C.muted, letterSpacing:'0.10em', marginBottom:4 })}>{label}</div>
        <div style={orb(14, 900, { color:col })}>{value}</div>
      </div>
    )

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <button onClick={()=>btCsvRef.current?.click()} style={{ padding:'6px 14px', border:'none', borderRadius:3, cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:700, letterSpacing:'0.14em', background:'rgba(201,168,76,0.12)', outline:'1px solid rgba(201,168,76,0.35)', color:C.gold }}>
            ⬆ CHARGER NQ.csv.txt
          </button>
          {btFile && <span style={jb(10, 400, { color:C.muted })}>{btFile}</span>}
          <span style={{ flex:1 }} />
          <button
            disabled={!btBars.length}
            onClick={() => setBtTrades(runBacktest(btBars))}
            style={{ padding:'6px 18px', border:'none', borderRadius:3, cursor: btBars.length ? 'pointer' : 'not-allowed', fontFamily:'Orbitron,monospace', fontSize:9, fontWeight:900, letterSpacing:'0.18em', background: btBars.length ? C.up : 'rgba(0,255,136,0.04)', color: btBars.length ? '#001a0d' : 'rgba(0,255,136,0.3)', opacity: btBars.length ? 1 : 0.5 }}>
            ▶ LANCER BACKTEST
          </button>
        </div>

        {/* Rule reminder */}
        <div style={{ padding:'6px 10px', borderRadius:3, background:'rgba(201,168,76,0.04)', border:'1px solid rgba(201,168,76,0.14)', display:'flex', gap:16, flexWrap:'wrap' }}>
          {[['Fenêtre','18h00–22h00 ET'],['Signal','Prix ≤ SD-2 → rejet'],['Stop','Low excess −10 pts'],['C1','VWAP 18h'],['C2','SD+1'],['C3','SD+2']].map(([k,v])=>(
            <span key={k}><span style={jb(8,400,{color:C.muted})}>{k} </span><span style={jb(9,700,{color:C.gold})}>{v}</span></span>
          ))}
        </div>

        {btTrades.length > 0 && (<>
          {/* Stats grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(90px,1fr))', gap:6 }}>
            {statBox('SETUPS',    String(btTrades.length))}
            {statBox('WIN RATE',  `${wr}%`,   wr >= 60 ? C.up : wr >= 45 ? C.amber : C.down)}
            {statBox('C1 %',      `${c1Rate}%`, c1Rate >= 60 ? C.up : C.muted)}
            {statBox('C2 %',      `${c2Rate}%`, c2Rate >= 45 ? C.up : C.muted)}
            {statBox('C3 %',      `${c3Rate}%`, c3Rate >= 30 ? C.up : C.muted)}
            {statBox('AVG WIN',   `+${avgWin.toFixed(1)}`, C.up)}
            {statBox('AVG LOSS',  avgLoss.toFixed(1), C.down)}
            {statBox('RATIO',     ratio.toFixed(2), ratio >= 1.5 ? C.up : ratio >= 1 ? C.amber : C.down)}
            {statBox('BEST',      `+${best.toFixed(1)}`, C.up)}
            {statBox('WORST',     worst.toFixed(1), C.down)}
          </div>

          {/* Results table */}
          <div style={{ overflowX:'auto' }}>
            <div style={{ overflowY:'auto', maxHeight:420, borderRadius:3, border:'1px solid rgba(201,168,76,0.15)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:680 }}>
                <thead>
                  <tr style={{ background:'rgba(201,168,76,0.10)', position:'sticky', top:0, zIndex:1 }}>
                    {['Date','Heure','Entrée','Stop','C1 VWAP','C2 SD+1','C3 SD+2','Résultat','C1','C2','C3','W/L'].map(h=>(
                      <th key={h} style={{ padding:'5px 8px', textAlign:'center', ...jb(8, 700, { color:C.gold, letterSpacing:'0.10em', whiteSpace:'nowrap' }) }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {btTrades.map((t, idx) => {
                    const rowBg = idx % 2 === 0 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.12)'
                    const resBg = t.win ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,68,0.08)'
                    const resCol = t.win ? C.up : C.down
                    const cell = (v: string, col?: string, bg?: string) => (
                      <td style={{ padding:'4px 8px', textAlign:'center', background: bg || rowBg, ...jb(9, t.win ? 600 : 400, { color: col || '#d0ddf0', fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }) }}>{v}</td>
                    )
                    const tick = (hit: boolean) => (
                      <td style={{ padding:'4px 8px', textAlign:'center', background: hit ? 'rgba(0,255,136,0.08)' : rowBg }}>
                        <span style={{ color: hit ? C.up : 'rgba(136,153,187,0.35)', fontSize:11 }}>{hit ? '✓' : '·'}</span>
                      </td>
                    )
                    return (
                      <tr key={idx}>
                        {cell(t.date)}
                        {cell(t.entryTime)}
                        {cell(t.entry.toFixed(2))}
                        {cell(t.stop.toFixed(2), C.down)}
                        {cell(t.c1.toFixed(2))}
                        {cell(t.c2.toFixed(2))}
                        {cell(t.c3.toFixed(2))}
                        {cell((t.result >= 0 ? '+' : '') + t.result.toFixed(2), resCol, resBg)}
                        {tick(t.hitC1)}
                        {tick(t.hitC2)}
                        {tick(t.hitC3)}
                        <td style={{ padding:'4px 8px', textAlign:'center', background: resBg }}>
                          <span style={orb(8, 900, { color: resCol })}>{t.win ? 'WIN' : 'LOSS'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>)}

        {btBars.length > 0 && btTrades.length === 0 && (
          <div style={{ textAlign:'center', padding:20, ...jb(11, 400, { color:C.muted }) }}>
            {btBars.length.toLocaleString()} barres chargées — cliquez ▶ LANCER BACKTEST
          </div>
        )}
      </div>
    )
  }

  const renderSetupLauncher = () => {
    type Status = 'ok' | 'wait' | 'no' | 'na'
    const lp    = pf(I.lastPx)
    const vw18  = pf(I.vwap18h)
    const rVah  = pf(I.rVah), rVal = pf(I.rVal)
    const nqLp  = pf(II.NQ.lastPx), nqVal = pf(II.NQ.rVal)
    const esLp  = pf(II.ES.lastPx), esVal = pf(II.ES.rVal)

    // 1. CONTEXTE
    const valAccepted: Status = !lp||!rVah ? 'na' : lp>rVah ? 'ok' : lp>rVal ? 'wait' : 'no'
    const pocMigStatus: Status = td.pocMig==='Ascendant'?'ok':td.pocMig==='Stable'?'wait':td.pocMig==='Descendant'?'no':'na'
    const alnPat  = tab==='NQ' ? I.alnPattern : ''
    const alnBiais = alnPat==='P3'?'Haussier':alnPat==='P4'?'Baissier':alnPat?'Neutre':'—'

    // 2. §9 — NQ/ES vs VAL J-1
    const nqAboveVal = nqLp>0&&nqVal>0&&nqLp>nqVal
    const esAboveVal = esLp>0&&esVal>0&&esLp>esVal
    const p9NQ: Status = !nqLp||!nqVal?'na':nqAboveVal?'ok':'no'
    const p9ES: Status = !esLp||!esVal?'na':esAboveVal?'ok':'no'
    const p9All: Status = nqAboveVal&&esAboveVal?'ok':(!nqLp||!esLp||!nqVal||!esVal)?'na':(nqAboveVal||esAboveVal)?'wait':'no'

    // 3. TPO structure
    const tpoLetts = tpoLetters[tab]
    let otfStatus: Status = 'na'
    if (tpoLetts.length >= 2) {
      const lastPoc = pf(tpoLetts[tpoLetts.length-1].poc)
      const prevPoc = pf(tpoLetts[tpoLetts.length-2].poc)
      if (lastPoc>0&&prevPoc>0) otfStatus = lastPoc>prevPoc?'ok':lastPoc<prevPoc?'no':'wait'
    }
    let equalHighStatus: Status = 'na'
    if (tpoLetts.length >= 2) {
      const h1=pf(tpoLetts[tpoLetts.length-1].high), h2=pf(tpoLetts[tpoLetts.length-2].high)
      if (h1>0&&h2>0) equalHighStatus = Math.abs(h1-h2)<TICK_SZ[tab]*3?'ok':'no'
    }

    // BOX levels
    const boxH = pf(I.boxHigh), boxL = pf(I.boxLow)
    const bMid = boxH>0&&boxL>0 ? (boxH+boxL)/2 : 0
    const boxPosStatus: Status = !lp||!boxH||!boxL ? 'na' : lp>boxH ? 'ok' : lp>bMid ? 'wait' : 'no'
    const boxDH = boxH>0&&lp>0 ? Math.abs(lp-boxH) : 0
    const boxDL = boxL>0&&lp>0 ? Math.abs(lp-boxL) : 0

    // 4. TRIGGER
    const vwapStatus: Status = !lp||!vw18?'na':lp>vw18?'ok':lp===vw18?'wait':'no'

    // 5. NOON CURVE
    const parts0 = nyTime.split(':')
    const totMin = parseInt(parts0[0]||'0')*60+parseInt(parts0[1]||'0')
    const isNoon = totMin>=12*60&&totMin<14*60
    let amHigh=0
    if (isNoon) {
      const amBars = rthRows[tab].filter(r=>r.heure>='09:30'&&r.heure<'12:00')
      amHigh = amBars.reduce((mx,r)=>{const h=pf(r.high);return h>mx?h:mx},0)
    }
    const noonAMSet: Status = isNoon?(amHigh>0?'ok':'wait'):'na'
    const noonPM: Status = isNoon&&amHigh>0&&lp>0 ? (Math.abs(lp-amHigh)<(pf(I.atr)||5)*0.35?'ok':lp<amHigh?'wait':'no') : 'na'

    // Signal direction + score
    const checks: Status[] = [valAccepted, pocMigStatus, p9All, otfStatus, vwapStatus]
    const okCnt = checks.filter(s=>s==='ok').length
    const naCnt = checks.filter(s=>s==='na').length
    const active = checks.length-naCnt
    const setupReady   = okCnt>=4
    const setupPartial = okCnt>=2

    // Direction: prefer cSig if confident, else vote from conditions
    const dir = cSig.signal==='LONG'?'LONG':cSig.signal==='SHORT'?'SHORT':'LONG'
    const dirCol = dir==='LONG'?C.up:C.down

    // Levels
    const stopL   = rVal>0?rVal:pf(sdVals.sm1)
    const c1L     = pf(sdVals.sp1), c2L=rVah, c3L=pf(sdVals.sp2)
    const stopS   = rVah>0?rVah:pf(sdVals.sp1)
    const c1S     = pf(sdVals.sm1), c2S=rVal, c3S=pf(sdVals.sm2)
    const eApprox = vw18>0?vw18:lp
    const rrL = eApprox>0&&stopL>0&&c1L>0&&c1L>eApprox&&eApprox>stopL ? ((c1L-eApprox)/(eApprox-stopL)).toFixed(1) : '—'
    const rrS = eApprox>0&&stopS>0&&c1S>0&&c1S<eApprox&&stopS>eApprox ? ((eApprox-c1S)/(stopS-eApprox)).toFixed(1) : '—'

    const si = (s: Status) => s==='ok'?'✅':s==='wait'?'⏳':s==='no'?'❌':'⬜'
    const sc2 = (s: Status) => s==='ok'?C.up:s==='wait'?C.amber:s==='no'?C.down:C.muted

    const sHdr = (txt: string) => (
      <div style={{ fontSize:7.5, fontFamily:'Orbitron,monospace', fontWeight:700, color:C.muted, letterSpacing:'0.18em', paddingBottom:3, borderBottom:'1px solid rgba(201,168,76,0.10)', marginTop:6 }}>{txt}</div>
    )
    const Row2 = ({ s, label, val }: { s: Status; label: string; val?: string }) => (
      <div style={{ display:'flex', alignItems:'center', gap:7, padding:'2px 0' }}>
        <span style={{ fontSize:11, lineHeight:1, minWidth:16, textAlign:'center' }}>{si(s)}</span>
        <span style={jb(8.5, s==='ok'?600:400, { color:sc2(s), flex:1 })}>{label}</span>
        {val&&<span style={jb(8.5, 700, { color:sc2(s), fontVariantNumeric:'tabular-nums' })}>{val}</span>}
      </div>
    )

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {/* Setup score banner */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'7px 12px', background: setupReady?'rgba(0,255,136,0.07)':setupPartial?'rgba(212,175,55,0.07)':'rgba(136,153,187,0.05)', borderRadius:3, border:`1px solid ${setupReady?'rgba(0,255,136,0.25)':setupPartial?'rgba(212,175,55,0.22)':'rgba(136,153,187,0.14)'}` }}>
          <span style={orb(11, 900, { color: setupReady?C.up:setupPartial?C.amber:C.muted, letterSpacing:'0.14em' })}>{setupReady?'◈ SETUP PRÊT':setupPartial?'◈ SETUP PARTIEL':'◈ PAS DE SETUP'}</span>
          <span style={jb(9, 600, { color:C.muted })}>{okCnt}/{active}</span>
          <span style={{ flex:1 }} />
          <span style={orb(10, 900, { color:dirCol })}>{dir}</span>
          {nyTime && <span style={jb(8, 400, { color:'rgba(136,153,187,0.55)' })}>{nyTime.slice(0,5)} ET</span>}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {/* ── LEFT: Checklist ─────────────────── */}
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {sHdr('1 · CONTEXTE (TOP-DOWN)')}
            <Row2 s={valAccepted}  label="VAL J-1 acceptée (prix > VAH)"    val={rVah>0?`>${fmt2(rVah)}`:''} />
            <Row2 s={pocMigStatus} label="POC migration"                     val={td.pocMig||'—'} />
            <div style={{ display:'flex', alignItems:'center', gap:7, padding:'2px 0' }}>
              <span style={{ fontSize:11, lineHeight:1, minWidth:16, textAlign:'center' }}>{alnPat?'ℹ️':'⬜'}</span>
              <span style={jb(8.5, 400, { color:C.muted, flex:1 })}>ALN Pattern</span>
              <span style={jb(8.5, 700, { color:alnPat==='P3'?C.up:alnPat==='P4'?C.down:C.muted })}>{alnPat||'—'}{alnBiais!=='—'?` · ${alnBiais}`:''}</span>
            </div>

            {sHdr('2 · §9 — ALIGNEMENT NQ/ES')}
            <Row2 s={p9NQ} label={`NQ > VAL J-1`} val={nqVal>0?fmt2(nqVal):''} />
            <Row2 s={p9ES} label={`ES > VAL J-1`} val={esVal>0?fmt2(esVal):''} />
            <Row2 s={p9All} label="§9 Global" val={p9All==='ok'?'CONFIRMÉ':p9All==='wait'?'PARTIEL':p9All==='no'?'DIVERGENT':'—'} />

            {boxH>0&&boxL>0&&(<>
              {sHdr('BOX RTH · ZONE BALANCÉE')}
              <Row2 s={boxPosStatus} label="Prix > BOX High (breakout haussier)" val={boxH>0?fmt2(boxH):''} />
              {boxDH>0&&<div style={{ display:'flex', gap:7, padding:'2px 0', paddingLeft:23 }}><span style={jb(8,400,{color:C.muted})}>Δ BOX High</span><span style={jb(8.5,700,{color:C.muted,fontVariantNumeric:'tabular-nums'})}>{fmt2(boxDH)}</span></div>}
              {boxDL>0&&<div style={{ display:'flex', gap:7, padding:'2px 0', paddingLeft:23 }}><span style={jb(8,400,{color:C.muted})}>Δ BOX Low</span><span style={jb(8.5,700,{color:C.muted,fontVariantNumeric:'tabular-nums'})}>{fmt2(boxDL)}</span></div>}
              {bMid>0&&<div style={{ display:'flex', gap:7, padding:'2px 0', paddingLeft:23 }}><span style={jb(8,400,{color:'#00d4ff'})}>Milieu BOX = pivot</span><span style={jb(8.5,700,{color:'#00d4ff',fontVariantNumeric:'tabular-nums'})}>{fmt2(bMid)}</span></div>}
              {cSig.boxPos&&<div style={{ display:'flex', gap:7, padding:'2px 0', paddingLeft:23 }}><span style={jb(8,400,{color:C.muted})}>Mode</span><Pill label={cSig.boxPos} col={cSig.boxPos==='BREAKOUT HAUSSIER'?C.up:cSig.boxPos==='BREAKOUT BAISSIER'?C.down:'#00d4ff'}/></div>}
            </>)}

            {sHdr('3 · STRUCTURE TPO')}
            <Row2 s={otfStatus}      label="OTF Higher (POC montant)"          val={otfStatus==='ok'?'OUI':otfStatus==='no'?'NON':otfStatus==='wait'?'STABLE':'—'} />
            <Row2 s={equalHighStatus} label="Equal High"                        val={equalHighStatus==='ok'?'Détecté':equalHighStatus==='no'?'Non':'—'} />
            <Row2 s={pocMigStatus}   label="POC stable ou montant"             val={td.pocMig||'—'} />

            {sHdr('4 · TRIGGER')}
            <Row2 s={vwapStatus} label="Prix > VWAP18h" val={vw18>0?fmt2(vw18):''} />
            <div style={{ display:'flex', alignItems:'center', gap:7, padding:'2px 0' }}>
              <span style={{ fontSize:11, lineHeight:1, minWidth:16, textAlign:'center' }}>⏳</span>
              <span style={jb(8.5, 400, { color:C.amber, flex:1 })}>Bougie {dir==='LONG'?'rouge':'verte'} sur pullback</span>
              <span style={jb(8, 400, { color:'rgba(136,153,187,0.45)' })}>manuel</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:7, padding:'2px 0' }}>
              <span style={{ fontSize:11, lineHeight:1, minWidth:16, textAlign:'center' }}>⏳</span>
              <span style={jb(8.5, 400, { color:C.amber, flex:1 })}>Close &gt; niveau clé → ENTRÉE</span>
              <span style={jb(8, 400, { color:'rgba(136,153,187,0.45)' })}>manuel</span>
            </div>

            {isNoon && (<>
              {sHdr('5 · NOON CURVE (12h–14h)')}
              <Row2 s={noonAMSet} label="High AM posé"              val={amHigh>0?fmt2(amHigh):''} />
              <Row2 s={noonPM}    label="PM retour vers High AM"     val={amHigh>0&&lp>0?`Δ${Math.abs(lp-amHigh).toFixed(2)}`:''} />
            </>)}
          </div>

          {/* ── RIGHT: Signal Output ─────────────── */}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ fontSize:7.5, fontFamily:'Orbitron,monospace', fontWeight:700, color:C.muted, letterSpacing:'0.18em', paddingBottom:3, borderBottom:'1px solid rgba(201,168,76,0.10)' }}>SIGNAL OUTPUT</div>

            <div style={{ border:`1px solid ${dirCol}30`, borderRadius:4, overflow:'hidden', flexGrow:1 }}>
              <div style={{ padding:'7px 10px', background:`${dirCol}0a`, borderBottom:`1px solid ${dirCol}20`, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:dirCol, flexShrink:0, animation: setupReady?`pulseDot${dir==='LONG'?'':' '} 1.8s infinite`:'none' }} />
                <span style={orb(10, 900, { color:dirCol, letterSpacing:'0.16em' })}>SETUP {tab} — {dir}</span>
              </div>
              <div style={{ padding:'8px 10px', display:'flex', flexDirection:'column', gap:5 }}>
                {/* Condition summary rows */}
                {valAccepted!=='na'&&<div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:11 }}>{si(valAccepted)}</span>
                  <span style={jb(8.5, valAccepted==='ok'?600:400, { color:sc2(valAccepted) })}>VAL J-1 acceptée</span>
                </div>}
                {p9All!=='na'&&<div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:11 }}>{si(p9All)}</span>
                  <span style={jb(8.5, p9All==='ok'?600:400, { color:sc2(p9All) })}>§9 {p9All==='ok'?'confirmé':p9All==='wait'?'partiel':'divergent'}</span>
                </div>}
                {otfStatus!=='na'&&<div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:11 }}>{si(otfStatus)}</span>
                  <span style={jb(8.5, otfStatus==='ok'?600:400, { color:sc2(otfStatus) })}>OTF Higher</span>
                </div>}
                {vwapStatus!=='na'&&<div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:11 }}>{si(vwapStatus)}</span>
                  <span style={jb(8.5, vwapStatus==='ok'?600:400, { color:sc2(vwapStatus) })}>VWAP18h {vwapStatus==='ok'?'au-dessus':'en-dessous'}</span>
                </div>}
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  <span style={{ fontSize:11 }}>⏳</span>
                  <span style={jb(8.5, 400, { color:C.amber })}>Attendre bougie {dir==='LONG'?'rouge':'verte'}</span>
                </div>

                <div style={{ height:1, background:'rgba(201,168,76,0.10)', margin:'3px 0' }} />

                {/* Entry rule */}
                <div style={{ padding:'5px 8px', background:`${dirCol}08`, borderRadius:2, borderLeft:`2px solid ${dirCol}60` }}>
                  <div style={jb(8, 400, { color:C.muted, marginBottom:2 })}>Règle entrée</div>
                  <div style={jb(8.5, 600, { color:dirCol })}>Close {dir==='LONG'?'rouge':'verte'} {dir==='LONG'?'>':'<'} VWAP18h{vw18>0?` (${fmt2(vw18)})`:''}</div>
                </div>

                <div style={{ height:1, background:'rgba(201,168,76,0.10)', margin:'1px 0' }} />

                {/* Levels */}
                {dir==='LONG'?(<>
                  {stopL>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>Stop</span><span style={jb(9,700,{color:C.down,fontVariantNumeric:'tabular-nums'})}>{boxL>0?`BOX Low  ${fmt2(boxL)}`:`sous VAL J-1  ${fmt2(stopL)}`}</span></div>}
                  {c1L>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>C1</span><span style={jb(9,700,{color:C.up,fontVariantNumeric:'tabular-nums'})}>{boxH>0?`BOX High  ${fmt2(boxH)}`:`SD+1  ${fmt2(c1L)}`}</span></div>}
                  {c2L>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>C2</span><span style={jb(9,700,{color:C.up,fontVariantNumeric:'tabular-nums'})}>VAH J-1  {fmt2(c2L)}</span></div>}
                  {c3L>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>C3</span><span style={jb(9,700,{color:C.up,fontVariantNumeric:'tabular-nums'})}>SD+2  {fmt2(c3L)}</span></div>}
                  {bMid>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:'#00d4ff',minWidth:36})}>Pivot</span><span style={jb(9,700,{color:'#00d4ff',fontVariantNumeric:'tabular-nums'})}>BOX Mid  {fmt2(bMid)}</span></div>}
                  {rrL!=='—'&&<div style={{ display:'flex', gap:8, paddingTop:3, borderTop:'1px solid rgba(201,168,76,0.08)' }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>R:R</span><span style={jb(9,700,{color:C.teal})}>1 : {rrL}</span></div>}
                </>):(<>
                  {stopS>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>Stop</span><span style={jb(9,700,{color:C.down,fontVariantNumeric:'tabular-nums'})}>{boxH>0?`BOX High  ${fmt2(boxH)}`:`sur VAH J-1  ${fmt2(stopS)}`}</span></div>}
                  {c1S>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>C1</span><span style={jb(9,700,{color:C.up,fontVariantNumeric:'tabular-nums'})}>{boxL>0?`BOX Low  ${fmt2(boxL)}`:`SD-1  ${fmt2(c1S)}`}</span></div>}
                  {c2S>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>C2</span><span style={jb(9,700,{color:C.up,fontVariantNumeric:'tabular-nums'})}>VAL J-1  {fmt2(c2S)}</span></div>}
                  {c3S>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>C3</span><span style={jb(9,700,{color:C.up,fontVariantNumeric:'tabular-nums'})}>SD-2  {fmt2(c3S)}</span></div>}
                  {bMid>0&&<div style={{ display:'flex', gap:8 }}><span style={jb(8,400,{color:'#00d4ff',minWidth:36})}>Pivot</span><span style={jb(9,700,{color:'#00d4ff',fontVariantNumeric:'tabular-nums'})}>BOX Mid  {fmt2(bMid)}</span></div>}
                  {rrS!=='—'&&<div style={{ display:'flex', gap:8, paddingTop:3, borderTop:'1px solid rgba(201,168,76,0.08)' }}><span style={jb(8,400,{color:C.muted,minWidth:36})}>R:R</span><span style={jb(9,700,{color:C.teal})}>1 : {rrS}</span></div>}
                </>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPositionActive = () => {
    const lp     = pf(I.lastPx)
    const entry  = pf(posEntry)
    const stop   = pf(posStop)
    const vw18   = pf(I.vwap18h)
    const sp1    = pf(sdVals.sp1), sm1 = pf(sdVals.sm1)
    const sp2    = pf(sdVals.sp2), sm2 = pf(sdVals.sm2)
    const ibH    = pf(I.ibHigh),   ibL = pf(I.ibLow)
    const ibMidV = ibH>0&&ibL>0 ? (ibH+ibL)/2 : 0
    const orbH   = pf(I.orbHigh),  orbL = pf(I.orbLow)
    const bxH    = pf(I.boxHigh),  bxL = pf(I.boxLow)
    const bxMid  = bxH>0&&bxL>0 ? (bxH+bxL)/2 : 0
    const alnPat = tab==='NQ' ? I.alnPattern : ''
    const alnBiais = alnPat==='P3' ? 'Haussier' : alnPat==='P4' ? 'Baissier' : alnPat ? 'Neutre' : '—'
    const alnCol   = alnPat==='P3' ? C.up : alnPat==='P4' ? C.down : C.muted
    const pnlPts   = lp>0&&entry>0 ? (posDir==='LONG' ? lp-entry : entry-lp) : 0
    const pnlCol   = pnlPts>0 ? C.up : pnlPts<0 ? C.down : C.muted

    interface Verdict { action: 'TENIR'|'ALLÉGER'|'SORTIR'|'STOP'|'RE-ENTRER'|'ATTENTE'; icon: string; col: string; reason: string; priority: number }
    const verdicts: Verdict[] = []
    const add = (action: Verdict['action'], icon: string, col: string, reason: string, priority: number) =>
      verdicts.push({ action, icon, col, reason, priority })

    if (posMode === 'OVN') {
      if (posDir === 'LONG') {
        if (alnPat === 'P4')           add('SORTIR',  '❌', C.down,  'ALN biais Baissier', 10)
        if (p9Align === 'Divergent')   add('SORTIR',  '❌', C.down,  'NQ/ES divergent', 9)
        if (lp>0&&vw18>0&&lp<vw18)    add('STOP',    '❌', C.down,  `Prix < VWAP18h (${fmt2(vw18)})`, 8)
        if (lp>0&&sp2>0&&lp>=sp2)     add('SORTIR',  '🎯', C.teal,  `SD+2 atteint (${fmt2(sp2)})`, 7)
        if (lp>0&&bxH>0&&lp>=bxH)     add('SORTIR',  '🎯', C.teal,  `BOX High atteint (${fmt2(bxH)})`, 6)
        if (lp>0&&sp1>0&&lp>=sp1)     add('ALLÉGER', '⚠️', C.amber, `SD+1 atteint (${fmt2(sp1)})`, 5)
        if (lp>0&&bxMid>0&&lp<bxMid&&bxL>0&&lp>bxL) add('ALLÉGER','⚠️', C.amber, `Prix sous Milieu BOX (${fmt2(bxMid)})`, 4)
        if (lp>0&&bxL>0&&lp<bxL)      add('STOP',    '❌', C.down,  `Prix sous BOX Low (${fmt2(bxL)})`, 8)
        if (alnPat==='P3'&&p9Align==='Aligné'&&lp>0&&vw18>0&&lp>vw18)
                                       add('TENIR',   '✅', C.up,    'ALN Haussier + §9 Aligné + Prix > VWAP', 3)
        else if (!verdicts.length)     add('ATTENTE', '⏳', C.muted, 'Conditions partielles', 1)
      } else {
        if (alnPat === 'P3')           add('SORTIR',  '❌', C.down,  'ALN biais Haussier', 10)
        if (p9Align === 'Divergent')   add('SORTIR',  '❌', C.down,  'NQ/ES divergent', 9)
        if (lp>0&&vw18>0&&lp>vw18)    add('STOP',    '❌', C.down,  `Prix > VWAP18h (${fmt2(vw18)})`, 8)
        if (lp>0&&bxL>0&&lp<=bxL)     add('SORTIR',  '🎯', C.teal,  `BOX Low atteint (${fmt2(bxL)})`, 6)
        if (lp>0&&sm2>0&&lp<=sm2)     add('SORTIR',  '🎯', C.teal,  `SD-2 atteint (${fmt2(sm2)})`, 7)
        if (lp>0&&sm1>0&&lp<=sm1)     add('ALLÉGER', '⚠️', C.amber, `SD-1 atteint (${fmt2(sm1)})`, 5)
        if (lp>0&&bxMid>0&&lp>bxMid&&bxH>0&&lp<bxH) add('ALLÉGER','⚠️', C.amber, `Prix sur Milieu BOX (${fmt2(bxMid)})`, 4)
        if (lp>0&&bxH>0&&lp>bxH)      add('STOP',    '❌', C.down,  `Prix sur BOX High (${fmt2(bxH)})`, 8)
        if (alnPat==='P4'&&p9Align==='Aligné'&&lp>0&&vw18>0&&lp<vw18)
                                       add('TENIR',   '✅', C.up,    'ALN Baissier + §9 Aligné + Prix < VWAP', 3)
        else if (!verdicts.length)     add('ATTENTE', '⏳', C.muted, 'Conditions partielles', 1)
      }
    } else if (posMode === 'RTH') {
      if (posDir === 'LONG') {
        const orbConf = lp>0&&orbH>0&&lp>orbH
        if (ibH>0&&lp>0&&lp<ibH&&orbH>0&&lp>orbL) add('SORTIR', '❌', C.down, 'Prix revient dans IB après cassure', 8)
        if (ibH>0&&lp>0&&lp>=ibH)                  add('ALLÉGER','⚠️', C.amber,`IB High atteint (${fmt2(ibH)})`, 6)
        if (ibMidV>0&&lp>0&&lp<ibMidV)             add('ALLÉGER','⚠️', C.amber,`IB Mid perdu (${fmt2(ibMidV)})`, 5)
        if (I.ibClass==='Wide IB'&&orbConf)         add('RE-ENTRER','🔄',C.teal,'Wide IB + ORB confirmé', 4)
        if (orbConf)                                add('TENIR',   '✅', C.up,  `ORB cassé haut (${fmt2(orbH)})`, 3)
        if (!verdicts.length)                       add('ATTENTE', '⏳', C.muted,'ORB non confirmé', 1)
      } else {
        const orbConf = lp>0&&orbL>0&&lp<orbL
        if (ibL>0&&lp>0&&lp>ibL&&orbL>0&&lp<orbH) add('SORTIR', '❌', C.down, 'Prix revient dans IB après cassure', 8)
        if (ibL>0&&lp>0&&lp<=ibL)                  add('ALLÉGER','⚠️', C.amber,`IB Low atteint (${fmt2(ibL)})`, 6)
        if (ibMidV>0&&lp>0&&lp>ibMidV)             add('ALLÉGER','⚠️', C.amber,`IB Mid perdu (${fmt2(ibMidV)})`, 5)
        if (I.ibClass==='Wide IB'&&orbConf)         add('RE-ENTRER','🔄',C.teal,'Wide IB + ORB confirmé', 4)
        if (orbConf)                                add('TENIR',   '✅', C.up,  `ORB cassé bas (${fmt2(orbL)})`, 3)
        if (!verdicts.length)                       add('ATTENTE', '⏳', C.muted,'ORB non confirmé', 1)
      }
    }

    const sorted  = [...verdicts].sort((a,b)=>b.priority-a.priority)
    const main    = sorted[0]
    const others  = sorted.slice(1)
    const allergerAt = posMode==='OVN' ? (posDir==='LONG' ? sdVals.sp1 : sdVals.sm1) : (posDir==='LONG' ? (ibH>0?fmt2(ibH):'') : (ibL>0?fmt2(ibL):''))
    const sortirAt   = posMode==='OVN' ? (posDir==='LONG' ? sdVals.sp2 : sdVals.sm2) : ''
    const hasPos = entry>0 && stop>0
    const inpS: CSSProperties = { padding:'5px 8px', borderRadius:3, border:'1px solid rgba(201,168,76,0.30)', background:'#1a2236', color:'#fff', fontFamily:'"JetBrains Mono",monospace', fontSize:11, outline:'none', boxSizing:'border-box', width:'100%' }

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {/* Mode + Direction */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          <span style={jb(9, 400, { color:C.muted })}>MODE :</span>
          {(['OVN','RTH'] as const).map(m=>(
            <button key={m} onClick={()=>setPosMode(p=>p===m?null:m)} style={{ padding:'4px 10px', border:'none', borderRadius:2, cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, letterSpacing:'0.12em', background: posMode===m?'rgba(201,168,76,0.18)':'transparent', outline:`1px solid ${posMode===m?'rgba(201,168,76,0.5)':'rgba(201,168,76,0.14)'}`, color: posMode===m?C.gold:'rgba(136,153,187,0.65)' }}>{m}</button>
          ))}
          <span style={{ marginLeft:6, ...jb(9, 400, { color:C.muted }) }}>DIRECTION :</span>
          {(['LONG','SHORT'] as const).map(d=>(
            <button key={d} onClick={()=>setPosDir(d)} style={{ padding:'4px 10px', border:'none', borderRadius:2, cursor:'pointer', fontFamily:'Orbitron,monospace', fontSize:8, fontWeight:700, letterSpacing:'0.12em', background: posDir===d?(d==='LONG'?'rgba(0,255,136,0.12)':'rgba(255,68,68,0.12)'):'transparent', outline:`1px solid ${posDir===d?(d==='LONG'?'rgba(0,255,136,0.4)':'rgba(255,68,68,0.4)'):'rgba(201,168,76,0.14)'}`, color: posDir===d?(d==='LONG'?C.up:C.down):'rgba(136,153,187,0.65)' }}>{d}</button>
          ))}
        </div>

        {/* Inputs */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {([['ENTRÉE', posEntry, setPosEntry, '29150'],['STOP', posStop, setPosStop, '29066'],['CONTRATS', posSize, setPosSize, '1']] as [string,string,(v:string)=>void,string][]).map(([lbl,val,setter,ph])=>(
            <div key={lbl}>
              <div style={jb(8, 400, { color:C.muted, marginBottom:3 })}>{lbl}</div>
              <input type="text" inputMode="decimal" value={val} onChange={e=>setter(normNum(e.target.value))} placeholder={ph} style={inpS} />
            </div>
          ))}
        </div>

        {/* Position block */}
        {hasPos && posMode && (
          <div style={{ border:`2px solid ${posDir==='LONG'?'rgba(0,255,136,0.25)':'rgba(255,68,68,0.25)'}`, borderRadius:4, overflow:'hidden' }}>
            <div style={{ padding:'8px 12px', background: posDir==='LONG'?'rgba(0,255,136,0.07)':'rgba(255,68,68,0.07)', borderBottom:`1px solid ${posDir==='LONG'?'rgba(0,255,136,0.18)':'rgba(255,68,68,0.18)'}`, display:'flex', alignItems:'center', gap:10 }}>
              <span style={orb(11, 900, { color: posDir==='LONG'?C.up:C.down, letterSpacing:'0.18em' })}>POSITION ACTIVE — {posDir}</span>
              <span style={{ flex:1 }} />
              <span style={jb(9, 400, { color:C.muted })}>{posMode} · {tab}</span>
            </div>
            <div style={{ padding:'10px 12px', background:C.sur, display:'flex', flexDirection:'column', gap:8 }}>
              {/* Metrics */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                {([
                  ['ENTRÉE', fmt2(entry),  C.gold],
                  ['STOP',   fmt2(stop),   C.down],
                  ['LAST',   lp>0?fmt2(lp):'—', posDir==='LONG'?(lp>entry?C.up:lp<stop?C.down:C.muted):(lp<entry?C.up:lp>stop?C.down:C.muted)],
                  ['P&L',    (pnlPts>=0?'+':'')+pnlPts.toFixed(2)+' pts', pnlCol],
                ] as [string,string,string][]).map(([label,val,c])=>(
                  <div key={label} style={{ padding:'6px', background:'rgba(0,0,0,0.25)', borderRadius:3, textAlign:'center' }}>
                    <div style={jb(7, 400, { color:C.muted, marginBottom:2 })}>{label}</div>
                    <div style={orb(11, 900, { color:c, fontVariantNumeric:'tabular-nums' })}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Main signal */}
              {main && (
                <div style={{ padding:'10px 12px', borderRadius:3, background: main.action==='TENIR'?'rgba(0,255,136,0.07)':main.action==='ALLÉGER'?'rgba(212,175,55,0.09)':main.action==='SORTIR'||main.action==='STOP'?'rgba(255,68,68,0.09)':main.action==='RE-ENTRER'?'rgba(30,179,188,0.07)':'rgba(136,153,187,0.05)', border:`1px solid ${main.col}30`, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18, lineHeight:1 }}>{main.icon}</span>
                  <div>
                    <span style={orb(15, 900, { color:main.col, letterSpacing:'0.14em' })}>{main.action}</span>
                    <span style={jb(9, 400, { color:'rgba(136,153,187,0.7)', marginLeft:10 })}>{main.reason}</span>
                  </div>
                </div>
              )}

              {/* Auto-signals */}
              <div style={{ display:'flex', flexDirection:'column', gap:4, padding:'6px 0' }}>
                {posMode==='OVN' && (<>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={jb(8, 400, { color:C.muted, minWidth:60 })}>ALN</span>
                    <span style={jb(9, 700, { color:alnCol })}>{alnBiais}</span>
                    {alnPat && <span style={jb(8, 400, { color:'rgba(136,153,187,0.5)' })}>{alnPat}</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={jb(8, 400, { color:C.muted, minWidth:60 })}>§9 NQ+ES</span>
                    <span style={jb(9, 700, { color: p9Align==='Aligné'?C.up:p9Align==='Divergent'?C.down:C.muted })}>{p9Align||'—'}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={jb(8, 400, { color:C.muted, minWidth:60 })}>VWAP18h</span>
                    <span style={jb(9, 700, { color: lp>0&&vw18>0?(lp>vw18?C.up:C.down):C.muted })}>{lp>0&&vw18>0?(lp>vw18?'Au-dessus ✅':'En-dessous ❌'):'—'}</span>
                    {vw18>0&&<span style={jb(8, 400, { color:'rgba(136,153,187,0.45)' })}>{fmt2(vw18)}</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={jb(8, 400, { color:C.muted, minWidth:60 })}>{posDir==='LONG'?'SD+1 / +2':'SD-1 / -2'}</span>
                    <span style={jb(9, 700, { color:C.amber })}>{posDir==='LONG'?`${sdVals.sp1||'—'} / ${sdVals.sp2||'—'}`:`${sdVals.sm1||'—'} / ${sdVals.sm2||'—'}`}</span>
                  </div>
                </>)}
                {posMode==='RTH' && (<>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={jb(8, 400, { color:C.muted, minWidth:60 })}>ORB</span>
                    <span style={jb(9, 700, { color: lp>0&&orbH>0&&orbL>0?(lp>orbH?C.up:lp<orbL?C.up:C.muted):C.muted })}>{lp>0&&orbH>0&&orbL>0?(lp>orbH?`Cassé haut (${fmt2(orbH)}) ✅`:lp<orbL?`Cassé bas (${fmt2(orbL)}) ✅`:'Dans ORB ⚠️'):'—'}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={jb(8, 400, { color:C.muted, minWidth:60 })}>IB</span>
                    <span style={jb(9, 700, { color: ibH>0&&ibL>0?(lp>ibH?C.up:lp<ibL?C.down:C.muted):C.muted })}>{ibH>0&&ibL>0?(lp>ibH?'Au-dessus IB':lp<ibL?'En-dessous IB':'Dans IB'):'—'}</span>
                    {I.ibClass&&<span style={jb(8, 400, { color:'rgba(136,153,187,0.5)' })}>{I.ibClass}</span>}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={jb(8, 400, { color:C.muted, minWidth:60 })}>IB Mid</span>
                    <span style={jb(9, 700, { color: ibMidV>0&&lp>0?(posDir==='LONG'?lp>ibMidV?C.up:C.down:lp<ibMidV?C.up:C.down):C.muted })}>{ibMidV>0?fmt2(ibMidV):'—'}</span>
                  </div>
                </>)}
              </div>

              {/* Targets */}
              {(allergerAt||sortirAt) && (
                <div style={{ display:'flex', gap:16, paddingTop:6, borderTop:'1px solid rgba(201,168,76,0.10)', flexWrap:'wrap' }}>
                  {allergerAt&&<span><span style={jb(8,400,{color:C.muted})}>ALLÉGER 50% : </span><span style={jb(10,700,{color:C.amber})}>{allergerAt}</span></span>}
                  {sortirAt&&<span><span style={jb(8,400,{color:C.muted})}>SORTIR TOTAL : </span><span style={jb(10,700,{color:C.teal})}>{sortirAt}</span></span>}
                </div>
              )}

              {/* Secondary signals */}
              {others.length>0&&(
                <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                  {others.map((v,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, padding:'3px 8px', background:'rgba(0,0,0,0.15)', borderRadius:2 }}>
                      <span style={{ fontSize:10, lineHeight:1 }}>{v.icon}</span>
                      <span style={jb(8,600,{color:v.col})}>{v.action}</span>
                      <span style={jb(8,400,{color:'rgba(136,153,187,0.55)'})}>{v.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!hasPos && posMode && (
          <div style={{ textAlign:'center', padding:14, ...jb(10,400,{color:C.muted}) }}>
            Saisissez Entrée + Stop pour activer le suivi de position
          </div>
        )}
      </div>
    )
  }

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
        {/* SC Bridge status + launch button */}
        <button
          onClick={() => { if (wsSc !== 'live') window.open('scbridge://launch') }}
          title={wsSc === 'live' ? 'Bridge actif' : 'Cliquer pour lancer le bridge Sierra Chart'}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:2, border:'none', cursor: wsSc==='live' ? 'default' : 'pointer', background: wsSc==='live' ? 'rgba(0,255,136,0.08)' : 'rgba(255,68,68,0.13)', outline:`1px solid ${wsSc==='live' ? 'rgba(0,255,136,0.30)' : 'rgba(255,68,68,0.45)'}`, transition:'all 0.15s' }}
        >
          <span style={{ width:6, height:6, borderRadius:'50%', background: wsSc==='live' ? C.up : C.down, flexShrink:0, animation: wsSc==='live' ? 'pulseDot 1.8s infinite' : 'none' }} />
          <span style={orb(7, 700, { color: wsSc==='live' ? C.up : C.down, letterSpacing:'0.14em' })}>
            {wsSc==='live' ? 'SC LIVE' : '⚡ LANCER BRIDGE'}
          </span>
        </button>
        <Btn label="◉ SETUP LAUNCHER"   active={slOpen} col='#00d4ff' onClick={()=>setSlOpen(o=>!o)} />
        <Btn label="▲ TOP-DOWN DALTON"  active={tdOpen} col={C.goldL} onClick={()=>setTdOpen(o=>!o)} />
        <Btn label="⊕ LIVE TRACKER"     active={trOpen} col={C.up}    onClick={()=>setTrOpen(o=>!o)} />
        <Btn label="⚙ RÉGLAGES IB/OR"  active={stOpen} col={C.muted}  onClick={()=>setStOpen(o=>!o)} />
        <Btn label="◈ BACKTEST SD-2"    active={btOpen} col={C.teal}  onClick={()=>setBtOpen(o=>!o)} />
        <Btn label="⬡ POSITION ACTIVE"  active={posOpen} col='#c77dff' onClick={()=>setPosOpen(o=>!o)} />
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

      {/* Setup Launcher */}
      {slOpen && (
        <div style={{ border:'1px solid rgba(0,212,255,0.22)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'6px 12px', borderLeft:'3px solid #00d4ff', background:'rgba(0,212,255,0.04)', borderBottom:'1px solid rgba(0,212,255,0.14)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={orb(8.5, 900, { color:'#00d4ff', letterSpacing:'0.22em' })}>◉ SETUP LAUNCHER · {tab}</span>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#00d4ff', animation:'pulseDot 2.4s infinite', flexShrink:0 }} />
          </div>
          <div style={{ padding:'12px 12px', background:C.sur }}>
            {renderSetupLauncher()}
          </div>
        </div>
      )}

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

      {/* Backtest SD-2 Bounce OVN */}
      {btOpen && (
        <div style={{ border:`1px solid rgba(30,179,188,0.22)`, borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'6px 12px', borderLeft:`3px solid ${C.teal}`, background:'rgba(30,179,188,0.04)', borderBottom:'1px solid rgba(30,179,188,0.14)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={orb(8.5, 900, { color:C.teal, letterSpacing:'0.22em' })}>◈ BACKTEST — SD-2 BOUNCE OVN · NQ</span>
          </div>
          <div style={{ padding:'12px 12px', background:C.sur }}>
            {renderBacktest()}
          </div>
        </div>
      )}

      {/* Position Active */}
      {posOpen && (
        <div style={{ border:'1px solid rgba(199,125,255,0.22)', borderRadius:4, overflow:'hidden' }}>
          <div style={{ padding:'6px 12px', borderLeft:'3px solid #c77dff', background:'rgba(199,125,255,0.04)', borderBottom:'1px solid rgba(199,125,255,0.14)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={orb(8.5, 900, { color:'#c77dff', letterSpacing:'0.22em' })}>⬡ GESTION POSITION ACTIVE · {tab}</span>
          </div>
          <div style={{ padding:'12px 12px', background:C.sur }}>
            {renderPositionActive()}
          </div>
        </div>
      )}

      <input ref={csvInputRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={handleCsvFile} />
      <input ref={btCsvRef} type="file" accept=".csv,.txt" style={{ display:'none' }} onChange={e => {
        const f = e.target.files?.[0]; if (!f) return
        setBtFile(f.name); setBtTrades([])
        const r = new FileReader(); r.onload = ev => { const { bars, error } = parseBtCsv(ev.target?.result as string || ''); if (error) alert('Erreur CSV: ' + error); else setBtBars(bars) }; r.readAsText(f, 'utf-8')
        e.target.value = ''
      }} />

      {csvMsg && (
        <div style={{ position:'fixed', bottom:16, right:16, zIndex:9999, maxWidth:380, padding:'8px 14px', borderRadius:4, background: csvMsg.ok ? 'rgba(0,255,136,0.12)' : 'rgba(255,68,68,0.12)', border:`1px solid ${csvMsg.ok ? 'rgba(0,255,136,0.4)' : 'rgba(255,68,68,0.4)'}`, backdropFilter:'blur(4px)' }}>
          <span style={jb(11.5, 600, { color: csvMsg.ok ? C.up : C.down, whiteSpace:'pre-wrap' })}>{csvMsg.text}</span>
        </div>
      )}
    </div>
  )
}
