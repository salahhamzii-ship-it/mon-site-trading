// Vercel serverless function — fetch depuis sc_bridge.js (Windows) via cloudflared tunnel
// sc_bridge.js (Windows) → cloudflared tunnel → GET ici → frontend

import type { VercelRequest, VercelResponse } from '@vercel/node'

// URL permanente tunnel cloudflared (sc-bridge named tunnel)
// Fallback: ancienne URL temporaire si tunnel permanent pas encore actif
const TUNNEL_URLS = [
  'https://sc-bridge.cfargotunnel.com/data',
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
