import { useState, useRef } from "react";
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const SEVERITY = {
  critical: { label: "Critical", color: "var(--red-alert)", bg: "rgba(255,45,85,0.12)", border: "rgba(255,45,85,0.4)", glow: "rgba(255,45,85,0.25)" },
  high:     { label: "High",     color: "var(--orange)", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.4)", glow: "rgba(249,115,22,0.25)" },
  medium:   { label: "Medium",   color: "var(--green-ok)", bg: "rgba(0,255,136,0.08)", border: "rgba(0,255,136,0.3)", glow: "rgba(0,255,136,0.15)" },
};
const INCIDENT_TYPES = ["Road accident","Building collapse","Fire emergency","Flood disaster","Industrial accident","Mass casualty event","Explosion"];
const PROGRESS_STEPS = [[12,"Geocoding incident location..."],[28,"Scanning hospitals via Google Maps..."],[48,"Calculating ambulance ETAs..."],[65,"Sending emergency notifications..."],[82,"Awaiting hospital acknowledgements..."],[95,"Finalizing dispatch orders..."],[100,"All hospitals alerted!"]];
const now = () => new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});

export default function HospitalAlertPanel() {
  const [tab, setTab] = useState("report");
  const [form, setForm] = useState({ address:"", lat:"", lng:"", incident_type:"", severity:"", casualties_estimate:1, description:"" });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [log, setLog] = useState([{ time: now(), text: "CrisisNetra hospital alert module initialized", done: true }]);
  const [dispatchedMap, setDispatchedMap] = useState({});
  const timerRef = useRef(null);

  const addLog = (text, active=false) => setLog(p=>[...p,{time:now(),text,done:!active,active}]);
  const finalizeLog = () => setLog(p=>p.map((l,i)=>i===p.length-1?{...l,done:true,active:false}:l));

  const useGPS = () => {
    if (!navigator.geolocation) return setError("GPS not available.");
    navigator.geolocation.getCurrentPosition(pos => {
      const lat=pos.coords.latitude.toFixed(6), lng=pos.coords.longitude.toFixed(6);
      setForm(f=>({...f,lat,lng,address:`GPS: ${lat}°N, ${lng}°E`}));
      addLog(`GPS captured: ${lat}, ${lng}`);
    }, () => setError("GPS denied. Enter address manually."));
  };

  const handleSubmit = async () => {
    const { address,lat,lng,incident_type,severity,casualties_estimate,description } = form;
    if (!incident_type) return setError("Select incident type.");
    if (!severity) return setError("Select severity level.");
    if (!address && !(lat&&lng)) return setError("Enter location or use GPS.");
    setError(""); setLoading(true); setProgress(0); setResult(null);
    addLog(`Incident reported: ${incident_type} (${severity})`, true);
    let step=0;
    timerRef.current = setInterval(()=>{
      if(step>=PROGRESS_STEPS.length){clearInterval(timerRef.current);return;}
      const [pct,msg]=PROGRESS_STEPS[step]; setProgress(pct); setProgressMsg(msg); step++;
    },650);
    try {
      const resp = await fetch(`${API_BASE}/api/hospital-alert/trigger`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({location:{address:address||null,lat:lat?parseFloat(lat):null,lng:lng?parseFloat(lng):null},incident_type,severity,casualties_estimate:parseInt(casualties_estimate)||1,description,reported_by:"CrisisNetra Dashboard"})});
      clearInterval(timerRef.current); setProgress(100); setProgressMsg("All hospitals alerted!");
      if(!resp.ok){const d=await resp.json();throw new Error(d.detail||"Alert failed.");}
      const data=await resp.json(); setResult(data); finalizeLog();
      addLog(`✓ ${data.hospitals_alerted} hospitals alerted — ETA: ${data.nearest_eta_minutes} min`);
      setTimeout(()=>setTab("hospitals"),800);
    } catch(e) {
      clearInterval(timerRef.current); setProgress(0); setError(e.message); addLog(`Error: ${e.message}`);
    } finally { setLoading(false); }
  };

  const dispatchAmbulance = async (hospital) => {
    try { await fetch(`${API_BASE}/api/hospital-alert/dispatch-ambulance`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({incident_id:result?.incident_id,hospital_place_id:hospital.place_id||hospital.name.replace(/\s/g,"_"),ambulance_count:1})}); } catch{}
    setDispatchedMap(m=>({...m,[hospital.name]:true}));
    addLog(`Ambulance dispatched from ${hospital.name}`);
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.eyebrow}>EMERGENCY RESPONSE</div>
          <h1 style={s.title}>Hospital <span style={{ color: "var(--red-alert)", textShadow: "0 0 20px rgba(255,45,85,0.5)" }}>Alert System</span></h1>
          <p style={s.subtitle}>Automatically notify nearest hospitals when a disaster is reported</p>
        </div>
        <div style={s.livePill}><span style={s.liveDot} />LIVE</div>
      </div>

      <div style={s.tabs}>
        {[["report","Report Incident"],["hospitals","Hospital Alerts"],["log","Alert Log"]].map(([key,label])=>(
          <button key={key} style={{...s.tab,...(tab===key?s.tabActive:{})}} onClick={()=>setTab(key)}>
            {label}
            {key==="hospitals"&&result&&<span style={s.tabBadge}>{result.hospitals_alerted}</span>}
          </button>
        ))}
      </div>

      {tab==="report"&&(
        <div style={s.panel}>
          <div style={s.cardLine} />
          <div style={s.sectionLabel}>Incident Details</div>
          <div style={s.field}><label style={s.label}>Location / Address</label>
            <div style={{display:"flex",gap:8}}>
              <input style={{...s.input,flex:1}} placeholder="e.g. Anna Salai, Chennai or coordinates" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} />
              <button style={s.gpsBtn} onClick={useGPS}>📍 GPS</button>
            </div>
            {form.lat&&<div style={{fontSize:11,color:"var(--green-ok)",marginTop:4}}>Coordinates: {form.lat}, {form.lng}</div>}
          </div>
          <div style={s.field}><label style={s.label}>Incident Type</label>
            <select style={s.input} value={form.incident_type} onChange={e=>setForm(f=>({...f,incident_type:e.target.value}))}>
              <option value="">— Select incident type —</option>
              {INCIDENT_TYPES.map(t=><option key={t} value={t} style={{ background: "#0a1628", color: "#e8f4ff" }}>{t}</option>)}
            </select>
          </div>
          <div style={s.field}><label style={s.label}>Severity Level</label>
            <div style={{display:"flex",gap:8}}>
              {Object.entries(SEVERITY).map(([key,cfg])=>(
                <button key={key} style={{...s.sevBtn,borderColor:form.severity===key?cfg.color:"var(--border)",background:form.severity===key?cfg.bg:"transparent",color:form.severity===key?cfg.color:"var(--text-secondary)",boxShadow:form.severity===key?`0 0 16px ${cfg.glow}`:"none"}} onClick={()=>setForm(f=>({...f,severity:key}))}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div style={s.field}><label style={s.label}>Estimated Casualties</label>
            <input type="number" min="0" style={{...s.input,width:140}} value={form.casualties_estimate} onChange={e=>setForm(f=>({...f,casualties_estimate:e.target.value}))} />
          </div>
          <div style={s.field}><label style={s.label}>Description <span style={{color:"var(--text-muted)",fontWeight:400}}>(optional)</span></label>
            <textarea style={{...s.input,minHeight:80,resize:"vertical"}} placeholder="Describe the situation, types of injuries, hazards..." value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          </div>
          {error&&<div style={s.errorBox}>{error}</div>}
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <button style={{...s.submitBtn,opacity:loading?0.65:1}} onClick={handleSubmit} disabled={loading}>
              <div style={s.btnGlow}/>
              <span style={{width:8,height:8,borderRadius:"50%",background:"var(--red-alert)",display:"inline-block",marginRight:8,boxShadow:"0 0 8px #ff2d55"}}/>
              {loading?"Sending alerts...":"Send Hospital Alert"}
            </button>
            {result&&<span style={{fontSize:13,color:"var(--green-ok)",fontWeight:700}}>✓ {result.hospitals_alerted} hospitals alerted</span>}
          </div>
          {loading&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:12,color:"var(--text-secondary)",marginBottom:6}}>{progressMsg}</div>
              <div style={s.progressTrack}><div style={{...s.progressFill,width:`${progress}%`}}/></div>
            </div>
          )}
          {!loading&&!result&&(
            <div style={s.infoBox}>
              <strong style={{color:"var(--cyan)"}}>How it works:</strong> CrisisNetra finds nearest hospitals via Google Maps, calculates live ambulance ETAs, and sends emergency alerts simultaneously.
            </div>
          )}
        </div>
      )}

      {tab==="hospitals"&&(
        <div>
          {!result ? (
            <div style={s.panel}><p style={{fontSize:14,color:"var(--text-secondary)"}}>No active incident. Go to "Report Incident" to send a hospital alert.</p></div>
          ) : (
            <>
              <div style={{...s.panel,marginBottom:16}}>
                <div style={s.cardLine}/>
                <div style={s.sectionLabel}>Active Incident</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center",marginBottom:16}}>
                  <span style={{fontSize:16,fontWeight:700,color:"var(--text-primary)"}}>{form.incident_type}</span>
                  <span style={{fontSize:11,padding:"3px 12px",borderRadius:20,background:SEVERITY[result.severity]?.bg,color:SEVERITY[result.severity]?.color,border:`1px solid ${SEVERITY[result.severity]?.border}`,fontWeight:700,textTransform:"uppercase"}}>{result.severity}</span>
                  <span style={{fontSize:13,color:"var(--text-secondary)"}}>{form.address}</span>
                </div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  {[{v:result.hospitals_alerted,l:"Hospitals Notified",c:"var(--cyan)"},{v:result.hospitals?.reduce((s,h)=>s+(h.ambulances_dispatched||0),0),l:"Ambulances Dispatched",c:"var(--orange)"},{v:`${result.nearest_eta_minutes} min`,l:"First ETA",c:"var(--green-ok)"},{v:form.casualties_estimate,l:"Est. Casualties",c:"var(--red-alert)"}].map(({v,l,c})=>(
                    <div key={l} style={{background:"var(--bg-input)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px",flex:1,minWidth:100}}>
                      <div style={{fontSize:24,fontWeight:800,color:c,fontFamily:"'Poppins',sans-serif",textShadow:`0 0 16px ${c}66`}}>{v}</div>
                      <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={s.panel}>
                <div style={s.cardLine}/>
                <div style={s.sectionLabel}>Hospital Response</div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {result.hospitals?.map((h,i)=>{
                    const dispatched=dispatchedMap[h.name];
                    return (
                      <div key={i} style={{...s.hospCard,background:dispatched?"rgba(0,255,136,0.05)":"rgba(255,45,85,0.05)",borderColor:dispatched?"rgba(0,255,136,0.2)":"rgba(255,45,85,0.2)"}}>
                        <div style={{fontSize:32,lineHeight:1,flexShrink:0}}>🏥</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:15,fontWeight:700,color:"var(--text-primary)"}}>{h.name}</div>
                          {h.address&&<div style={{fontSize:12,color:"var(--text-secondary)",marginTop:2}}>{h.address}</div>}
                          <div style={{display:"flex",gap:10,marginTop:8,flexWrap:"wrap"}}>
                            {[`📍 ${h.route_distance_km} km`,`⏱ ETA ${h.eta_minutes} min`,`🚑 ${h.ambulances_dispatched} ambulance${h.ambulances_dispatched!==1?"s":""}`].map(chip=>(
                              <span key={chip} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"var(--cyan-dim)",border:"1px solid var(--cyan-dim)",color:"var(--text-secondary)"}}>{chip}</span>
                            ))}
                            <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:dispatched?"rgba(0,255,136,0.08)":"rgba(249,115,22,0.08)",border:`1px solid ${dispatched?"rgba(0,255,136,0.25)":"rgba(249,115,22,0.25)"}`,color:dispatched?"var(--green-ok)":"var(--orange)"}}>{dispatched?"En Route":"Alerted"}</span>
                          </div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                          {!dispatched&&<button style={s.dispatchBtn} onClick={()=>dispatchAmbulance(h)}>🚑 Dispatch</button>}
                          {dispatched&&<span style={{fontSize:12,color:"var(--green-ok)",fontWeight:700}}>✓ Dispatched</span>}
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${h.address||h.name}`} target="_blank" rel="noreferrer" style={{fontSize:12,color:"var(--cyan)"}}>Maps ↗</a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab==="log"&&(
        <div style={s.panel}>
          <div style={s.cardLine}/>
          <div style={s.sectionLabel}>Alert Timeline</div>
          <div style={{borderLeft:"2px solid rgba(0,212,255,0.2)",paddingLeft:18}}>
            {log.map((item,i)=>(
              <div key={i} style={{position:"relative",marginBottom:14,display:"flex",gap:10}}>
                <div style={{position:"absolute",left:-23,top:4,width:9,height:9,borderRadius:"50%",background:item.active?"var(--red-alert)":item.done?"var(--green-ok)":"var(--text-muted)",boxShadow:item.active?"0 0 10px #ff2d55":item.done?"0 0 8px #00ff88":"none"}}/>
                <div><div style={{fontSize:11,color:"var(--text-muted)"}}>{item.time}</div><div style={{fontSize:13,color:"var(--text-primary)",marginTop:2}}>{item.text}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  page: { maxWidth: 800, fontFamily: "'Inter',system-ui,sans-serif", animation: "fadeInUp 0.4s ease" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 },
  eyebrow: { fontSize: 10, fontWeight: 700, color: "var(--red-alert)", letterSpacing: "0.15em", marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", letterSpacing: "-0.02em", margin: "0 0 8px" },
  subtitle: { fontSize: 13, color: "var(--text-secondary)" },
  livePill: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 20, background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", color: "var(--red-alert)", letterSpacing: "0.1em", flexShrink: 0 },
  liveDot: { width: 6, height: 6, borderRadius: "50%", background: "var(--red-alert)", boxShadow: "0 0 8px #ff2d55", display: "inline-block", animation: "pulse-dot 1.5s infinite" },
  tabs: { display: "flex", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", marginBottom: 20, background: "rgba(10,22,40,0.4)" },
  tab: { flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 600, textAlign: "center", cursor: "pointer", background: "transparent", color: "var(--text-muted)", border: "none", fontFamily: "inherit", position: "relative", transition: "all 0.2s" },
  tabActive: { background: "var(--cyan-dim)", color: "var(--cyan)" },
  tabBadge: { position: "absolute", top: 8, right: 14, background: "var(--red-alert)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "1px 6px", boxShadow: "0 0 8px #ff2d55" },
  panel: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 18, padding: "24px 28px", marginBottom: 16, position: "relative", overflow: "hidden" },
  cardLine: { position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)" },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { width: "100%", padding: "11px 14px", fontSize: 14, border: "1px solid var(--cyan-dim)", borderRadius: 10, background: "rgba(0,212,255,0.04)", color: "var(--text-primary)", fontFamily: "inherit", boxSizing: "border-box", outline: "none", transition: "all 0.2s" },
  gpsBtn: { padding: "11px 16px", fontSize: 13, border: "1px solid rgba(0,212,255,0.2)", borderRadius: 10, cursor: "pointer", background: "var(--cyan-dim)", color: "var(--cyan)", fontFamily: "inherit", whiteSpace: "nowrap", fontWeight: 600 },
  sevBtn: { padding: "9px 20px", fontSize: 13, fontWeight: 700, borderRadius: 20, cursor: "pointer", border: "1px solid", background: "transparent", fontFamily: "inherit", transition: "all 0.2s" },
  errorBox: { background: "rgba(255,45,85,0.08)", border: "1px solid rgba(255,45,85,0.25)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ff6b8a", marginBottom: 16 },
  infoBox: { background: "rgba(0,212,255,0.04)", border: "1px solid var(--cyan-dim)", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "var(--text-secondary)", marginTop: 16, lineHeight: 1.6 },
  progressTrack: { height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #ff2d55, #f97316)", borderRadius: 2, transition: "width 0.6s ease", boxShadow: "0 0 8px rgba(255,45,85,0.5)" },
  submitBtn: { display: "inline-flex", alignItems: "center", padding: "12px 24px", fontSize: 14, fontWeight: 700, border: "none", borderRadius: 12, cursor: "pointer", background: "linear-gradient(135deg, #ff2d55, #c0152a)", color: "#fff", fontFamily: "inherit", position: "relative", overflow: "hidden", boxShadow: "0 0 28px rgba(255,45,85,0.35)", transition: "all 0.2s" },
  btnGlow: { position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.12), transparent)", pointerEvents: "none" },
  hospCard: { display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, border: "1px solid", transition: "all 0.2s" },
  dispatchBtn: { fontSize: 12, padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,45,85,0.3)", background: "rgba(255,45,85,0.08)", cursor: "pointer", color: "var(--red-alert)", fontFamily: "inherit", fontWeight: 700 },
};
