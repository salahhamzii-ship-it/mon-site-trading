// Vercel serverless function — fetch depuis sc_bridge.js (Windows) via cloudflared tunnel
// sc_bridge.js (Windows) → cloudflared tunnel → GET ici → frontend

import type { VercelRequest, VercelResponse } from '@vercel/node'

// URLs par ordre de priorité — localtunnel (subdomain fixe) en premier
const TUNNEL_URLS = [
  'https://sc-bridge.loca.lt/data',
  'https://33654683-3a3b-4484-8441-0cda7748d29e.cfargotunnel.com/data',
  'https://laughing-urw-sacramento-creations.trycloudflare.com/data',
]

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  let lastErr = ''
  for (const url of TUNNEL_URLS) {
    try {
      const controller = new AbortController()
      const tid = setTimeout(() => controller.abort(), 6000)
      const r = await fetch(url, { signal: controller.signal })
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
