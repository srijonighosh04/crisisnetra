// theme.js
// CrisisNetra — Theme Context (Dark / Light mode)
// Stores preference in localStorage and applies CSS variables to :root

import { createContext, useContext, useState, useEffect } from "react";

// ── Token maps ─────────────────────────────────────────────────────────────────

const DARK = {
  "--bg-primary":       "#050914",
  "--bg-secondary":     "#0a1628",
  "--bg-tertiary":      "#0f1f3d",
  "--bg-card":          "rgba(10, 22, 40, 0.85)",
  "--bg-glass":         "rgba(15, 31, 61, 0.6)",
  "--bg-sidebar":       "rgba(5, 9, 20, 0.9)",
  "--bg-input":         "rgba(10, 22, 40, 0.6)",

  "--cyan":             "#00d4ff",
  "--cyan-dim":         "rgba(0, 212, 255, 0.15)",
  "--cyan-glow":        "0 0 20px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.1)",
  "--cyan-border":      "rgba(0, 212, 255, 0.3)",

  "--purple":           "#7c3aed",
  "--purple-light":     "#a855f7",
  "--purple-dim":       "rgba(124, 58, 237, 0.2)",

  "--orange":           "#f97316",
  "--orange-dim":       "rgba(249, 115, 22, 0.15)",

  "--red-alert":        "#ff2d55",
  "--red-dim":          "rgba(255, 45, 85, 0.15)",

  "--green-ok":         "#00ff88",
  "--green-dim":        "rgba(0, 255, 136, 0.12)",

  "--text-primary":     "#e8f4ff",
  "--text-secondary":   "#7aa3cc",
  "--text-muted":       "#3d5a7a",

  "--border":           "rgba(0, 212, 255, 0.12)",
  "--border-hover":     "rgba(0, 212, 255, 0.35)",

  "--shadow-card":      "0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(0,212,255,0.08) inset",
  "--shadow-glow":      "0 0 40px rgba(0,212,255,0.15)",

  "--grid-line":        "rgba(0, 212, 255, 0.03)",
  "--glow1-color":      "rgba(0, 212, 255, 0.06)",
  "--glow2-color":      "rgba(124, 58, 237, 0.08)",
};

const LIGHT = {
  "--bg-primary":       "#f0f4fa",
  "--bg-secondary":     "#ffffff",
  "--bg-tertiary":      "#e8eef8",
  "--bg-card":          "rgba(255, 255, 255, 0.95)",
  "--bg-glass":         "rgba(240, 244, 250, 0.85)",
  "--bg-sidebar":       "rgba(255, 255, 255, 0.98)",
  "--bg-input":         "rgba(240, 244, 250, 0.9)",

  "--cyan":             "#0284c7",
  "--cyan-dim":         "rgba(2, 132, 199, 0.12)",
  "--cyan-glow":        "0 0 20px rgba(2,132,199,0.2), 0 0 60px rgba(2,132,199,0.05)",
  "--cyan-border":      "rgba(2, 132, 199, 0.25)",

  "--purple":           "#7c3aed",
  "--purple-light":     "#9333ea",
  "--purple-dim":       "rgba(124, 58, 237, 0.1)",

  "--orange":           "#ea580c",
  "--orange-dim":       "rgba(234, 88, 12, 0.1)",

  "--red-alert":        "#e11d48",
  "--red-dim":          "rgba(225, 29, 72, 0.1)",

  "--green-ok":         "#16a34a",
  "--green-dim":        "rgba(22, 163, 74, 0.1)",

  "--text-primary":     "#0f172a",
  "--text-secondary":   "#475569",
  "--text-muted":       "#94a3b8",

  "--border":           "rgba(2, 132, 199, 0.15)",
  "--border-hover":     "rgba(2, 132, 199, 0.4)",

  "--shadow-card":      "0 4px 24px rgba(15,23,42,0.08), 0 1px 0 rgba(2,132,199,0.06) inset",
  "--shadow-glow":      "0 0 40px rgba(2,132,199,0.08)",

  "--grid-line":        "rgba(2, 132, 199, 0.04)",
  "--glow1-color":      "rgba(2, 132, 199, 0.04)",
  "--glow2-color":      "rgba(124, 58, 237, 0.04)",
};

// ── Apply tokens to :root ──────────────────────────────────────────────────────

function applyTheme(tokens) {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v));
}

// ── Context ────────────────────────────────────────────────────────────────────

const ThemeContext = createContext({ dark: true, toggle: () => {} });

export function ThemeProvider({ children }) {
  const stored = localStorage.getItem("cn_theme");
  const [dark, setDark] = useState(stored ? stored === "dark" : true);

  useEffect(() => {
    applyTheme(dark ? DARK : LIGHT);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("cn_theme", dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => setDark(d => !d);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
