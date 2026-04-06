import { useState, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";

/* ─── Storage (localStorage) ─── */
const SK_T = "pj3-trades", SK_C = "pj3-config";
function sg(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } }
function ss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { console.error(e) } }

const CATS = ["CS2","Valorant","Futebol","NBA","NFL","UFC/MMA","Tênis","MLB","NHL","Política","Crypto","Outro"];
const PC = ["#10b981","#3b82f6","#ec4899","#f59e0b","#8b5cf6","#f97316","#14b8a6","#d946ef","#0ea5e9","#84cc16","#ef4444","#6366f1"];

/* ─── Design Tokens Atualizados (Premium Dark Mode) ─── */
const T = {
  bg0: "#09090b", bg1: "#121214", bg2: "#1c1c1f",
  card: "rgba(18, 18, 20, 0.7)", cardHover: "rgba(28, 28, 31, 0.9)",
  glass: "rgba(255, 255, 255, 0.04)",
  b0: "rgba(255, 255, 255, 0.06)", b1: "rgba(255, 255, 255, 0.12)",
  t0: "#ffffff", t1: "#e4e4e7", t2: "#a1a1aa", t3: "#71717a",
  mint: "#10b981", mintDim: "rgba(16, 185, 129, 0.15)", mintGlow: "rgba(16, 185, 129, 0.3)",
  red: "#ef4444", redDim: "rgba(239, 68, 68, 0.15)",
  amber: "#f59e0b", amberDim: "rgba(245, 158, 11, 0.15)",
  blue: "#3b82f6", blueDim: "rgba(59, 130, 246, 0.15)",
};

const ff = "'Outfit', -apple-system, sans-serif";
const fm = "'JetBrains Mono', 'SF Mono', monospace";
const cardStyle = { background: T.card, backdropFilter: "blur(16px)", border: `1px solid ${T.b0}`, borderRadius: 16 };
const inputBase = { width: "100%", padding: "14px 16px", borderRadius: 12, background: T.bg2, border: `1px solid ${T.b1}`, color: T.t0, fontSize: "0.95rem", fontFamily: ff, outline: "none", boxSizing: "border-box", transition: "all 0.2s ease" };
const labelBase = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: T.t2, marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" };

/* ─── Export/Import helpers ─── */
function exportTrades(trades, config) {
  const data = JSON.stringify({ trades, config, exportedAt: new Date().toISOString(), version: 3 }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `polyjournal-backup-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function importTrades(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.trades || !Array.isArray(data.trades)) reject("Arquivo de backup inválido");
        else resolve(data);
      } catch { reject("Erro ao ler o conteúdo do arquivo") }
    };
    reader.onerror = () => reject("Erro na leitura do arquivo");
    reader.readAsText(file);
  });
}

/* ════════════ MAIN APP ════════════ */
export default function App() {
  const [trades, setTrades] = useState([]);
  const [config, setConfig] = useState({ bankroll: 1000, maxRiskPct: 5 });
  const [view, setView] = useState("dashboard");
  const [ready, setReady] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);

  useEffect(() => {
    const t = sg(SK_T); const c = sg(SK_C);
    if (t) setTrades(t); if (c) setConfig(c);
    setReady(true);
  }, []);

  useEffect(() => { if (ready) ss(SK_T, trades) }, [trades, ready]);
  useEffect(() => { if (ready) ss(SK_C, config) }, [config, ready]);

  const addTrade = useCallback(t => { setTrades(p => [{ ...t, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...p]); setView("history") }, []);
  const updateTrade = useCallback((id, u) => setTrades(p => p.map(t => t.id === id ? { ...t, ...u } : t)), []);
  const deleteTrade = useCallback(id => setTrades(p => p.filter(t => t.id !== id)), []);

  const handleExport = () => exportTrades(trades, config);
  const handleImport = async (file) => {
    try {
      const data = await importTrades(file);
      setTrades(data.trades);
      if (data.config) setConfig(data.config);
      alert(`Importação concluída. ${data.trades.length} operações restauradas com sucesso.`);
    } catch (err) { alert("Erro na importação: " + err) }
  };

  const saveEdit = useCallback(t => {
    const stake = parseFloat(t.stake) || 0, odds = parseFloat(t.odds) || 0;
    let pnl = 0;
    if (t.result === "win" && odds > 0) pnl = (stake / odds) - stake;
    if (t.result === "loss") pnl = -stake;
    updateTrade(t.id, { ...t, stake, odds, pnl });
    setEditingTrade(null); setView("history");
  }, [updateTrade]);

  if (!ready) return (
    <div style={{ minHeight: "100dvh", background: T.bg0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>
      <div style={{ color: T.mint, fontSize: "1.2rem", fontWeight: 600, letterSpacing: "1px" }}>Iniciando PolyJournal...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh", background: T.bg0, color: T.t1, fontFamily: ff, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::selection { background: ${T.mintDim}; color: ${T.mint}; }
        *::-webkit-scrollbar { width: 6px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: ${T.b1}; border-radius: 4px; }
        input:focus, select:focus, textarea:focus { border-color: ${T.mint} !important; background: ${T.bg2} !important; box-shadow: 0 0 0 3px ${T.mintDim}; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        body { overscroll-behavior: none; margin: 0; background: ${T.bg0}; }
        .btn-hover { transition: all 0.2s ease; cursor: pointer; }
        .btn-hover:active { transform: scale(0.97); }
        .btn-hover:hover { filter: brightness(1.15); }
      `}</style>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 100px" }}>
        <TopHeader trades={trades} />
        
        <div style={{ animation: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {view === "dashboard" && <Dashboard trades={trades} config={config} setView={setView} />}
          {view === "new" && <TradeForm onSubmit={addTrade} onCancel={() => setView("dashboard")} config={config} trades={trades} />}
          {view === "edit" && editingTrade && <TradeForm initialData={editingTrade} onSubmit={saveEdit} onCancel={() => { setEditingTrade(null); setView("history") }} config={config} trades={trades} isEdit />}
          {view === "history" && <History trades={trades} onUpdate={updateTrade} onDelete={deleteTrade} onEdit={t => { setEditingTrade(t); setView("edit"); }} />}
          {view === "insights" && <Insights trades={trades} />}
          {view === "settings" && <Settings config={config} setConfig={setConfig} onExport={handleExport} onImport={handleImport} />}
        </div>
      </div>

      <BottomNav view={view} setView={setView} />
    </div>
  );
}

/* ════════════ TOP HEADER ════════════ */
function TopHeader({ trades }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, paddingBottom: 16, borderBottom: `1px solid ${T.b0}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${T.mint}, ${T.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 800, color: T.bg0, boxShadow: `0 4px 12px ${T.mintDim}` }}>P</div>
        <span style={{ fontWeight: 800, fontSize: "1.4rem", color: T.t0, letterSpacing: "-0.5px" }}>PolyJournal</span>
      </div>
      {trades.length > 0 && <span style={{ fontFamily: fm, fontSize: "0.75rem", color: T.mint, background: T.mintDim, border: `1px solid ${T.mint}44`, padding: "6px 12px", borderRadius: 20, fontWeight: 600 }}>{trades.length} registros</span>}
    </div>
  );
}

/* ════════════ BOTTOM NAV ════════════ */
function BottomNav({ view, setView }) {
  const tabs = [
    { id: "dashboard", icon: "📊", label: "Visão" },
    { id: "new", icon: "➕", label: "Registrar" },
    { id: "history", icon: "📋", label: "Histórico" },
    { id: "insights", icon: "🔬", label: "Análise" },
    { id: "settings", icon: "⚙️", label: "Ajustes" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "rgba(9, 9, 11, 0.9)", backdropFilter: "blur(20px)", borderTop: `1px solid ${T.b1}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", justifyContent: "space-between", padding: "12px 16px" }}>
        {tabs.map(t => (
          <button key={t.id} className="btn-hover" onClick={() => setView(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, border: "none", background: "transparent", padding: "8px 12px", fontFamily: ff, width: "20%" }}>
            <span style={{ fontSize: "1.3rem", filter: view === t.id ? "drop-shadow(0 0 8px rgba(255,255,255,0.2))" : "grayscale(1) opacity(0.4)", transition: "all 0.3s" }}>{t.icon}</span>
            <span style={{ fontSize: "0.65rem", fontWeight: view === t.id ? 700 : 500, color: view === t.id ? T.t0 : T.t3, transition: "all 0.3s" }}>{t.label}</span>
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
    res.forEach(t => { 
      if (!byCat[t.category]) byCat[t.category] = { w:0, l:0, pnl:0, stk:0, n:0 }; 
      byCat[t.category].n++; byCat[t.category].pnl += t.pnl || 0; byCat[t.category].stk += t.stake || 0; 
      if (t.result === "win") byCat[t.category].w++; else byCat[t.category].l++;
    });
    
    const byDate = {}; let cum = 0;
    [...res].sort((a, b) => (a.date || "").localeCompare(b.date || "")).forEach(t => { cum += t.pnl || 0; byDate[t.date] = cum });
    const tl = Object.entries(byDate).map(([d, p]) => ({ date: d.slice(5).replace('-','/'), pnl: Math.round(p * 100) / 100 }));
    
    const cb = config.bankroll + pnl;
    return { 
      res: res.length, pend: trades.filter(t => t.result === "pending").length, 
      wins: w.length, losses: l.length, wr: res.length > 0 ? (w.length / res.length * 100) : 0, 
      pnl, roi, avgStk: res.length > 0 ? stk / res.length : 0, streak, sT, byCat, tl, cb, 
      bkPct: config.bankroll > 0 ? ((cb - config.bankroll) / config.bankroll * 100) : 0 
    };
  }, [trades, config]);

  if (!trades.length) return (
    <div style={{ textAlign: "center", padding: "80px 16px" }}>
      <div style={{ width: 90, height: 90, borderRadius: 28, background: `linear-gradient(135deg, ${T.mint}, ${T.blue})`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", fontWeight: 800, color: T.bg0, marginBottom: 24, boxShadow: `0 16px 40px ${T.mintDim}` }}>P</div>
      <h2 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12, color: T.t0 }}>Bem-vindo ao PolyJournal</h2>
      <p style={{ color: T.t2, fontSize: "1rem", marginBottom: 40, lineHeight: 1.6 }}>O seu painel profissional de gestão de banca.<br />Comece mapeando sua primeira entrada.</p>
      <button className="btn-hover" onClick={() => setView("new")} style={{ padding: "18px 40px", border: "none", borderRadius: 16, background: `linear-gradient(135deg, ${T.mint}, #059669)`, color: T.bg0, fontSize: "1.05rem", fontWeight: 700, fontFamily: ff, boxShadow: `0 8px 24px ${T.mintDim}` }}>Nova Operação</button>
    </div>
  );

  const catData = Object.entries(s.byCat).map(([name, d]) => ({ name, ...d, roi: d.stk > 0 ? (d.pnl / d.stk * 100) : 0, wr: d.n > 0 ? (d.w / d.n * 100) : 0 })).sort((a, b) => b.pnl - a.pnl);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero Card */}
      <div style={{ ...cardStyle, padding: "32px 28px", background: `linear-gradient(145deg, #18181b, #09090b)`, position: "relative", overflow: "hidden", border: `1px solid ${T.b1}` }}>
        <div style={{ position: "absolute", top: -100, right: -50, width: 250, height: 250, borderRadius: "50%", background: `radial-gradient(circle, ${T.mintGlow}, transparent 70%)`, pointerEvents: "none" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative" }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: T.t3, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>Capital Atual</div>
            <div style={{ fontFamily: fm, fontSize: "2.8rem", fontWeight: 700, color: T.t0, letterSpacing: "-2px", lineHeight: 1 }}>${s.cb.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: "right", background: T.bg1, padding: "8px 16px", borderRadius: 12, border: `1px solid ${T.b0}` }}>
            <div style={{ fontFamily: fm, fontSize: "1.2rem", fontWeight: 700, color: s.bkPct >= 0 ? T.mint : T.red }}>{s.bkPct >= 0 ? "+" : ""}{s.bkPct.toFixed(2)}%</div>
            <div style={{ fontSize: "0.7rem", color: T.t3, marginTop: 4, fontWeight: 500 }}>Evolução</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <Kpi l="Resultado Líquido" v={`${s.pnl >= 0 ? "+" : ""}$${s.pnl.toFixed(2)}`} c={s.pnl >= 0 ? T.mint : T.red} />
        <Kpi l="Retorno (ROI)" v={`${s.roi >= 0 ? "+" : ""}${s.roi.toFixed(1)}%`} c={s.roi >= 0 ? T.mint : T.red} />
        <Kpi l="Taxa de Acerto" v={`${s.wr.toFixed(1)}%`} sub={`${s.wins}W - ${s.losses}L`} c={s.wr >= 50 ? T.mint : T.red} />
        <Kpi l="Momentum" v={`${s.streak} ${s.sT === "win" ? "Wins" : s.sT === "loss" ? "Losses" : "-"}`} c={s.sT === "win" ? T.mint : s.sT === "loss" ? T.red : T.t3} />
      </div>

      {s.tl.length > 1 && (
        <div style={{ ...cardStyle, padding: "24px 20px" }}>
          <div style={{ fontSize: "0.8rem", color: T.t3, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 20 }}>Curva de Capital</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={s.tl} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs><linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.mint} stopOpacity={0.3} /><stop offset="95%" stopColor={T.mint} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke={T.b0} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: T.t3, fontSize: 11, fontFamily: fm }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: T.t3, fontSize: 11, fontFamily: fm }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip contentStyle={{ background: T.bg1, border: `1px solid ${T.b1}`, borderRadius: 12, color: T.t0, fontFamily: fm }} itemStyle={{ color: T.mint }} formatter={v => [`$${v}`, "PnL Acumulado"]} />
              <Area type="monotone" dataKey="pnl" stroke={T.mint} fill="url(#colorPnl)" strokeWidth={3} activeDot={{ r: 6, fill: T.mint, stroke: T.bg0, strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {catData.length > 0 && (
        <div style={{ ...cardStyle, padding: "24px 20px", overflowX: "auto" }}>
          <div style={{ fontSize: "0.8rem", color: T.t3, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 20 }}>Performance por Setor</div>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
            <thead>
              <tr>
                {["Mercado", "Vol", "WR%", "Lucro"].map((h, i) => <th key={h} style={{ textAlign: i===0?"left":"right", padding: "0 8px 12px", color: T.t3, fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase", borderBottom: `1px solid ${T.b1}` }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {catData.map((c, i) => (
                <tr key={c.name} style={{ borderBottom: `1px solid ${T.b0}` }}>
                  <td style={{ padding: "16px 8px", fontWeight: 600, fontSize: "0.9rem", color: T.t0, display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: PC[i % PC.length] }} />{c.name}</td>
                  <td style={{ padding: "16px 8px", textAlign: "right", fontFamily: fm, color: T.t2, fontSize: "0.85rem" }}>{c.n}</td>
                  <td style={{ padding: "16px 8px", textAlign: "right", fontFamily: fm, color: c.wr >= 50 ? T.mint : T.red, fontSize: "0.85rem" }}>{c.wr.toFixed(0)}%</td>
                  <td style={{ padding: "16px 8px", textAlign: "right", fontFamily: fm, fontWeight: 600, color: c.pnl >= 0 ? T.mint : T.red, fontSize: "0.9rem" }}>{c.pnl >= 0 ? "+" : ""}${c.pnl.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ l, v, sub, c }) {
  return (
    <div style={{ ...cardStyle, padding: "20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: "0.7rem", color: T.t3, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>{l}</div>
      <div style={{ fontFamily: fm, fontSize: "1.3rem", fontWeight: 700, color: c || T.t0, letterSpacing: "-0.5px" }}>{v}</div>
      {sub && <div style={{ fontSize: "0.7rem", color: T.t2, marginTop: 6, fontFamily: fm }}>{sub}</div>}
    </div>
  );
}

/* ════════════ TRADE FORM (New & Edit) ════════════ */
function TradeForm({ initialData, onSubmit, onCancel, config, trades, isEdit }) {
  const defaultState = { market: "", category: "CS2", side: "YES", stake: "", odds: "", result: "pending", notes: "", date: new Date().toISOString().split("T")[0], confidence: 3 };
  const [f, setF] = useState(initialData || defaultState);
  
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const stake = parseFloat(f.stake) || 0, odds = parseFloat(f.odds) || 0;
  const pay = useMemo(() => { if (!stake || !odds || odds <= 0 || odds >= 1) return { w: 0, l: 0 }; return { w: (stake / odds) - stake, l: -stake } }, [stake, odds]);
  const ok = f.market.trim() && stake > 0 && odds > 0 && odds < 1;

  const submit = () => { if (!ok) return; let pnl = 0; if (f.result === "win") pnl = pay.w; if (f.result === "loss") pnl = pay.l; onSubmit({ ...f, stake, odds, pnl }); };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", display: "flex", flexDirection: "column", gap: 24 }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: T.t0, margin: 0 }}>{isEdit ? "Editar Operação" : "Nova Operação"}</h2>

      <div style={cardStyle}>
        <div style={{ padding: "20px", borderBottom: `1px solid ${T.b0}` }}>
          <label style={labelBase}>Evento / Mercado</label>
          <input style={inputBase} placeholder="Ex: NAVI vs FaZe - Vencedor" value={f.market} onChange={e => set("market", e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "20px", borderBottom: `1px solid ${T.b0}` }}>
          <div><label style={labelBase}>Setor</label><select style={{ ...inputBase, cursor: "pointer" }} value={f.category} onChange={e => set("category", e.target.value)}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label style={labelBase}>Data</label><input type="date" style={inputBase} value={f.date} onChange={e => set("date", e.target.value)} /></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: "20px", borderBottom: `1px solid ${T.b0}` }}>
          <div><label style={labelBase}>Stake (Volume USD)</label><input type="number" style={inputBase} placeholder="0.00" value={f.stake} onChange={e => set("stake", e.target.value)} /></div>
          <div><label style={labelBase}>Cotação / Odd</label><input type="number" step="0.01" style={inputBase} placeholder="0.00" value={f.odds} onChange={e => set("odds", e.target.value)} /></div>
        </div>

        {stake > 0 && odds > 0 && odds < 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "16px 20px", background: T.bg1 }}>
            <div style={{ textAlign: "center", borderRight: `1px solid ${T.b0}` }}><div style={{ fontSize: "0.7rem", color: T.t3, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Projeção de Lucro</div><div style={{ fontFamily: fm, fontWeight: 700, color: T.mint, fontSize: "1.2rem" }}>+${pay.w.toFixed(2)}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "0.7rem", color: T.t3, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>Risco Associado</div><div style={{ fontFamily: fm, fontWeight: 700, color: T.red, fontSize: "1.2rem" }}>-${Math.abs(pay.l).toFixed(2)}</div></div>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, padding: "20px" }}>
        <label style={labelBase}>Status da Posição</label>
        <div style={{ display: "flex", gap: 12 }}>
          {[{ id: "pending", l: "Aberta", c: T.amber }, { id: "win", l: "Green (Win)", c: T.mint }, { id: "loss", l: "Red (Loss)", c: T.red }].map(r => (
            <button key={r.id} className="btn-hover" onClick={() => set("result", r.id)} style={{ flex: 1, padding: "16px 12px", borderRadius: 12, fontFamily: ff, fontWeight: 600, fontSize: "0.9rem", border: `1px solid ${f.result === r.id ? r.c : T.b0}`, background: f.result === r.id ? r.c + "15" : T.bg2, color: f.result === r.id ? r.c : T.t2 }}>{r.l}</button>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, padding: "20px" }}>
        <label style={labelBase}>Tese de Investimento (Notas)</label>
        <textarea style={{ ...inputBase, minHeight: 100, resize: "vertical" }} placeholder="Detalhe o racional por trás desta operação..." value={f.notes} onChange={e => set("notes", e.target.value)} />
      </div>

      <div style={{ display: "flex", gap: 16 }}>
        <button className="btn-hover" onClick={onCancel} style={{ flex: 1, padding: "18px", border: `1px solid ${T.b1}`, borderRadius: 16, background: T.bg1, color: T.t1, fontSize: "1rem", fontWeight: 600, fontFamily: ff }}>Cancelar</button>
        <button className="btn-hover" onClick={submit} disabled={!ok} style={{ flex: 2, padding: "18px", border: "none", borderRadius: 16, background: ok ? `linear-gradient(135deg, ${T.mint}, #059669)` : T.b0, color: ok ? T.bg0 : T.t3, fontSize: "1rem", fontWeight: 700, fontFamily: ff, opacity: ok ? 1 : 0.5 }}>{isEdit ? "Salvar Alterações" : "Confirmar Operação"}</button>
      </div>
    </div>
  );
}

/* ════════════ HISTORY ════════════ */
function History({ trades, onUpdate, onDelete, onEdit }) {
  const [filter, setFilter] = useState("all");
  
  const filteredTrades = trades.filter(t => filter === "all" || t.result === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: T.t0, margin: 0 }}>Diário de Bordo</h2>
        <div style={{ display: "flex", background: T.bg2, borderRadius: 12, padding: 4, border: `1px solid ${T.b0}` }}>
          {[{ id: "all", l: "Todos" }, { id: "pending", l: "Abertos" }, { id: "win", l: "Wins" }].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: filter === f.id ? T.b1 : "transparent", color: filter === f.id ? T.t0 : T.t3, fontSize: "0.8rem", fontWeight: 600, fontFamily: ff, cursor: "pointer", transition: "all 0.2s" }}>{f.l}</button>
          ))}
        </div>
      </div>

      {!filteredTrades.length ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: T.t3, background: T.card, borderRadius: 16, border: `1px dashed ${T.b1}` }}>Nenhum registro encontrado para este filtro.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filteredTrades.map(t => {
            const isWin = t.result === "win";
            const isLoss = t.result === "loss";
            const isPending = t.result === "pending";
            const statusColor = isWin ? T.mint : isLoss ? T.red : T.amber;

            return (
              <div key={t.id} style={{ ...cardStyle, padding: "20px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: statusColor }} />
                
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "0.75rem", background: T.b1, padding: "4px 8px", borderRadius: 6, fontWeight: 600, color: T.t1 }}>{t.category}</span>
                    <span style={{ fontSize: "0.75rem", color: T.t3, fontFamily: fm }}>{t.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-hover" onClick={() => onEdit(t)} style={{ background: "transparent", border: "none", color: T.t2, fontSize: "1rem" }}>✏️</button>
                    <button className="btn-hover" onClick={() => { if(window.confirm("Deseja deletar esta entrada?")) onDelete(t.id) }} style={{ background: "transparent", border: "none", color: T.redDim, fontSize: "1rem" }}>🗑️</button>
                  </div>
                </div>

                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: T.t0, marginBottom: 16 }}>{t.market}</div>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, background: T.bg1, padding: "12px", borderRadius: 12, border: `1px solid ${T.b0}` }}>
                  <div><div style={{ fontSize: "0.65rem", color: T.t3, textTransform: "uppercase" }}>Volume</div><div style={{ fontFamily: fm, fontWeight: 600, color: T.t1, fontSize: "0.95rem" }}>${parseFloat(t.stake).toFixed(2)}</div></div>
                  <div><div style={{ fontSize: "0.65rem", color: T.t3, textTransform: "uppercase" }}>Cotação</div><div style={{ fontFamily: fm, fontWeight: 600, color: T.t1, fontSize: "0.95rem" }}>{parseFloat(t.odds).toFixed(2)}</div></div>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: "0.65rem", color: T.t3, textTransform: "uppercase" }}>PnL Liquido</div><div style={{ fontFamily: fm, fontWeight: 700, color: statusColor, fontSize: "1rem" }}>{!isPending ? (t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`) : "--"}</div></div>
                </div>

                {isPending && (
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <button className="btn-hover" onClick={() => { const sk = parseFloat(t.stake), od = parseFloat(t.odds); onUpdate(t.id, { result: "win", pnl: (sk/od)-sk }) }} style={{ flex: 1, padding: "10px", borderRadius: 8, background: T.mintDim, border: `1px solid ${T.mint}55`, color: T.mint, fontWeight: 600, fontFamily: ff }}>Marcar Green</button>
                    <button className="btn-hover" onClick={() => { onUpdate(t.id, { result: "loss", pnl: -parseFloat(t.stake) }) }} style={{ flex: 1, padding: "10px", borderRadius: 8, background: T.redDim, border: `1px solid ${T.red}55`, color: T.red, fontWeight: 600, fontFamily: ff }}>Marcar Red</button>
                  </div>
                )}
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
  const settled = trades.filter(t => t.result !== "pending");
  const winCount = settled.filter(t => t.result === "win").length;
  const lossCount = settled.filter(t => t.result === "loss").length;
  const pieData = [{ name: "Win", value: winCount, color: T.mint }, { name: "Loss", value: lossCount, color: T.red }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: T.t0, margin: 0 }}>Análise de Risco</h2>
      {settled.length === 0 ? (
        <div style={{ ...cardStyle, padding: "40px", textAlign: "center", color: T.t3 }}>Dados insuficientes para gerar métricas.</div>
      ) : (
        <div style={{ ...cardStyle, padding: "24px" }}>
          <div style={{ fontSize: "0.8rem", color: T.t3, fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 20 }}>Distribuição de Resultados</div>
          <div style={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: T.bg1, border: `1px solid ${T.b1}`, borderRadius: 8, color: T.t0 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
            <div style={{ textAlign: "center" }}><div style={{ color: T.mint, fontWeight: 700, fontSize: "1.2rem" }}>{winCount}</div><div style={{ fontSize: "0.75rem", color: T.t3, textTransform: "uppercase" }}>Greens</div></div>
            <div style={{ textAlign: "center" }}><div style={{ color: T.red, fontWeight: 700, fontSize: "1.2rem" }}>{lossCount}</div><div style={{ fontSize: "0.75rem", color: T.t3, textTransform: "uppercase" }}>Reds</div></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════ SETTINGS ════════════ */
function Settings({ config, setConfig, onExport, onImport }) {
  const handleFileChange = (e) => { if(e.target.files.length) onImport(e.target.files[0]) };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: T.t0, margin: 0 }}>Configurações Globais</h2>
      
      <div style={{ ...cardStyle, padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={labelBase}>Banca Inicial (USD)</label>
          <input type="number" style={inputBase} value={config.bankroll} onChange={e => setConfig({ ...config, bankroll: parseFloat(e.target.value) || 0 })} />
          <div style={{ fontSize: "0.75rem", color: T.t3, marginTop: 8 }}>Este valor é usado como base para calcular o crescimento do seu patrimônio.</div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: "24px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: T.t0, margin: "0 0 16px 0" }}>Backup e Dados</h3>
        <p style={{ fontSize: "0.85rem", color: T.t2, marginBottom: 20, lineHeight: 1.5 }}>Faça o download do seu histórico para garantir que nenhum dado seja perdido caso você limpe o cache do navegador.</p>
        
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-hover" onClick={onExport} style={{ flex: 1, padding: "14px", borderRadius: 12, background: T.bg2, border: `1px solid ${T.b1}`, color: T.t0, fontWeight: 600, fontFamily: ff }}>Exportar Backup</button>
          <label className="btn-hover" style={{ flex: 1, padding: "14px", borderRadius: 12, background: T.mintDim, border: `1px solid ${T.mint}55`, color: T.mint, fontWeight: 600, fontFamily: ff, textAlign: "center", cursor: "pointer" }}>
            Importar Dados
            <input type="file" accept=".json" onChange={handleFileChange} style={{ display: "none" }} />
          </label>
        </div>
      </div>
    </div>
  );
}
