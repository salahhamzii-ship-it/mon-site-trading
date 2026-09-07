// Vercel serverless function — proxy POST /order vers sc_bridge.js (Windows) via tunnel ngrok
// Cockpit → POST /api/order → ici → ngrok tunnel → sc_bridge.js → UDP → Sierra Chart SIM

import type { VercelRequest, VercelResponse } from '@vercel/node'

const TUNNEL_BASE = 'https://hatbox-placidly-crabmeat.ngrok-free.dev'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return }

  const body = req.body
  if (!body?.action || !body?.symbol) {
    res.status(400).json({ error: 'action + symbol requis' }); return
  }

  try {
    const controller = new AbortController()
    const tid = setTimeout(() => controller.abort(), 8000)
    const r = await fetch(`${TUNNEL_BASE}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(tid)
    const data = await r.json()
    res.status(r.ok ? 200 : 502).json(data)
  } catch (e: unknown) {
    res.status(503).json({ ok: false, error: 'bridge_offline', detail: String(e) })
  }
}
