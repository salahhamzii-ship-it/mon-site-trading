import React, { useEffect, useRef, useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Candle { o: number; h: number; l: number; c: number; v: number }

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:            '#060810',
  surface:       '#090d15',
  surfaceUp:     '#0d1220',
  gold:          '#c9a84c',
  goldBright:    '#f0d070',
  goldDim:       'rgba(201,168,76,0.5)',
  goldFaint:     'rgba(201,168,76,0.10)',
  turquoise:     '#1eb3bc',
  turquoiseFaint:'rgba(30,179,188,0.12)',
  sand:          '#d8cdb8',
  sandMuted:     '#7a6a50',
  border:        'rgba(201,168,76,0.14)',
  borderUp:      'rgba(201,168,76,0.40)',
  red:           '#ef4444',
  redFaint:      'rgba(239,68,68,0.12)',
  green:         '#34d399',
  greenFaint:    'rgba(52,211,153,0.12)',
  purple:        'rgba(139,92,246,0.70)',
  amber:         '#f59e0b',
};

// ─── Gradient text style (reusable) ──────────────────────────────────────────
const GRAD = {
  background:           'linear-gradient(135deg, #f0d070, #c9a84c)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor:  'transparent',
  backgroundClip:       'text',
} as React.CSSProperties;

// ─── Global CSS ───────────────────────────────────────────────────────────────
const CSS = `
  .nav-tab {
    font-family: 'Orbitron', monospace;
    font-size: 7.5px;
    font-weight: 700;
    letter-spacing: 0.18em;
    color: #7a6a50;
    padding: 0 12px;
    height: 100%;
    display: flex;
    align-items: center;
    border-bottom: 2px solid transparent;
    transition: color 0.2s, border-color 0.2s;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    flex-shrink: 0;
  }
  .nav-tab:hover { color: #f0d070; border-bottom-color: rgba(201,168,76,0.35); }
  .nav-tab.active {
    color: #f0d070;
    border-bottom-color: #c9a84c;
    text-shadow: 0 0 14px rgba(240,208,112,0.55);
  }
  .bpr-bar {
    position: relative;
    height: 8px;
    background: rgba(201,168,76,0.07);
    border-radius: 4px;
    overflow: visible;
  }
  .bpr-fill {
    position: absolute;
    top: 0; left: 0;
    height: 100%;
    border-radius: 4px;
    transition: width 0.6s ease;
  }
  .bpr-marker {
    position: absolute;
    top: -4px;
    width: 2px;
    height: 16px;
    border-radius: 1px;
  }
  .bpr-lbl {
    position: absolute;
    top: 14px;
    font-size: 8px;
    transform: translateX(-50%);
    font-family: 'JetBrains Mono', monospace;
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function genCandles(n: number): Candle[] {
  let p = 21340;
  return Array.from({ length: n }, () => {
    const o = p;
    const move = (Math.random() - 0.5) * 60;
    const h = o + Math.abs(move) + Math.random() * 20;
    const l = o - Math.abs(move) - Math.random() * 20;
    const c = o + move;
    p = c;
    return { o, h, l, c, v: 800 + Math.random() * 1200 };
  });
}

function fmt(p: number, dec = 2): string {
  return p.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

// ─── MiniChart ────────────────────────────────────────────────────────────────
function MiniChart({ hist, live, avwap, gex }: { hist: Candle[]; live: number; avwap: number; gex: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.scale(dpr, dpr);
    }

    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0c1020');
    bg.addColorStop(1, '#060810');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(201,168,76,0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) { const y = H / 6 * i; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    for (let i = 1; i < 10; i++) { const x = W / 10 * i; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

    // Price range
    const all = hist.flatMap(c => [c.h, c.l]);
    all.push(live, avwap, gex);
    const mn = Math.min(...all) - 15;
    const mx = Math.max(...all) + 15;
    const py = (p: number) => H - ((p - mn) / (mx - mn)) * H;

    const N   = hist.length;
    const pad = 60;
    const cw  = (W - pad) / N;
    const cx  = (i: number) => pad / 2 + i * cw + cw / 2;

    // Volume bars
    const maxV = Math.max(...hist.map(c => c.v));
    hist.forEach((c, i) => {
      ctx.fillStyle = c.c >= c.o ? 'rgba(52,211,153,0.06)' : 'rgba(239,68,68,0.06)';
      const vh = (c.v / maxV) * H * 0.28;
      ctx.fillRect(cx(i) - cw * 0.4, H - vh, cw * 0.8, vh);
    });

    // BPR zone
    const bTop = py(Math.max(avwap, gex));
    const bBot = py(Math.min(avwap, gex));
    const bprGrad = ctx.createLinearGradient(0, bTop, 0, bBot);
    bprGrad.addColorStop(0, 'rgba(139,92,246,0.14)');
    bprGrad.addColorStop(1, 'rgba(139,92,246,0.04)');
    ctx.fillStyle = bprGrad;
    ctx.fillRect(0, bTop, W, Math.max(bBot - bTop, 1));

    // AVWAP line
    ctx.strokeStyle = 'rgba(201,168,76,0.75)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(0, py(avwap)); ctx.lineTo(W - pad, py(avwap)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(201,168,76,0.85)';
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('AVWAP', W - pad + 4, py(avwap) + 3);

    // GEX line
    ctx.strokeStyle = 'rgba(30,179,188,0.65)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.moveTo(0, py(gex)); ctx.lineTo(W - pad, py(gex)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(30,179,188,0.85)';
    ctx.fillText('GEX', W - pad + 4, py(gex) + 3);

    // Candles
    hist.forEach((c, i) => {
      const bull  = c.c >= c.o;
      const x     = cx(i);
      const half  = Math.max(cw * 0.36, 1.2);
      ctx.strokeStyle = bull ? '#34d399' : '#ef4444';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, py(c.h)); ctx.lineTo(x, py(c.l)); ctx.stroke();
      ctx.fillStyle = bull ? 'rgba(52,211,153,0.82)' : 'rgba(239,68,68,0.82)';
      const top = py(Math.max(c.o, c.c));
      const bot = py(Math.min(c.o, c.c));
      ctx.fillRect(x - half, top, half * 2, Math.max(bot - top, 1));
    });

    // Live price dashed
    const ly = py(live);
    ctx.strokeStyle = 'rgba(240,208,112,0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(W, ly); ctx.stroke();
    ctx.setLineDash([]);

    // Live price pill
    const lbl = fmt(live);
    const lw  = lbl.length * 6.2 + 14;
    const px2 = W - lw - 4;
    const py2 = ly - 9;
    ctx.fillStyle = '#f0d070';
    rrect(ctx, px2, py2, lw, 17, 3);
    ctx.fillStyle = '#060810';
    ctx.font = 'bold 8.5px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(lbl, px2 + 6, py2 + 11);
  }, [hist, live, avwap, gex]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => { draw(); });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ title, icon, accent, children }: { title: string; icon: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{
      flex: 1,
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderTop: `2px solid ${accent ?? C.gold}`,
      borderRadius: 4,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
    }}>
      <div style={{
        padding: '3px 10px',
        background: C.goldFaint,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10 }}>{icon}</span>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: 7.5,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: accent ?? C.gold,
          textTransform: 'uppercase' as const,
        }}>{title}</span>
      </div>
      <div style={{
        padding: '4px 10px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 8.5,
        color: C.sandMuted,
        letterSpacing: '0.05em',
      }}>{label}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9.5,
        fontWeight: 700,
        color: color ?? C.sand,
      }}>{value}</span>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [hist]   = useState(() => genCandles(80));
  const [live, setLive]     = useState(21340.0);
  const [clock, setClock]   = useState('');
  const [bprPct, setBprPct] = useState(63.4);
  const [bull, setBull]     = useState(true);

  // Key levels
  const open   = 21262;
  const high   = 21425;
  const low    = 21198;
  const settle = 21385;
  const vah    = 21410;
  const val    = 21250;
  const poc    = 21320;
  const avwap  = 21380;
  const gex    = 21340;

  useEffect(() => {
    const t = setInterval(() => setLive(p => +(p + (Math.random() - 0.49) * 3).toFixed(2)), 900);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setBprPct(p => { const n = p + (Math.random() - 0.5) * 2; return Math.min(90, Math.max(40, n)); });
      setBull(Math.random() > 0.35);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('fr-FR', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ET');
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const change    = live - open;
  const changePct = (change / open * 100).toFixed(2);
  const up        = change >= 0;

  const oteZone    = bprPct > 61.8 && bprPct < 78.6;
  const signalReady = oteZone && bull;
  const sigColor   = signalReady ? C.green : bprPct > 78.6 ? C.red : C.amber;
  const sigLabel   = signalReady ? 'PRÊT' : bprPct > 78.6 ? 'DÉPASSÉ' : 'EN ATTENTE';

  const bprFill = bprPct > 78.6
    ? `linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.65))`
    : bprPct > 61.8
      ? `linear-gradient(90deg, rgba(139,92,246,0.35), rgba(201,168,76,0.45))`
      : `linear-gradient(90deg, rgba(52,211,153,0.3), rgba(139,92,246,0.3))`;

  const ORBITRON = "'Orbitron', monospace";
  const JB_MONO  = "'JetBrains Mono', monospace";

  return (
    <div style={{
      marginLeft: -24, marginRight: -24, marginTop: -24,
      height: 'calc(100vh - 56px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: C.bg,
    }}>
      <style>{CSS}</style>

      {/* ── Row 1 : Header ─────────────────────────────────────────────── */}
      <div style={{
        height: 56, minHeight: 56,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 16,
        background: 'linear-gradient(180deg, rgba(201,168,76,0.07) 0%, transparent 100%)',
        borderBottom: `1px solid ${C.border}`,
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* Horizon glow */}
        <div style={{
          position: 'absolute', bottom: 0, left: '5%', right: '5%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)',
        }} />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 24, filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.45))' }}>🐪</span>
          <div>
            <div style={{
              ...GRAD,
              fontFamily: ORBITRON,
              fontWeight: 900,
              fontSize: 13,
              letterSpacing: '0.16em',
              lineHeight: 1.1,
              filter: 'drop-shadow(0 0 10px rgba(201,168,76,0.3))',
            }}>CAMEL MARKET COCKPIT</div>
            <div style={{
              fontFamily: JB_MONO,
              fontSize: 8,
              color: C.sandMuted,
              letterSpacing: '0.12em',
              marginTop: 1,
            }}>by SalahTataouine · NQ·ES MARKET READING SYSTEM</div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Live Price */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            ...GRAD,
            fontFamily: ORBITRON,
            fontWeight: 900,
            fontSize: 22,
            lineHeight: 1,
            filter: 'drop-shadow(0 0 12px rgba(201,168,76,0.35))',
          }}>{fmt(live)}</div>
          <div style={{
            fontFamily: JB_MONO,
            fontSize: 10,
            color: up ? C.green : C.red,
            marginTop: 2,
          }}>{up ? '▲' : '▼'} {fmt(Math.abs(change))} ({up ? '+' : ''}{changePct}%)</div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          {([['VAH', vah], ['POC', poc], ['VAL', val], ['OPEN', open]] as [string, number][]).map(([k, v]) => (
            <div key={k} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: JB_MONO, fontSize: 7.5, color: C.sandMuted, letterSpacing: '0.1em' }}>{k}</div>
              <div style={{ fontFamily: JB_MONO, fontSize: 9.5, color: C.sand }}>{fmt(v)}</div>
            </div>
          ))}

          <div style={{
            padding: '2px 8px',
            background: C.turquoiseFaint,
            border: `1px solid ${C.turquoise}`,
            borderRadius: 3,
            fontFamily: ORBITRON,
            fontSize: 7,
            fontWeight: 700,
            color: C.turquoise,
            letterSpacing: '0.1em',
          }}>● LIVE RTH</div>

          <div style={{
            fontFamily: JB_MONO,
            fontSize: 10,
            color: C.goldBright,
            minWidth: 88,
            textAlign: 'right',
          }}>{clock}</div>
        </div>
      </div>

      {/* ── Row 2 : Nav Tabs ────────────────────────────────────────────── */}
      <div style={{
        height: 38, minHeight: 38,
        display: 'flex',
        alignItems: 'stretch',
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        overflowX: 'auto',
        overflowY: 'hidden',
        flexShrink: 0,
      }}>
        {[
          { to: '/',         label: 'THE COCKPIT',      end: true },
          { to: '/analyseur',label: 'MARKET ORBIT' },
          { to: '/gex',      label: 'FLOW · GEX' },
          { to: '/journal',  label: 'THE LOGBOOK' },
          { to: '/setups',   label: 'NQ ROUTES' },
          { to: '/bible',    label: 'THE CODEX' },
          { to: '/plan',     label: 'THE WEEKLY ROUTE' },
          { to: '/stats',    label: 'THE ARCHIVE' },
        ].map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
          >{label}</NavLink>
        ))}
      </div>

      {/* ── Row 3 : Data Cards ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: 4,
        padding: '4px 8px',
        height: 112, minHeight: 112,
        flexShrink: 0,
      }}>
        <Card title="RTH J-1" icon="📊">
          <Row label="OPEN"   value={fmt(open)} />
          <Row label="HIGH"   value={fmt(high)}   color={C.green} />
          <Row label="LOW"    value={fmt(low)}    color={C.red} />
          <Row label="SETTLE" value={fmt(settle)} color={C.goldBright} />
          <Row label="VAH"    value={fmt(vah)}    color={C.green} />
          <Row label="VAL"    value={fmt(val)}    color={C.red} />
          <Row label="POC"    value={fmt(poc)}    color={C.gold} />
        </Card>

        <Card title="OVN" icon="🌙">
          <Row label="INVENTAIRE" value="HAUSSIER"   color={C.green} />
          <Row label="AVWAP 18H"  value={fmt(avwap)} color={C.gold} />
          <Row label="EXCESS"     value="+1.8%"      color={C.green} />
          <Row label="OTF4"       value="ACHETEUR"   color={C.green} />
          <Row label="GAP RTH"    value="21,295" />
          <Row label="RANGE"      value="127 pts" />
          <Row label="BIAIS"      value="▲ LONG"     color={C.green} />
        </Card>

        <Card title="ALN" icon="🧭" accent={C.turquoise}>
          <Row label="PATTERN"   value="P4 LONDON"    color={C.turquoise} />
          <Row label="LONDON H"  value={fmt(21415)}   color={C.goldBright} />
          <Row label="ASIA H"    value={fmt(21390)} />
          <Row label="CALL WALL" value={fmt(21500)}   color={C.green} />
          <Row label="PUT WALL"  value={fmt(21200)}   color={C.red} />
          <Row label="IB CLASS." value="NORMAL"       color={C.amber} />
          <Row label="STRUCTURE" value="HAUSSIÈRE"    color={C.green} />
        </Card>

        <Card title="IB · GEX" icon="⚡" accent={C.amber}>
          <Row label="IB HIGH"     value={fmt(21350)} color={C.green} />
          <Row label="IB LOW"      value={fmt(21280)} color={C.red} />
          <Row label="IB RANGE"    value="70 pts" />
          <Row label="AVWAP 18H"   value={fmt(avwap)} color={C.gold} />
          <Row label="GEX BIAS"    value="▲ CALLS"   color={C.green} />
          <Row label="GEX ATTRAC." value={fmt(gex)}   color={C.turquoise} />
          <Row label="OTE 61.8%"   value={fmt(21318)} color={C.amber} />
        </Card>
      </div>

      {/* ── Row 4 : Chart + Right Panel ─────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: 4,
        padding: '0 8px',
        minHeight: 0,
      }}>
        {/* Chart */}
        <div style={{
          flex: 1,
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}>
          <div style={{
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: ORBITRON, fontSize: 7.5, fontWeight: 700, letterSpacing: '0.15em', color: C.gold }}>
              NQ · PRICE ACTION
            </span>
            {['1m', '5m', '15m', '1h'].map(tf => (
              <span key={tf} style={{
                fontFamily: JB_MONO, fontSize: 9,
                color: tf === '5m' ? C.goldBright : C.sandMuted,
                cursor: 'pointer',
                borderBottom: tf === '5m' ? `1px solid ${C.gold}` : 'none',
              }}>{tf}</span>
            ))}
            <div style={{ flex: 1 }} />
            {[
              { color: C.gold,           label: '─ AVWAP 18H' },
              { color: C.turquoise,      label: '⋯ GEX' },
              { color: 'rgba(139,92,246,0.8)', label: '▪ BPR/FVG' },
            ].map(l => (
              <span key={l.label} style={{ fontFamily: JB_MONO, fontSize: 8, color: l.color }}>{l.label}</span>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <MiniChart hist={hist} live={live} avwap={avwap} gex={gex} />
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ width: 204, display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {/* Scénarios */}
          <div style={{
            flex: 1,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderTop: `2px solid ${C.gold}`,
            borderRadius: 4,
            padding: '6px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflow: 'hidden',
          }}>
            <div style={{ fontFamily: ORBITRON, fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: C.gold }}>
              SCÉNARIOS
            </div>
            {[
              { active: bull,  color: C.green, dir: '▲ BULL', text: `Reclaim ${fmt(avwap)} → IB High → ${fmt(21500)}` },
              { active: !bull, color: C.red,   dir: '▼ BEAR', text: `Fail ${fmt(open)} → ${fmt(21200)} PUT WALL` },
            ].map(s => (
              <div key={s.dir} style={{
                background: s.active ? `${s.color}14` : 'transparent',
                border: `1px solid ${s.active ? s.color : C.border}`,
                borderRadius: 3,
                padding: '4px 8px',
                transition: 'all 0.4s',
              }}>
                <div style={{ fontFamily: ORBITRON, fontSize: 7, color: s.color, letterSpacing: '0.1em', marginBottom: 3 }}>
                  {s.dir}
                </div>
                <div style={{ fontFamily: JB_MONO, fontSize: 8, color: C.sand }}>{s.text}</div>
              </div>
            ))}
          </div>

          {/* Règles actives */}
          <div style={{
            flex: 1,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderTop: `2px solid ${C.turquoise}`,
            borderRadius: 4,
            padding: '6px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            overflow: 'hidden',
          }}>
            <div style={{ fontFamily: ORBITRON, fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: C.turquoise }}>
              RÈGLES ACTIVES
            </div>
            {[
              '85/15 : veille RTH ouverture',
              'Chameau : attendre le 85',
              'GEX > 21300 : zone magnétique',
              'OVN inventaire long confirmé',
            ].map((r, i) => (
              <div key={i} style={{ fontFamily: JB_MONO, fontSize: 8, color: C.sandMuted, display: 'flex', gap: 5 }}>
                <span style={{ color: C.gold, flexShrink: 0 }}>›</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 5 : BPR / FVG Zone ──────────────────────────────────────── */}
      <div style={{
        height: 64, minHeight: 64,
        padding: '6px 12px',
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: ORBITRON, fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: C.gold }}>
            BPR · FVG ZONE
          </span>
          <span style={{ fontFamily: JB_MONO, fontSize: 9, color: bprPct > 78.6 ? C.red : bprPct > 61.8 ? C.green : C.amber }}>
            {bprPct.toFixed(1)}% — {fmt(open + (bprPct / 100) * 200)}
          </span>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div className="bpr-bar" style={{ flex: 1, margin: '8px 0' }}>
            <div className="bpr-fill" style={{
              width: `${bprPct}%`,
              background: bprFill,
              boxShadow: `0 0 8px ${sigColor}50`,
            }} />
            <div className="bpr-marker" style={{ left: '61.8%', background: C.green, boxShadow: `0 0 4px ${C.green}` }} />
            <div className="bpr-marker" style={{ left: '78.6%', background: C.amber, boxShadow: `0 0 4px ${C.amber}` }} />
            <span className="bpr-lbl" style={{ left: '61.8%', color: C.green }}>61.8%</span>
            <span className="bpr-lbl" style={{ left: '78.6%', color: C.amber }}>78.6%</span>
          </div>
        </div>
      </div>

      {/* ── Row 6 : Signal Bar ──────────────────────────────────────────── */}
      <div style={{
        height: 44, minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 16,
        background: `linear-gradient(90deg, ${sigColor}10, transparent 60%)`,
        borderTop: `1px solid ${sigColor}35`,
        flexShrink: 0,
      }}>
        {/* Status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 14px 0 0',
          borderRight: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: sigColor,
            boxShadow: `0 0 8px ${sigColor}`,
          }} />
          <span style={{
            fontFamily: ORBITRON, fontSize: 10, fontWeight: 700,
            letterSpacing: '0.15em', color: sigColor,
          }}>{sigLabel}</span>
        </div>

        {/* Levels */}
        {([
          ['ENTRY',  fmt(live - 5)],
          ['STOP',   fmt(val)],
          ['TP1',    fmt(avwap)],
          ['TP2',    fmt(21500)],
          ['RISK',   '1%'],
          ['RATIO',  '1:3'],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: JB_MONO, fontSize: 7, color: C.sandMuted, letterSpacing: '0.1em' }}>{k}</div>
            <div style={{ fontFamily: JB_MONO, fontSize: 11, fontWeight: 700, color: C.sand }}>{v}</div>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <div style={{ fontFamily: ORBITRON, fontSize: 7, letterSpacing: '0.15em', color: C.sandMuted }}>
          NQ · CME · MÉTHODE SALAH
        </div>
      </div>
    </div>
  );
}
