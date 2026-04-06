import { useState, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

/* ─── Storage (localStorage) ─── */
const SK_T = "pj3-trades", SK_C = "pj3-config";
function sg(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } }
function ss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { console.error(e) } }

const CATS = ["CS2","Valorant","Futebol","NBA","NFL","UFC/MMA","Tênis","MLB","NHL","Política","Crypto","Outro"];
const PC = ["#34d399","#60a5fa","#f472b6","#fbbf24","#a78bfa","#fb923c","#2dd4bf","#e879f9","#38bdf8","#a3e635","#f87171","#818cf8"];

/* ─── Design tokens ─── */
const T = {
  bg0:"#000000", bg1:"#060810", bg2:"#0b0f18",
  card:"rgba(14,19,30,0.65)", cardSolid:"#0e131e", cardHover:"#121826",
  glass:"rgba(255,255,255,0.02)",
  b0:"rgba(255,255,255,0.04)", b1:"rgba(255,255,255,0.07)", b2:"rgba(255,255,255,0.12)",
  t0:"#ffffff", t1:"#e2e8f0", t2:"#8494a7", t3:"#3e4f65",
  mint:"#34d399", mintDim:"rgba(52,211,153,0.08)", mintGlow:"rgba(52,211,153,0.15)",
  red:"#f87171", redDim:"rgba(248,113,113,0.08)",
  amber:"#fbbf24", amberDim:"rgba(251,191,36,0.08)",
  blue:"#60a5fa", blueDim:"rgba(96,165,250,0.06)",
};
const ff = "'Outfit', -apple-system, sans-serif";
const fm = "'JetBrains Mono', 'SF Mono', monospace";
const cardStyle = { background:T.card, backdropFilter:"blur(40px) saturate(1.5)", border:`1px solid ${T.b0}`, borderRadius:16 };
const inputBase = { width:"100%", padding:"13px 16px", borderRadius:12, background:T.bg2, border:`1px solid ${T.b1}`, color:T.t0, fontSize:"0.88rem", fontFamily:ff, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s" };
const labelBase = { display:"block", fontSize:"0.72rem", fontWeight:600, color:T.t2, marginBottom:7, letterSpacing:"0.4px", textTransform:"uppercase" };

/* ════════════════════════════════════════ */
export default function App() {
  const [trades, setTrades] = useState([]);
  const [config, setConfig] = useState({ bankroll:1000, maxRiskPct:5 });
  const [view, setView] = useState("dashboard");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = sg(SK_T); const c = sg(SK_C);
    if (t) setTrades(t); if (c) setConfig(c);
    setReady(true);
  }, []);

  useEffect(() => { if (ready) ss(SK_T, trades) }, [trades, ready]);
  useEffect(() => { if (ready) ss(SK_C, config) }, [config, ready]);

  const addTrade = useCallback(t => { setTrades(p => [{ ...t, id:Date.now().toString(), createdAt:new Date().toISOString() }, ...p]); setView("history") }, []);
  const updateTrade = useCallback((id, u) => setTrades(p => p.map(t => t.id === id ? { ...t, ...u } : t)), []);
  const deleteTrade = useCallback(id => setTrades(p => p.filter(t => t.id !== id)), []);

  if (!ready) return (
    <div style={{ minHeight:"100vh", minHeight:"100dvh", background:T.bg0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:ff }}>
      <div style={{ textAlign:"center", color:T.t2, fontSize:"0.9rem" }}>
        <div style={{ width:32, height:32, border:`2px solid ${T.b1}`, borderTop:`2px solid ${T.mint}`, borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 16px" }} />
        Carregando
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", minHeight:"100dvh", background:T.bg0, color:T.t1, fontFamily:ff, paddingBottom:"env(safe-area-inset-bottom)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        *{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
        ::selection{background:${T.mintDim};color:${T.mint}}
        *::-webkit-scrollbar{width:4px}
        *::-webkit-scrollbar-track{background:transparent}
        *::-webkit-scrollbar-thumb{background:${T.b1};border-radius:2px}
        input:focus,select:focus,textarea:focus{border-color:${T.b2}!important}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        body{overscroll-behavior:none}
      `}</style>

      {/* Content */}
      <div style={{ maxWidth:540, margin:"0 auto", padding:"16px 16px 90px" }}>
        <TopHeader trades={trades} />
        <div style={{ animation:"fadeIn 0.4s ease" }}>
          {view === "dashboard" && <Dashboard trades={trades} config={config} setView={setView} />}
          {view === "new" && <NewTrade onSubmit={addTrade} onCancel={() => setView("dashboard")} config={config} trades={trades} />}
          {view === "history" && <History trades={trades} onUpdate={updateTrade} onDelete={deleteTrade} />}
          {view === "insights" && <Insights trades={trades} />}
          {view === "settings" && <Settings config={config} setConfig={setConfig} />}
        </div>
      </div>

      {/* Bottom Tab Bar — mobile native feel */}
      <BottomNav view={view} setView={setView} />
    </div>
  );
}

/* ════════════ TOP HEADER ════════════ */
function TopHeader({ trades }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, paddingTop:8 }}>
      <div style={{ width:30, height:30, borderRadius:9, background:`linear-gradient(135deg, ${T.mint}, ${T.blue})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"0.8rem", fontWeight:800, color:T.bg0 }}>P</div>
      <span style={{ fontWeight:700, fontSize:"1rem", color:T.t0, letterSpacing:"-0.3px" }}>PolyJournal</span>
      {trades.length > 0 && <span style={{ fontFamily:fm, fontSize:"0.6rem", color:T.t3, background:T.glass, border:`1px solid ${T.b0}`, padding:"3px 8px", borderRadius:100 }}>{trades.length}</span>}
    </div>
  );
}

/* ════════════ BOTTOM NAV ════════════ */
function BottomNav({ view, setView }) {
  const tabs = [
    { id:"dashboard", icon:"📊", label:"Home" },
    { id:"new", icon:"➕", label:"Trade" },
    { id:"history", icon:"📋", label:"Histórico" },
    { id:"insights", icon:"🔬", label:"Insights" },
    { id:"settings", icon:"⚙️", label:"Config" },
  ];
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:100,
      background:"rgba(0,0,0,0.85)", backdropFilter:"blur(24px) saturate(1.8)",
      borderTop:`1px solid ${T.b0}`,
      paddingBottom:"env(safe-area-inset-bottom)",
    }}>
      <div style={{ maxWidth:540, margin:"0 auto", display:"flex", justifyContent:"space-around", padding:"8px 0 6px" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{
            display:"flex", flexDirection:"column", alignItems:"center", gap:2,
            border:"none", background:"transparent", cursor:"pointer",
            padding:"4px 12px", fontFamily:ff, transition:"all 0.2s",
          }}>
            <span style={{ fontSize:"1.15rem", filter: view === t.id ? "none" : "grayscale(1) opacity(0.4)" }}>{t.icon}</span>
            <span style={{ fontSize:"0.6rem", fontWeight:view === t.id ? 600 : 400, color: view === t.id ? T.mint : T.t3, letterSpacing:"0.3px" }}>{t.label}</span>
            {view === t.id && <div style={{ width:4, height:4, borderRadius:2, background:T.mint, marginTop:1 }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════ DASHBOARD ════════════ */
function Dashboard({ trades, config, setView }) {
  const s = useMemo(() => {
    const res = trades.filter(t => t.result !== "pending");
    const w = res.filter(t => t.result === "win"), l = res.filter(t => t.result === "loss");
    const pnl = res.reduce((a, t) => a + (t.pnl || 0), 0);
    const stk = res.reduce((a, t) => a + (t.stake || 0), 0);
    const roi = stk > 0 ? (pnl / stk) * 100 : 0;
    let streak = 0, sT = null;
    for (const t of res) { if (!sT) { sT = t.result; streak = 1 } else if (t.result === sT) streak++; else break }
    const byCat = {};
    res.forEach(t => { if (!byCat[t.category]) byCat[t.category] = { w:0, l:0, pnl:0, stk:0, n:0 }; byCat[t.category].n++; byCat[t.category].pnl += t.pnl || 0; byCat[t.category].stk += t.stake || 0; if (t.result === "win") byCat[t.category].w++; else byCat[t.category].l++ });
    const byDate = {}; let cum = 0;
    [...res].sort((a, b) => (a.date || "").localeCompare(b.date || "")).forEach(t => { cum += t.pnl || 0; byDate[t.date] = cum });
    const tl = Object.entries(byDate).map(([d, p]) => ({ date:d.slice(5), pnl:Math.round(p * 100) / 100 }));
    const cb = config.bankroll + pnl;
    const pl = res.filter(t => t.tradeType === "planned"), im = res.filter(t => t.tradeType === "impulsive");
    return { total:trades.length, res:res.length, pend:trades.filter(t => t.result === "pending").length, wins:w.length, losses:l.length, wr:res.length > 0 ? (w.length / res.length * 100) : 0, pnl, roi, avgStk:res.length > 0 ? stk / res.length : 0, avgW:w.length > 0 ? w.reduce((a, t) => a + (t.pnl || 0), 0) / w.length : 0, avgL:l.length > 0 ? Math.abs(l.reduce((a, t) => a + (t.pnl || 0), 0) / l.length) : 0, streak, sT, byCat, tl, cb, bkPct:config.bankroll > 0 ? ((cb - config.bankroll) / config.bankroll * 100) : 0, plPnl:pl.reduce((a, t) => a + (t.pnl || 0), 0), imPnl:im.reduce((a, t) => a + (t.pnl || 0), 0), plN:pl.length, imN:im.length, plWr:pl.length > 0 ? (pl.filter(t => t.result === "win").length / pl.length * 100) : 0, imWr:im.length > 0 ? (im.filter(t => t.result === "win").length / im.length * 100) : 0 };
  }, [trades, config]);

  if (!trades.length) return (
    <div style={{ textAlign:"center", padding:"80px 16px" }}>
      <div style={{ width:64, height:64, borderRadius:16, background:`linear-gradient(135deg, ${T.mint}, ${T.blue})`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:"1.6rem", fontWeight:800, color:T.bg0, marginBottom:20 }}>P</div>
      <h2 style={{ fontSize:"1.4rem", fontWeight:800, letterSpacing:"-0.5px", marginBottom:8, color:T.t0 }}>PolyJournal</h2>
      <p style={{ color:T.t2, fontSize:"0.9rem", marginBottom:32, lineHeight:1.7 }}>Seu diário de trading.<br />Registre, analise e evolua.</p>
      <button onClick={() => setView("new")} style={{ padding:"14px 32px", border:"none", borderRadius:12, background:`linear-gradient(135deg, ${T.mint}, #2dd4bf)`, color:T.bg0, fontSize:"0.88rem", fontWeight:700, cursor:"pointer", fontFamily:ff, boxShadow:`0 8px 32px ${T.mintDim}` }}>Registrar primeira trade</button>
    </div>
  );

  const catData = Object.entries(s.byCat).map(([name, d]) => ({ name, ...d, roi:d.stk > 0 ? (d.pnl / d.stk * 100) : 0, wr:d.n > 0 ? (d.w / d.n * 100) : 0 })).sort((a, b) => b.pnl - a.pnl);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Bankroll hero */}
      <div style={{ ...cardStyle, padding:"24px 20px", background:`linear-gradient(145deg, rgba(14,19,30,0.8), rgba(52,211,153,0.03))`, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-50, right:-50, width:160, height:160, borderRadius:"50%", background:`radial-gradient(circle, ${T.mintGlow}, transparent 70%)`, pointerEvents:"none" }} />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", position:"relative" }}>
          <div>
            <div style={{ fontSize:"0.65rem", color:T.t3, fontWeight:600, letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 }}>Banca Atual</div>
            <div style={{ fontFamily:fm, fontSize:"2rem", fontWeight:700, color:T.t0, letterSpacing:"-1px", lineHeight:1 }}>${s.cb.toFixed(2)}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:fm, fontSize:"1rem", fontWeight:600, color:s.bkPct >= 0 ? T.mint : T.red }}>{s.bkPct >= 0 ? "+" : ""}{s.bkPct.toFixed(1)}%</div>
            <div style={{ fontSize:"0.65rem", color:T.t3, marginTop:2 }}>total</div>
          </div>
        </div>
      </div>

      {/* KPIs grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8 }}>
        <Kpi l="PnL" v={`${s.pnl >= 0 ? "+" : ""}$${s.pnl.toFixed(0)}`} c={s.pnl >= 0 ? T.mint : T.red} />
        <Kpi l="Win Rate" v={`${s.wr.toFixed(0)}%`} sub={`${s.wins}W·${s.losses}L`} c={s.wr >= 50 ? T.mint : T.red} />
        <Kpi l="ROI" v={`${s.roi >= 0 ? "+" : ""}${s.roi.toFixed(1)}%`} c={s.roi >= 0 ? T.mint : T.red} />
        <Kpi l="Streak" v={`${s.streak}${s.sT === "win" ? "W" : s.sT === "loss" ? "L" : "–"}`} c={s.sT === "win" ? T.mint : s.sT === "loss" ? T.red : T.t3} />
        <Kpi l="Avg Stake" v={`$${s.avgStk.toFixed(0)}`} c={T.blue} />
        <Kpi l="Pendentes" v={`${s.pend}`} c={T.amber} />
      </div>

      {/* Planned vs Impulsive */}
      {(s.plN > 0 || s.imN > 0) && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div style={{ ...cardStyle, padding:"16px" }}>
            <div style={{ fontSize:"0.62rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:8 }}>📐 Planejadas ({s.plN})</div>
            <div style={{ fontFamily:fm, fontSize:"1.1rem", fontWeight:700, color:s.plPnl >= 0 ? T.mint : T.red }}>{s.plPnl >= 0 ? "+" : ""}${s.plPnl.toFixed(2)}</div>
            <div style={{ fontSize:"0.62rem", color:T.t3, fontFamily:fm, marginTop:2 }}>WR {s.plWr.toFixed(0)}%</div>
          </div>
          <div style={{ ...cardStyle, padding:"16px" }}>
            <div style={{ fontSize:"0.62rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:8 }}>⚡ Impulsivas ({s.imN})</div>
            <div style={{ fontFamily:fm, fontSize:"1.1rem", fontWeight:700, color:s.imPnl >= 0 ? T.mint : T.red }}>{s.imPnl >= 0 ? "+" : ""}${s.imPnl.toFixed(2)}</div>
            <div style={{ fontSize:"0.62rem", color:T.t3, fontFamily:fm, marginTop:2 }}>WR {s.imWr.toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* PnL Chart */}
      {s.tl.length > 1 && (
        <div style={{ ...cardStyle, padding:"18px 12px" }}>
          <div style={{ fontSize:"0.65rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:14, paddingLeft:4 }}>PnL Acumulado</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={s.tl}>
              <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.mint} stopOpacity={0.2} /><stop offset="100%" stopColor={T.mint} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke={T.b0} strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill:T.t3, fontSize:9, fontFamily:fm }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:T.t3, fontSize:9, fontFamily:fm }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={45} />
              <Tooltip contentStyle={{ background:T.cardSolid, border:`1px solid ${T.b1}`, borderRadius:10, fontSize:"0.75rem", fontFamily:fm }} formatter={v => [`$${v}`, "PnL"]} />
              <Area type="monotone" dataKey="pnl" stroke={T.mint} fill="url(#ag)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category table */}
      {catData.length > 0 && (
        <div style={{ ...cardStyle, padding:"18px 14px", overflow:"auto" }}>
          <div style={{ fontSize:"0.65rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:12 }}>Por Categoria</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.76rem" }}>
            <thead><tr>{["","N","W%","PnL","ROI"].map(h => <th key={h} style={{ textAlign:"left", padding:"7px 4px", color:T.t3, fontWeight:500, fontSize:"0.62rem", textTransform:"uppercase", letterSpacing:"0.5px", borderBottom:`1px solid ${T.b0}` }}>{h}</th>)}</tr></thead>
            <tbody>{catData.map((c, i) => (
              <tr key={c.name}><td style={{ padding:"9px 4px", fontWeight:600, fontSize:"0.78rem" }}><span style={{ display:"inline-block", width:7, height:7, borderRadius:2, background:PC[i % PC.length], marginRight:6, verticalAlign:"middle" }} />{c.name}</td>
                <td style={{ padding:"9px 4px", fontFamily:fm, color:T.t2, fontSize:"0.74rem" }}>{c.n}</td>
                <td style={{ padding:"9px 4px", fontFamily:fm, color:c.wr >= 50 ? T.mint : T.red, fontSize:"0.74rem" }}>{c.wr.toFixed(0)}%</td>
                <td style={{ padding:"9px 4px", fontFamily:fm, fontWeight:600, color:c.pnl >= 0 ? T.mint : T.red, fontSize:"0.74rem" }}>{c.pnl >= 0 ? "+" : ""}${c.pnl.toFixed(0)}</td>
                <td style={{ padding:"9px 4px", fontFamily:fm, color:c.roi >= 0 ? T.mint : T.red, fontSize:"0.74rem" }}>{c.roi >= 0 ? "+" : ""}{c.roi.toFixed(0)}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {/* Avg win/loss */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div style={{ ...cardStyle, padding:"16px", textAlign:"center" }}>
          <div style={{ fontSize:"0.62rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:6 }}>Ganho Médio</div>
          <div style={{ fontFamily:fm, fontSize:"1.2rem", fontWeight:700, color:T.mint }}>+${s.avgW.toFixed(2)}</div>
        </div>
        <div style={{ ...cardStyle, padding:"16px", textAlign:"center" }}>
          <div style={{ fontSize:"0.62rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:6 }}>Perda Média</div>
          <div style={{ fontFamily:fm, fontSize:"1.2rem", fontWeight:700, color:T.red }}>-${s.avgL.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ l, v, sub, c }) {
  return (
    <div style={{ ...cardStyle, padding:"14px 12px" }}>
      <div style={{ fontSize:"0.58rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:5 }}>{l}</div>
      <div style={{ fontFamily:fm, fontSize:"1.05rem", fontWeight:700, color:c || T.t0, letterSpacing:"-0.3px" }}>{v}</div>
      {sub && <div style={{ fontSize:"0.58rem", color:T.t3, marginTop:1, fontFamily:fm }}>{sub}</div>}
    </div>
  );
}

/* ════════════ NEW TRADE ════════════ */
function NewTrade({ onSubmit, onCancel, config, trades }) {
  const [f, setF] = useState({ market:"", category:"CS2", side:"YES", stake:"", odds:"", result:"pending", notes:"", date:new Date().toISOString().split("T")[0], tradeType:"planned", confidence:3 });
  const set = (k, v) => setF(p => ({ ...p, [k]:v }));
  const stake = parseFloat(f.stake) || 0, odds = parseFloat(f.odds) || 0;
  const maxStk = (config.bankroll * config.maxRiskPct) / 100;
  const over = stake > maxStk && maxStk > 0;
  const pay = useMemo(() => { if (!stake || !odds || odds <= 0 || odds >= 1) return { w:0, l:0 }; return { w:(stake / odds) - stake, l:-stake } }, [stake, odds]);
  const ok = f.market.trim() && stake > 0 && odds > 0 && odds < 1;
  const todayN = trades.filter(t => t.date === f.date).length;
  const submit = () => { if (!ok) return; let pnl = 0; if (f.result === "win") pnl = pay.w; if (f.result === "loss") pnl = pay.l; onSubmit({ ...f, stake, odds, pnl }) };

  return (
    <div style={{ animation:"slideIn 0.3s ease" }}>
      <h2 style={{ fontSize:"1.15rem", fontWeight:700, letterSpacing:"-0.3px", marginBottom:20, color:T.t0 }}>Nova Trade</h2>
      {todayN >= 5 && (
        <div style={{ padding:"12px 16px", borderRadius:12, background:T.redDim, border:`1px solid rgba(248,113,113,0.15)`, marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
          <span>⚠️</span>
          <div><div style={{ fontSize:"0.78rem", fontWeight:600, color:T.red }}>Muitas trades hoje ({todayN})</div><div style={{ fontSize:"0.7rem", color:T.t2 }}>Cuidado com overtrading.</div></div>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div><label style={labelBase}>Tipo</label>
          <div style={{ display:"flex", gap:8 }}>
            {[{ id:"planned", l:"Planejada", d:"Analisei", c:T.mint }, { id:"impulsive", l:"Impulsiva", d:"Na hora", c:T.amber }].map(t => (
              <button key={t.id} onClick={() => set("tradeType", t.id)} style={{ flex:1, padding:"13px 10px", borderRadius:12, cursor:"pointer", fontFamily:ff, textAlign:"center", border:`1px solid ${f.tradeType === t.id ? t.c + "33" : T.b0}`, background:f.tradeType === t.id ? t.c + "0d" : "transparent", transition:"all 0.25s" }}>
                <div style={{ fontSize:"0.82rem", fontWeight:600, color:f.tradeType === t.id ? T.t0 : T.t3 }}>{t.l}</div>
                <div style={{ fontSize:"0.65rem", color:T.t3, marginTop:1 }}>{t.d}</div>
              </button>
            ))}
          </div>
        </div>
        <div><label style={labelBase}>Mercado</label><input style={inputBase} placeholder="Spirit vs Vitality" value={f.market} onChange={e => set("market", e.target.value)} /></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div><label style={labelBase}>Categoria</label><select style={{ ...inputBase, cursor:"pointer" }} value={f.category} onChange={e => set("category", e.target.value)}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={labelBase}>Data</label><input type="date" style={inputBase} value={f.date} onChange={e => set("date", e.target.value)} /></div>
        </div>
        <div><label style={labelBase}>Lado</label>
          <div style={{ display:"flex", gap:8 }}>
            {["YES", "NO"].map(s => (
              <button key={s} onClick={() => set("side", s)} style={{ flex:1, padding:"11px", borderRadius:10, fontFamily:ff, cursor:"pointer", fontWeight:600, fontSize:"0.84rem", border:`1px solid ${f.side === s ? (s === "YES" ? T.mint : T.red) + "44" : T.b0}`, background:f.side === s ? (s === "YES" ? T.mintDim : T.redDim) : "transparent", color:f.side === s ? (s === "YES" ? T.mint : T.red) : T.t3, transition:"all 0.2s" }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div><label style={labelBase}>Stake ($)</label>
            <input type="number" style={{ ...inputBase, borderColor:over ? T.red + "66" : T.b1 }} placeholder="100" value={f.stake} onChange={e => set("stake", e.target.value)} />
            {over && <div style={{ fontSize:"0.66rem", color:T.red, marginTop:4 }}>Acima de {config.maxRiskPct}% (máx ${maxStk.toFixed(0)})</div>}
            {stake > 0 && !over && config.bankroll > 0 && <div style={{ fontSize:"0.62rem", color:T.t3, marginTop:3, fontFamily:fm }}>{((stake / config.bankroll) * 100).toFixed(1)}% da banca</div>}
          </div>
          <div><label style={labelBase}>Odd</label><input type="number" step="0.01" style={inputBase} placeholder="0.65" value={f.odds} onChange={e => set("odds", e.target.value)} /></div>
        </div>
        {stake > 0 && odds > 0 && odds < 1 && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, padding:"14px", borderRadius:12, background:T.blueDim, border:`1px solid ${T.blue}11` }}>
            <div style={{ textAlign:"center" }}><div style={{ fontSize:"0.6rem", color:T.t3, fontWeight:600, textTransform:"uppercase", marginBottom:3 }}>Ganho</div><div style={{ fontFamily:fm, fontWeight:700, color:T.mint, fontSize:"0.95rem" }}>+${pay.w.toFixed(2)}</div></div>
            <div style={{ textAlign:"center" }}><div style={{ fontSize:"0.6rem", color:T.t3, fontWeight:600, textTransform:"uppercase", marginBottom:3 }}>Perda</div><div style={{ fontFamily:fm, fontWeight:700, color:T.red, fontSize:"0.95rem" }}>-${Math.abs(pay.l).toFixed(2)}</div></div>
          </div>
        )}
        <div><label style={labelBase}>Confiança</label>
          <div style={{ display:"flex", gap:4 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => set("confidence", n)} style={{ flex:1, padding:"10px 0", borderRadius:8, cursor:"pointer", border:`1px solid ${f.confidence >= n ? T.amber + "44" : T.b0}`, background:f.confidence >= n ? T.amberDim : "transparent", fontSize:"1rem", color:f.confidence >= n ? T.amber : T.t3, transition:"all 0.15s", fontFamily:ff }}>{f.confidence >= n ? "★" : "☆"}</button>
            ))}
          </div>
        </div>
        <div><label style={labelBase}>Resultado</label>
          <div style={{ display:"flex", gap:8 }}>
            {[{ id:"pending", l:"Pendente", c:T.t3 }, { id:"win", l:"Win", c:T.mint }, { id:"loss", l:"Loss", c:T.red }].map(r => (
              <button key={r.id} onClick={() => set("result", r.id)} style={{ flex:1, padding:"11px", borderRadius:10, fontFamily:ff, cursor:"pointer", fontWeight:600, fontSize:"0.8rem", border:`1px solid ${f.result === r.id ? r.c + "44" : T.b0}`, background:f.result === r.id ? r.c + "0d" : "transparent", color:f.result === r.id ? r.c : T.t3, transition:"all 0.2s" }}>{r.l}</button>
            ))}
          </div>
        </div>
        <div><label style={labelBase}>Notas</label><textarea style={{ ...inputBase, minHeight:65, resize:"vertical" }} placeholder="Contexto..." value={f.notes} onChange={e => set("notes", e.target.value)} /></div>
        <div style={{ display:"flex", gap:10, marginTop:4 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"14px", border:`1px solid ${T.b1}`, borderRadius:12, background:"transparent", color:T.t2, fontSize:"0.84rem", fontWeight:500, cursor:"pointer", fontFamily:ff }}>Cancelar</button>
          <button onClick={submit} disabled={!ok} style={{ flex:2, padding:"14px", border:"none", borderRadius:12, background:ok ? `linear-gradient(135deg, ${T.mint}, #2dd4bf)` : T.b0, color:ok ? T.bg0 : T.t3, fontSize:"0.84rem", fontWeight:700, cursor:ok ? "pointer" : "not-allowed", fontFamily:ff, boxShadow:ok ? `0 4px 20px ${T.mintDim}` : "none" }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════════ HISTORY ════════════ */
function History({ trades, onUpdate, onDelete }) {
  const [fl, setFl] = useState("all");
  const fd = trades.filter(t => fl === "all" || t.result === fl);
  const mark = (id, r, s, o) => { const sk = parseFloat(s) || 0, od = parseFloat(o) || 0; let pnl = 0; if (r === "win") pnl = (sk / od) - sk; if (r === "loss") pnl = -sk; onUpdate(id, { result:r, pnl }) };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, gap:8 }}>
        <h2 style={{ fontSize:"1.15rem", fontWeight:700, color:T.t0 }}>Histórico</h2>
        <div style={{ display:"flex", gap:3 }}>
          {[{ id:"all", l:"All" }, { id:"pending", l:"⏳" }, { id:"win", l:"✅" }, { id:"loss", l:"❌" }].map(f => (
            <button key={f.id} onClick={() => setFl(f.id)} style={{ padding:"5px 11px", borderRadius:7, border:`1px solid ${fl === f.id ? T.mint + "33" : T.b0}`, background:fl === f.id ? T.mintDim : "transparent", color:fl === f.id ? T.mint : T.t3, fontSize:"0.72rem", fontWeight:500, cursor:"pointer", fontFamily:ff }}>{f.l}</button>
          ))}
        </div>
      </div>
      {!fd.length ? (
        <div style={{ textAlign:"center", padding:"50px 16px", color:T.t3 }}>Nenhuma trade.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {fd.map(t => {
            const rc = { win:T.mint, loss:T.red, pending:T.amber };
            const rl = { win:"WIN", loss:"LOSS", pending:"PEND" };
            const pnl = t.pnl || 0;
            const stars = "★".repeat(t.confidence || 0) + "☆".repeat(5 - (t.confidence || 0));
            return (
              <div key={t.id} style={{ ...cardStyle, padding:"14px 16px", animation:"slideIn 0.3s ease" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:5, flexWrap:"wrap" }}>
                      <span style={{ padding:"2px 7px", borderRadius:5, fontSize:"0.58rem", fontWeight:700, background:rc[t.result] + "15", color:rc[t.result], fontFamily:fm }}>{rl[t.result]}</span>
                      <span style={{ fontSize:"0.62rem", color:T.t3, fontFamily:fm }}>{t.date}</span>
                      <span style={{ padding:"2px 6px", borderRadius:4, fontSize:"0.56rem", background:T.b0, color:T.t2 }}>{t.category}</span>
                      <span style={{ fontSize:"0.58rem" }}>{t.tradeType === "planned" ? "📐" : "⚡"}</span>
                      <span style={{ fontSize:"0.52rem", color:T.amber }}>{stars}</span>
                    </div>
                    <div style={{ fontWeight:600, fontSize:"0.84rem", color:T.t0, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.market}</div>
                    <div style={{ display:"flex", gap:10, fontSize:"0.72rem", color:T.t2, fontFamily:fm }}>
                      <span style={{ color:t.side === "YES" ? T.mint : T.red }}>{t.side}</span>
                      <span>${t.stake}</span>
                      <span>@{t.odds}</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                    {t.result !== "pending" && <div style={{ fontFamily:fm, fontWeight:700, fontSize:"1rem", color:pnl >= 0 ? T.mint : T.red }}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}$</div>}
                    <div style={{ display:"flex", gap:4 }}>
                      {t.result === "pending" && (
                        <>
                          <button onClick={() => mark(t.id, "win", t.stake, t.odds)} style={{ padding:"4px 9px", borderRadius:6, border:`1px solid ${T.mint}33`, background:T.mintDim, color:T.mint, fontSize:"0.68rem", fontWeight:600, cursor:"pointer", fontFamily:ff }}>Win</button>
                          <button onClick={() => mark(t.id, "loss", t.stake, t.odds)} style={{ padding:"4px 9px", borderRadius:6, border:`1px solid ${T.red}33`, background:T.redDim, color:T.red, fontSize:"0.68rem", fontWeight:600, cursor:"pointer", fontFamily:ff }}>Loss</button>
                        </>
                      )}
                      <button onClick={() => onDelete(t.id)} style={{ padding:"4px 7px", borderRadius:6, border:`1px solid ${T.b0}`, background:"transparent", color:T.t3, fontSize:"0.65rem", cursor:"pointer" }}>✕</button>
                    </div>
                  </div>
                </div>
                {t.notes && <div style={{ marginTop:8, padding:"8px 10px", borderRadius:8, background:T.bg1, fontSize:"0.74rem", color:T.t2, lineHeight:1.5 }}>{t.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════ INSIGHTS ════════════ */
function Insights({ trades }) {
  const res = trades.filter(t => t.result !== "pending");
  const byConf = {};
  res.forEach(t => { const c = t.confidence || 3; if (!byConf[c]) byConf[c] = { w:0, n:0, pnl:0 }; byConf[c].n++; byConf[c].pnl += t.pnl || 0; if (t.result === "win") byConf[c].w++ });
  const confD = [1, 2, 3, 4, 5].map(c => ({ conf:`${c}★`, wr:byConf[c] ? (byConf[c].w / byConf[c].n * 100) : 0, pnl:byConf[c] ? byConf[c].pnl : 0, n:byConf[c] ? byConf[c].n : 0 }));
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const byDay = {};
  res.forEach(t => { if (!t.date) return; const d = new Date(t.date + "T12:00:00").getDay(); const dn = days[d]; if (!byDay[dn]) byDay[dn] = { pnl:0, n:0 }; byDay[dn].n++; byDay[dn].pnl += t.pnl || 0 });
  const dayD = days.map(d => ({ day:d, pnl:byDay[d] ? Math.round(byDay[d].pnl * 100) / 100 : 0 }));
  const pl = res.filter(t => t.tradeType === "planned"), im = res.filter(t => t.tradeType === "impulsive");
  const pP = pl.reduce((a, t) => a + (t.pnl || 0), 0), iP = im.reduce((a, t) => a + (t.pnl || 0), 0);

  if (res.length < 3) return (
    <div style={{ textAlign:"center", padding:"70px 16px" }}>
      <h2 style={{ fontSize:"1.15rem", fontWeight:700, marginBottom:8, color:T.t0 }}>Insights</h2>
      <p style={{ color:T.t3, fontSize:"0.85rem" }}>Registre pelo menos 3 trades resolvidas.</p>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, animation:"fadeIn 0.4s ease" }}>
      <h2 style={{ fontSize:"1.15rem", fontWeight:700, color:T.t0 }}>Insights</h2>
      {pl.length > 0 && im.length > 0 && (
        <div style={{ ...cardStyle, padding:"16px 18px", borderLeft:`3px solid ${iP < 0 ? T.red : T.mint}` }}>
          <p style={{ fontSize:"0.82rem", color:T.t1, lineHeight:1.6, margin:0 }}>
            {iP < 0 ? `Impulsivas acumulam -$${Math.abs(iP).toFixed(2)}. Planejadas: ${pP >= 0 ? "+" : ""}$${pP.toFixed(2)}.` : `Planejadas: ${pP >= 0 ? "+" : ""}$${pP.toFixed(2)} | Impulsivas: ${iP >= 0 ? "+" : ""}$${iP.toFixed(2)}.`}
          </p>
        </div>
      )}
      <div style={{ ...cardStyle, padding:"18px 12px" }}>
        <div style={{ fontSize:"0.65rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:14, paddingLeft:4 }}>Confiança vs Win Rate</div>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={confD}>
            <CartesianGrid stroke={T.b0} strokeDasharray="3 3" />
            <XAxis dataKey="conf" tick={{ fill:T.t3, fontSize:9, fontFamily:fm }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:T.t3, fontSize:9, fontFamily:fm }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} width={35} />
            <Tooltip contentStyle={{ background:T.cardSolid, border:`1px solid ${T.b1}`, borderRadius:10, fontSize:"0.74rem", fontFamily:fm }} formatter={(v) => [`${v.toFixed(1)}%`, "Win Rate"]} />
            <Bar dataKey="wr" radius={[5, 5, 0, 0]}>{confD.map((_, i) => <Cell key={i} fill={T.mint} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ ...cardStyle, padding:"18px 12px" }}>
        <div style={{ fontSize:"0.65rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:14, paddingLeft:4 }}>PnL por Dia da Semana</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={dayD}>
            <CartesianGrid stroke={T.b0} strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fill:T.t3, fontSize:9, fontFamily:fm }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:T.t3, fontSize:9, fontFamily:fm }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={40} />
            <Tooltip contentStyle={{ background:T.cardSolid, border:`1px solid ${T.b1}`, borderRadius:10, fontSize:"0.74rem", fontFamily:fm }} formatter={v => [`$${v}`, "PnL"]} />
            <Bar dataKey="pnl" radius={[5, 5, 0, 0]}>{dayD.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? T.mint : T.red} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ════════════ SETTINGS ════════════ */
function Settings({ config, setConfig }) {
  return (
    <div style={{ animation:"fadeIn 0.4s ease" }}>
      <h2 style={{ fontSize:"1.15rem", fontWeight:700, marginBottom:22, color:T.t0 }}>Configurações</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
        <div><label style={labelBase}>Banca Total (USD)</label><input type="number" style={inputBase} value={config.bankroll} onChange={e => setConfig(p => ({ ...p, bankroll:parseFloat(e.target.value) || 0 }))} /><p style={{ fontSize:"0.7rem", color:T.t3, marginTop:5 }}>Total disponível para apostar.</p></div>
        <div><label style={labelBase}>Risco Máximo (%)</label><input type="number" step="0.5" style={inputBase} value={config.maxRiskPct} onChange={e => setConfig(p => ({ ...p, maxRiskPct:parseFloat(e.target.value) || 5 }))} /><p style={{ fontSize:"0.7rem", color:T.t3, marginTop:5 }}>Trades acima desse % serão sinalizadas.</p></div>
        <div style={{ ...cardStyle, padding:"18px", background:`linear-gradient(145deg, rgba(14,19,30,0.8), rgba(52,211,153,0.03))` }}>
          <div style={{ fontSize:"0.62rem", color:T.t3, fontWeight:600, letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:6 }}>Limite por trade</div>
          <div style={{ fontFamily:fm, fontSize:"1.4rem", fontWeight:700, color:T.t0 }}>${((config.bankroll * config.maxRiskPct) / 100).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
