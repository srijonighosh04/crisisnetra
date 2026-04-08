import React, { useEffect, useRef, useState } from "react";

export default function LiveMapPage() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    if (!window.google) return;
    const m = new window.google.maps.Map(mapRef.current, {
      center: { lat: 19.076, lng: 72.877 }, // Default center (Mumbai)
      zoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
         { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
         { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
         { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
         { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
         { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] }
      ]
    });
    setMap(m);

    // Fetch and display active route obstacles
    fetch("/api/routes/obstacles/active?min_severity=low")
      .then(r => r.json())
      .then(obstacles => {
        obstacles.forEach(obs => {
          if (obs.polygon && obs.polygon.length > 0) {
            const path = obs.polygon.map(p => ({ lat: p[0], lng: p[1] }));
            new window.google.maps.Polygon({
              paths: path,
              strokeColor: "#FF2D55",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: "#FF2D55",
              fillOpacity: 0.35,
              map: m
            });
          }
        });
      })
      .catch(console.error);

    // Render a few dummy hospital markers to showcase the live map
    const hospitals = [
      { name: "Mumbai General", lat: 19.076, lng: 72.877 },
      { name: "City Trauma Center", lat: 19.05, lng: 72.89 }
    ];
    hospitals.forEach(h => {
      new window.google.maps.Marker({
        position: { lat: h.lat, lng: h.lng },
        map: m,
        title: h.name,
        icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: "#00d4ff",
            fillOpacity: 1,
            strokeWeight: 0,
            scale: 8
        }
      });
    });
  }, []);

  return (
    <div style={s.page}>
      <div style={s.eyebrow}>GEO-TRACKING</div>
      <h1 style={s.title}>Live <span style={{ color: "var(--cyan)", textShadow: "0 0 20px rgba(0,212,255,0.4)" }}>Map</span></h1>
      <p style={s.subtitle}>Real-time visualization of facilities, incidents, and obstacles</p>
      
      <div style={s.mapContainer}>
        <div ref={mapRef} style={{ width: "100%", height: "100%", borderRadius: 14 }} />
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: "100%", height: "85vh", display: "flex", flexDirection: "column", animation: "fadeInUp 0.4s ease", fontFamily: "'Inter',system-ui,sans-serif" },
  eyebrow: { fontSize: 10, fontWeight: 700, color: "var(--cyan)", letterSpacing: "0.15em", marginBottom: 6 },
  title: { fontSize: 28, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Poppins',sans-serif", letterSpacing: "-0.02em", margin: "0 0 8px" },
  subtitle: { fontSize: 13, color: "var(--text-secondary)", marginBottom: 20 },
  mapContainer: { flex: 1, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: 4, position: "relative", overflow: "hidden", minHeight: 400 }
};
