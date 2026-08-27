// Vercel Edge Function — proxy WebSocket VPS vers HTTP
// Browser (HTTPS) GET /api/bridge-data → Vercel → ws://2.29.3.199:8765
// Aucune modification VPS requise — le WS existant est utilisé côté serveur

export const config = { runtime: 'edge' }

const VPS_WS  = 'ws://2.29.3.199:8765'
const TIMEOUT = 8000

export default async function handler(): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  }

  return new Promise<Response>((resolve) => {
    let done = false
    const finish = (body: string, status = 200) => {
      if (done) return
      done = true
      try { ws.close() } catch { /* ignore */ }
      clearTimeout(timer)
      resolve(new Response(body, { status, headers }))
    }

    let ws: WebSocket
    try {
      ws = new WebSocket(VPS_WS)
    } catch (e) {
      return resolve(new Response(
        JSON.stringify({ _error: 'ws_create_failed', _detail: String(e) }),
        { status: 503, headers }
      ))
    }

    const timer = setTimeout(
      () => finish(JSON.stringify({ _error: 'timeout' }), 503),
      TIMEOUT
    )

    ws.onmessage = (e) => finish(typeof e.data === 'string' ? e.data : JSON.stringify({ _error: 'bad_data' }))
    ws.onerror   = ()  => finish(JSON.stringify({ _error: 'bridge_offline' }), 503)
    ws.onclose   = ()  => { if (!done) finish(JSON.stringify({ _error: 'ws_closed' }), 503) }
  })
}
