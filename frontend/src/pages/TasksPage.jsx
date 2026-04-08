import { useState, useEffect } from "react";
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => { fetch(`${API_BASE}/api/tasks?status=open`).then(r=>r.json()).then(setTasks).catch(()=>{}); }, []);

  const sevConfig = {
    critical: { color: "var(--red-alert)", bg: "rgba(255,45,85,0.1)", border: "rgba(255,45,85,0.3)" },
    high:     { color: "var(--orange)", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
    medium:   { color: "var(--cyan)", bg: "var(--cyan-dim)", border: "rgba(0,212,255,0.2)" },
    low:      { color: "var(--text-secondary)", bg: "rgba(122,163,204,0.08)", border: "rgba(122,163,204,0.2)" },
  };

  return (
    <div style={s.page}>
      <div style={s.eyebrow}>OPERATIONS</div>
      <h1 style={s.title}>Task <span style={{ color: "var(--cyan)", textShadow: "0 0 20px rgba(0,212,255,0.4)" }}>Management</span></h1>
      <p style={s.subtitle}>Open tasks created from crisis reports</p>

      {tasks.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>No open tasks</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Tasks are created automatically from crisis incident reports.</div>
        </div>
      ) : (
        <div style={s.list}>
          {tasks.map((t, i) => {
            const cfg = sevConfig[t.severity] || sevConfig.medium;
            return (
              <div key={i} style={s.card}>
                <div style={{ ...s.sevBar, background: cfg.color, boxShadow: `0 0 8px ${cfg.color}66` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{t.title}</div>
                    <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0, marginLeft: 10 }}>{t.severity}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{t.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { maxWidth: 760, animation: "fadeInUp 0.4s ease", fontFamily: "'Inter',system-ui,sans-serif" },
  eyebrow: { fontSize: 10, fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.15em", marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", letterSpacing: "-0.02em", margin: "0 0 8px" },
  subtitle: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 28 },
  emptyState: { background: "var(--bg-input)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 18, padding: "48px 32px", textAlign: "center" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", display: "flex", gap: 16, position: "relative", overflow: "hidden", transition: "all 0.2s" },
  sevBar: { width: 3, borderRadius: 3, flexShrink: 0, minHeight: 40 },
};
