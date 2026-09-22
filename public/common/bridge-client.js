/**
 * bridge-client.js — Client universel NQ Bridge
 * Charge automatiquement les données depuis le bridge local ou un tunnel HTTPS.
 * Inclure AVANT tout script qui utilise fetchBridge() ou les événements bridge:*.
 *
 * Usage :
 *   <script src="/common/bridge-client.js"></script>
 *   document.addEventListener('bridge:ok', e => console.log(e.detail.NQ));
 *   const data = await fetchBridge();
 */

(function (global) {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────────────────

  const BRIDGE_LOCAL   = 'http://localhost:8766';
  const DATA_PATH      = '/data';
  const STATUS_PATH    = '/status';
  const FETCH_TIMEOUT  = 4000;   // ms
  const RETRY_DELAYS   = [1000, 2000, 4000];
  const STALE_MAX_AGE  = 30000;  // ms — au-delà : badge "stale"

  // ── Helpers ────────────────────────────────────────────────────────────────

  function timeoutSignal(ms) {
    // Polyfill AbortSignal.timeout() — compatible Safari < 16.4
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
      return AbortSignal.timeout(ms);
    }
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), ms);
    return ctrl.signal;
  }

  async function fetchWithTimeout(url, ms) {
    const res = await fetch(url, { signal: timeoutSignal(ms) });
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
    return res.json();
  }

  // ── Résolution de l'URL bridge ──────────────────────────────────────────────
  // Si la page est servie en HTTPS, on lit /status pour trouver un tunnel actif.
  // Sinon on utilise le bridge local directement.

  let _resolvedBase = null;   // cache après première résolution réussie
  let _statusCache  = null;

  async function _resolveBase() {
    if (_resolvedBase) return _resolvedBase;

    if (location.protocol !== 'https:') {
      _resolvedBase = BRIDGE_LOCAL;
      return _resolvedBase;
    }

    // HTTPS : interroger /status via la même origine (Vercel proxy ou tunnel)
    try {
      const status = await fetchWithTimeout(location.origin + STATUS_PATH, FETCH_TIMEOUT);
      _statusCache = status;
      const { ngrok, cloudflared, vercel } = (status.tunnels || {});
      // Tester les tunnels dans l'ordre de préférence
      for (const url of [vercel, ngrok, cloudflared]) {
        if (!url) continue;
        try {
          await fetchWithTimeout(url + '/health', 2000);
          _resolvedBase = url;
          return _resolvedBase;
        } catch (_) {/* tunnel inactif */}
      }
    } catch (_) {/* /status inaccessible */}

    // Fallback : même origine (Vercel proxy /api/bridge-data)
    _resolvedBase = location.origin;
    return _resolvedBase;
  }

  // ── fetchBridge() ───────────────────────────────────────────────────────────

  /**
   * Récupère un snapshot NQ depuis le bridge avec retry automatique.
   * @returns {Promise<object>} — la structure {NQ: {...}}
   */
  async function fetchBridge() {
    const base = await _resolveBase();
    const url  = base + DATA_PATH;
    let lastErr;

    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt - 1]));
      }
      try {
        const data = await fetchWithTimeout(url, FETCH_TIMEOUT);
        _dispatch('bridge:ok', data);
        if (data.NQ && data.NQ.stale) {
          _dispatch('bridge:stale', data);
        }
        return data;
      } catch (err) {
        lastErr = err;
        if (err.name === 'AbortError') {
          _dispatch('bridge:timeout', { url, attempt });
        }
      }
    }

    _dispatch('bridge:error', { error: lastErr, url });
    throw lastErr;
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  function _dispatch(type, detail) {
    document.dispatchEvent(new CustomEvent(type, { detail }));
  }

  // ── Badge de statut (optionnel) ─────────────────────────────────────────────
  // Si un élément avec id="bridge-badge" existe, son texte et sa couleur
  // sont mis à jour automatiquement selon les événements.

  function _setupBadge() {
    const badge = document.getElementById('bridge-badge');
    if (!badge) return;

    const set = (txt, color) => {
      badge.textContent = txt;
      badge.style.color = color;
    };

    document.addEventListener('bridge:ok',      e => {
      const stale = e.detail.NQ && e.detail.NQ.stale;
      set(stale ? '⚠ stale' : '● live', stale ? '#f59e0b' : '#22c55e');
    });
    document.addEventListener('bridge:error',   () => set('✖ erreur',  '#ef4444'));
    document.addEventListener('bridge:timeout', () => set('⌛ timeout', '#f59e0b'));
    document.addEventListener('bridge:stale',   () => set('⚠ stale',   '#f59e0b'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _setupBadge);
  } else {
    _setupBadge();
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  global.fetchBridge      = fetchBridge;
  global.BridgeClient     = { fetchBridge, resolveBase: _resolveBase };

}(typeof globalThis !== 'undefined' ? globalThis : window));
