/**
 * SC Bridge — Node.js port de sc_bridge.py
 * WebSocket ws://0.0.0.0:8765  +  HTTP http://0.0.0.0:8766
 * GET /data → payload JSON pour Vercel
 * GET /health → "ok"
 * POST /upload/:instr → reçoit CSV Sierra Chart depuis Windows
 */

import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { WebSocketServer } from 'ws'

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const IS_WIN   = process.platform === 'win32'
const UPLOAD_DIR = '/tmp/sc-bridge'

let FILES = {
  NQ: IS_WIN ? String.raw`C:\SierraChart_CME\Data\NQ.csv.txt`            : `${UPLOAD_DIR}/NQ.csv`,
  ES: IS_WIN ? String.raw`C:\SierraChart_CME\Data\ESU26_FUT_CME[M]  30 Min  #17_GraphData.txt` : `${UPLOAD_DIR}/ES.csv`,
  GC: IS_WIN ? String.raw`C:\SierraChart_CME\Data\GC.csv.txt`           : `${UPLOAD_DIR}/GC.csv`,
  CL: IS_WIN ? String.raw`C:\SierraChart_CME\Data\CL.csv.txt`           : `${UPLOAD_DIR}/CL.csv`,
}

const RTH_START = { NQ: '09:30', ES: '09:30', GC: '08:20', CL: '09:00' }
const RTH_END   = { NQ: '16:00', ES: '16:00', GC: '13:30', CL: '14:30' }

const WS_PORT   = 8765
const HTTP_PORT = 8766
const REFRESH_S = 10

if (!IS_WIN) {
  mkdirSync(UPLOAD_DIR, { recursive: true })
}

// ─── ÉTAT GLOBAL ──────────────────────────────────────────────────────────────

let LAST_MSG = '{}'
const CLIENTS = new Set()
const DIAG_DONE = new Set()

// ─── UTILITAIRES TEMPS ───────────────────────────────────────────────────────

function t2m(t) {
  if (!t) return -1
  const parts = t.split(':')
  if (parts.length < 2) return -1
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return -1
  return h * 60 + m
}

function extractTime(s) {
  s = s.trim()
  if (s.includes(' ')) s = s.split(' ').pop()
  let m = s.match(/^(\d{1,2}):(\d{2})/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  m = s.match(/^(\d{1,2})[Hh](\d{2})/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  m = s.match(/^(\d{2})(\d{2})$/)
  if (m) return `${m[1]}:${m[2]}`
  return ''
}

function parseScDate(s) {
  try {
    const parts = s.trim().split('-')
    if (parts.length < 3) return null
    const y = parseInt(parts[0], 10)
    const mo = parseInt(parts[1], 10)
    const d = parseInt(parts[2], 10)
    if (isNaN(y) || isNaN(mo) || isNaN(d)) return null
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  } catch {
    return null
  }
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

function j1Str() {
  const now = new Date()
  const dow = now.getDay() // 0=Sun,1=Mon,...,6=Sat
  const delta = dow === 1 ? 3 : 1  // lundi → vendredi
  const j1 = new Date(now)
  j1.setDate(j1.getDate() - delta)
  return `${j1.getFullYear()}-${String(j1.getMonth()+1).padStart(2,'0')}-${String(j1.getDate()).padStart(2,'0')}`
}

// ─── PARSING CSV ─────────────────────────────────────────────────────────────

function parseCsv(filepath, diag = false) {
  let content
  try {
    content = readFileSync(filepath, 'utf-8').replace(/^\uFEFF/, '')
  } catch {
    return []  // fichier absent → silencieux
  }

  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = content.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const hdr = lines[0]
  const sep = hdr.split(';').length > hdr.split(',').length && hdr.split(';').length > hdr.split('\t').length
    ? ';'
    : hdr.split('\t').length > hdr.split(',').length ? '\t' : ','

  const splitLine = l => l.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))
  const hdrs = splitLine(hdr).map(h => h.toLowerCase().trim())

  if (diag) {
    console.log(`  [DIAG] Séparateur: ${JSON.stringify(sep)}`)
    console.log(`  [DIAG] Headers: ${JSON.stringify(hdrs)}`)
  }

  function find(...names) {
    for (const n of names) {
      const nc = n.replace(/ /g, '').toLowerCase()
      // exact match
      for (let i = 0; i < hdrs.length; i++) {
        if (hdrs[i] === n.toLowerCase() || hdrs[i].replace(/ /g, '') === nc) return i
      }
      // partial match
      for (let i = 0; i < hdrs.length; i++) {
        if (hdrs[i].replace(/ /g, '').includes(nc)) return i
      }
    }
    return -1
  }

  let idx_date = find('date')
  let idx_time = find('time', 'heure', 'date/time', 'datetime', 'timestamp', 'dateheure')
  let idx_open = find('open', 'ouverture', 'ouvr')
  let idx_high = find('high', 'haut', 'plus haut')
  let idx_low  = find('low', 'bas', 'plus bas')
  let idx_last = find('last', 'close', 'clôture', 'cloture', 'dernier')
  let idx_vol  = find('volume', 'vol', 'totalvolume', 'total volume')
  let idx_vwap = find('vwap', 'vwap(daily)', 'dailyvwap', 'vwap daily')
  let idx_sp1  = find('sd+1', 'sd +1', 'vwap sd+1', '+1sd', 'upper1', 'upper band 1', 'upperband1', 'bande+1', 'bande +1')
  let idx_sm1  = find('sd-1', 'sd -1', 'vwap sd-1', '-1sd', 'lower1', 'lower band 1', 'lowerband1', 'bande-1', 'bande -1')
  let idx_sp2  = find('sd+2', 'sd +2', 'vwap sd+2', '+2sd', 'upper2', 'upper band 2', 'upperband2', 'bande+2', 'bande +2')
  let idx_sm2  = find('sd-2', 'sd -2', 'vwap sd-2', '-2sd', 'lower2', 'lower band 2', 'lowerband2', 'bande-2', 'bande -2')
  let idx_poc  = find('tpo poc', 'poc', 'pointofcontrol', 'point of control')
  let idx_vah  = find('tpo vah', 'vah', 'valuearehigh', 'value area high')
  let idx_val  = find('tpo val', 'val', 'valuearealow', 'value area low')

  // Fallback positionnel Sierra Chart standard : Date,Time,Open,High,Low,Last,...
  const scStd = idx_date === 0 && idx_time === 1
    && idx_open < 0 && idx_high < 0 && idx_low < 0 && idx_last < 0
    && hdrs.length >= 6
  if (scStd) {
    idx_open = 2; idx_high = 3; idx_low = 4; idx_last = 5
    if (diag) console.log('  [DIAG] OHLC fallback positionnel SC (col 2-5)')
  }

  // Volume fallback
  if (idx_vol < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 7) idx_vol = 6

  // VWAP/SD positional fallback (Sierra Chart multi-études)
  if (idx_vwap < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 15) idx_vwap = 14
  if (idx_sp1  < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 16) idx_sp1  = 15
  if (idx_sm1  < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 17) idx_sm1  = 16
  if (idx_sp2  < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 18) idx_sp2  = 17
  if (idx_sm2  < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 19) idx_sm2  = 18

  if (diag) {
    console.log(`  [DIAG] date=${idx_date} time=${idx_time} O=${idx_open} H=${idx_high} L=${idx_low} C=${idx_last}`)
    console.log(`  [DIAG] vwap=${idx_vwap} sp1=${idx_sp1} sm1=${idx_sm1} sp2=${idx_sp2} sm2=${idx_sm2}`)
    console.log(`  [DIAG] poc=${idx_poc} vah=${idx_vah} val=${idx_val}`)
    if (lines[1]) console.log(`  [DIAG] 1ère ligne: ${lines[1]}`)
  }

  const time_col = idx_time >= 0 ? idx_time : idx_date
  if (time_col < 0) {
    console.log(`[WARN] Colonne horaire introuvable dans ${filepath}`)
    return []
  }

  const get = (cols, j) => (j >= 0 && j < cols.length ? cols[j].trim() : '')

  const rows = []
  for (const line of lines.slice(1)) {
    const cols = splitLine(line)
    const raw = get(cols, time_col)
    if (!raw) continue

    let date_obj = null, time_s = ''

    if (idx_date >= 0 && idx_time >= 0) {
      date_obj = parseScDate(get(cols, idx_date))
      time_s   = extractTime(get(cols, idx_time))
    } else if (raw.includes(' ')) {
      const [dp, tp] = raw.split(' ', 2)
      date_obj = parseScDate(dp)
      time_s   = extractTime(tp)
    } else {
      time_s = extractTime(raw)
    }

    if (!time_s) continue

    rows.push({
      date:    date_obj,
      time:    time_s,
      open:    get(cols, idx_open),
      high:    get(cols, idx_high),
      low:     get(cols, idx_low),
      close:   get(cols, idx_last),
      vol:     get(cols, idx_vol),
      vwap:    get(cols, idx_vwap),
      sd1h:    get(cols, idx_sp1),
      sd1l:    get(cols, idx_sm1),
      sd2h:    get(cols, idx_sp2),
      sd2l:    get(cols, idx_sm2),
      tpo_poc: get(cols, idx_poc),
      tpo_vah: get(cols, idx_vah),
      tpo_val: get(cols, idx_val),
    })
  }

  if (diag && rows.length) {
    const r = rows[0]
    console.log(`  [DIAG] 1ère barre: date=${r.date} time=${r.time} O=${r.open} H=${r.high} L=${r.low} C=${r.close}`)
    console.log(`  [DIAG] Total lignes parsées: ${rows.length}`)
  }

  return rows
}

// ─── CALCUL PAYLOAD ───────────────────────────────────────────────────────────

function filterRth(rows, instr) {
  const s = t2m(RTH_START[instr]), e = t2m(RTH_END[instr])
  return rows.filter(r => { const m = t2m(r.time); return m >= s && m < e })
}

function aggHigh(rows) {
  const vals = rows.map(r => parseFloat(r.high)).filter(v => !isNaN(v))
  return vals.length ? Math.max(...vals).toFixed(2) : ''
}

function aggLow(rows) {
  const vals = rows.map(r => parseFloat(r.low)).filter(v => !isNaN(v) && v > 0)
  return vals.length ? Math.min(...vals).toFixed(2) : ''
}

function barDict(r) {
  return {
    time:  r.time,
    open:  r.open,
    high:  r.high,
    low:   r.low,
    close: r.close,
    vwap:  r.vwap  || '',
    sd1h:  r.sd1h  || '',
    sd1l:  r.sd1l  || '',
    sd2h:  r.sd2h  || '',
    sd2l:  r.sd2l  || '',
  }
}

function sessionSplit(rows, instr) {
  const rth = filterRth(rows, instr)
  const sessions = []
  let cur = []
  for (const r of rth) {
    if (cur.length && t2m(r.time) < t2m(cur[cur.length - 1].time)) {
      sessions.push(cur)
      cur = [r]
    } else {
      cur.push(r)
    }
  }
  if (cur.length) sessions.push(cur)
  const today = sessions.length ? sessions[sessions.length - 1] : []
  const j1    = sessions.length >= 2 ? sessions[sessions.length - 2] : []
  return [today, j1]
}

function computeVwap(bars) {
  let cumPv = 0, cumV = 0, scVwap = ''
  for (const r of bars) {
    const h = parseFloat(r.high), l = parseFloat(r.low), c = parseFloat(r.close)
    const v = parseFloat(r.vol || 0)
    if (!isNaN(h) && !isNaN(l) && !isNaN(c)) {
      const tp = (h + l + c) / 3
      if (v > 0) { cumPv += tp * v; cumV += v }
    }
    const vv = parseFloat(r.vwap || 0)
    if (!isNaN(vv) && vv > 0) scVwap = vv.toFixed(2)
  }
  return cumV > 0 ? (cumPv / cumV).toFixed(2) : scVwap
}

function atrAuto(allRows, instr, n = 10) {
  const dates = [...new Set(allRows.filter(r => r.date).map(r => r.date))].sort().reverse()
  const ranges = []
  for (const d of dates) {
    const rth = filterRth(allRows.filter(r => r.date === d), instr)
    if (!rth.length) continue
    const hs = rth.map(r => parseFloat(r.high)).filter(v => !isNaN(v))
    const ls = rth.map(r => parseFloat(r.low)).filter(v => !isNaN(v) && v > 0)
    if (hs.length && ls.length) {
      const range = Math.max(...hs) - Math.min(...ls)
      if (range > 0) ranges.push(range)
    }
    if (ranges.length >= n) break
  }
  return ranges.length ? (ranges.reduce((a, b) => a + b, 0) / ranges.length).toFixed(2) : ''
}

function lastNonempty(bars, key) {
  for (let i = bars.length - 1; i >= 0; i--) {
    const v = (bars[i][key] || '').trim()
    const f = parseFloat(v)
    if (!isNaN(f) && f > 0) return f.toFixed(2)
  }
  return ''
}

function buildPayload(instr, allRows) {
  const today = todayStr()
  const j1    = j1Str()

  const hasDates = allRows.slice(0, 20).some(r => r.date !== null)

  let todayRows, j1Rows, todayAll, barsAsia, barsLondon, barsPre

  if (hasDates) {
    todayAll  = allRows.filter(r => r.date === today)
    todayRows = filterRth(todayAll, instr)
    j1Rows    = filterRth(allRows.filter(r => r.date === j1), instr)
    const asiaJ1    = allRows.filter(r => r.date === j1    && t2m(r.time) >= t2m('18:00'))
    const asiaToday = allRows.filter(r => r.date === today && t2m(r.time) <  t2m('02:00'))
    barsAsia   = [...asiaJ1, ...asiaToday]
    barsLondon = allRows.filter(r => r.date === today && t2m(r.time) >= t2m('02:00') && t2m(r.time) < t2m('08:00'))
    barsPre    = allRows.filter(r => r.date === today && t2m(r.time) >= t2m('08:00') && t2m(r.time) < t2m(RTH_START[instr]))
  } else {
    ;[todayRows, j1Rows] = sessionSplit(allRows, instr)
    todayAll = todayRows
    barsAsia = barsLondon = barsPre = []
  }

  const lastJ1  = j1Rows.length  ? j1Rows[j1Rows.length - 1]  : {}
  const firstJ1 = j1Rows.length  ? j1Rows[0]                  : {}

  let lastVal = ''
  if (todayRows.length)     lastVal = todayRows[todayRows.length - 1].close
  else if (todayAll.length) lastVal = todayAll[todayAll.length - 1].close
  else if (j1Rows.length)   lastVal = j1Rows[j1Rows.length - 1].close
  else if (allRows.length)  lastVal = allRows[allRows.length - 1].close

  const allOvn = [...barsAsia, ...barsLondon, ...barsPre]
  const ovnVwap = allOvn.length ? computeVwap(allOvn) : computeVwap(todayAll)

  const hs = v => v.map(r => parseFloat(r.high)).filter(x => !isNaN(x))
  const ls = v => v.map(r => parseFloat(r.low)).filter(x => !isNaN(x) && x > 0)

  const asiaHs = hs(barsAsia), asiaLs = ls(barsAsia)
  const lonHs  = hs(barsLondon), lonLs = ls(barsLondon)
  const ovnHs  = hs(allOvn), ovnLs = ls(allOvn)

  return {
    last:      lastVal,
    j1_high:   aggHigh(j1Rows),
    j1_low:    aggLow(j1Rows),
    j1_open:   firstJ1.open || '',
    j1_settle: lastJ1.close || '',
    poc:       lastJ1.tpo_poc || '',
    vah:       lastJ1.tpo_vah || '',
    val:       lastJ1.tpo_val || '',
    ovn_vwap:  ovnVwap,
    atr_auto:  atrAuto(allRows, instr),
    asia_high:  asiaHs.length ? Math.max(...asiaHs).toFixed(2) : '',
    asia_low:   asiaLs.length ? Math.min(...asiaLs).toFixed(2) : '',
    asia_close: barsAsia.length ? barsAsia[barsAsia.length - 1].close : '',
    lon_high:   lonHs.length ? Math.max(...lonHs).toFixed(2) : '',
    lon_low:    lonLs.length ? Math.min(...lonLs).toFixed(2) : '',
    lon_close:  barsLondon.length ? barsLondon[barsLondon.length - 1].close : '',
    ovn_high:   ovnHs.length ? Math.max(...ovnHs).toFixed(2) : '',
    ovn_low:    ovnLs.length ? Math.min(...ovnLs).toFixed(2) : '',
    ovn_close:  allOvn.length ? allOvn[allOvn.length - 1].close : '',
    ovn_poc:    lastNonempty(allOvn, 'tpo_poc'),
    ovn_vah:    lastNonempty(allOvn, 'tpo_vah'),
    ovn_val:    lastNonempty(allOvn, 'tpo_val'),
    ovn_sd1h:   lastNonempty(allOvn, 'sd1h'),
    ovn_sd1l:   lastNonempty(allOvn, 'sd1l'),
    ovn_sd2h:   lastNonempty(allOvn, 'sd2h'),
    ovn_sd2l:   lastNonempty(allOvn, 'sd2l'),
    bars_today:  [...todayRows].sort((a, b) => t2m(a.time) - t2m(b.time)).map(barDict),
    bars_j1:     [...j1Rows].sort((a, b) => t2m(a.time) - t2m(b.time)).map(barDict),
    bars_asia:   barsAsia.map(barDict),
    bars_london: barsLondon.map(barDict),
  }
}

function buildMessage() {
  const today = todayStr()
  const j1    = j1Str()
  console.log(`\n  today=${today}  j1=${j1}`)

  const data = {}
  for (const [instr, filepath] of Object.entries(FILES)) {
    const diag = !DIAG_DONE.has(instr)
    if (diag) console.log(`\n  [DIAG] ── ${instr} ─── ${filepath}`)
    const rows = parseCsv(filepath, diag)
    if (diag) DIAG_DONE.add(instr)
    if (!rows.length) continue

    const dated = rows.filter(r => r.date).map(r => r.date).sort()
    if (dated.length) {
      const lastDate = dated[dated.length - 1]
      console.log(`  ${instr}: dernière date CSV=${lastDate}  match=${lastDate === today}`)
    } else {
      console.log(`  ${instr}: aucune date parsée`)
    }

    data[instr] = buildPayload(instr, rows)
    const bt = data[instr].bars_today
    const bj = data[instr].bars_j1
    console.log(`  ${instr}: ${bt.length} barres today / ${bj.length} barres J-1  last=${data[instr].last}`)
  }
  return JSON.stringify(data)
}

// ─── SERVEUR HTTP ─────────────────────────────────────────────────────────────

const INSTRUMENTS = new Set(['NQ', 'ES', 'GC', 'CL'])

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method === 'GET' && req.url === '/data') {
    const body = Buffer.from(LAST_MSG, 'utf-8')
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': body.length })
    res.end(body)
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200)
    res.end('ok')
    return
  }

  if (req.method === 'POST') {
    const parts = req.url.replace(/^\/+/, '').split('/')
    if (parts.length === 2 && parts[0] === 'upload' && INSTRUMENTS.has(parts[1].toUpperCase())) {
      const instr = parts[1].toUpperCase()
      const dest  = FILES[instr] || `${UPLOAD_DIR}/${instr}.csv`
      const chunks = []
      req.on('data', c => chunks.push(c))
      req.on('end', () => {
        const body = Buffer.concat(chunks)
        try {
          const tmp = dest + '.tmp'
          mkdirSync(join(dest, '..').replace(/[^/]+$/, ''), { recursive: true })
          writeFileSync(tmp, body)
          renameSync(tmp, dest)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end('{"ok":true}')
          console.log(`  [upload] ${instr} ${body.length} octets → ${dest}`)
          // Rebuild immédiat sans attendre le prochain cycle
          try { LAST_MSG = buildMessage() } catch {}
        } catch (e) {
          res.writeHead(500)
          res.end(`{"error":"${e.message}"}`)
        }
      })
      return
    }
  }

  res.writeHead(404)
  res.end()
})

// ─── SERVEUR WEBSOCKET ────────────────────────────────────────────────────────

const wss = new WebSocketServer({ port: WS_PORT })

wss.on('connection', ws => {
  CLIENTS.add(ws)
  console.log(`[+] WS client connecté (${CLIENTS.size} actif(s))`)
  ws.send(LAST_MSG)
  ws.on('close', () => {
    CLIENTS.delete(ws)
    console.log(`[-] WS client déconnecté (${CLIENTS.size} actif(s))`)
  })
  ws.on('error', () => CLIENTS.delete(ws))
})

// ─── BOUCLE DE RAFRAÎCHISSEMENT ───────────────────────────────────────────────

function refreshAndBroadcast() {
  const now = new Date()
  console.log(`\n[${now.toTimeString().slice(0, 8)}] Rafraîchissement (${CLIENTS.size} WS client(s))...`)
  try {
    const msg = buildMessage()
    LAST_MSG = msg
    for (const ws of CLIENTS) {
      if (ws.readyState === ws.OPEN) {
        ws.send(msg, err => { if (err) CLIENTS.delete(ws) })
      } else {
        CLIENTS.delete(ws)
      }
    }
  } catch (e) {
    console.error(`  [ERR] refresh: ${e.message}`)
  }
}

// ─── DÉMARRAGE ────────────────────────────────────────────────────────────────

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`SC Bridge HTTP  http://0.0.0.0:${HTTP_PORT}/data`)
})

wss.on('listening', () => {
  console.log(`SC Bridge WS    ws://0.0.0.0:${WS_PORT}`)
})

console.log('\nFichiers configurés :')
for (const [k, v] of Object.entries(FILES)) {
  const ok = existsSync(v)
  console.log(`  ${k}: ${v}  [${ok ? 'OK' : 'absent (ignoré)'}]`)
}
console.log()

// Premier build immédiat
LAST_MSG = buildMessage()

// Rafraîchissement périodique
setInterval(refreshAndBroadcast, REFRESH_S * 1000)
