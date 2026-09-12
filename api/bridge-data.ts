// Vercel serverless function — fetch depuis sc_bridge.js (Windows) via ngrok/cloudflared
// sc_bridge.js (Windows) → ngrok tunnel → GET ici → frontend

import type { VercelRequest, VercelResponse } from '@vercel/node'

// Sources données — ngrok (priorité) → cloudflared fallback
const TUNNEL_URLS = [
  'https://hatbox-placidly-crabmeat.ngrok-free.dev/data',                    // ngrok (priorité)
  'https://33654683-3a3b-4484-8441-0cda7748d29e.cfargotunnel.com/data',      // cloudflared fallback
]

// Dérive AVWAP/SD±1/SD±3 depuis SD±2 si sc_bridge ne les fournit pas
// Formule : AVWAP = (SD+2 + SD-2)/2  |  sigma = (SD+2 - SD-2)/4
function enrichSdBands(instr: Record<string, unknown>): Record<string, unknown> {
  const sd2h = parseFloat(instr.sd2h as string)
  const sd2l = parseFloat(instr.sd2l as string)
  if (isNaN(sd2h) || isNaN(sd2l) || sd2h <= sd2l || sd2h < 100) return instr

  const sigma  = (sd2h - sd2l) / 4
  const vwap   = (sd2h + sd2l) / 2

  const out = { ...instr }
  if (!instr.vwap  || parseFloat(instr.vwap  as string) <= 0) out.vwap  = vwap.toFixed(2)
  if (!instr.sd1h  || parseFloat(instr.sd1h  as string) <= 0) out.sd1h  = (vwap + sigma).toFixed(2)
  if (!instr.sd1l  || parseFloat(instr.sd1l  as string) <= 0) out.sd1l  = (vwap - sigma).toFixed(2)
  if (!instr.ovn_vwap || parseFloat(instr.ovn_vwap as string) <= 0) out.ovn_vwap = vwap.toFixed(2)

  // SD±3 depuis sigma
  const v = parseFloat(out.vwap as string)
  const s1h = parseFloat(out.sd1h as string)
  if (!isNaN(v) && !isNaN(s1h) && s1h > v) {
    const sig3 = s1h - v
    if (!instr.ovn_sd3h || parseFloat(instr.ovn_sd3h as string) <= 0) out.ovn_sd3h = (v + 3 * sig3).toFixed(2)
    if (!instr.ovn_sd3l || parseFloat(instr.ovn_sd3l as string) <= 0) out.ovn_sd3l = (v - 3 * sig3).toFixed(2)
  }

  // avwap_side recalculé si dérivé
  if (!instr.avwap_side) {
    const price = parseFloat(instr.last as string)
    if (!isNaN(price) && !isNaN(vwap)) out.avwap_side = price > vwap ? 'above' : 'below'
  }

  return out
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  let lastErr = ''
  for (const url of TUNNEL_URLS) {
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 6000)
      const r = await fetch(url, { signal: controller.signal, headers: { 'ngrok-skip-browser-warning': '1' } })
      clearTimeout(tid)
      if (!r.ok) { lastErr = `HTTP ${r.status} from ${url}`; continue }
      const raw = await r.json() as Record<string, Record<string, unknown>>
      // Enrichir chaque instrument avec les bandes SD dérivées
      const data: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(raw)) {
        data[key] = (val && typeof val === 'object') ? enrichSdBands(val) : val
      }
      res.json(data)
      return
    } catch (e: unknown) {
      lastErr = String(e)
    }
  }
  res.status(503).json({ error: 'bridge_offline', detail: lastErr })
}
