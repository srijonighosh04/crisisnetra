import { useState, useEffect } from "react";

export default function WeatherPredictionPage() {
  const [alerts, setAlerts] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [region, setRegion] = useState("Mumbai");
  const [disasterType, setDisasterType] = useState("flood");
  const [severity, setSeverity] = useState(3);
  const [location] = useState({ lat: 19.076, lng: 72.877 });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetch(`/api/weather/alerts?lat=${location.lat}&lon=${location.lng}&radius_km=100`).then(r=>r.json()).then(setAlerts).catch(()=>{}); }, []);

  const generatePrediction = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/resources/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ region, disaster_type: disasterType, severity, lat: location.lat, lon: location.lng }) });
      setPrediction(await r.json());
    } catch (e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.eyebrow}>FORECASTING</div>
        <h1 style={s.title}>Weather & Resource <span style={{ color: "var(--cyan)", textShadow: "0 0 20px rgba(0,212,255,0.4)" }}>Prediction</span></h1>
        <p style={s.subtitle}>Predict resource needs before disasters strike using historical models</p>
      </div>

      {alerts.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={s.sectionLabel}>Active Weather Alerts</div>
          <div style={s.alertsGrid}>
            {alerts.map((alert, i) => (
              <div key={i} style={{ ...s.alertCard, borderLeftColor: alert.severity >= 4 ? "var(--red-alert)" : alert.severity >= 3 ? "var(--orange)" : "var(--cyan)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{alert.alert_type?.replace(/_/g, " ")}</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>{alert.affected_regions?.join(", ")}</div>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--cyan)" }}>
                  <span>🚑 {alert.predicted_ambulances_needed}</span>
                  <span>🏥 {alert.predicted_beds_needed}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={s.grid}>
        <div style={s.formCard}>
          <div style={s.cardTopLine} />
          <div style={s.cardTitle}>Predict Resources</div>
          <div style={s.field}><label style={s.miniLabel}>Region</label><input style={s.input} value={region} onChange={e=>setRegion(e.target.value)} /></div>
          <div style={s.field}><label style={s.miniLabel}>Disaster Type</label>
            <select style={s.input} value={disasterType} onChange={e=>setDisasterType(e.target.value)}>
              <option value="hurricane">Hurricane</option><option value="flood">Flood</option>
              <option value="tornado">Tornado</option><option value="earthquake">Earthquake</option>
              <option value="severe_weather">Severe Weather</option>
            </select>
          </div>
          <div style={s.field}>
            <label style={s.miniLabel}>Severity: <span style={{ color: "var(--cyan)", fontWeight: 700 }}>{severity}/5</span></label>
            <input type="range" min="1" max="5" value={severity} onChange={e=>setSeverity(+e.target.value)} style={{ width: "100%", marginTop: 10, accentColor: "var(--cyan)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}><span>Minor</span><span>Catastrophic</span></div>
          </div>
          <button onClick={generatePrediction} disabled={loading} style={s.predictBtn}>
            <div style={s.btnGlow} />
            {loading ? "Calculating..." : "🔮 Generate Prediction"}
          </button>
        </div>

        <div style={s.resultCard}>
          <div style={s.cardTopLine} />
          {!prediction ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 12, color: "var(--text-muted)" }}>
              <div style={{ fontSize: 40 }}>🔮</div>
              <div style={{ fontSize: 13 }}>Prediction results appear here</div>
            </div>
          ) : (
            <>
              <div style={s.cardTitle}>Predicted Resources</div>
              <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--cyan-dim)" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", marginBottom: 4 }}>{prediction.region}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", textTransform: "capitalize", marginBottom: 6 }}>{prediction.disaster_type?.replace(/_/g," ")}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green-ok)" }}>Confidence: {(prediction.confidence_score * 100).toFixed(0)}%</div>
              </div>
              <div style={s.resourcesGrid}>
                {[
                  { icon: "🚑", value: prediction.ambulances_needed, label: "Ambulances", color: "var(--red-alert)" },
                  { icon: "👨‍⚕️", value: prediction.medical_teams_needed, label: "Medical Teams", color: "var(--purple-light)" },
                  { icon: "🏥", value: prediction.beds_needed, label: "Hospital Beds", color: "var(--cyan)" },
                ].map(({ icon, value, label, color }) => (
                  <div key={label} style={s.resourceCard}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Poppins',sans-serif", textShadow: `0 0 16px ${color}66` }}>{value}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                  </div>
                ))}
              </div>
              {prediction.blood_units_needed && (
                <div style={s.bloodSection}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--red-alert)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>🩸 Blood Units Needed</div>
                  <div style={s.bloodGrid}>
                    {Object.entries(prediction.blood_units_needed).map(([type, units]) => (
                      <div key={type} style={s.bloodItem}><span style={{ fontWeight: 700, color: "var(--red-alert)" }}>{type}</span><span style={{ color: "var(--text-secondary)" }}>{units}u</span></div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 1200, animation: "fadeInUp 0.4s ease", fontFamily: "'Inter',system-ui,sans-serif" },
  header: { marginBottom: 28 },
  eyebrow: { fontSize: 10, fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.15em", marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", letterSpacing: "-0.02em", margin: "0 0 8px" },
  subtitle: { fontSize: 13, color: "var(--text-secondary)" },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 },
  alertsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 12 },
  alertCard: { background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid", backdropFilter: "blur(20px)", borderRadius: "0 12px 12px 0", padding: "14px 16px" },
  grid: { display: "grid", gridTemplateColumns: "380px 1fr", gap: 20 },
  formCard: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, position: "relative", overflow: "hidden" },
  resultCard: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 18, padding: 24, position: "relative", overflow: "hidden", minHeight: 300 },
  cardTopLine: { position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)" },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", marginBottom: 20 },
  field: { marginBottom: 18 },
  miniLabel: { display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { display: "block", width: "100%", padding: "10px 14px", border: "1px solid var(--cyan-dim)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", background: "rgba(0,212,255,0.04)", color: "var(--text-primary)", outline: "none", transition: "all 0.2s" },
  predictBtn: { width: "100%", padding: 14, background: "linear-gradient(135deg, #00d4ff, #0891b2)", color: "var(--bg-primary)", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", position: "relative", overflow: "hidden", boxShadow: "0 0 24px var(--cyan-border)", marginTop: 8 },
  btnGlow: { position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.15), transparent)", pointerEvents: "none" },
  resourcesGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 },
  resourceCard: { textAlign: "center", padding: 16, background: "rgba(0,212,255,0.04)", borderRadius: 12, border: "1px solid var(--cyan-dim)" },
  bloodSection: { background: "rgba(255,45,85,0.05)", borderRadius: 10, padding: 14, border: "1px solid var(--red-dim)" },
  bloodGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px,1fr))", gap: 6 },
  bloodItem: { display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "var(--bg-input)", borderRadius: 6, fontSize: 12 },
};
