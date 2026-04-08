import { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({ volunteers: 0, tasks: 0, incidents: 0 });
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`).then(r => r.json()).then(setHealth).catch(() => {});
    fetch(`${API_BASE}/api/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.eyebrow}>OVERVIEW</div>
          <h1 style={s.title}>CrisisNetra <span style={s.titleAccent}>Dashboard</span></h1>
          <p style={s.subtitle}>Disaster relief coordination — powered by Google Cloud</p>
        </div>
        <div style={s.livePill}>
          <span style={s.liveDot} />
          LIVE
        </div>
      </div>

      <div style={s.statusCard}>
        <div style={s.statusCardGlow} />
        <div style={s.sectionLabel}>System Status</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: health ? "var(--green-ok)" : "var(--text-muted)", display: "inline-block", boxShadow: health ? "0 0 10px #00ff88" : "none", flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: health ? "var(--green-ok)" : "var(--text-secondary)" }}>
            {health ? `Backend online — v${health.version}` : "Connecting to backend..."}
          </span>
        </div>
        {health?.features && (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {health.features.map(f => (
              <span key={f} style={s.featureChip}>✓ {f}</span>
            ))}
          </div>
        )}
      </div>

      <div style={s.statsGrid}>
        {[
          { label: "Volunteers", value: stats.volunteers, color: "var(--cyan)", glow: "var(--cyan-border)", icon: "👥" },
          { label: "Open Tasks", value: stats.tasks, color: "var(--purple-light)", glow: "rgba(168,85,247,0.3)", icon: "📋" },
          { label: "Incidents", value: stats.incidents, color: "var(--red-alert)", glow: "rgba(255,45,85,0.3)", icon: "⚡" },
        ].map(({ label, value, color, glow, icon }) => (
          <div key={label} style={{ ...s.statCard, "--glow": glow }}>
            <div style={s.statCardLine(color)} />
            <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "'Poppins',sans-serif", lineHeight: 1, textShadow: `0 0 20px ${glow}` }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={s.alertCard} onClick={() => onNavigate("hospital-alert")}>
        <div style={s.alertGlow} />
        <div style={{ fontSize: 40, flexShrink: 0 }}>🏥</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--red-alert)", fontFamily: "'Poppins',sans-serif", marginBottom: 4 }}>Hospital Alert System</div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>Auto-notify nearest hospitals and dispatch ambulances when a disaster occurs</div>
        </div>
        <button style={s.alertBtn}>Open →</button>
      </div>

      <div style={s.quickGrid}>
        {[
          { label: "Triage System", icon: "🏷️", page: "triage", color: "var(--orange)", desc: "Tag and route patients" },
          { label: "Route Obstacles", icon: "🚧", page: "route-obstacles", color: "var(--purple-light)", desc: "Crowdsourced blockages" },
          { label: "Weather & Prediction", icon: "🌤️", page: "weather-prediction", color: "var(--cyan)", desc: "Resource forecasting" },
        ].map(item => (
          <div key={item.page} style={s.quickCard} onClick={() => onNavigate(item.page)}>
            <span style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: item.color, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 800, animation: "fadeInUp 0.4s ease" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 },
  eyebrow: { fontSize: 10, fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.15em", marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", letterSpacing: "-0.02em", margin: 0 },
  titleAccent: { color: "var(--cyan)", textShadow: "0 0 20px rgba(0,212,255,0.5)" },
  subtitle: { fontSize: 13, color: "var(--text-secondary)", marginTop: 6 },
  livePill: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 20, background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", color: "var(--red-alert)", letterSpacing: "0.1em", flexShrink: 0 },
  liveDot: { width: 6, height: 6, borderRadius: "50%", background: "var(--red-alert)", boxShadow: "0 0 8px #ff2d55", animation: "pulse-dot 1.5s infinite", display: "inline-block" },
  statusCard: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px", marginBottom: 16, position: "relative", overflow: "hidden" },
  statusCardGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)" },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 },
  featureChip: { fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", color: "var(--green-ok)" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 },
  statCard: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden", cursor: "default", transition: "all 0.25s" },
  statCardLine: (color) => ({ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }),
  alertCard: { background: "rgba(255,45,85,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,45,85,0.2)", borderRadius: 16, padding: "20px 24px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 0.25s", position: "relative", overflow: "hidden" },
  alertGlow: { position: "absolute", inset: 0, background: "radial-gradient(ellipse at left, rgba(255,45,85,0.05), transparent 60%)", pointerEvents: "none" },
  alertBtn: { padding: "10px 20px", fontSize: 13, fontWeight: 700, border: "1px solid rgba(255,45,85,0.4)", borderRadius: 10, cursor: "pointer", background: "rgba(255,45,85,0.1)", color: "var(--red-alert)", fontFamily: "inherit", flexShrink: 0, transition: "all 0.2s" },
  quickGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 },
  quickCard: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--cyan-dim)", borderRadius: 14, padding: "18px", cursor: "pointer", transition: "all 0.25s", display: "flex", flexDirection: "column", alignItems: "flex-start" },
};
