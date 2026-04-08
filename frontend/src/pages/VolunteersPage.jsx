import { useState, useEffect } from "react";
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function VolunteersPage() {
  const [volunteers, setVolunteers] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", status: "" });

  const fetchVolunteers = () => {
    fetch(`${API_BASE}/api/volunteers`).then(r=>r.json()).then(setVolunteers).catch(()=>{});
  };

  useEffect(() => { fetchVolunteers(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name || !phone) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/volunteers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, skills: [], status: "active" })
      });
      setName("");
      setPhone("");
      fetchVolunteers();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to remove this volunteer?")) return;
    try {
      await fetch(`${API_BASE}/api/volunteers/${id}`, { method: "DELETE" });
      fetchVolunteers();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setEditForm({ name: v.name, phone: v.phone, status: v.status || "active" });
  };

  const handleSave = async (id) => {
    try {
      await fetch(`${API_BASE}/api/volunteers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      });
      setEditingId(null);
      fetchVolunteers();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.eyebrow}>PERSONNEL</div>
      <h1 style={s.title}>Volunteers <span style={{ color: "var(--purple-light)", textShadow: "0 0 20px rgba(168,85,247,0.4)" }}>Registry</span></h1>
      <p style={s.subtitle}>Manage and track registered relief volunteers</p>

      <form onSubmit={handleAdd} style={s.formGroup}>
        <input style={s.input} placeholder="Volunteer Name" value={name} onChange={e=>setName(e.target.value)} required />
        <input style={s.input} placeholder="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} required />
        <button type="submit" disabled={loading} style={s.button}>{loading ? "..." : "Add Volunteer"}</button>
      </form>

      {volunteers.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>No volunteers found</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Add volunteers via the Firebase console under the <code style={{ color: "var(--cyan)" }}>volunteers</code> collection.</div>
        </div>
      ) : (
        <div style={s.list}>
          {volunteers.map((v, i) => {
            const isEditing = editingId === v.id;
            return (
              <div key={v.id || i} style={s.card}>
                <div style={s.cardLine} />
                <div style={s.avatar}>{(editForm.name || v.name || "V")[0].toUpperCase()}</div>
                
                <div style={{ flex: 1 }}>
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <input 
                        style={s.editInput} 
                        value={editForm.name} 
                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Name"
                      />
                      <input 
                        style={s.editInput} 
                        value={editForm.phone} 
                        onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="Phone"
                      />
                      <select 
                        style={s.editInput} 
                        value={editForm.status} 
                        onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                      >
                        <option value="active">Active</option>
                        <option value="on_task">On Task</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{v.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>{v.phone}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => startEdit(v)} style={s.iconBtn} title="Edit Volunteer">✏️</button>
                        <button onClick={() => handleDelete(v.id)} style={s.deleteBtn} title="Remove Volunteer">✕</button>
                      </div>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button onClick={() => handleSave(v.id)} style={s.saveBtn}>Save</button>
                    <button onClick={() => setEditingId(null)} style={s.cancelBtn}>Cancel</button>
                  </div>
                ) : (
                  <span style={{ ...s.statusPill, background: v.status === "active" ? "rgba(0,255,136,0.1)" : "rgba(249,115,22,0.1)", borderColor: v.status === "active" ? "rgba(0,255,136,0.3)" : "rgba(249,115,22,0.3)", color: v.status === "active" ? "var(--green-ok)" : "var(--orange)" }}>
                    {v.status || "active"}
                  </span>
                )}
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
  eyebrow: { fontSize: 10, fontWeight: 700, color: "var(--purple-light)", letterSpacing: "0.15em", marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", letterSpacing: "-0.02em", margin: "0 0 8px" },
  subtitle: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 28 },
  emptyState: { background: "var(--bg-input)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 18, padding: "48px 32px", textAlign: "center" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: { background: "var(--bg-card)", backdropFilter: "blur(20px)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, position: "relative", overflow: "hidden", transition: "all 0.2s" },
  cardLine: { position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg, #00d4ff, #7c3aed)" },
  avatar: { width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, var(--cyan-dim), var(--purple-dim))", border: "1px solid rgba(0,212,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "var(--cyan)", flexShrink: 0 },
  statusPill: { fontSize: 11, padding: "4px 12px", borderRadius: 20, border: "1px solid", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  formGroup: { display: "flex", gap: "10px", marginBottom: "20px", background: "var(--bg-card)", padding: "16px", borderRadius: "14px", border: "1px solid var(--border)" },
  input: { flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", outline: "none" },
  button: { padding: "10px 20px", borderRadius: "8px", background: "var(--cyan)", color: "#000", fontWeight: 600, border: "none", cursor: "pointer" },
  deleteBtn: { background: "rgba(255, 45, 85, 0.1)", border: "1px solid rgba(255, 45, 85, 0.2)", color: "var(--red-alert)", borderRadius: "6px", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px", transition: "all 0.2s", padding: 0 },
  editInput: { padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-input)", color: "var(--text-primary)", fontSize: "13px", outline: "none" },
  iconBtn: { background: "rgba(0, 212, 255, 0.1)", border: "1px solid rgba(0, 212, 255, 0.2)", color: "var(--cyan)", borderRadius: "6px", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "12px", transition: "all 0.2s" },
  saveBtn: { padding: "6px 14px", borderRadius: "6px", background: "var(--green-ok)", color: "#000", fontWeight: 700, border: "none", cursor: "pointer", fontSize: "11px" },
  cancelBtn: { padding: "6px 14px", borderRadius: "6px", background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", fontSize: "11px" }
};
