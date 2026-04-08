import { useState, useEffect } from "react";

const TRIAGE_LEVELS = [
  { value: "red", label: "RED — Immediate", color: "var(--red-alert)", bg: "rgba(255,45,85,0.1)", border: "rgba(255,45,85,0.4)", glow: "rgba(255,45,85,0.3)", description: "Life-threatening" },
  { value: "yellow", label: "YELLOW — Delayed", color: "var(--orange)", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.4)", glow: "rgba(249,115,22,0.3)", description: "Serious but stable" },
  { value: "green", label: "GREEN — Minor", color: "var(--green-ok)", bg: "rgba(0,255,136,0.08)", border: "rgba(0,255,136,0.3)", glow: "rgba(0,255,136,0.2)", description: "Walking wounded" },
  { value: "black", label: "BLACK — Expectant", color: "var(--text-secondary)", bg: "rgba(61,90,122,0.15)", border: "rgba(61,90,122,0.3)", glow: "transparent", description: "Expectant / Deceased" },
];

const INJURY_TYPES = ["head_trauma","internal_bleeding","severe_burn","chest_wound","spinal_injury","fracture","moderate_burn","deep_laceration","minor_laceration","contusion"];
const SPECIAL_REQUIREMENTS = [
  { value: "burn_ward", label: "Burn Ward" }, { value: "icu", label: "ICU Required" },
  { value: "o_negative", label: "O− Blood" }, { value: "o_positive", label: "O+ Blood" },
  { value: "a_negative", label: "A− Blood" }, { value: "a_positive", label: "A+ Blood" },
];

export default function TriagePage() {
  const [patientId, setPatientId] = useState("");
  const [severity, setSeverity] = useState("yellow");
  const [injuries, setInjuries] = useState([]);
  const [specialReqs, setSpecialReqs] = useState([]);
  const [vitalSigns, setVitalSigns] = useState({ respiratory_rate: 15, pulse: 80, conscious: true });
  const [location] = useState({ lat: 19.076, lng: 72.877 });
  const [triageStats, setTriageStats] = useState(null);
  const [autoRouted, setAutoRouted] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/triage/stats").then(r => r.json()).then(setTriageStats).catch(() => {});
  }, []);

  const toggleInjury = (v) => setInjuries(p => p.includes(v) ? p.filter(i => i !== v) : [...p, v]);
  const toggleSpecialReq = (v) => setSpecialReqs(p => p.includes(v) ? p.filter(i => i !== v) : [...p, v]);

  const handleAutoAssess = async () => {
    try {
      const r = await fetch("/api/triage/auto-assess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vital_signs: vitalSigns, injuries }) });
      const d = await r.json();
      setSeverity(d.recommended_level);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const r = await fetch("/api/triage/tag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patient_id: patientId, severity, injuries, vital_signs: vitalSigns, special_requirements: specialReqs, location, tagged_by: "dashboard" }) });
      const d = await r.json();
      if (d.auto_routed_to) setAutoRouted(d.auto_routed_to);
      setPatientId(""); setInjuries([]); setSpecialReqs([]);
    } catch (err) { alert("Error: " + err.message); }
    finally { setLoading(false); }
  };

  const currentLevel = TRIAGE_LEVELS.find(l => l.value === severity);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.eyebrow}>MEDICAL</div>
        <h1 style={s.title}>Triage <span style={{ color: "var(--orange)", textShadow: "0 0 20px rgba(249,115,22,0.4)" }}>System</span></h1>
        <p style={s.subtitle}>Tag patients and auto-route to appropriate hospitals using START protocol</p>
      </div>

      {triageStats && (
        <div style={s.statsRow}>
          {[
            { label: "Total Tagged", value: triageStats.total || 0, color: "var(--cyan)" },
            { label: "Critical (Red)", value: triageStats.by_severity?.red || 0, color: "var(--red-alert)" },
            { label: "Delayed (Yellow)", value: triageStats.by_severity?.yellow || 0, color: "var(--orange)" },
            { label: "Minor (Green)", value: triageStats.by_severity?.green || 0, color: "var(--green-ok)" },
            { label: "Auto-Routed", value: triageStats.auto_routed || 0, color: "var(--purple-light)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={s.statCard}>
              <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Poppins',sans-serif", textShadow: `0 0 16px ${color}66` }}>{value}</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} style={s.form}>
        <div style={s.section}>
          <div style={s.sectionLabel}>Patient ID</div>
          <input value={patientId} onChange={e => setPatientId(e.target.value)} placeholder="e.g., PATIENT-001" required style={s.input} />
        </div>

        <div style={s.section}>
          <div style={s.sectionLabel}>Triage Level</div>
          <div style={s.triageGrid}>
            {TRIAGE_LEVELS.map(level => (
              <button key={level.value} type="button" onClick={() => setSeverity(level.value)} style={{ ...s.triageBtn, background: severity === level.value ? level.bg : "rgba(10,22,40,0.5)", borderColor: severity === level.value ? level.color : "var(--border)", boxShadow: severity === level.value ? `0 0 20px ${level.glow}, inset 0 0 20px ${level.bg}` : "none", color: severity === level.value ? level.color : "var(--text-secondary)" }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{level.label}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{level.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionLabel}>Vital Signs</div>
          <div style={s.vitalsGrid}>
            <div>
              <label style={s.miniLabel}>Respiratory Rate (breaths/min)</label>
              <input type="number" value={vitalSigns.respiratory_rate} onChange={e => setVitalSigns({ ...vitalSigns, respiratory_rate: +e.target.value })} style={s.input} />
            </div>
            <div>
              <label style={s.miniLabel}>Pulse (bpm)</label>
              <input type="number" value={vitalSigns.pulse} onChange={e => setVitalSigns({ ...vitalSigns, pulse: +e.target.value })} style={s.input} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 28 }}>
              <input type="checkbox" checked={vitalSigns.conscious} onChange={e => setVitalSigns({ ...vitalSigns, conscious: e.target.checked })} style={{ width: 18, height: 18, accentColor: "var(--cyan)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Conscious / Responsive</span>
            </div>
          </div>
          <button type="button" onClick={handleAutoAssess} style={s.autoBtn}>🤖 Auto-Assess via START Protocol</button>
        </div>

        <div style={s.section}>
          <div style={s.sectionLabel}>Injuries</div>
          <div style={s.chipGrid}>
            {INJURY_TYPES.map(inj => (
              <button key={inj} type="button" onClick={() => toggleInjury(inj)} style={{ ...s.chip, ...(injuries.includes(inj) ? { background: "var(--orange-dim)", borderColor: "var(--orange)", color: "var(--orange)" } : {}) }}>
                {inj.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionLabel}>Special Requirements</div>
          <div style={s.chipGrid}>
            {SPECIAL_REQUIREMENTS.map(req => (
              <button key={req.value} type="button" onClick={() => toggleSpecialReq(req.value)} style={{ ...s.chip, ...(specialReqs.includes(req.value) ? { background: "rgba(168,85,247,0.15)", borderColor: "var(--purple-light)", color: "var(--purple-light)" } : {}) }}>
                {req.label}
              </button>
            ))}
          </div>
        </div>

        {autoRouted && (
          <div style={s.routedBanner}>
            <span style={{ color: "var(--green-ok)", fontWeight: 700 }}>✓ AUTO-ROUTED</span> — Patient directed to: <strong style={{ color: "var(--cyan)" }}>{autoRouted}</strong>
          </div>
        )}

        <button type="submit" disabled={loading} style={s.submitBtn}>
          <div style={s.submitGlow} />
          {loading ? "Creating tag..." : "🏷️ Create Triage Tag & Route Patient"}
        </button>
      </form>
    </div>
  );
}

const s = {
  page: { maxWidth: 1000, animation: "fadeInUp 0.4s ease", fontFamily: "'Inter',system-ui,sans-serif" },
  header: { marginBottom: 28 },
  eyebrow: { fontSize: 10, fontWeight: 700, color: "var(--orange)", letterSpacing: "0.15em", marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", letterSpacing: "-0.02em", margin: "0 0 8px" },
  subtitle: { fontSize: 13, color: "var(--text-secondary)" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 },
  statCard: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 },
  form: { background: "var(--bg-input)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 18, padding: 28 },
  section: { marginBottom: 28, paddingBottom: 28, borderBottom: "1px solid var(--cyan-dim)" },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 },
  input: { display: "block", width: "100%", padding: "11px 14px", border: "1px solid var(--cyan-dim)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: "rgba(0,212,255,0.03)", color: "var(--text-primary)", outline: "none", transition: "all 0.2s" },
  miniLabel: { display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 500 },
  triageGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 },
  triageBtn: { padding: "14px 12px", border: "1px solid", borderRadius: 12, cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: "inherit", backdropFilter: "blur(10px)" },
  vitalsGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 14 },
  autoBtn: { width: "100%", padding: "11px", border: "1px solid rgba(0,212,255,0.25)", borderRadius: 10, background: "rgba(0,212,255,0.05)", color: "var(--cyan)", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit", transition: "all 0.2s" },
  chipGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { padding: "7px 14px", border: "1px solid var(--cyan-dim)", borderRadius: 20, background: "rgba(0,212,255,0.03)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", color: "var(--text-secondary)", transition: "all 0.2s" },
  routedBanner: { background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "var(--text-primary)", marginBottom: 20, lineHeight: 1.5 },
  submitBtn: { width: "100%", padding: 16, background: "linear-gradient(135deg, #f97316, #ea580c)", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", position: "relative", overflow: "hidden", boxShadow: "0 0 30px rgba(249,115,22,0.35)", transition: "all 0.2s" },
  submitGlow: { position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)", pointerEvents: "none" },
};
