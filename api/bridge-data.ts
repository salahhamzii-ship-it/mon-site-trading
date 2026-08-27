// Vercel serverless function — fetch depuis bridge_receiver.py sur VPS
// sc_bridge.py (Windows) → HTTP POST → VPS:8767 → GET ici → frontend

import type { VercelRequest, VercelResponse } from '@vercel/node'

const VPS_URL = 'http://2.29.3.199:8766/data'

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 6000)
    const r = await fetch(VPS_URL, { signal: controller.signal })
    clearTimeout(tid)
    if (!r.ok) throw new Error(`VPS ${r.status}`)
    const data = await r.json()
    if (!data || Object.keys(data).length === 0) throw new Error('no_data')
    res.json(data)
  } catch (e: unknown) {
    res.status(503).json({ error: 'bridge_offline', detail: String(e) })
  }
}
