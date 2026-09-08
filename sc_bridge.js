/**
 * SC Bridge — Node.js
 * WebSocket ws://0.0.0.0:8765  +  HTTP http://0.0.0.0:8766
 * GET /data → payload JSON pour Vercel
 * GET /health → "ok"
 * POST /upload/:instr → reçoit CSV Sierra Chart depuis Windows
 */

import { createServer } from 'http'
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { WebSocketServer, WebSocket } from 'ws'
import { execFile } from 'child_process'

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const IS_WIN       = process.platform === 'win32'
const UPLOAD_DIR   = '/tmp/sc-bridge'
const SNAPSHOT_FILE = IS_WIN
  ? String.raw`C:\SierraChart\CME\Data\sc_snapshot.json`
  : `${UPLOAD_DIR}/sc_snapshot.json`

// Résout le chemin CSV : essaie .csv puis .csv.txt (Sierra Chart peut ajouter .txt)
function resolveCsv(base) {
  if (!IS_WIN) return base
  if (existsSync(base)) return base
  if (existsSync(base + '.txt')) return base + '.txt'
  return base // retourne base même si absent (pour le diagnostic)
}

// NQ multi-sources — essaie les deux variantes de chemin Sierra Chart
const NQ_PATHS = {
  main: resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\NQ.csv`        : `${UPLOAD_DIR}/NQ.csv`),
  auto: resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\NQ_auto.csv`   : `${UPLOAD_DIR}/NQ_auto.csv`),
  m30:  resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\NQ_30min.csv`  : `${UPLOAD_DIR}/NQ_30min.csv`),
  rth:  resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\NQ_RTH.csv`    : `${UPLOAD_DIR}/NQ_RTH.csv`),
  ovn:  resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\NQ_OVN.csv`    : `${UPLOAD_DIR}/NQ_OVN.csv`),
  tpo:  resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\NQ_TPO.csv`    : `${UPLOAD_DIR}/NQ_TPO.csv`),
}

// GC multi-sources : GC.csv = 10min (confirm) | GC_30min.csv = 30min (alert)
const GC_PATHS = {
  m10:  resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\GC.csv`       : `${UPLOAD_DIR}/GC.csv`),
  m30:  resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\GC_30min.csv` : `${UPLOAD_DIR}/GC_30min.csv`),
}

let FILES = {
  NQ:     NQ_PATHS.auto,
  ES:     resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\ES_auto.csv` : `${UPLOAD_DIR}/ES.csv`),
  GC:     GC_PATHS.m10,
  GC_30m: GC_PATHS.m30,
  CL:     resolveCsv(IS_WIN ? String.raw`C:\SierraChart_CME\Data\CL.csv` : `${UPLOAD_DIR}/CL.csv`),
}

// ─── SIERRA CHART ORDER BRIDGE — DTC Protocol (port 11099) ──────────────────
// Architecture : cockpit → sc_bridge POST /order → WS DTC → SC port 11099 (SIM)
// SC Server Settings > DTC Protocol Server : Enable=Yes, Port=11099, Allow Trading=Yes
// Flow : connect → LogonRequest → LogonResponse → SubmitOrder/Flatten → close
const SC_DTC_HOST = process.env.SC_DTC_HOST || '127.0.0.1'
const SC_DTC_PORT = parseInt(process.env.SC_DTC_PORT || '11099', 10)
const SC_ACCOUNT  = process.env.SC_ACCOUNT  || 'Sim1'

const DTC_TYPE = {
  LOGON_REQUEST: 1,
  LOGON_RESPONSE: 2,
  FLATTEN_POSITIONS: 112,
  SUBMIT_NEW_SINGLE_ORDER: 208,
  ORDER_TYPE_MARKET: 1,
  ORDER_TYPE_LIMIT: 2,
  BUY: 1,
  SELL: 2,
  TIME_IN_FORCE_DAY: 1,
}

function sendScOrder({ action, symbol, quantity = 1, orderType = 'MARKET', price = 0 }) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${SC_DTC_HOST}:${SC_DTC_PORT}`)
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('DTC timeout 5s')) }, 5000)

    ws.on('open', () => {
      ws.send(JSON.stringify({
        Type: DTC_TYPE.LOGON_REQUEST,
        ProtocolVersion: 8,
        Username: '',
        Password: '',
        ClientName: 'sc_bridge',
        HeartbeatIntervalInSeconds: 60,
        TradeAccount: SC_ACCOUNT,
      }))
    })

    ws.on('message', (raw) => {
      let msg
      try { msg = JSON.parse(raw.toString()) } catch { return }
      if (msg.Type !== DTC_TYPE.LOGON_RESPONSE) return

      if (msg.Result !== 1) {
        clearTimeout(timer); ws.terminate()
        reject(new Error(`DTC logon refusé: ${msg.ResultText || msg.Result}`))
        return
      }

      const scAction = action.toUpperCase()
      let payload
      if (scAction === 'FLATTEN') {
        payload = { Type: DTC_TYPE.FLATTEN_POSITIONS, TradeAccount: SC_ACCOUNT }
      } else {
        const isLimit = (orderType || '').toUpperCase() === 'LIMIT'
        payload = {
          Type: DTC_TYPE.SUBMIT_NEW_SINGLE_ORDER,
          ClientOrderID: String(Date.now()),
          Symbol: symbol,
          Exchange: 'CME',
          TradeAccount: SC_ACCOUNT,
          OrderType: isLimit ? DTC_TYPE.ORDER_TYPE_LIMIT : DTC_TYPE.ORDER_TYPE_MARKET,
          BuySell: scAction === 'BUY' ? DTC_TYPE.BUY : DTC_TYPE.SELL,
          Quantity: Number(quantity),
          TimeInForce: DTC_TYPE.TIME_IN_FORCE_DAY,
          Price1: isLimit ? Number(price) : 0,
          Price2: 0,
          IsAutomatedOrder: 1,
        }
      }
      ws.send(JSON.stringify(payload))
      // SC ne renvoie pas de confirmation synchrone — fermer proprement après 400ms
      setTimeout(() => {
        clearTimeout(timer); ws.close()
        resolve({ ok: true, action: scAction, symbol, payload })
      }, 400)
    })

    ws.on('error', (err) => { clearTimeout(timer); reject(err) })
  })
}

// ─── AUTO-DÉCOUVERTE des fichiers Sierra Chart ────────────────────────────────
// Scanne tous les dossiers Sierra Chart connus et met à jour FILES automatiquement
function autoDiscoverFiles() {
  if (!IS_WIN) return
  const USERNAME = process.env.USERNAME || process.env.USER || 'USER'
  const searchDirs = [
    String.raw`C:\SierraChart_CME\Data`,
    String.raw`C:\SierraChart\Data`,
    String.raw`C:\SierraChart\CME\Data`,
    `C:\\Users\\${USERNAME}\\SierraChart\\Data`,
    `C:\\Users\\${USERNAME}\\Documents\\SierraChart\\Data`,
    String.raw`C:\Program Files\SierraChart\Data`,
    String.raw`C:\Program Files (x86)\SierraChart\Data`,
    String.raw`D:\SierraChart_CME\Data`,
    String.raw`D:\SierraChart\Data`,
  ]

  const found = {}  // sym → [full_path, ...]
  for (const sym of ['NQ', 'ES', 'GC', 'CL']) found[sym] = []

  console.log('\n[AUTO-SCAN] Recherche des fichiers CSV Sierra Chart...')
  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue
    let files
    try { files = readdirSync(dir) } catch { continue }
    const csvs = files.filter(f => f.toLowerCase().includes('.csv'))
    if (!csvs.length) continue
    console.log(`  [SCAN] ${dir} → ${csvs.length} fichier(s) CSV trouvé(s): ${csvs.slice(0,8).join(', ')}`)
    for (const f of csvs) {
      const fl = f.toLowerCase()
      for (const sym of ['NQ', 'ES', 'GC', 'CL']) {
        if (fl.startsWith(sym.toLowerCase())) {
          found[sym].push(join(dir, f))
        }
      }
    }
  }

  // Sélectionne le meilleur fichier par instrument : préfère _auto, sinon premier
  for (const sym of ['NQ', 'ES', 'GC', 'CL']) {
    const list = found[sym]
    if (!list.length) continue
    const auto = list.find(f => f.toLowerCase().includes('_auto'))
    const chosen = auto || list[0]
    FILES[sym] = chosen
    console.log(`  [AUTO] ${sym} → ${chosen}`)
  }

  // NQ_PATHS : cherche aussi les variantes spécialisées
  const allNqFiles = found.NQ
  const pick = (keyword) => allNqFiles.find(f => f.toLowerCase().includes(keyword)) || ''
  if (pick('_30min') || pick('_30m')) NQ_PATHS.m30 = pick('_30min') || pick('_30m')
  if (pick('_rth'))   NQ_PATHS.rth = pick('_rth')
  if (pick('_ovn'))   NQ_PATHS.ovn = pick('_ovn')
  if (pick('_tpo'))   NQ_PATHS.tpo = pick('_tpo')
  if (!NQ_PATHS.auto || !existsSync(NQ_PATHS.auto)) NQ_PATHS.auto = FILES.NQ

  console.log()
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
const CLIENTS  = new Set()
const DIAG_DONE = new Set()

// ─── ALERTES LAF / LBF ────────────────────────────────────────────────────────
// Mémorise l'état précédent pour n'alerter qu'à la TRANSITION false → true
const ALERT_STATE = { laf_NQ: false, lbf_NQ: false, laf_ES: false, lbf_ES: false, sc_NQ: false, sc_ES: false, sc_GC: false }

function fireToast(title, msg) {
  if (!IS_WIN) { console.log(`  [ALERT] ${title} — ${msg}`); return }
  const ps = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]|Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType=WindowsRuntime]|Out-Null
$xml=[Windows.Data.Xml.Dom.XmlDocument]::new()
$xml.LoadXml('<toast duration="long"><visual><binding template="ToastGeneric"><text>${title}</text><text>${msg}</text></binding></visual></toast>')
$toast=[Windows.UI.Notifications.ToastNotification]::new($xml)
$notifier=[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("SC Bridge Alert")
$notifier.Show($toast)
`
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], (err) => {
    if (err) console.error(`  [TOAST ERR] ${err.message}`)
  })
}

function checkAlerts(data) {
  for (const sym of ['NQ', 'ES', 'GC']) {
    const d = data[sym]
    if (!d || d._from_snapshot) continue
    const laf = !!d.laf_sd2
    const lbf = !!d.lbf_sd2
    if (laf && !ALERT_STATE[`laf_${sym}`]) {
      console.log(`  🔴 ALERT ${sym} LAF R37 — SD+2 rejeté ${d.sd2h} last=${d.last} → SHORT`)
      fireToast(`🔴 ${sym} — LAF R37 · SD+2 REJETÉ`, `Barre fermée sous SD+2 ${d.sd2h} — SHORT SETUP`)
    }
    if (lbf && !ALERT_STATE[`lbf_${sym}`]) {
      console.log(`  🟢 ALERT ${sym} LBF R36 — SD-2 rejeté ${d.sd2l} last=${d.last} → LONG`)
      fireToast(`🟢 ${sym} — LBF R36 · SD-2 REJETÉ`, `Barre fermée sur SD-2 ${d.sd2l} — LONG SETUP`)
    }
    ALERT_STATE[`laf_${sym}`] = laf
    ALERT_STATE[`lbf_${sym}`] = lbf
    // ── Sleeping Camel alert (Asia window)
    const sc = d.sleeping_camel
    if (sc && !ALERT_STATE[`sc_${sym}`]) {
      const ico = sc.direction === 'LONG' ? '🟢' : '🔴'
      console.log(`  🐪 SLEEPING CAMEL ${sym} ${sc.type} — ${sc.time} entry=${sc.entry} stop=${sc.stop} target=${sc.target||'?'} ratio=${sc.ratio||'?'}`)
      fireToast(
        `🐪 ${sym} SLEEPING CAMEL · ${sc.type}`,
        `${sc.time} · Entrée ${sc.entry} · Stop ${sc.stop} · Cible ${sc.target||'?'} · R=${sc.ratio||'?'}`
      )
    }
    ALERT_STATE[`sc_${sym}`] = !!sc
  }
}

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
    const y  = parseInt(parts[0], 10)
    const mo = parseInt(parts[1], 10)
    const d  = parseInt(parts[2], 10)
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
  const dow = now.getDay()
  // Sun(0)→vendredi(-2), Mon(1)→vendredi(-3), autres→hier(-1)
  const delta = dow === 0 ? 2 : dow === 1 ? 3 : 1
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
    return []
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
      for (let i = 0; i < hdrs.length; i++) {
        if (hdrs[i] === n.toLowerCase() || hdrs[i].replace(/ /g, '') === nc) return i
      }
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
  let idx_vol  = find('volume', 'totalvolume', 'total volume')
  let idx_vwap = find('vwap', 'vwap(daily)', 'dailyvwap', 'vwap daily')
  let idx_sp1  = find('sd+1', 'sd +1', 'vwap sd+1', '+1sd', 'upper1', 'upper band 1', 'upperband1', 'bande+1', 'bande +1')
  let idx_sm1  = find('sd-1', 'sd -1', 'vwap sd-1', '-1sd', 'lower1', 'lower band 1', 'lowerband1', 'bande-1', 'bande -1')
  let idx_sp2  = find('sd+2', 'sd +2', 'vwap sd+2', '+2sd', 'upper2', 'upper band 2', 'upperband2', 'bande+2', 'bande +2')
  let idx_sm2  = find('sd-2', 'sd -2', 'vwap sd-2', '-2sd', 'lower2', 'lower band 2', 'lowerband2', 'bande-2', 'bande -2')
  // Fix: termes précis uniquement — pas de 'val', 'vah', 'poc' seuls (risque collision)
  let idx_poc  = find('tpo poc', 'tpopoc', 'point of control', 'pointofcontrol')
  let idx_vah  = find('tpo vah', 'tpovah', 'value area high', 'valuearehigh', 'valuearahigh')
  let idx_val  = find('tpo val', 'tpoval', 'value area low', 'valuearealow', 'valueараlow')
  let idx_sp3  = find('sd+3', 'sd +3', 'vwap sd+3', '+3sd', 'upper3', 'upperband3', 'bande+3')
  let idx_sm3  = find('sd-3', 'sd -3', 'vwap sd-3', '-3sd', 'lower3', 'lowerband3', 'bande-3')
  // BidVol / AskVol (Règle 13 Excess — Delta)
  let idx_bid  = find('bidvolume', 'bid volume', 'bidvol', 'bid vol')
  let idx_ask  = find('askvolume', 'ask volume', 'askvol', 'ask vol')

  // Fallback positionnel Sierra Chart standard : Date,Time,Open,High,Low,Last,...
  const scStd = idx_date === 0 && idx_time === 1
    && idx_open < 0 && idx_high < 0 && idx_low < 0 && idx_last < 0
    && hdrs.length >= 6
  if (scStd) {
    idx_open = 2; idx_high = 3; idx_low = 4; idx_last = 5
    if (diag) console.log('  [DIAG] OHLC fallback positionnel SC (col 2-5)')
  }

  // Volume fallback (col 6)
  if (idx_vol < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 7) idx_vol = 6

  // BidVol/AskVol fallback positionnel (SC standard : col 8=BidVol, col 9=AskVol)
  if (idx_bid < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 9)  idx_bid = 8
  if (idx_ask < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 10) idx_ask = 9

  // VWAP/SD positional fallback
  if (idx_vwap < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 15) idx_vwap = 14
  if (idx_sp1  < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 16) idx_sp1  = 15
  if (idx_sm1  < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 17) idx_sm1  = 16
  if (idx_sp2  < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 18) idx_sp2  = 17
  if (idx_sm2  < 0 && idx_date === 0 && idx_time === 1 && hdrs.length >= 19) idx_sm2  = 18

  if (diag) {
    console.log(`  [DIAG] date=${idx_date} time=${idx_time} O=${idx_open} H=${idx_high} L=${idx_low} C=${idx_last}`)
    console.log(`  [DIAG] vol=${idx_vol} bid=${idx_bid} ask=${idx_ask}`)
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
    const raw  = get(cols, time_col)
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

    // nz : filtre les valeurs 0.00 exportées par Sierra Chart avant calcul AVWAP/SD
    const nz = v => { const f = parseFloat(v); return (!isNaN(f) && f > 0) ? v : '' }
    rows.push({
      date:    date_obj,
      time:    time_s,
      open:    get(cols, idx_open),
      high:    get(cols, idx_high),
      low:     get(cols, idx_low),
      close:   get(cols, idx_last),
      vol:     get(cols, idx_vol),
      bid:     get(cols, idx_bid),
      ask:     get(cols, idx_ask),
      vwap:    nz(get(cols, idx_vwap)),
      sd1h:    nz(get(cols, idx_sp1)),
      sd1l:    nz(get(cols, idx_sm1)),
      sd2h:    nz(get(cols, idx_sp2)),
      sd2l:    nz(get(cols, idx_sm2)),
      sd3h:    nz(get(cols, idx_sp3)),
      sd3l:    nz(get(cols, idx_sm3)),
      tpo_poc: get(cols, idx_poc),
      tpo_vah: get(cols, idx_vah),
      tpo_val: get(cols, idx_val),
    })
  }

  if (diag && rows.length) {
    const r = rows[0]
    console.log(`  [DIAG] 1ère barre: date=${r.date} time=${r.time} O=${r.open} H=${r.high} L=${r.low} C=${r.close}`)
    console.log(`  [DIAG] bid=${r.bid} ask=${r.ask} vol=${r.vol}`)
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
  const bid  = parseFloat(r.bid)
  const ask  = parseFloat(r.ask)
  const vol  = parseFloat(r.vol)
  const delta = (!isNaN(bid) && !isNaN(ask)) ? Math.round(ask - bid) : null
  return {
    time:  r.time,
    open:  r.open,
    high:  r.high,
    low:   r.low,
    close: r.close,
    vol:   isNaN(vol) ? '' : vol,
    bid:   isNaN(bid) ? '' : bid,
    ask:   isNaN(ask) ? '' : ask,
    delta: delta,
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
    if (!isNaN(f) && f > 100) return f.toFixed(2)  // sanity: prix NQ > 100
  }
  return ''
}

// Extrait tpo_poc/vah/val valide (> 100) depuis un jeu de rows (colonnes Sierra Chart)
function extractTpo(rows) {
  const poc = lastNonempty(rows, 'tpo_poc')
  const vah = lastNonempty(rows, 'tpo_vah')
  const val = lastNonempty(rows, 'tpo_val')
  return { poc, vah, val }
}

// Calcule POC/VAH/VAL depuis les barres OHLC — méthode Dalton TPO standard
// Tick NQ = 0.25, Value Area = 70% des TPO totaux
function calcTpoFromBars(bars, tick = 0.25) {
  if (!bars || bars.length < 2) return { poc: '', vah: '', val: '' }

  const hist = new Map()
  for (const r of bars) {
    const h = parseFloat(r.high), l = parseFloat(r.low)
    if (isNaN(h) || isNaN(l) || h <= 0 || l <= 0 || h < l) continue
    const lo = Math.round(l / tick) * tick
    const hi = Math.round(h / tick) * tick
    for (let p = lo; p <= hi + tick * 0.01; p = Math.round((p + tick) * 1e6) / 1e6) {
      const key = Math.round(p / tick)
      hist.set(key, (hist.get(key) || 0) + 1)
    }
  }

  if (!hist.size) return { poc: '', vah: '', val: '' }

  let pocKey = 0, pocCount = 0
  for (const [k, c] of hist) {
    if (c > pocCount || (c === pocCount && k > pocKey)) { pocKey = k; pocCount = c }
  }

  const total = [...hist.values()].reduce((a, b) => a + b, 0)
  const target = total * 0.70

  const sorted = [...hist.keys()].sort((a, b) => a - b)
  let lo = pocKey, hi = pocKey
  let area = pocCount
  while (area < target) {
    const nextLo = lo > sorted[0]                    ? (lo - 1) : null
    const nextHi = hi < sorted[sorted.length - 1]   ? (hi + 1) : null
    const countLo = nextLo !== null ? (hist.get(nextLo) || 0) : 0
    const countHi = nextHi !== null ? (hist.get(nextHi) || 0) : 0
    if (countLo === 0 && countHi === 0) break
    if (countHi >= countLo) { hi = nextHi; area += countHi }
    else                     { lo = nextLo; area += countLo }
  }

  const fmt = k => (k * tick).toFixed(2)
  return { poc: fmt(pocKey), vah: fmt(hi), val: fmt(lo) }
}

function buildPayload(instr, allRows, extraSources = {}) {
  const today = todayStr()
  const j1    = j1Str()

  const hasDates = allRows.slice(0, 20).some(r => r.date !== null)

  let todayRows, j1Rows, todayAll, barsAsia, barsLondon, barsPre
  let j1Target = j1  // date j1 effectivement utilisée (peut être antérieure si CSV périmé)
  let lastCsvDate = ''

  if (hasDates) {
    todayAll  = allRows.filter(r => r.date === today)
    todayRows = filterRth(todayAll, instr)

    // Fallback j1 intelligent : si pas de données pour la date j1 attendue,
    // utiliser la date la plus récente disponible dans le CSV (hors today)
    if (!allRows.some(r => r.date === j1)) {
      const csvDates = [...new Set(allRows.filter(r => r.date && r.date !== today).map(r => r.date))].sort()
      const fallback = csvDates[csvDates.length - 1]
      if (fallback) {
        j1Target = fallback
        console.log(`  [FALLBACK] j1 attendu=${j1} → utilise ${j1Target} (CSV périmé)`)
      }
    }

    j1Rows = filterRth(allRows.filter(r => r.date === j1Target), instr)
    const asiaJ1    = allRows.filter(r => r.date === j1Target && t2m(r.time) >= t2m('18:00'))
    const asiaToday = allRows.filter(r => r.date === today    && t2m(r.time) <  t2m('02:00'))
    barsAsia   = [...asiaJ1, ...asiaToday]
    barsLondon = allRows.filter(r => r.date === today && t2m(r.time) >= t2m('02:00') && t2m(r.time) < t2m('08:00'))
    barsPre    = allRows.filter(r => r.date === today && t2m(r.time) >= t2m('08:00') && t2m(r.time) < t2m(RTH_START[instr]))

    const allCsvDates = [...new Set(allRows.filter(r => r.date).map(r => r.date))].sort()
    lastCsvDate = allCsvDates[allCsvDates.length - 1] || ''
  } else {
    ;[todayRows, j1Rows] = sessionSplit(allRows, instr)
    todayAll = todayRows
    barsAsia = barsLondon = barsPre = []
  }

  const lastJ1  = j1Rows.length ? j1Rows[j1Rows.length - 1] : {}
  const firstJ1 = j1Rows.length ? j1Rows[0]                 : {}

  // j1_date = date réellement utilisée ; si ≠ j1_expected → frontend affiche avertissement stale
  const j1DateActual = (hasDates && j1Rows.length > 0) ? j1Target : null

  let lastVal = ''
  if (todayRows.length)     lastVal = todayRows[todayRows.length - 1].close
  else if (todayAll.length) lastVal = todayAll[todayAll.length - 1].close
  else if (j1Rows.length)   lastVal = j1Rows[j1Rows.length - 1].close
  else if (allRows.length)  lastVal = allRows[allRows.length - 1].close

  const allOvn  = [...barsAsia, ...barsLondon, ...barsPre]
  const ovnVwap = allOvn.length ? computeVwap(allOvn) : computeVwap(todayAll)

  const hs = v => v.map(r => parseFloat(r.high)).filter(x => !isNaN(x))
  const ls = v => v.map(r => parseFloat(r.low)).filter(x => !isNaN(x) && x > 0)

  const asiaHs = hs(barsAsia), asiaLs = ls(barsAsia)
  const lonHs  = hs(barsLondon), lonLs  = ls(barsLondon)
  const ovnHs  = hs(allOvn), ovnLs  = ls(allOvn)

  // ── TPO VAH/VAL/POC : préférer source TPO dédiée si disponible ──────────────
  let { poc, vah, val } = extractTpo(j1Rows)

  // Source TPO dédiée (NQ_TPO.csv.txt) — override si valeurs valides
  if (extraSources.tpo && extraSources.tpo.length) {
    const tpoJ1 = hasDates
      ? extraSources.tpo.filter(r => r.date === j1)
      : extraSources.tpo
    const { poc: tp, vah: tv, val: tl } = extractTpo(tpoJ1.length ? tpoJ1 : extraSources.tpo)
    if (tp) poc = tp
    if (tv) vah = tv
    if (tl) val = tl
  }

  // Source RTH dédiée (NQ_RTH.csv.txt) — override si TPO toujours vide
  if (extraSources.rth && extraSources.rth.length && (!poc || !vah || !val)) {
    const rthJ1 = hasDates
      ? filterRth(extraSources.rth.filter(r => r.date === j1), instr)
      : filterRth(extraSources.rth, instr)
    const { poc: rp, vah: rv, val: rl } = extractTpo(rthJ1.length ? rthJ1 : extraSources.rth)
    if (!poc && rp) poc = rp
    if (!vah && rv) vah = rv
    if (!val && rl) val = rl
  }

  // Fallback calcul TPO depuis barres OHLC J-1 — si Sierra Chart ne fournit pas les colonnes
  if (!poc || !vah || !val) {
    const barsForTpo = (extraSources.m30 && extraSources.m30.length && hasDates)
      ? filterRth(extraSources.m30.filter(r => r.date === j1), instr)
      : j1Rows
    if (barsForTpo.length >= 2) {
      const calc = calcTpoFromBars(barsForTpo)
      if (!poc && calc.poc) { poc = calc.poc; console.log(`  [TPO-CALC] POC calculé depuis ${barsForTpo.length} barres J-1: ${poc}`) }
      if (!vah && calc.vah) { vah = calc.vah; console.log(`  [TPO-CALC] VAH calculé: ${vah}`) }
      if (!val && calc.val) { val = calc.val; console.log(`  [TPO-CALC] VAL calculé: ${val}`) }
    }
  }

  // ── OVN AVWAP/SD : préférer source OVN dédiée si disponible ────────────────
  let ovnSd1h = lastNonempty(allOvn, 'sd1h')
  let ovnSd1l = lastNonempty(allOvn, 'sd1l')
  let ovnSd2h = lastNonempty(allOvn, 'sd2h')
  let ovnSd2l = lastNonempty(allOvn, 'sd2l')
  let ovnVwapFinal = ovnVwap

  if (extraSources.ovn && extraSources.ovn.length) {
    const ovnRows = hasDates
      ? extraSources.ovn.filter(r => r.date === today || r.date === j1)
      : extraSources.ovn
    if (ovnRows.length) {
      const computedOvnVwap = computeVwap(ovnRows)
      if (computedOvnVwap) ovnVwapFinal = computedOvnVwap
      const s1h = lastNonempty(ovnRows, 'sd1h')
      const s1l = lastNonempty(ovnRows, 'sd1l')
      const s2h = lastNonempty(ovnRows, 'sd2h')
      const s2l = lastNonempty(ovnRows, 'sd2l')
      if (s1h) ovnSd1h = s1h
      if (s1l) ovnSd1l = s1l
      if (s2h) ovnSd2h = s2h
      if (s2l) ovnSd2l = s2l
    }
  }

  // ── Barres today : préférer source 30min (BidVol/AskVol) ────────────────────
  let barsTodayFinal = todayRows
  let barsJ1Final    = j1Rows

  if (extraSources.m30 && extraSources.m30.length) {
    const m30Today = hasDates
      ? filterRth(extraSources.m30.filter(r => r.date === today), instr)
      : []
    const m30J1 = hasDates
      ? filterRth(extraSources.m30.filter(r => r.date === j1), instr)
      : []
    if (m30Today.length) barsTodayFinal = m30Today
    if (m30J1.length)    barsJ1Final    = m30J1
  }

  return {
    last:          lastVal,
    lastUpdate:    new Date().toISOString(),
    last_csv_date: lastCsvDate,
    j1_date:       j1DateActual,
    j1_expected:   j1,
    j1_high:   aggHigh(j1Rows),
    j1_low:    aggLow(j1Rows),
    j1_open:   firstJ1.open   || '',
    j1_settle: lastJ1.close   || '',
    poc,
    vah,
    val,
    ovn_vwap:  ovnVwapFinal,
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
    ovn_sd1h:   ovnSd1h,
    ovn_sd1l:   ovnSd1l,
    ovn_sd2h:   ovnSd2h,
    ovn_sd2l:   ovnSd2l,
    ovn_sd3h:   lastNonempty(allOvn, 'sd3h') || lastNonempty(todayAll, 'sd3h') || lastNonempty(allRows, 'sd3h'),
    ovn_sd3l:   lastNonempty(allOvn, 'sd3l') || lastNonempty(todayAll, 'sd3l') || lastNonempty(allRows, 'sd3l'),
    // ── AVWAP position & signaux ──────────────────────────────────────────────
    // SD live : préférer les barres du jour (RTH migrent les SD) avant de tomber sur OVN
    vwap:   ovnVwapFinal,
    sd1h:   lastNonempty(todayAll, 'sd1h') || ovnSd1h,
    sd1l:   lastNonempty(todayAll, 'sd1l') || ovnSd1l,
    sd2h:   lastNonempty(todayAll, 'sd2h') || ovnSd2h || lastNonempty(allRows, 'sd2h'),
    sd2l:   lastNonempty(todayAll, 'sd2l') || ovnSd2l || lastNonempty(allRows, 'sd2l'),
    avwap_side: (() => {
      const p = parseFloat(lastVal), v = parseFloat(ovnVwapFinal)
      if (isNaN(p) || isNaN(v) || v === 0) return ''
      return p > v ? 'above' : 'below'
    })(),
    laf_sd2: (() => {
      // LAF SD+2 (R37) : barre courante High >= SD+2 ET Close < SD+2
      // = même bougie touche SD+2 et ferme en dessous (rejet immédiat)
      // Aligné avec la logique backtest : hi>=sp2 && cl<sp2
      const sd2h = parseFloat(lastNonempty(todayAll, 'sd2h') || ovnSd2h || lastNonempty(allRows, 'sd2h'))
      if (isNaN(sd2h) || sd2h <= 0) return false
      const bars = [...barsTodayFinal].sort((a, b) => t2m(a.time) - t2m(b.time))
      if (!bars.length) return false
      const curr = bars[bars.length - 1]
      const currHigh  = parseFloat(curr.high  || '')
      const currClose = parseFloat(curr.close || '')
      if (isNaN(currHigh) || isNaN(currClose)) return false
      const result = currHigh >= sd2h && currClose < sd2h
      if (result) console.log(`  [LAF R37] ${instr} high=${currHigh} >= sd2h=${sd2h} close=${currClose} < sd2h → SHORT`)
      return result
    })(),
    lbf_sd2: (() => {
      // LBF SD-2 (R36) : barre courante Low <= SD-2 ET Close > SD-2
      // = même bougie touche SD-2 et ferme au-dessus (rejet immédiat)
      // Aligné avec la logique backtest : lo<=sm2 && cl>sm2
      const sd2l = parseFloat(lastNonempty(todayAll, 'sd2l') || ovnSd2l || lastNonempty(allRows, 'sd2l'))
      if (isNaN(sd2l) || sd2l <= 0) return false
      const bars = [...barsTodayFinal].sort((a, b) => t2m(a.time) - t2m(b.time))
      if (!bars.length) return false
      const curr = bars[bars.length - 1]
      const currLow   = parseFloat(curr.low   || '')
      const currClose = parseFloat(curr.close || '')
      if (isNaN(currLow) || isNaN(currClose)) return false
      const result = currLow <= sd2l && currClose > sd2l
      if (result) console.log(`  [LBF R36] ${instr} low=${currLow} <= sd2l=${sd2l} close=${currClose} > sd2l → LONG`)
      return result
    })(),
    // ── SLEEPING CAMEL (Phase 1 — Observation) ──────────────────────────────────
    // Priorité 1 : LBF SD-2 / LAF SD+2 (signal principal)
    // Priorité 2 : SD-1 cassé → retest → accept (signal secondaire — GC)
    // Stop NQ/ES : 200 pts fixes (absorbe bruit IB) | GC/CL : natural (bar low/high)
    sleeping_camel: (() => {
      const nowNY = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const nowM  = nowNY.getHours() * 60 + nowNY.getMinutes()
      const scPhase = nowM >= t2m('16:00') ? 'EXPIRE'
                    : nowM >= t2m('10:30') ? 'RTH_ACTIF'
                    : nowM >= t2m('09:30') ? 'REVEIL_IB'
                    : 'OVN_SLEEP'

      const SC_START = t2m('19:00'), SC_END = t2m('02:00')
      const scBars = barsAsia.filter(r => { const m = t2m(r.time); return m >= SC_START || m < SC_END })
      scBars.sort((a, b) => {
        const ma = t2m(a.time), mb = t2m(b.time)
        const ra = ma >= SC_START ? ma - 1440 : ma
        const rb = mb >= SC_START ? mb - 1440 : mb
        return ra - rb
      })
      if (!scBars.length) return null

      // NQ/ES → stop 200 pts fixes (IB buffer) | GC/CL → stop naturel au low/high de la barre
      const useFixed = instr === 'NQ' || instr === 'ES'

      let sd1BreakBar = null  // pour SD-1 break→retest→accept

      for (const bar of scBars) {
        const lo = parseFloat(bar.low || ''), hi = parseFloat(bar.high || ''), cl = parseFloat(bar.close || '')
        if (isNaN(lo) || isNaN(hi) || isNaN(cl)) continue

        const bSd2l = parseFloat(bar.sd2l || ''), bSd2h = parseFloat(bar.sd2h || '')
        const bSd1l = parseFloat(bar.sd1l || ''), bSd1h = parseFloat(bar.sd1h || '')
        const sd2l  = (!isNaN(bSd2l) && bSd2l > 0) ? bSd2l : parseFloat(ovnSd2l || '0')
        const sd2h  = (!isNaN(bSd2h) && bSd2h > 0) ? bSd2h : parseFloat(ovnSd2h || '0')
        const sd1l  = (!isNaN(bSd1l) && bSd1l > 0) ? bSd1l : parseFloat(ovnSd1l || '0')

        // ── P1 : LBF SD-2 ──────────────────────────────────────────────────────
        if (sd2l > 0 && lo <= sd2l && cl > sd2l) {
          const risk = useFixed ? 200 : Math.max(parseFloat((cl - lo).toFixed(2)), 2)
          const stop = useFixed ? parseFloat((cl - risk).toFixed(2)) : parseFloat(lo.toFixed(2))
          const tgt  = sd2h > 0 ? sd2h : null
          const rwd  = tgt ? parseFloat((tgt - cl).toFixed(2)) : null
          console.log(`  [🐪 SC] ${instr} LBF @ ${bar.time} entry=${cl} stop=${stop} tgt=${tgt} R=${rwd&&(rwd/risk).toFixed(2)}`)
          return { type: 'LBF', direction: 'LONG', time: bar.time,
                   entry: cl.toFixed(2), stop: stop.toFixed(2),
                   target: tgt ? tgt.toFixed(2) : null,
                   pts_risk: risk, pts_reward: rwd ? rwd.toFixed(2) : null,
                   ratio: rwd ? (rwd / risk).toFixed(2) : null,
                   sd2l: sd2l.toFixed(2), sd2h: sd2h > 0 ? sd2h.toFixed(2) : null,
                   window: 'ASIA 19h-02h', phase: scPhase }
        }
        // ── P1 : LAF SD+2 ──────────────────────────────────────────────────────
        if (sd2h > 0 && hi >= sd2h && cl < sd2h) {
          const risk = useFixed ? 200 : Math.max(parseFloat((hi - cl).toFixed(2)), 2)
          const stop = useFixed ? parseFloat((cl + risk).toFixed(2)) : parseFloat(hi.toFixed(2))
          const tgt  = sd2l > 0 ? sd2l : null
          const rwd  = tgt ? parseFloat((cl - tgt).toFixed(2)) : null
          console.log(`  [🐪 SC] ${instr} LAF @ ${bar.time} entry=${cl} stop=${stop} tgt=${tgt}`)
          return { type: 'LAF', direction: 'SHORT', time: bar.time,
                   entry: cl.toFixed(2), stop: stop.toFixed(2),
                   target: tgt ? tgt.toFixed(2) : null,
                   pts_risk: risk, pts_reward: rwd ? rwd.toFixed(2) : null,
                   ratio: rwd ? (rwd / risk).toFixed(2) : null,
                   sd2h: sd2h.toFixed(2), sd2l: sd2l > 0 ? sd2l.toFixed(2) : null,
                   window: 'ASIA 19h-02h', phase: scPhase }
        }
        // ── P2 : SD-1 break → retest → accept (LONG) ──────────────────────────
        if (sd1BreakBar) {
          const ref = sd1BreakBar._sd1l
          if (ref > 0 && lo < ref && cl > ref) {
            const risk = useFixed ? 200 : Math.max(parseFloat((cl - lo).toFixed(2)), 2)
            const stop = useFixed ? parseFloat((cl - risk).toFixed(2)) : parseFloat(lo.toFixed(2))
            const tgt  = sd2h > 0 ? sd2h : null
            const rwd  = tgt ? parseFloat((tgt - cl).toFixed(2)) : null
            console.log(`  [🐪 SC] ${instr} SD1_ACCEPT @ ${bar.time} entry=${cl} stop=${stop} sd1=${ref}`)
            return { type: 'SD1_ACCEPT', direction: 'LONG', time: bar.time,
                     entry: cl.toFixed(2), stop: stop.toFixed(2),
                     target: tgt ? tgt.toFixed(2) : null,
                     pts_risk: risk, pts_reward: rwd ? rwd.toFixed(2) : null,
                     ratio: rwd ? (rwd / risk).toFixed(2) : null,
                     sd1l: ref.toFixed(2), sd2h: sd2h > 0 ? sd2h.toFixed(2) : null,
                     window: 'ASIA 19h-02h', phase: scPhase }
          }
          sd1BreakBar = null
        }
        // SD-1 cassé : Close < SD-1 → mémoriser pour retest sur barre suivante
        if (sd1l > 0 && cl < sd1l) sd1BreakBar = { ...bar, _sd1l: sd1l }
      }
      return null
    })(),
    // ── EXCESS R13 — Règle 13 Dalton-Salah ───────────────────────────────────────
    // Stop NQ/ES : Entry ± 200 pts (stop institutionnel — absorbe le stop-hunt retail)
    // Stop GC/CL : High/Low barre excess + 1 tick (naturel)
    // Premier excess chronologique OVN/Asia → priorité (setup annoncé avant London)
    excess_r13: (() => {
      const useFixed = instr === 'NQ' || instr === 'ES'
      // "Nettement" : clôture doit être en dessous du High excess d'au moins minRej pts
      const minRej   = instr === 'NQ' ? 10 : instr === 'ES' ? 3 : instr === 'GC' ? 2 : 0.20

      const SC_START = t2m('18:00')
      const pool = [...barsAsia].sort((a, b) => {
        const ma = t2m(a.time), mb = t2m(b.time)
        return (ma >= SC_START ? ma : ma + 1440) - (mb >= SC_START ? mb : mb + 1440)
      })

      for (let i = 1; i + 1 < pool.length; i++) {
        const prev = pool[i - 1], exc = pool[i], rej = pool[i + 1]

        const prevHi = parseFloat(prev.high  || ''), prevLo = parseFloat(prev.low  || '')
        const excHi  = parseFloat(exc.high   || ''), excLo  = parseFloat(exc.low   || '')
        const rejHi  = parseFloat(rej.high   || ''), rejLo  = parseFloat(rej.low   || '')
        const rejCl  = parseFloat(rej.close  || '')

        if ([prevHi, prevLo, excHi, excLo, rejHi, rejLo, rejCl].some(isNaN)) continue

        // ── Excess HIGH → SHORT ─────────────────────────────────────────────────
        // excHi > prevHi (nouveau high local) | rejHi < excHi (Lower High) | rejCl < excHi - minRej
        if (excHi > prevHi && rejHi < excHi && rejCl < excHi - minRej) {
          const entry = rejCl
          const risk  = useFixed ? 200 : parseFloat((excHi - entry + 0.25).toFixed(2))
          const stop  = useFixed ? parseFloat((entry + risk).toFixed(2))
                                 : parseFloat((excHi + 0.25).toFixed(2))
          const bSd2l = parseFloat(exc.sd2l || '') || parseFloat(ovnSd2l || '0')
          const tgt   = bSd2l > 0 ? bSd2l : null
          const rwd   = tgt ? parseFloat((entry - tgt).toFixed(2)) : null
          const ratio = (rwd && risk) ? (rwd / risk).toFixed(2) : null
          console.log(`  [R13] ${instr} EXCESS HIGH ${exc.time} H=${excHi} → rejet ${rej.time} entry=${entry} stop=${stop} risk=${risk} tgt=${tgt}`)
          return { type: 'EXCESS_HIGH', direction: 'SHORT',
                   excess_bar: exc.time, excess_high: excHi.toFixed(2),
                   reject_bar: rej.time,
                   entry: entry.toFixed(2), stop: stop.toFixed(2),
                   pts_risk: risk, pts_reward: rwd ? rwd.toFixed(2) : null,
                   ratio, target: tgt ? tgt.toFixed(2) : null,
                   stop_type: useFixed ? 'FIXED_200' : 'NATURAL' }
        }

        // ── Excess LOW → LONG ──────────────────────────────────────────────────
        // excLo < prevLo (nouveau low local) | rejLo > excLo (Higher Low) | rejCl > excLo + minRej
        if (excLo < prevLo && rejLo > excLo && rejCl > excLo + minRej) {
          const entry = rejCl
          const risk  = useFixed ? 200 : parseFloat((entry - excLo + 0.25).toFixed(2))
          const stop  = useFixed ? parseFloat((entry - risk).toFixed(2))
                                 : parseFloat((excLo - 0.25).toFixed(2))
          const bSd2h = parseFloat(exc.sd2h || '') || parseFloat(ovnSd2h || '0')
          const tgt   = bSd2h > 0 ? bSd2h : null
          const rwd   = tgt ? parseFloat((tgt - entry).toFixed(2)) : null
          const ratio = (rwd && risk) ? (rwd / risk).toFixed(2) : null
          console.log(`  [R13] ${instr} EXCESS LOW ${exc.time} L=${excLo} → rejet ${rej.time} entry=${entry} stop=${stop} risk=${risk} tgt=${tgt}`)
          return { type: 'EXCESS_LOW', direction: 'LONG',
                   excess_bar: exc.time, excess_low: excLo.toFixed(2),
                   reject_bar: rej.time,
                   entry: entry.toFixed(2), stop: stop.toFixed(2),
                   pts_risk: risk, pts_reward: rwd ? rwd.toFixed(2) : null,
                   ratio, target: tgt ? tgt.toFixed(2) : null,
                   stop_type: useFixed ? 'FIXED_200' : 'NATURAL' }
        }
      }
      return null
    })(),
    bars_today:  [...barsTodayFinal].sort((a, b) => t2m(a.time) - t2m(b.time)).map(barDict),
    bars_j1:     [...barsJ1Final].sort((a, b) => t2m(a.time) - t2m(b.time)).map(barDict),
    bars_asia:   barsAsia.map(barDict),
    bars_london: barsLondon.map(barDict),
  }
}

// ─── SNAPSHOT JSON ────────────────────────────────────────────────────────────

function saveSnapshot(data) {
  try {
    const snap = {}
    for (const [instr, payload] of Object.entries(data)) {
      if (payload && payload.last && parseFloat(payload.last) > 100 && !payload._from_snapshot) {
        snap[instr] = { ...payload, _saved_at: new Date().toISOString() }
      }
    }
    if (!Object.keys(snap).length) return
    const dir = SNAPSHOT_FILE.replace(/[/\\][^/\\]+$/, '')
    mkdirSync(dir, { recursive: true })
    writeFileSync(SNAPSHOT_FILE, JSON.stringify(snap, null, 2), 'utf-8')
    console.log(`  [SNAP] Sauvegardé: ${Object.keys(snap).join(', ')}`)
  } catch (e) {
    console.log(`  [SNAP] Erreur sauvegarde: ${e.message}`)
  }
}

function loadSnapshot() {
  try {
    if (!existsSync(SNAPSHOT_FILE)) return {}
    const snap = JSON.parse(readFileSync(SNAPSHOT_FILE, 'utf-8'))
    console.log(`  [SNAP] Fichier trouvé: ${Object.keys(snap).join(', ')}`)
    return snap
  } catch {
    return {}
  }
}

function buildMessage() {
  const today = todayStr()
  const j1    = j1Str()
  console.log(`\n  today=${today}  j1=${j1}`)

  const data = {}

  // ── NQ : lecture multi-sources ────────────────────────────────────────────
  {
    const instr = 'NQ'
    const diagAuto = !DIAG_DONE.has(instr)
    if (diagAuto) console.log(`\n  [DIAG] ── NQ main ─── ${FILES.NQ}`)
    const rowsAuto = parseCsv(FILES.NQ, diagAuto)
    if (diagAuto) DIAG_DONE.add(instr)

    const extraSources = {}
    for (const [key, path] of [['m30', NQ_PATHS.m30], ['rth', NQ_PATHS.rth], ['ovn', NQ_PATHS.ovn], ['tpo', NQ_PATHS.tpo]]) {
      const diagKey = `NQ_${key}`
      const doD = !DIAG_DONE.has(diagKey)
      if (existsSync(path)) {
        if (doD) console.log(`\n  [DIAG] ── NQ ${key} ─── ${path}`)
        extraSources[key] = parseCsv(path, doD)
        if (doD) DIAG_DONE.add(diagKey)
        console.log(`  NQ_${key}: ${extraSources[key].length} lignes`)
      } else {
        extraSources[key] = []
      }
    }

    // Source principale : rowsAuto (fallback) enrichi par extraSources
    const mainRows = rowsAuto.length ? rowsAuto
      : (extraSources.m30?.length ? extraSources.m30
        : (extraSources.rth?.length ? extraSources.rth : []))

    if (mainRows.length) {
      const dated = mainRows.filter(r => r.date).map(r => r.date).sort()
      if (dated.length) {
        const lastDate = dated[dated.length - 1]
        console.log(`  NQ: dernière date CSV=${lastDate}  match=${lastDate === today}`)
      } else {
        console.log(`  NQ: aucune date parsée`)
      }

      data[instr] = buildPayload(instr, mainRows, extraSources)
      const bt = data[instr].bars_today
      const bj = data[instr].bars_j1
      console.log(`  NQ: ${bt.length} barres today / ${bj.length} barres J-1  last=${data[instr].last}  poc=${data[instr].poc}  vah=${data[instr].vah}  val=${data[instr].val}`)
    }
  }

  // ── ES / GC / CL ──────────────────────────────────────────────────────────
  for (const [instr, filepath] of [['ES', FILES.ES], ['GC', FILES.GC], ['CL', FILES.CL]]) {
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

  // ── §9 : NQ + ES alignés vs AVWAP ───────────────────────────────────────────
  if (data.NQ && data.ES && data.NQ.avwap_side && data.ES.avwap_side) {
    const par9 = data.NQ.avwap_side === data.ES.avwap_side ? data.NQ.avwap_side : 'divergent'
    data.NQ.par9 = par9
    data.ES.par9 = par9
    console.log(`  §9: NQ=${data.NQ.avwap_side} ES=${data.ES.avwap_side} → ${par9}`)
  }

  // ── §9+ : GC macro filter — direction OVN pour Sleeping Camel ───────────────
  if (data.GC && data.GC.avwap_side) {
    const gcBias = data.GC.avwap_side === 'above' ? 'LONG'
                 : data.GC.avwap_side === 'below' ? 'SHORT'
                 : 'NEUTRAL'
    for (const sym of ['NQ', 'ES']) {
      if (data[sym] && data[sym].sleeping_camel) data[sym].sleeping_camel.gc_bias = gcBias
    }
    console.log(`  §9+: GC last=${data.GC.last} avwap=${data.GC.avwap||data.GC.ovn_vwap||'?'} → gc_bias=${gcBias}`)
  }

  // ── GC Sleeping Camel — 30min alert + 10min confirm ─────────────────────────
  // data.GC.sleeping_camel = signal 10-min (GC.csv)
  // GC_30min.csv → signal 30-min = ALERT principal
  // confirmed_10m = true si les deux timeframes sont alignés (même direction)
  if (data.GC && FILES.GC_30m && existsSync(FILES.GC_30m)) {
    const rows30 = parseCsv(FILES.GC_30m, false)
    if (rows30.length) {
      data[`GC_30m`] = buildPayload('GC', rows30)
      const sc30 = data['GC_30m'].sleeping_camel
      const sc10 = data.GC.sleeping_camel
      if (sc30) {
        const confirm10 = !!(sc10 && sc10.direction === sc30.direction)
        sc30.confirmed_10m = confirm10
        sc30.timeframe = '30min'
        data.GC.sleeping_camel = sc30   // 30min override → ALERT principal
        if (sc10 && !confirm10) data.GC.sleeping_camel_10m = sc10  // désaccord → garder pour info
        console.log(`  [🐪 GC 30m] ${sc30.type} @ ${sc30.time} confirmed_10m=${confirm10}`)
      }
      delete data['GC_30m']  // ne pas polluer le payload
    }
  }

  // ── Fallback snapshot pour instruments sans données CSV ─────────────────────
  const snap = loadSnapshot()
  for (const instr of ['NQ', 'ES', 'GC', 'CL']) {
    if (!data[instr] && snap[instr]) {
      data[instr] = { ...snap[instr], _from_snapshot: true }
      const age = snap[instr]._saved_at
        ? Math.round((Date.now() - new Date(snap[instr]._saved_at).getTime()) / 3600000) + 'h'
        : '?'
      console.log(`  ${instr}: SNAPSHOT (sauvegardé il y a ${age})`)
    }
  }

  // ── Sauvegarder les données fraîches du jour ─────────────────────────────
  saveSnapshot(data)

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

  if (req.method === 'GET' && req.url === '/scan') {
    // Scan automatique des dossiers Sierra Chart courants
    import('fs').then(({readdirSync}) => {
      const roots = [
        String.raw`C:\SierraChart\CME\Data`,
        String.raw`C:\SierraChart\Data`,
        String.raw`C:\SierraChart_CME\Data`,
        String.raw`C:\Program Files\SierraChart\Data`,
        String.raw`C:\Program Files (x86)\SierraChart\Data`,
        `C:\\Users\\${process.env.USERNAME || 'USER'}\\Documents\\SierraChart\\Data`,
      ]
      const found = []
      for (const root of roots) {
        try {
          const files = readdirSync(root)
          const csvs = files.filter(f => f.toLowerCase().includes('.csv'))
          if (csvs.length) found.push({ dir: root, files: csvs.slice(0, 20) })
        } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ found, checked: roots }, null, 2))
    })
    return
  }

  // ── POST /order — Sierra Chart UDP Trading API (SIM)
  if (req.method === 'POST' && req.url === '/order') {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json')
      let body
      try { body = JSON.parse(Buffer.concat(chunks).toString()) } catch {
        res.writeHead(400); res.end('{"error":"invalid JSON"}'); return
      }
      const { action, symbol, quantity, orderType, price } = body
      if (!action || !symbol) {
        res.writeHead(400); res.end('{"error":"action + symbol requis"}'); return
      }
      try {
        const result = await sendScOrder({ action: action.toUpperCase(), symbol, quantity: quantity || 1, orderType: orderType || 'MARKET', price: price || 0 })
        const log = `[ORDER] ${action.toUpperCase()} ${quantity||1} ${symbol} ${orderType||'MARKET'} → DTC ${SC_DTC_HOST}:${SC_DTC_PORT}`
        console.log(log)
        res.writeHead(200); res.end(JSON.stringify({ ok: true, log, ...result }))
      } catch (e) {
        console.error(`[ORDER ERR] ${e.message}`)
        res.writeHead(500); res.end(JSON.stringify({ ok: false, error: e.message }))
      }
    })
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
          mkdirSync(dest.replace(/[^/\\]+$/, ''), { recursive: true })
          writeFileSync(tmp, body)
          renameSync(tmp, dest)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end('{"ok":true}')
          console.log(`  [upload] ${instr} ${body.length} octets → ${dest}`)
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

wss.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`  [WARN] WS port ${WS_PORT} déjà occupé — WebSocket désactivé, HTTP seul actif`)
  } else {
    console.error(`  [WSS ERR] ${err.message}`)
  }
})

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
    try { checkAlerts(JSON.parse(msg)) } catch {}
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

// Auto-découverte : trouve les CSV Sierra Chart avant tout diagnostic
autoDiscoverFiles()

console.log('\nFichiers NQ configurés :')
for (const [k, v] of Object.entries(NQ_PATHS)) {
  if (!v) continue
  const ok = existsSync(v)
  console.log(`  NQ_${k}: ${v}  [${ok ? 'OK ✓' : 'absent (ignoré)'}]`)
}
console.log('\nFichiers ES/GC/CL :')
for (const [k, v] of [['ES', FILES.ES], ['GC', FILES.GC], ['CL', FILES.CL]]) {
  if (!v) continue
  const ok = existsSync(v)
  console.log(`  ${k}: ${v}  [${ok ? 'OK ✓' : 'absent (ignoré)'}]`)
}
console.log()

LAST_MSG = buildMessage()
setInterval(refreshAndBroadcast, REFRESH_S * 1000)
