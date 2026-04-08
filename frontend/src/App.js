import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import LoginPage, { auth } from "./pages/LoginPage";
import HospitalAlertPanel from "./pages/HospitalAlertPanel";
import Dashboard from "./pages/Dashboard";
import VolunteersPage from "./pages/VolunteersPage";
import TasksPage from "./pages/TasksPage";
import TriagePage from "./pages/TriagePage";
import RouteObstaclesPage from "./pages/RouteObstaclesPage";
import WeatherPredictionPage from "./pages/WeatherPredictionPage";
import LiveMapPage from "./pages/LiveMapPage";
import { useTheme } from "./theme";

const NAV_ITEMS = [
  { key: "dashboard",         label: "Dashboard",          icon: "⚡" },
  { key: "hospital-alert",    label: "Hospital Alert",     icon: "🏥" },
  { key: "triage",            label: "Triage System",      icon: "🏷️" },
  { key: "route-obstacles",   label: "Route Obstacles",    icon: "🚧" },
  { key: "weather-prediction",label: "Weather & Prediction",icon: "🌤️" },
  { key: "live-map",          label: "Live Map",           icon: "🗺️" },
  { key: "volunteers",        label: "Volunteers",         icon: "👥" },
  { key: "tasks",             label: "Tasks",              icon: "📋" },
];

// ── Theme toggle pill component ────────────────────────────────────────────────
function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{ marginBottom: 4 }}
    >
      <span style={{ fontSize: 15 }}>{dark ? "☀️" : "🌙"}</span>
      <span style={{ flex: 1, textAlign: "left" }}>
        {dark ? "Light Mode" : "Dark Mode"}
      </span>
      <div className={`toggle-track ${dark ? "" : "on"}`}>
        <div className="toggle-thumb" />
      </div>
    </button>
  );
}

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swRegistered, setSwRegistered] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { dark } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    if ("serviceWorker" in navigator) registerServiceWorker();
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      unsubscribe();
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
      setSwRegistered(true);
    } catch (e) {}
  };

  const handleLogout = async () => { await signOut(auth); setUser(null); };

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (authLoading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg-primary)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: "float 2s ease-in-out infinite" }}>🚨</div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 20, fontFamily: "'Inter', sans-serif" }}>
          Loading CrisisNetra...
        </div>
        <div style={{ width: 200, height: 2, background: "var(--cyan-dim)", borderRadius: 2, margin: "0 auto", overflow: "hidden" }}>
          <div style={{ height: "100%", width: "60%", background: "linear-gradient(90deg, var(--cyan), var(--purple))", borderRadius: 2, animation: "shimmer 1.5s infinite", backgroundSize: "200% auto" }} />
        </div>
      </div>
    </div>
  );

  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <div style={{
      display: "flex", minHeight: "100vh", position: "relative",
      overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif",
      background: "var(--bg-primary)", color: "var(--text-primary)",
    }}>
      {/* Background decorations */}
      <div style={{
        position: "fixed", inset: 0,
        backgroundImage: `linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)`,
        backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", top: "-20%", left: "-10%", width: "50vw", height: "50vh",
        background: `radial-gradient(ellipse, var(--glow1-color) 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "-20%", right: "-10%", width: "50vw", height: "50vh",
        background: `radial-gradient(ellipse, var(--glow2-color) 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Offline banner */}
      {!isOnline && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0,
          background: "linear-gradient(90deg, var(--orange), #ea580c)",
          color: "#fff", padding: "10px 20px", textAlign: "center",
          fontSize: 13, fontWeight: 600, zIndex: 1000,
          boxShadow: "0 0 20px rgba(249,115,22,0.5)",
        }}>
          📡 Offline — changes will sync on reconnect
        </div>
      )}

      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0, position: "relative", zIndex: 10,
        background: "var(--bg-sidebar)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid var(--border)",
        padding: "1.5rem 1rem",
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        {/* Top glow line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: "linear-gradient(90deg, transparent, var(--cyan-border), transparent)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 20, paddingBottom: 16,
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, fontSize: 20,
            background: "linear-gradient(135deg, var(--cyan-dim), var(--purple-dim))",
            border: "1px solid var(--cyan-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px var(--cyan-dim)",
          }}>🚨</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              CrisisNetra
            </div>
            <div style={{ fontSize: 10, color: "var(--cyan)", marginTop: 1, letterSpacing: "0.05em" }}>
              v4.0.0 {swRegistered && "· PWA"}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "10px 14px",
                border: "none", borderRadius: 10, cursor: "pointer",
                textAlign: "left", fontFamily: "inherit",
                fontSize: 13, fontWeight: page === item.key ? 600 : 500,
                position: "relative", overflow: "hidden",
                background: page === item.key ? "var(--cyan-dim)" : "transparent",
                color: page === item.key ? "var(--cyan)" : "var(--text-secondary)",
                transition: "all 0.2s",
              }}
            >
              {page === item.key && (
                <>
                  <div style={{
                    position: "absolute", left: 0, top: "20%", bottom: "20%", width: 3,
                    background: "linear-gradient(180deg, var(--cyan), var(--purple))",
                    borderRadius: "0 3px 3px 0", boxShadow: "0 0 8px var(--cyan)",
                  }} />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "radial-gradient(ellipse at left, var(--cyan-dim), transparent 70%)",
                    pointerEvents: "none",
                  }} />
                </>
              )}
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Theme toggle */}
        <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)", marginTop: 4 }}>
          <ThemeToggle />
        </div>

        {/* User badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--cyan-dim)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "10px 12px",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, var(--cyan-dim), var(--purple-dim))",
            border: "1px solid var(--cyan-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {user.photoURL
              ? <img src={user.photoURL} alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%" }} />
              : <span style={{ fontSize: 14, fontWeight: 700, color: "var(--cyan)" }}>{(user.email || "U")[0].toUpperCase()}</span>
            }
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.displayName || user.email}
            </div>
            <div style={{ fontSize: 10, color: "var(--green-ok)" }}>● Authenticated</div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--text-muted)", padding: 2, flexShrink: 0 }}
          >↩</button>
        </div>

        {/* Status badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--green-dim)", border: "1px solid var(--border)",
          borderRadius: 10, padding: "8px 12px",
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
            background: isOnline ? "var(--green-ok)" : "var(--orange)",
            animation: "pulse-dot 2s infinite",
          }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
              {isOnline ? "Online" : "Offline Mode"}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {isOnline ? "All systems operational" : "Auto-sync enabled"}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1, padding: "2rem 2.5rem", overflowY: "auto",
        position: "relative", zIndex: 5,
      }}>
        {page === "dashboard"          && <Dashboard onNavigate={setPage} />}
        {page === "hospital-alert"     && <HospitalAlertPanel />}
        {page === "triage"             && <TriagePage />}
        {page === "route-obstacles"    && <RouteObstaclesPage />}
        {page === "weather-prediction" && <WeatherPredictionPage />}
        {page === "live-map"           && <LiveMapPage />}
        {page === "volunteers"         && <VolunteersPage />}
        {page === "tasks"              && <TasksPage />}
      </main>
    </div>
  );
}
