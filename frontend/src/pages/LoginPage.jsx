import { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

let app, auth;
try { app = initializeApp(firebaseConfig); auth = getAuth(app); }
catch (e) { const { getApp } = require("firebase/app"); app = getApp(); auth = getAuth(app); }

export { auth };

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { const r = await signInWithEmailAndPassword(auth, email, password); onLogin(r.user); }
    catch (err) { setError(err.message.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, "")); }
    finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    setError(""); setLoading(true);
    try { const r = await signInWithPopup(auth, new GoogleAuthProvider()); onLogin(r.user); }
    catch (err) { setError(err.message.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, "")); }
    finally { setLoading(false); }
  };

  return (
    <div style={s.wrapper}>
      <div style={s.bgGrid} />
      <div style={s.bgGlow} />
      <div style={s.bgGlowPurple} />

      <div style={s.card}>
        <div style={s.cardTopLine} />
        <div style={s.logo}>
          <div style={s.logoIcon}>🚨</div>
          <div>
            <div style={s.title}>CrisisNetra</div>
            <div style={s.subtitle}>Disaster Relief Coordination</div>
          </div>
        </div>

        <button style={s.googleBtn} onClick={handleGoogleLogin} disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 10 }}>
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
          </svg>
          Continue with Google
        </button>

        <div style={s.divider}><div style={s.dividerLine} /><span style={s.dividerText}>or sign in with email</span><div style={s.dividerLine} /></div>

        <form onSubmit={handleEmailLogin}>
          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={s.input} placeholder="you@organization.org" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={s.input} placeholder="••••••••" required />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button type="submit" style={s.submitBtn} disabled={loading}>
            <div style={s.submitBtnGlow} />
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <p style={s.note}>Access restricted to authorized relief coordinators and volunteers.</p>
      </div>
    </div>
  );
}

const s = {
  wrapper: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", padding: 20, position: "relative", overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif" },
  bgGrid: { position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" },
  bgGlow: { position: "fixed", top: "-30%", left: "-20%", width: "60vw", height: "60vh", background: "radial-gradient(ellipse, var(--cyan-dim) 0%, transparent 70%)", pointerEvents: "none" },
  bgGlowPurple: { position: "fixed", bottom: "-30%", right: "-20%", width: "60vw", height: "60vh", background: "radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)", pointerEvents: "none" },
  card: { background: "var(--bg-card)", backdropFilter: "blur(24px)", border: "1px solid var(--cyan-dim)", borderRadius: 20, padding: "40px 44px", width: "100%", maxWidth: 420, position: "relative", boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.05) inset", animation: "fadeInUp 0.5s ease" },
  cardTopLine: { position: "absolute", top: 0, left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)" },
  logo: { display: "flex", alignItems: "center", gap: 14, marginBottom: 32 },
  logoIcon: { width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, var(--cyan-dim), var(--purple-dim))", border: "1px solid var(--cyan-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "0 0 24px rgba(0,212,255,0.2)" },
  title: { fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Poppins', sans-serif", letterSpacing: "-0.02em" },
  subtitle: { fontSize: 12, color: "var(--cyan)", marginTop: 2 },
  googleBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "12px 16px", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 10, background: "rgba(0,212,255,0.05)", fontSize: 14, fontWeight: 500, color: "var(--text-primary)", cursor: "pointer", fontFamily: "inherit", marginBottom: 20, transition: "all 0.2s" },
  divider: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, background: "var(--border)" },
  dividerText: { fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" },
  input: { width: "100%", padding: "11px 14px", border: "1px solid var(--cyan-dim)", borderRadius: 10, fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box", background: "rgba(0,212,255,0.04)", color: "var(--text-primary)", transition: "all 0.2s" },
  error: { background: "rgba(255,45,85,0.1)", border: "1px solid rgba(255,45,85,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#ff6b8a", marginBottom: 14 },
  submitBtn: { width: "100%", padding: "12px 16px", background: "linear-gradient(135deg, #00d4ff, #0891b2)", color: "var(--bg-primary)", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4, position: "relative", overflow: "hidden", boxShadow: "0 0 24px var(--cyan-border)", transition: "all 0.2s" },
  submitBtnGlow: { position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)", pointerEvents: "none" },
  note: { fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 24, lineHeight: 1.5 },
};
