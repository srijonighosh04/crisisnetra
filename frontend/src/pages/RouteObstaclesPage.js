import { useState, useEffect } from "react";

const OBSTACLE_TYPES = [
  { value: "road_blocked", label: "🚧 Road Blocked", color: "var(--red-alert)" },
  { value: "flood", label: "🌊 Flooding", color: "var(--cyan)" },
  { value: "debris", label: "🪨 Debris", color: "var(--orange)" },
  { value: "fire", label: "🔥 Fire", color: "var(--orange)" },
  { value: "damage", label: "⚠️ Structural Damage", color: "var(--purple-light)" },
];

export default function RouteObstaclesPage() {
  const [obstacles, setObstacles] = useState([]);
  const [obstacleType, setObstacleType] = useState("road_blocked");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [durationHours, setDurationHours] = useState(6);
  const [polygon, setPolygon] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch("/api/routes/obstacles/active?min_severity=low").then(r=>r.json()).then(setObstacles).catch(()=>{}); }, []);

  const addPolygonPoint = () => { const lat = 19.076+(Math.random()-0.5)*0.01; const lng = 72.877+(Math.random()-0.5)*0.01; setPolygon(p=>[...p,[lat,lng]]); };
  const finishDrawing = () => { if (polygon.length < 3) { alert("Need at least 3 points"); return; } setIsDrawing(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (polygon.length < 3) { alert("Draw at least 3 polygon points"); return; }
    setLoading(true);
    try {
      await fetch("/api/routes/obstacles/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ obstacle_type: obstacleType, polygon, description, reported_by: "dashboard", severity, duration_hours: +durationHours }) });
      setPolygon([]); setDescription(""); setIsDrawing(false);
      const r = await fetch("/api/routes/obstacles/active?min_severity=low"); setObstacles(await r.json());
    } catch (e) { alert("Error: "+e.message); }
    finally { setLoading(false); }
  };

  const verifyObstacle = async (id) => { await fetch(`/api/routes/obstacles/${id}/verify`, { method: "POST" }).catch(()=>{}); };
  const clearObstacle = async (id) => { await fetch(`/api/routes/obstacles/${id}/clear`, { method: "POST" }).catch(()=>{}); setObstacles(o=>o.filter(x=>x.id!==id)); };

  const sevCfg = { high: { color: "var(--red-alert)", bg: "rgba(255,45,85,0.1)", border: "rgba(255,45,85,0.3)" }, medium: { color: "var(--orange)", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" }, low: { color: "var(--cyan)", bg: "var(--cyan-dim)", border: "rgba(0,212,255,0.2)" } };

  return (
    <div style={s.page}>
      <div style={s.eyebrow}>NAVIGATION</div>
      <h1 style={s.title}>Route <span style={{ color: "var(--purple-light)", textShadow: "0 0 20px rgba(168,85,247,0.4)" }}>Obstacles</span></h1>
      <p style={s.subtitle}>Report blockages so ambulances can route around them in real-time</p>

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardLine} />
          <div style={s.cardTitle}>Report New Obstacle</div>
          <form onSubmit={handleSubmit}>
            <div style={s.sectionLabel}>Obstacle Type</div>
            <div style={s.typeGrid}>
              {OBSTACLE_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setObstacleType(t.value)} style={{ ...s.typeBtn, borderColor: obstacleType === t.value ? t.color : "var(--border)", background: obstacleType === t.value ? `rgba(${t.color === "var(--red-alert)" ? "255,45,85" : t.color === "var(--cyan)" ? "0,212,255" : t.color === "var(--orange)" ? "249,115,22" : "168,85,247"},0.1)` : "rgba(10,22,40,0.5)", color: obstacleType === t.value ? t.color : "var(--text-secondary)", boxShadow: obstacleType === t.value ? `0 0 12px ${t.color}33` : "none" }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={s.sectionLabel}>Description</div>
            <input value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the obstacle..." style={s.input} />

            <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
              <div style={{ flex: 1 }}>
                <div style={s.sectionLabel}>Severity</div>
                <select style={s.input} value={severity} onChange={e=>setSeverity(e.target.value)}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={s.sectionLabel}>Clear in (hours)</div>
                <input type="number" value={durationHours} onChange={e=>setDurationHours(e.target.value)} min="1" max="72" style={s.input} />
              </div>
            </div>

            <div style={s.polygonBox}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Area Polygon ({polygon.length} points)</span>
                {!isDrawing ? (
                  <button type="button" onClick={() => { setIsDrawing(true); setPolygon([]); }} style={s.drawBtn}>📍 Start Drawing</button>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={addPolygonPoint} style={{ ...s.drawBtn, background: "rgba(0,255,136,0.1)", borderColor: "rgba(0,255,136,0.3)", color: "var(--green-ok)" }}>+ Add Point</button>
                    <button type="button" onClick={finishDrawing} style={{ ...s.drawBtn, background: "rgba(249,115,22,0.1)", borderColor: "rgba(249,115,22,0.3)", color: "var(--orange)" }}>✓ Finish</button>
                  </div>
                )}
              </div>
              {polygon.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {polygon.map((p, i) => <div key={i} style={s.pointChip}>P{i+1}: {p[0].toFixed(4)}, {p[1].toFixed(4)}</div>)}
                </div>
              )}
            </div>

            <button type="submit" disabled={loading || polygon.length < 3} style={{ ...s.submitBtn, opacity: polygon.length < 3 ? 0.4 : 1 }}>
              <div style={s.btnGlow} />
              {loading ? "Reporting..." : "🚨 Report Obstacle"}
            </button>
          </form>
        </div>

        <div style={s.card}>
          <div style={s.cardLine} />
          <div style={s.cardTitle}>Active Obstacles ({obstacles.length})</div>
          {obstacles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 14 }}>No active obstacles reported</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 500, overflowY: "auto" }}>
              {obstacles.map(obs => {
                const cfg = sevCfg[obs.severity] || sevCfg.medium;
                return (
                  <div key={obs.id} style={{ ...s.obsCard, borderColor: cfg.border }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{OBSTACLE_TYPES.find(t=>t.value===obs.type)?.label || obs.type}</span>
                      <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontWeight: 700, textTransform: "uppercase" }}>{obs.severity}</span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "6px 0 10px" }}>{obs.description}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(obs.created_at).toLocaleString()}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        {!obs.verified && <button onClick={() => verifyObstacle(obs.id)} style={s.verifyBtn}>✓ Verify</button>}
                        <button onClick={() => clearObstacle(obs.id)} style={s.clearBtn}>Clear</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 1200, animation: "fadeInUp 0.4s ease", fontFamily: "'Inter',system-ui,sans-serif" },
  eyebrow: { fontSize: 10, fontWeight: 700, color: "var(--purple-light)", letterSpacing: "0.15em", marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", letterSpacing: "-0.02em", margin: "0 0 8px" },
  subtitle: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 28 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  card: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, position: "relative", overflow: "hidden" },
  cardLine: { position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)" },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", marginBottom: 20 },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 },
  input: { display: "block", width: "100%", padding: "10px 14px", border: "1px solid var(--cyan-dim)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: "rgba(0,212,255,0.04)", color: "var(--text-primary)", outline: "none" },
  typeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 },
  typeBtn: { padding: "10px 12px", border: "1px solid", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600, background: "rgba(10,22,40,0.5)", fontFamily: "inherit", transition: "all 0.2s", textAlign: "left" },
  polygonBox: { background: "rgba(0,212,255,0.03)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 16 },
  drawBtn: { padding: "6px 12px", background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s" },
  pointChip: { padding: "3px 8px", background: "rgba(0,212,255,0.05)", border: "1px solid var(--cyan-dim)", borderRadius: 4, fontSize: 10, fontFamily: "monospace", color: "var(--text-secondary)" },
  submitBtn: { width: "100%", padding: 14, background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", position: "relative", overflow: "hidden", boxShadow: "0 0 24px rgba(168,85,247,0.3)" },
  btnGlow: { position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)", pointerEvents: "none" },
  obsCard: { background: "var(--bg-input)", border: "1px solid", borderRadius: 10, padding: "12px 14px" },
  verifyBtn: { padding: "5px 12px", background: "var(--cyan-dim)", color: "var(--cyan)", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" },
  clearBtn: { padding: "5px 12px", background: "rgba(0,255,136,0.08)", color: "var(--green-ok)", border: "1px solid rgba(0,255,136,0.25)", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit" },
};
