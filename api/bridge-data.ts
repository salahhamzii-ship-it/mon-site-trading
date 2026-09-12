// Vercel serverless function — fetch depuis sc_bridge.js (Windows) via ngrok/cloudflared
// sc_bridge.js (Windows) → ngrok tunnel → GET ici → frontend

import type { VercelRequest, VercelResponse } from '@vercel/node'

// Sources données — ngrok (priorité) → cloudflared fallback
const TUNNEL_URLS = [
  'https://hatbox-placidly-crabmeat.ngrok-free.dev/data',                    // ngrok (priorité)
  'https://33654683-3a3b-4484-8441-0cda7748d29e.cfargotunnel.com/data',      // cloudflared fallback
]

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
      const data = await r.json()
      res.json(data)
      return
    } catch (e: unknown) {
      lastErr = String(e)
    }
  }
  res.status(503).json({ error: 'bridge_offline', detail: lastErr })
}
