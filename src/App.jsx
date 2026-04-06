import { useState, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ─── Storage (localStorage) ─── */
const SK_T = "pj3-trades", SK_C = "pj3-config";
function sg(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } }
function ss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { console.error(e) } }

const CATS = ["CS2","Valorant","Futebol","NBA","NFL","UFC/MMA","Tênis","MLB","NHL","Política","Crypto","Outro"];

/* ─── Design Tokens (ARQ / Fintech Premium Aesthetic) ─── */
const T = {
  bg0: "#000000", // Preto absoluto
  bg1: "#121212", // Cartões escuros
  bg2: "#1C1C1E", // Inputs e Hover
  card: "#121212",
  b0: "#222222", // Bordas muito sutis
  b1: "#2C2C2E",
  t0: "#FFFFFF", // Texto principal
  t1: "#E5E5EA", // Texto secundário claro
  t2: "#8E8E93", // Texto descritivo (cinza clássico fintech)
  t3: "#636366",
  mint: "#32D74B", // Verde financeiro vibrante
  mintDim: "rgba(50, 215, 75, 0.15)",
  red: "#FF453A", // Vermelho financeiro
  redDim: "rgba(255, 69, 58, 0.15)",
  amber: "#FF9F0A",
  blue: "#0A84FF",
};

const ff = "'Outfit', -apple-system, system-ui, sans-serif";
const cardStyle = { background: T.card, borderRadius: 24, border: `1px solid ${T.b0}` };
const inputBase = { width: "100%", padding: "16px", borderRadius: 16, background: T.bg2, border: "none", color: T.t0, fontSize: "1rem", fontFamily: ff, outline: "none", boxSizing: "border-box", transition: "background 0.2s" };
const labelBase = { display: "block", fontSize: "0.8rem", fontWeight: 500, color: T.t2, marginBottom: 8 };

/* ─── Export/Import helpers ─── */
function exportTrades(trades, config) {
  const data = JSON.stringify({ trades, config, exportedAt: new Date().toISOString(), version: 3 }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `polyjournal-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function importTrades(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.trades || !Array.isArray(data.trades)) reject("Arquivo inválido");
        else resolve(data);
      } catch { reject("Erro ao ler arquivo") }
    };
    reader.onerror = () => reject("Erro na leitura");
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
      alert(`Dados restaurados.`);
    } catch (err) { alert("Erro: " + err) }
  };

  const saveEdit = useCallback(t => {
    const stake = parseFloat(t.stake) || 0, odds = parseFloat(t.odds) || 0;
    let pnl = 0;
    if (t.result === "win" && odds > 0) pnl = (stake / odds) - stake;
    if (t.result === "loss") pnl = -stake;
    updateTrade(t.id, { ...t, stake, odds, pnl });
    setEditingTrade(null); setView("history");
  }, [updateTrade]);

  if (!ready) return <div style={{ minHeight: "100dvh", background: T.bg0 }} />;

  return (
    <div style={{ minHeight: "100dvh", background: T.bg0, color: T.t1, fontFamily: ff, paddingBottom: "env(safe-area-inset-bottom)", WebkitFontSmoothing: "antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { overscroll-behavior: none; margin: 0; background: ${T.bg0}; }
        input:focus, select:focus, textarea:focus { background: #242426 !important; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .btn-hover { transition: transform 0.15s ease, opacity 0.15s ease; cursor: pointer; }
        .btn-hover:active { transform: scale(0.96); }
        .btn-hover:hover { opacity: 0.85; }
        /* Oculta scrollbar para visual mais limpo */
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 16px 100px" }}>
        <div style={{ animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {view === "dashboard" && <Dashboard trades={trades} config={config} setView={setView} />}
          {view === "new" && <TradeForm onSubmit={addTrade} onCancel={() => setView("dashboard")} trades={trades} />}
          {view === "edit" && editingTrade && <TradeForm initialData={editingTrade} onSubmit={saveEdit} onCancel={() => { setEditingTrade(null); setView("history") }} isEdit />}
          {view === "history" && <History trades={trades} onUpdate={updateTrade} onDelete={deleteTrade} onEdit={t => { setEditingTrade(t); setView("edit"); }} />}
          {view === "settings" && <Settings config={config} setConfig={setConfig} onExport={handleExport} onImport={handleImport} trades={trades} />}
        </div>
      </div>

      <BottomNav view={view} setView={setView} />
    </div>
  );
}

/* ════════════ BOTTOM NAV (Pill Style) ════════════ */
function BottomNav({ view, setView }) {
  const tabs = [
    { id: "dashboard", icon: "Início" },
    { id: "history", icon: "Atividade" },
    { id: "new", icon: "+ Nova" },
    { id: "settings", icon: "Ajustes" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 24, left: 0, right: 0, zIndex: 100, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ background: "rgba(28, 28, 30, 0.85)", backdropFilter: "blur(20px)", borderRadius: 100, padding: "8px", display: "flex", gap: 4, border: `1px solid ${T.b1}`, pointerEvents: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
        {tabs.map(t => (
          <button key={t.id} className="btn-hover" onClick={() => setView(t.id)} style={{ border: "none", background: view === t.id ? T.t0 : "transparent", color: view === t.id ? T.bg0 : T.t2, padding: "10px 16px", borderRadius: 100, fontSize: "0.85rem", fontWeight: 600, fontFamily: ff, transition: "all 0.2s" }}>
            {t.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════ DASHBOARD (Fintech Vibe) ════════════ */
function Dashboard({ trades, config, setView }) {
  const s = useMemo(() => {
    const res = trades.filter(t => t.result !== "pending");
    const pnl = res.reduce((a, t) => a + (t.pnl || 0), 0);
    const cb = config.bankroll + pnl;
    
    const byDate = {}; let cum = config.bankroll;
    [...res].sort((a, b) => (a.date || "").localeCompare(b.date || "")).forEach(t => { cum += t.pnl || 0; byDate[t.date] = cum });
    const tl = Object.entries(byDate).map(([d, p]) => ({ date: d, pnl: Math.round(p * 100) / 100 }));
    if(tl.length > 0 && tl[0].date !== "Início") tl.unshift({ date: "Início", pnl: config.bankroll });

    return { pnl, cb, tl, bkPct: config.bankroll > 0 ? ((cb - config.bankroll) / config.bankroll * 100) : 0 };
  }, [trades, config]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 20 }}>
      {/* Saldo Centralizado */}
      <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
        <div style={{ fontSize: "0.9rem", color: T.t2, fontWeight: 500, marginBottom: 8 }}>Capital Total</div>
        <div style={{ fontSize: "3.8rem", fontWeight: 600, color: T.t0, letterSpacing: "-1.5px", lineHeight: 1 }}>${s.cb.toFixed(2)}</div>
        
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: s.bkPct >= 0 ? T.mintDim : T.redDim, padding: "6px 14px", borderRadius: 100, marginTop: 16 }}>
          <span style={{ color: s.bkPct >= 0 ? T.mint : T.red, fontWeight: 600, fontSize: "0.85rem" }}>{s.bkPct >= 0 ? "+" : ""}{s.bkPct.toFixed(2)}% ({s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(2)})</span>
        </div>
      </div>

      {/* Gráfico Minimalista */}
      {s.tl.length > 1 && (
        <div style={{ height: 180, margin: "0 -16px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={s.tl}>
              <defs><linearGradient id="colorG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.bkPct >= 0 ? T.mint : T.red} stopOpacity={0.2} /><stop offset="100%" stopColor={s.bkPct >= 0 ? T.mint : T.red} stopOpacity={0} /></linearGradient></defs>
              <Tooltip contentStyle={{ background: T.bg1, border: "none", borderRadius: 12, color: T.t0, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }} itemStyle={{ color: T.t0 }} formatter={v => [`$${v}`, "Saldo"]} labelStyle={{ display: "none" }} />
              <Area type="monotone" dataKey="pnl" stroke={s.bkPct >= 0 ? T.mint : T.red} fill="url(#colorG)" strokeWidth={3} activeDot={{ r: 6, fill: T.bg0, stroke: s.bkPct >= 0 ? T.mint : T.red, strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ações Rápidas */}
      <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
        <button className="btn-hover" onClick={() => setView("new")} style={{ flex: 1, padding: "18px", borderRadius: 20, background: T.t0, color: T.bg0, border: "none", fontSize: "1rem", fontWeight: 600, fontFamily: ff }}>+ Registrar Trade</button>
        <button className="btn-hover" onClick={() => setView("history")} style={{ flex: 1, padding: "18px", borderRadius: 20, background: T.bg2, color: T.t0, border: "none", fontSize: "1rem", fontWeight: 600, fontFamily: ff }}>Ver Extrato</button>
      </div>

      {/* Resumo Rápido */}
      <div style={{ ...cardStyle, padding: "24px", display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, color: T.t0 }}>Resumo de Performance</h3>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${T.b0}` }}>
          <span style={{ color: T.t2 }}>Operações Finalizadas</span>
          <span style={{ fontWeight: 600 }}>{trades.filter(t => t.result !== "pending").length}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${T.b0}` }}>
          <span style={{ color: T.t2 }}>Win Rate</span>
          <span style={{ fontWeight: 600 }}>{trades.filter(t => t.result !== "pending").length > 0 ? (trades.filter(t => t.result === "win").length / trades.filter(t => t.result !== "pending").length * 100).toFixed(0) : 0}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: T.t2 }}>Posições Abertas</span>
          <span style={{ fontWeight: 600 }}>{trades.filter(t => t.result === "pending").length}</span>
        </div>
      </div>
    </div>
  );
}

/* ════════════ TRADE FORM (Clean Inputs) ════════════ */
function TradeForm({ initialData, onSubmit, onCancel, isEdit }) {
  const defaultState = { market: "", category: "CS2", stake: "", odds: "", result: "pending", notes: "", date: new Date().toISOString().split("T")[0] };
  const [f, setF] = useState(initialData || defaultState);
  
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const stake = parseFloat(f.stake) || 0, odds = parseFloat(f.odds) || 0;
  const ok = f.market.trim() && stake > 0 && odds > 0;

  const submit = () => { 
    if (!ok) return; 
    let pnl = 0; 
    if (f.result === "win") pnl = (stake / odds) - stake; 
    if (f.result === "loss") pnl = -stake; 
    onSubmit({ ...f, stake, odds, pnl }); 
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 600, color: T.t0, margin: 0 }}>{isEdit ? "Editar Trade" : "Nova Trade"}</h2>
        <button onClick={onCancel} style={{ background: "transparent", border: "none", color: T.t2, fontSize: "1rem", fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
      </div>

      <div style={{ ...cardStyle, padding: "8px 16px" }}>
        <div style={{ padding: "12px 0", borderBottom: `1px solid ${T.b0}` }}>
          <input style={{ ...inputBase, background: "transparent", padding: "8px 0", fontSize: "1.2rem", fontWeight: 500 }} placeholder="Mercado (ex: NAVI Vencedor)" value={f.market} onChange={e => set("market", e.target.value)} />
        </div>
        <div style={{ display: "flex", padding: "16px 0", borderBottom: `1px solid ${T.b0}` }}>
          <div style={{ flex: 1, borderRight: `1px solid ${T.b0}`, paddingRight: 16 }}>
            <label style={{ ...labelBase, fontSize: "0.75rem", textTransform: "uppercase" }}>Volume (USD)</label>
            <input type="number" style={{ ...inputBase, background: "transparent", padding: 0, fontSize: "1.6rem", fontWeight: 600 }} placeholder="0.00" value={f.stake} onChange={e => set("stake", e.target.value)} />
          </div>
          <div style={{ flex: 1, paddingLeft: 16 }}>
            <label style={{ ...labelBase, fontSize: "0.75rem", textTransform: "uppercase" }}>Odd / Cotação</label>
            <input type="number" step="0.01" style={{ ...inputBase, background: "transparent", padding: 0, fontSize: "1.6rem", fontWeight: 600 }} placeholder="0.00" value={f.odds} onChange={e => set("odds", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, padding: "16px 0" }}>
          <div style={{ flex: 1 }}>
            <select style={{ ...inputBase, padding: "12px", borderRadius: 12 }} value={f.category} onChange={e => set("category", e.target.value)}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div style={{ flex: 1 }}>
            <input type="date" style={{ ...inputBase, padding: "12px", borderRadius: 12 }} value={f.date} onChange={e => set("date", e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <label style={{ ...labelBase, marginLeft: 8 }}>Status do Resultado</label>
        <div style={{ display: "flex", gap: 10, background: T.bg2, padding: 6, borderRadius: 16 }}>
          {[{ id: "pending", l: "Aberto" }, { id: "win", l: "Green" }, { id: "loss", l: "Red" }].map(r => (
            <button key={r.id} onClick={() => set("result", r.id)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: f.result === r.id ? (r.id==="win"?T.mint:r.id==="loss"?T.red:T.t2) : "transparent", color: f.result === r.id ? (r.id==="pending"?T.bg0:T.bg0) : T.t2, fontWeight: 600, fontSize: "0.9rem", transition: "all 0.2s" }}>{r.l}</button>
          ))}
        </div>
      </div>

      <textarea style={{ ...inputBase, minHeight: 100, resize: "vertical", marginTop: 8 }} placeholder="Notas ou tese da operação (opcional)..." value={f.notes} onChange={e => set("notes", e.target.value)} />

      <button className="btn-hover" onClick={submit} disabled={!ok} style={{ padding: "20px", borderRadius: 100, background: ok ? T.t0 : T.b0, color: ok ? T.bg0 : T.t3, border: "none", fontSize: "1.1rem", fontWeight: 600, marginTop: 10, opacity: ok ? 1 : 0.5 }}>{isEdit ? "Salvar" : "Confirmar"}</button>
    </div>
  );
}

/* ════════════ HISTORY (Extrato Style) ════════════ */
function History({ trades, onUpdate, onDelete, onEdit }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 10 }}>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, color: T.t0, margin: "0 0 8px 0" }}>Extrato</h2>

      {!trades.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: T.t2 }}>Nenhuma transação.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          {trades.map((t, i) => {
            const isWin = t.result === "win";
            const isLoss = t.result === "loss";
            const isPending = t.result === "pending";
            
            return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: i === trades.length - 1 ? "none" : `1px solid ${T.b0}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                    {isWin ? "↗" : isLoss ? "↘" : "•"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "1rem", color: T.t0, marginBottom: 4 }}>{t.market}</div>
                    <div style={{ fontSize: "0.8rem", color: T.t2 }}>{t.date} · {t.category}</div>
                  </div>
                </div>
                
                <div style={{ textAlign: "right", cursor: "pointer" }} onClick={() => onEdit(t)}>
                  <div style={{ fontWeight: 600, fontSize: "1.05rem", color: isWin ? T.mint : isLoss ? T.t0 : T.amber }}>
                    {!isPending ? (t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`) : "Em aberto"}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: T.t2, marginTop: 4 }}>Vol: ${parseFloat(t.stake).toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════ SETTINGS ════════════ */
function Settings({ config, setConfig, onExport, onImport }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 10 }}>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, color: T.t0, margin: 0 }}>Ajustes</h2>
      
      <div style={{ ...cardStyle, padding: "20px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 500, color: T.t0, margin: "0 0 16px 0" }}>Capital Inicial</h3>
        <input type="number" style={inputBase} value={config.bankroll} onChange={e => setConfig({ ...config, bankroll: parseFloat(e.target.value) || 0 })} placeholder="Valor em USD" />
      </div>

      <div style={{ ...cardStyle, padding: "20px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 500, color: T.t0, margin: "0 0 16px 0" }}>Gerenciamento de Dados</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="btn-hover" onClick={onExport} style={{ padding: "16px", borderRadius: 16, background: T.bg2, color: T.t0, border: "none", fontSize: "0.95rem", fontWeight: 500, textAlign: "left" }}>Exportar Backup (.json)</button>
          <label className="btn-hover" style={{ padding: "16px", borderRadius: 16, background: T.bg2, color: T.t0, border: "none", fontSize: "0.95rem", fontWeight: 500, display: "block" }}>
            Importar Dados
            <input type="file" accept=".json" onChange={e => { if(e.target.files.length) onImport(e.target.files[0]) }} style={{ display: "none" }} />
          </label>
        </div>
      </div>
    </div>
  );
}
