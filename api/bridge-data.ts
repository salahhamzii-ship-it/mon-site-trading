// Vercel serverless function — proxy HTTP vers VPS bridge
// Browser (HTTPS) → GET /api/bridge-data → Vercel → http://VPS:8766/data
const VPS_HTTP = 'http://2.29.3.199:8766/data'
const TIMEOUT_MS = 6000

export const config = { runtime: 'edge' }

export default async function handler(): Promise<Response> {
  try {
    const res = await fetch(VPS_HTTP, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) throw new Error(`VPS HTTP ${res.status}`)
    const data = await res.text()
    return new Response(data, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ _error: 'bridge offline', _detail: String(e) }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
}
