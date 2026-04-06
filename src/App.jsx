import { useState, useEffect, useCallback, useMemo } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

/* ─── Storage ─── */
const SK_T = "pj3-trades", SK_C = "pj3-config";
function sg(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null } catch { return null } }
function ss(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) { console.error(e) } }

const CATS = ["CS2", "Valorant", "Futebol", "NBA", "NFL", "UFC/MMA", "Tênis", "MLB", "NHL", "Política", "Crypto", "Outro"];

/* ─── Design Tokens ─── */
const T = {
  bg0: "#000000", bg1: "#121212", bg2: "#1C1C1E",
  card: "#121212", b0: "#222222", b1: "#2C2C2E",
  t0: "#FFFFFF", t1: "#E5E5EA", t2: "#8E8E93", t3: "#636366",
  mint: "#32D74B", mintDim: "rgba(50, 215, 75, 0.15)",
  red: "#FF453A", redDim: "rgba(255, 69, 58, 0.15)",
  amber: "#FF9F0A", blue: "#0A84FF",
};
const ff = "'Outfit', -apple-system, system-ui, sans-serif";
const fm = "'JetBrains Mono', 'SF Mono', monospace";
const cardStyle = { background: T.card, borderRadius: 24, border: `1px solid ${T.b0}` };
const inputBase = { width: "100%", padding: "16px", borderRadius: 16, background: T.bg2, border: "none", color: T.t0, fontSize: "1rem", fontFamily: ff, outline: "none", boxSizing: "border-box", transition: "background 0.2s" };
const labelBase = { display: "block", fontSize: "0.8rem", fontWeight: 500, color: T.t2, marginBottom: 8 };

/*
  ─── POLYMARKET SHARE PRICE ───
  Preço da share = quanto você paga por share (1¢ a 99¢).
  Input do usuário: número inteiro 1-99 (ex: 55 = 55¢ por share).
  
  Se compro $100 de shares a 55¢:
  - Shares compradas = 100 / 0.55 = 181.82
  - WIN (share → $1.00): recebo 181.82 × $1 = $181.82 → lucro +$81.82
  - LOSS (share → $0): perco tudo → prejuízo -$100
  
  Odd implícita = 100 / preço. Ex: preço 55¢ → odd ~1.82x
*/
function calcPnl(result, stake, sharePrice) {
  const s = parseFloat(stake) || 0;
  const p = parseFloat(sharePrice) || 0;
  if (s <= 0 || p <= 0 || p >= 100) return 0;
  if (result === "win") return (s / (p / 100)) - s;
  if (result === "loss") return -s;
  return 0;
}

/* ─── Export/Import ─── */
function exportData(trades, config) {
  const d = JSON.stringify({ trades, config, exportedAt: new Date().toISOString(), v: 4 }, null, 2);
  const b = new Blob([d], { type: "application/json" });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = `polyjournal-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
}

function importData(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => { try { const d = JSON.parse(e.target.result); if (!Array.isArray(d.trades)) rej("Arquivo inválido"); else res(d) } catch { rej("Erro ao ler") } };
    r.onerror = () => rej("Erro na leitura");
    r.readAsText(file);
  });
}

/* ════════════ MAIN APP ════════════ */
export default function App() {
  const [trades, setTrades] = useState([]);
  const [config, setConfig] = useState({ bankroll: 1000, maxRiskPct: 5 });
  const [view, setView] = useState("dashboard");
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delId, setDelId] = useState(null);

  useEffect(() => { const t = sg(SK_T), c = sg(SK_C); if (t) setTrades(t); if (c) setConfig(c); setReady(true) }, []);
  useEffect(() => { if (ready) ss(SK_T, trades) }, [trades, ready]);
  useEffect(() => { if (ready) ss(SK_C, config) }, [config, ready]);

  const add = useCallback(t => { setTrades(p => [{ ...t, id: Date.now().toString(), createdAt: new Date().toISOString() }, ...p]); setView("history") }, []);
  const upd = useCallback((id, u) => setTrades(p => p.map(t => t.id === id ? { ...t, ...u } : t)), []);
  const del = useCallback(id => { setDelId(null); setTrades(p => p.filter(t => t.id !== id)) }, []);

  const saveEdit = useCallback(t => {
    const pnl = calcPnl(t.result, t.stake, t.sharePrice);
    upd(t.id, { ...t, stake: parseFloat(t.stake) || 0, sharePrice: parseFloat(t.sharePrice) || 0, pnl });
    setEditing(null); setView("history");
  }, [upd]);

  const doExport = () => exportData(trades, config);
  const doImport = async f => { try { const d = await importData(f); setTrades(d.trades); if (d.config) setConfig(d.config); alert(`${d.trades.length} trades importadas.`) } catch (e) { alert(e) } };

  if (!ready) return <div style={{ minHeight: "100dvh", background: T.bg0 }} />;

  return (
    <div style={{ minHeight: "100dvh", background: T.bg0, color: T.t1, fontFamily: ff, paddingBottom: "env(safe-area-inset-bottom)", WebkitFontSmoothing: "antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet" />
      <style>{`
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { overscroll-behavior: none; margin: 0; background: ${T.bg0}; }
        input:focus, select:focus, textarea:focus { background: #242426 !important; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .bh { transition: transform 0.15s ease, opacity 0.15s ease; cursor: pointer; }
        .bh:active { transform: scale(0.96); }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ maxWidth: 500, margin: "0 auto", padding: "16px 16px 100px" }}>
        <div style={{ animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          {view === "dashboard" && <Dashboard trades={trades} config={config} setView={setView} />}
          {view === "new" && <TradeForm onSubmit={add} onCancel={() => setView("dashboard")} config={config} trades={trades} />}
          {view === "edit" && editing && <TradeForm initialData={editing} onSubmit={saveEdit} onCancel={() => { setEditing(null); setView("history") }} isEdit config={config} />}
          {view === "history" && <History trades={trades} onUpdate={upd} onDelete={setDelId} onEdit={t => { setEditing(t); setView("edit") }} />}
          {view === "insights" && <Insights trades={trades} />}
          {view === "settings" && <Settings config={config} setConfig={setConfig} onExport={doExport} onImport={doImport} />}
        </div>
      </div>

      {/* Delete modal */}
      {delId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={() => setDelId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.bg1, borderRadius: 24, padding: "32px 24px", maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: T.t0, marginBottom: 8 }}>Deletar trade?</div>
            <p style={{ fontSize: "0.88rem", color: T.t2, marginBottom: 24 }}>Essa ação não pode ser desfeita.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="bh" onClick={() => setDelId(null)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: T.bg2, color: T.t2, fontSize: "0.9rem", fontWeight: 600, fontFamily: ff }}>Cancelar</button>
              <button className="bh" onClick={() => del(delId)} style={{ flex: 1, padding: "14px", borderRadius: 14, border: "none", background: T.red, color: T.t0, fontSize: "0.9rem", fontWeight: 600, fontFamily: ff }}>Deletar</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav view={view} setView={setView} />
    </div>
  );
}

/* ════════════ BOTTOM NAV ════════════ */
function BottomNav({ view, setView }) {
  const tabs = [
    { id: "dashboard", label: "Início" },
    { id: "history", label: "Extrato" },
    { id: "new", label: "+ Nova" },
    { id: "insights", label: "Insights" },
    { id: "settings", label: "Ajustes" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 24, left: 0, right: 0, zIndex: 100, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ background: "rgba(28,28,30,0.85)", backdropFilter: "blur(20px)", borderRadius: 100, padding: "8px", display: "flex", gap: 4, border: `1px solid ${T.b1}`, pointerEvents: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
        {tabs.map(t => (
          <button key={t.id} className="bh" onClick={() => setView(t.id)} style={{ border: "none", background: view === t.id ? T.t0 : "transparent", color: view === t.id ? T.bg0 : T.t2, padding: "10px 14px", borderRadius: 100, fontSize: "0.82rem", fontWeight: 600, fontFamily: ff, transition: "all 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════ ROW HELPER ════════════ */
function Row({ label, value, sub, color, last }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: last ? 0 : 16, borderBottom: last ? "none" : `1px solid ${T.b0}` }}>
      <span style={{ color: T.t2 }}>{label}</span>
      <div style={{ textAlign: "right" }}>
        <span style={{ fontWeight: 600, color: color || T.t1 }}>{value}</span>
        {sub && <div style={{ fontSize: "0.72rem", color: T.t3, fontFamily: fm, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ════════════ DASHBOARD ════════════ */
function Dashboard({ trades, config, setView }) {
  const s = useMemo(() => {
    const res = trades.filter(t => t.result !== "pending");
    const wins = res.filter(t => t.result === "win");
    const pnl = res.reduce((a, t) => a + (t.pnl || 0), 0);
    const stk = res.reduce((a, t) => a + (t.stake || 0), 0);
    const cb = config.bankroll + pnl;

    const byDate = {}; let cum = config.bankroll;
    [...res].sort((a, b) => (a.date || "").localeCompare(b.date || "")).forEach(t => { cum += t.pnl || 0; byDate[t.date] = cum });
    const tl = Object.entries(byDate).map(([d, p]) => ({ date: d, pnl: Math.round(p * 100) / 100 }));
    if (tl.length > 0) tl.unshift({ date: "Início", pnl: config.bankroll });

    const pl = res.filter(t => t.tradeType === "planned"), im = res.filter(t => t.tradeType === "impulsive");

    return {
      pnl, cb, tl,
      bkPct: config.bankroll > 0 ? ((cb - config.bankroll) / config.bankroll * 100) : 0,
      resolved: res.length,
      wr: res.length > 0 ? (wins.length / res.length * 100) : 0,
      wins: wins.length, losses: res.length - wins.length,
      pending: trades.filter(t => t.result === "pending").length,
      roi: stk > 0 ? (pnl / stk * 100) : 0,
      plPnl: pl.reduce((a, t) => a + (t.pnl || 0), 0), plN: pl.length,
      imPnl: im.reduce((a, t) => a + (t.pnl || 0), 0), imN: im.length,
    };
  }, [trades, config]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 20 }}>
      {/* Hero */}
      <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
        <div style={{ fontSize: "0.9rem", color: T.t2, fontWeight: 500, marginBottom: 8 }}>Capital Total</div>
        <div style={{ fontSize: "3.8rem", fontWeight: 600, color: T.t0, letterSpacing: "-1.5px", lineHeight: 1 }}>${s.cb.toFixed(2)}</div>
        <div style={{ display: "inline-flex", alignItems: "center", background: s.bkPct >= 0 ? T.mintDim : T.redDim, padding: "6px 14px", borderRadius: 100, marginTop: 16 }}>
          <span style={{ color: s.bkPct >= 0 ? T.mint : T.red, fontWeight: 600, fontSize: "0.85rem" }}>
            {s.bkPct >= 0 ? "+" : ""}{s.bkPct.toFixed(2)}% ({s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Chart */}
      {s.tl.length > 1 && (
        <div style={{ height: 180, margin: "0 -16px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={s.tl}>
              <defs><linearGradient id="cG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.bkPct >= 0 ? T.mint : T.red} stopOpacity={0.2} /><stop offset="100%" stopColor={s.bkPct >= 0 ? T.mint : T.red} stopOpacity={0} /></linearGradient></defs>
              <Tooltip contentStyle={{ background: T.bg1, border: "none", borderRadius: 12, color: T.t0, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }} formatter={v => [`$${v}`, "Saldo"]} labelStyle={{ display: "none" }} />
              <Area type="monotone" dataKey="pnl" stroke={s.bkPct >= 0 ? T.mint : T.red} fill="url(#cG)" strokeWidth={3} activeDot={{ r: 6, fill: T.bg0, stroke: s.bkPct >= 0 ? T.mint : T.red, strokeWidth: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CTA */}
      <div style={{ display: "flex", gap: 12 }}>
        <button className="bh" onClick={() => setView("new")} style={{ flex: 1, padding: "18px", borderRadius: 20, background: T.t0, color: T.bg0, border: "none", fontSize: "1rem", fontWeight: 600, fontFamily: ff }}>+ Registrar Trade</button>
        <button className="bh" onClick={() => setView("history")} style={{ flex: 1, padding: "18px", borderRadius: 20, background: T.bg2, color: T.t0, border: "none", fontSize: "1rem", fontWeight: 600, fontFamily: ff }}>Ver Extrato</button>
      </div>

      {/* Performance */}
      <div style={{ ...cardStyle, padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, color: T.t0 }}>Performance</h3>
        <Row label="Operações" value={s.resolved} />
        <Row label="Win Rate" value={`${s.wr.toFixed(0)}%`} sub={`${s.wins}W · ${s.losses}L`} color={s.wr >= 50 ? T.mint : T.red} />
        <Row label="ROI" value={`${s.roi >= 0 ? "+" : ""}${s.roi.toFixed(1)}%`} color={s.roi >= 0 ? T.mint : T.red} />
        <Row label="Posições Abertas" value={s.pending} color={s.pending > 0 ? T.amber : T.t1} last />
      </div>

      {/* Disciplina */}
      {(s.plN > 0 || s.imN > 0) && (
        <div style={{ ...cardStyle, padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, color: T.t0 }}>Disciplina</h3>
          <Row label={`Planejadas (${s.plN})`} value={`${s.plPnl >= 0 ? "+" : ""}$${s.plPnl.toFixed(2)}`} color={s.plPnl >= 0 ? T.mint : T.red} />
          <Row label={`Impulsivas (${s.imN})`} value={`${s.imPnl >= 0 ? "+" : ""}$${s.imPnl.toFixed(2)}`} color={s.imPnl >= 0 ? T.mint : T.red} last />
        </div>
      )}
    </div>
  );
}

/* ════════════ TRADE FORM ════════════ */
function TradeForm({ initialData, onSubmit, onCancel, isEdit, config, trades }) {
  const def = { market: "", category: "CS2", stake: "", sharePrice: "", result: "pending", notes: "", date: new Date().toISOString().split("T")[0], confidence: 1, tradeType: "planned" };
  const [f, setF] = useState(initialData ? { ...initialData, stake: String(initialData.stake || ""), sharePrice: String(initialData.sharePrice || initialData.odds || "") } : def);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const bankroll = config.bankroll || 1000;
  const maxRiskPct = config.maxRiskPct || 5;
  const stake = parseFloat(f.stake) || 0;
  const price = parseFloat(f.sharePrice) || 0;

  const stakePct = bankroll > 0 ? (stake / bankroll) * 100 : 0;
  const overLimit = stakePct > maxRiskPct;
  const ok = f.market.trim() && stake > 0 && price > 0 && price < 100 && !overLimit;

  // Payout preview
  const potentialWin = ok ? (stake / (price / 100)) - stake : 0;
  const impliedOdd = price > 0 ? (100 / price).toFixed(2) : 0;

  const todayN = (trades || []).filter(t => t.date === f.date).length;

  const handleConfidenceClick = (n) => {
    const calculatedStake = ((bankroll * n) / 100).toFixed(2);
    setF(p => ({ ...p, confidence: n, stake: calculatedStake }));
  };

  const submit = () => {
    if (!ok) return;
    const pnl = calcPnl(f.result, stake, price);
    onSubmit({ ...f, stake, sharePrice: price, pnl });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: "1.6rem", fontWeight: 600, color: T.t0, margin: 0 }}>{isEdit ? "Editar Trade" : "Nova Trade"}</h2>
        <button onClick={onCancel} style={{ background: "transparent", border: "none", color: T.t2, fontSize: "1rem", fontWeight: 500, cursor: "pointer" }}>Cancelar</button>
      </div>

      {!isEdit && todayN >= 5 && (
        <div style={{ padding: "14px 18px", borderRadius: 16, background: T.redDim }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: T.red }}>Muitas trades hoje ({todayN})</div>
          <div style={{ fontSize: "0.78rem", color: T.t2, marginTop: 2 }}>Cuidado com overtrading.</div>
        </div>
      )}

      <div style={{ ...cardStyle, padding: "8px 16px" }}>
        {/* Market */}
        <div style={{ padding: "12px 0", borderBottom: `1px solid ${T.b0}` }}>
          <input style={{ ...inputBase, background: "transparent", padding: "8px 0", fontSize: "1.2rem", fontWeight: 500 }} placeholder="Mercado (ex: NAVI vs Spirit)" value={f.market} onChange={e => set("market", e.target.value)} />
        </div>

        {/* Trade Type */}
        <div style={{ display: "flex", padding: "12px 0", borderBottom: `1px solid ${T.b0}`, gap: 8 }}>
          {[{ id: "planned", l: "Planejada" }, { id: "impulsive", l: "Impulsiva" }].map(t => (
            <button key={t.id} className="bh" onClick={() => set("tradeType", t.id)} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "none", background: f.tradeType === t.id ? T.bg2 : "transparent", color: f.tradeType === t.id ? T.t0 : T.t3, fontWeight: 600, fontSize: "0.85rem", fontFamily: ff, transition: "all 0.2s" }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Confidence */}
        <div style={{ padding: "14px 0", borderBottom: `1px solid ${T.b0}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ ...labelBase, margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}>Confiança (1★ = 1u = 1%)</label>
            <div style={{ display: "flex", gap: 12 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => handleConfidenceClick(n)} className="bh"
                  style={{ background: "transparent", border: "none", fontSize: "1.4rem", padding: 0, color: f.confidence >= n ? T.t0 : T.b1, cursor: "pointer", transition: "color 0.2s" }}>
                  ★
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stake + Share Price */}
        <div style={{ display: "flex", padding: "16px 0", borderBottom: `1px solid ${T.b0}` }}>
          <div style={{ flex: 1, borderRight: `1px solid ${T.b0}`, paddingRight: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ ...labelBase, fontSize: "0.75rem", textTransform: "uppercase", margin: 0 }}>Volume (USD)</label>
              {stake > 0 && <span style={{ fontSize: "0.7rem", color: overLimit ? T.red : T.t2, fontWeight: 600, fontFamily: fm }}>{stakePct.toFixed(1)}%</span>}
            </div>
            <input type="number" style={{ ...inputBase, background: "transparent", padding: "8px 0 0 0", fontSize: "1.6rem", fontWeight: 600, color: overLimit ? T.red : T.t0 }} placeholder="0.00" value={f.stake} onChange={e => set("stake", e.target.value)} />
            {overLimit && <div style={{ fontSize: "0.65rem", color: T.red, marginTop: 4, fontWeight: 500 }}>Excede limite de {maxRiskPct}%</div>}
          </div>
          <div style={{ flex: 1, paddingLeft: 16 }}>
            <label style={{ ...labelBase, fontSize: "0.75rem", textTransform: "uppercase" }}>Preço da Share (¢)</label>
            <input type="number" min="1" max="99" style={{ ...inputBase, background: "transparent", padding: "8px 0 0 0", fontSize: "1.6rem", fontWeight: 600 }} placeholder="55" value={f.sharePrice} onChange={e => set("sharePrice", e.target.value)} />
            {price > 0 && price < 100 && <div style={{ fontSize: "0.65rem", color: T.t3, marginTop: 4, fontFamily: fm }}>Odd implícita: {impliedOdd}x</div>}
          </div>
        </div>

        {/* Payout preview */}
        {ok && (
          <div style={{ display: "flex", padding: "14px 0", borderBottom: `1px solid ${T.b0}` }}>
            <div style={{ flex: 1, borderRight: `1px solid ${T.b0}`, paddingRight: 16 }}>
              <div style={{ fontSize: "0.7rem", color: T.t3, textTransform: "uppercase", marginBottom: 4 }}>Se green</div>
              <div style={{ fontFamily: fm, fontWeight: 600, color: T.mint, fontSize: "1.1rem" }}>+${potentialWin.toFixed(2)}</div>
            </div>
            <div style={{ flex: 1, paddingLeft: 16 }}>
              <div style={{ fontSize: "0.7rem", color: T.t3, textTransform: "uppercase", marginBottom: 4 }}>Se red</div>
              <div style={{ fontFamily: fm, fontWeight: 600, color: T.red, fontSize: "1.1rem" }}>-${stake.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Category + Date */}
        <div style={{ display: "flex", gap: 16, padding: "16px 0" }}>
          <div style={{ flex: 1 }}>
            <select style={{ ...inputBase, padding: "12px", borderRadius: 12 }} value={f.category} onChange={e => set("category", e.target.value)}>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <input type="date" style={{ ...inputBase, padding: "12px", borderRadius: 12 }} value={f.date} onChange={e => set("date", e.target.value)} />
          </div>
        </div>
      </div>

      {/* Result */}
      <div>
        <label style={{ ...labelBase, marginLeft: 8 }}>Resultado</label>
        <div style={{ display: "flex", gap: 10, background: T.bg2, padding: 6, borderRadius: 16 }}>
          {[{ id: "pending", l: "Aberto" }, { id: "win", l: "Green" }, { id: "loss", l: "Red" }].map(r => (
            <button key={r.id} onClick={() => set("result", r.id)} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: f.result === r.id ? (r.id === "win" ? T.mint : r.id === "loss" ? T.red : T.t2) : "transparent", color: f.result === r.id ? T.bg0 : T.t2, fontWeight: 600, fontSize: "0.9rem", fontFamily: ff, transition: "all 0.2s", cursor: "pointer" }}>
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <textarea style={{ ...inputBase, minHeight: 100, resize: "vertical" }} placeholder="Notas ou tese da operação (opcional)..." value={f.notes || ""} onChange={e => set("notes", e.target.value)} />

      {/* Submit */}
      <button className="bh" onClick={submit} disabled={!ok} style={{ padding: "20px", borderRadius: 100, background: ok ? T.t0 : T.b0, color: ok ? T.bg0 : T.t3, border: "none", fontSize: "1.1rem", fontWeight: 600, fontFamily: ff, marginTop: 10, opacity: ok ? 1 : 0.5, transition: "all 0.2s" }}>
        {isEdit ? "Salvar" : "Confirmar"}
      </button>
    </div>
  );
}

/* ════════════ HISTORY ════════════ */
function History({ trades, onUpdate, onDelete, onEdit }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const fd = trades.filter(t => {
    if (filter !== "all" && t.result !== filter) return false;
    if (catFilter !== "all" && t.category !== catFilter) return false;
    if (search.trim() && !t.market.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const mark = (id, result, stake, sharePrice) => {
    const pnl = calcPnl(result, stake, sharePrice);
    onUpdate(id, { result, pnl });
  };

  const cats = [...new Set(trades.map(t => t.category))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 10 }}>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, color: T.t0, margin: 0 }}>Extrato</h2>

      {/* Search */}
      <input style={{ ...inputBase, borderRadius: 14 }} placeholder="Buscar mercado..." value={search} onChange={e => setSearch(e.target.value)} />

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[{ id: "all", l: "Todas" }, { id: "pending", l: "Abertas" }, { id: "win", l: "Green" }, { id: "loss", l: "Red" }].map(f => (
          <button key={f.id} className="bh" onClick={() => setFilter(f.id)} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: filter === f.id ? T.t0 : T.bg2, color: filter === f.id ? T.bg0 : T.t2, fontSize: "0.8rem", fontWeight: 600, fontFamily: ff, transition: "all 0.2s" }}>
            {f.l}
          </button>
        ))}
        <select style={{ padding: "8px 12px", borderRadius: 10, background: T.bg2, border: "none", color: T.t2, fontSize: "0.8rem", fontFamily: ff, cursor: "pointer", outline: "none" }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">Categorias</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {!fd.length ? (
        <div style={{ textAlign: "center", padding: "40px", color: T.t2 }}>Nenhuma trade encontrada.</div>
      ) : (
        <div style={{ ...cardStyle, overflow: "hidden" }}>
          {fd.map((t, i) => {
            const isWin = t.result === "win";
            const isLoss = t.result === "loss";
            const isPending = t.result === "pending";
            const pnl = t.pnl || 0;
            const stars = "★".repeat(t.confidence || 1);
            const price = t.sharePrice || t.odds || 0;

            return (
              <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: i === fd.length - 1 ? "none" : `1px solid ${T.b0}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: T.bg2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                    {isWin ? "↗" : isLoss ? "↘" : "•"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: T.t0, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.market}</div>
                    <div style={{ fontSize: "0.72rem", color: T.t2, fontFamily: fm }}>
                      {t.date} · {t.category} · {price}¢
                      <span style={{ color: T.t3, marginLeft: 4 }}>{t.tradeType === "planned" ? "plan" : "imp"}</span>
                      <span style={{ color: T.t1, marginLeft: 4 }}>{stars}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  {isPending ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="bh" onClick={() => mark(t.id, "win", t.stake, price)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: T.mintDim, color: T.mint, fontSize: "0.75rem", fontWeight: 600, fontFamily: ff }}>Green</button>
                      <button className="bh" onClick={() => mark(t.id, "loss", t.stake, price)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: T.redDim, color: T.red, fontSize: "0.75rem", fontWeight: 600, fontFamily: ff }}>Red</button>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: "1.05rem", color: isWin ? T.mint : T.red, cursor: "pointer" }} onClick={() => onEdit(t)}>
                      {pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "flex-end" }}>
                    <button className="bh" onClick={() => onEdit(t)} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: T.bg2, color: T.t3, fontSize: "0.68rem", fontFamily: ff }}>Editar</button>
                    <button className="bh" onClick={() => onDelete(t.id)} style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: T.bg2, color: T.t3, fontSize: "0.68rem", fontFamily: ff }}>×</button>
                  </div>
                </div>
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

  // Confidence vs Win Rate
  const byConf = {};
  res.forEach(t => { const c = t.confidence || 1; if (!byConf[c]) byConf[c] = { w: 0, n: 0, pnl: 0 }; byConf[c].n++; byConf[c].pnl += t.pnl || 0; if (t.result === "win") byConf[c].w++ });
  const confD = [1, 2, 3, 4, 5].map(c => ({ conf: `${c}★`, wr: byConf[c] ? (byConf[c].w / byConf[c].n * 100) : 0, pnl: byConf[c] ? byConf[c].pnl : 0, n: byConf[c] ? byConf[c].n : 0 }));

  // Day of week
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const byDay = {};
  res.forEach(t => { if (!t.date) return; const d = new Date(t.date + "T12:00:00").getDay(); const dn = days[d]; if (!byDay[dn]) byDay[dn] = { pnl: 0, n: 0 }; byDay[dn].n++; byDay[dn].pnl += t.pnl || 0 });
  const dayD = days.map(d => ({ day: d, pnl: byDay[d] ? Math.round(byDay[d].pnl * 100) / 100 : 0 }));

  // By category
  const byCat = {};
  res.forEach(t => { if (!byCat[t.category]) byCat[t.category] = { w: 0, n: 0, pnl: 0 }; byCat[t.category].n++; byCat[t.category].pnl += t.pnl || 0; if (t.result === "win") byCat[t.category].w++ });
  const catData = Object.entries(byCat).map(([name, d]) => ({ name, ...d, wr: d.n > 0 ? (d.w / d.n * 100) : 0 })).sort((a, b) => b.pnl - a.pnl);

  // Planned vs Impulsive
  const pl = res.filter(t => t.tradeType === "planned"), im = res.filter(t => t.tradeType === "impulsive");
  const pP = pl.reduce((a, t) => a + (t.pnl || 0), 0), iP = im.reduce((a, t) => a + (t.pnl || 0), 0);

  const ttStyle = { background: T.bg1, border: "none", borderRadius: 12, color: T.t0, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.5)" };

  if (res.length < 3) return (
    <div style={{ textAlign: "center", padding: "80px 16px", paddingTop: 40 }}>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, color: T.t0, marginBottom: 8 }}>Insights</h2>
      <p style={{ color: T.t2, fontSize: "0.9rem" }}>Registre pelo menos 3 trades resolvidas para desbloquear.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 10 }}>
      <h2 style={{ fontSize: "1.6rem", fontWeight: 600, color: T.t0, margin: 0 }}>Insights</h2>

      {/* Discipline callout */}
      {pl.length > 0 && im.length > 0 && (
        <div style={{ ...cardStyle, padding: "20px", borderLeft: `3px solid ${iP < 0 ? T.red : T.mint}` }}>
          <p style={{ fontSize: "0.88rem", color: T.t1, lineHeight: 1.6, margin: 0 }}>
            {iP < 0
              ? `Impulsivas acumulam -$${Math.abs(iP).toFixed(2)}. Planejadas: ${pP >= 0 ? "+" : ""}$${pP.toFixed(2)}.`
              : `Planejadas: ${pP >= 0 ? "+" : ""}$${pP.toFixed(2)} | Impulsivas: ${iP >= 0 ? "+" : ""}$${iP.toFixed(2)}.`}
          </p>
        </div>
      )}

      {/* Confidence chart */}
      <div style={{ ...cardStyle, padding: "24px 16px 16px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 16px 4px", color: T.t0 }}>Confiança vs Win Rate</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={confD}>
            <CartesianGrid stroke={T.b0} strokeDasharray="3 3" opacity={0.5} />
            <XAxis dataKey="conf" tick={{ fill: T.t2, fontSize: 11, fontFamily: fm }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: T.t3, fontSize: 10, fontFamily: fm }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} width={36} />
            <Tooltip contentStyle={ttStyle} formatter={v => [`${v.toFixed(1)}%`, "Win Rate"]} />
            <Bar dataKey="wr" radius={[8, 8, 0, 0]}>{confD.map((_, i) => <Cell key={i} fill={T.mint} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Day of week */}
      <div style={{ ...cardStyle, padding: "24px 16px 16px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 16px 4px", color: T.t0 }}>PnL por Dia da Semana</h3>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dayD}>
            <CartesianGrid stroke={T.b0} strokeDasharray="3 3" opacity={0.5} />
            <XAxis dataKey="day" tick={{ fill: T.t2, fontSize: 11, fontFamily: fm }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: T.t3, fontSize: 10, fontFamily: fm }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={40} />
            <Tooltip contentStyle={ttStyle} formatter={v => [`$${v}`, "PnL"]} />
            <Bar dataKey="pnl" radius={[8, 8, 0, 0]}>{dayD.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? T.mint : T.red} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By category */}
      {catData.length > 0 && (
        <div style={{ ...cardStyle, padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0, color: T.t0 }}>Por Categoria</h3>
          {catData.map((c, i) => (
            <Row key={c.name}
              label={`${c.name} (${c.n})`}
              value={`${c.pnl >= 0 ? "+" : ""}$${c.pnl.toFixed(0)}`}
              sub={`${c.wr.toFixed(0)}% WR`}
              color={c.pnl >= 0 ? T.mint : T.red}
              last={i === catData.length - 1}
            />
          ))}
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
        <h3 style={{ fontSize: "1rem", fontWeight: 500, color: T.t0, margin: "0 0 16px 0" }}>Risco por Trade</h3>
        <input type="number" step="0.5" style={inputBase} value={config.maxRiskPct} onChange={e => setConfig({ ...config, maxRiskPct: parseFloat(e.target.value) || 5 })} placeholder="% máximo" />
        <p style={{ fontSize: "0.78rem", color: T.t3, marginTop: 8 }}>Limite atual: ${((config.bankroll * config.maxRiskPct) / 100).toFixed(2)} por trade</p>
      </div>

      <div style={{ ...cardStyle, padding: "20px" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 500, color: T.t0, margin: "0 0 16px 0" }}>Gerenciamento de Dados</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="bh" onClick={onExport} style={{ padding: "16px", borderRadius: 16, background: T.bg2, color: T.t0, border: "none", fontSize: "0.95rem", fontWeight: 500, fontFamily: ff, textAlign: "left" }}>Exportar Backup (.json)</button>
          <label className="bh" style={{ padding: "16px", borderRadius: 16, background: T.bg2, color: T.t0, border: "none", fontSize: "0.95rem", fontWeight: 500, display: "block", fontFamily: ff, cursor: "pointer" }}>
            Importar Dados
            <input type="file" accept=".json" onChange={e => { if (e.target.files.length) onImport(e.target.files[0]); e.target.value = "" }} style={{ display: "none" }} />
          </label>
        </div>
        <p style={{ fontSize: "0.75rem", color: T.t3, marginTop: 12, lineHeight: 1.5 }}>Exporte regularmente para proteger seus dados.</p>
      </div>
    </div>
  );
}
