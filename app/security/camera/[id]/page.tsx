"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ORASecurityCameraPage() {
  const params = useParams();
  const router = useRouter();
  const cameraId = params.id as string;

  const [camera, setCamera] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [editing, setEditing] = useState(false);

  const [editCamera, setEditCamera] = useState({
    name: "",
    location: "",
    zone: "",
    status: "online",
    feedType: "simulated",
  });

  async function loadData() {
    try {
      const camRes = await fetch("/api/ora/security/cameras", { cache: "no-store" });
      const camData = await camRes.json();

      const foundCamera = (camData.cameras || []).find((cam: any) => cam.id === cameraId);
      setCamera(foundCamera || null);

      if (foundCamera && !editing) {
        setEditCamera({
          name: foundCamera.name || "",
          location: foundCamera.location || "",
          zone: foundCamera.zone || "",
          status: foundCamera.status || "online",
          feedType: foundCamera.feedType || "simulated",
        });
      }

      const evRes = await fetch("/api/ora/security/events", { cache: "no-store" });
      const evData = await evRes.json();

      const alRes = await fetch("/api/ora/security/alerts", { cache: "no-store" });
      const alData = await alRes.json();

      setEvents((evData.events || []).filter((event: any) => event.zone === foundCamera?.zone));
      setAlerts((alData.alerts || []).filter((alert: any) => alert.zone === foundCamera?.zone));

      if (foundCamera) {
        const analysisRes = await fetch(`/api/ora/security/analyze-camera?id=${foundCamera.id}`, {
          cache: "no-store",
        });

        const analysisData = await analysisRes.json();
        setAnalysis(analysisData.analysis || analysisData.results?.[0]?.analysis || null);
      }

      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("ORA Security camera page error:", err);
    }
  }

  async function saveCameraChanges() {
    if (!camera) return;

    try {
      setLoadingAction(true);

      await fetch("/api/ora/security/cameras/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: camera.id,
          name: editCamera.name,
          location: editCamera.location,
          zone: editCamera.zone,
          status: editCamera.status,
          feedType: editCamera.feedType,
        }),
      });

      setEditing(false);
      await loadData();
    } catch (err) {
      console.error("ORA Security edit camera error:", err);
    } finally {
      setLoadingAction(false);
    }
  }

  async function toggleCameraStatus() {
    if (!camera) return;

    try {
      setLoadingAction(true);

      await fetch("/api/ora/security/cameras/manage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: camera.id,
          status: camera.status === "online" ? "offline" : "online",
        }),
      });

      await loadData();
    } catch (err) {
      console.error("ORA Security toggle camera error:", err);
    } finally {
      setLoadingAction(false);
    }
  }

  async function analyzeCameraNow() {
    if (!camera) return;

    try {
      setLoadingAction(true);

      const res = await fetch(`/api/ora/security/analyze-camera?id=${camera.id}`, {
        cache: "no-store",
      });

      const data = await res.json();
      setAnalysis(data.analysis || data.results?.[0]?.analysis || null);
    } catch (err) {
      console.error("ORA Security analyze camera now error:", err);
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteCamera() {
    if (!camera) return;

    try {
      setLoadingAction(true);

      await fetch("/api/ora/security/cameras/manage", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: camera.id }),
      });

      router.push("/security");
    } catch (err) {
      console.error("ORA Security delete camera error:", err);
      setLoadingAction(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, [cameraId, editing]);

  const cardStyle = {
    background: "#0b1220",
    border: "1px solid #223344",
    borderRadius: 16,
    padding: 20,
  };

  const buttonStyle = {
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: "bold",
    fontFamily: "monospace",
  };

  const inputStyle = {
    background: "#071018",
    color: "#d7ffe0",
    border: "1px solid #334155",
    borderRadius: 10,
    padding: "12px",
    fontFamily: "monospace",
  };

  if (!camera) {
    return (
      <main style={{ minHeight: "100vh", background: "#071018", color: "#d7ffe0", padding: 40, fontFamily: "monospace" }}>
        <Link href="/security" style={{ color: "#93c5fd", textDecoration: "none" }}>
          ← Volver al dashboard
        </Link>
        <h1 style={{ color: "#ff8b8b", marginTop: 30 }}>Cámara no encontrada</h1>
        <p>ID: {cameraId}</p>
      </main>
    );
  }

  const online = camera.status === "online";
  const risk = analysis?.risk || "bajo";
  const riskColor = risk === "alto" ? "#ff6b6b" : risk === "medio" ? "#facc15" : "#7fffd4";
  const lastEvent = events.slice().reverse()[0];
  const lastAlert = alerts.slice().reverse()[0];

  return (
    <main style={{ minHeight: "100vh", background: "#071018", color: "#d7ffe0", padding: 40, fontFamily: "monospace" }}>
      <Link href="/security" style={{ color: "#93c5fd", textDecoration: "none", fontWeight: "bold" }}>
        ← Volver al dashboard
      </Link>

      <h1 style={{ fontSize: 52, color: "#7fffd4", marginBottom: 10, marginTop: 25 }}>
        ORA Security / Cámara
      </h1>

      <p style={{ color: "#7fffd4", marginBottom: 20 }}>
        ● LIVE {lastUpdate && `— última lectura: ${lastUpdate}`}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 30 }}>
        <button disabled={loadingAction} onClick={toggleCameraStatus} style={{ ...buttonStyle, background: online ? "#2a1010" : "#0f2d1d", color: online ? "#ff8b8b" : "#7fffd4", border: `1px solid ${online ? "#6a2a2a" : "#2e6d52"}` }}>
          {online ? "Poner offline" : "Poner online"}
        </button>

        <button disabled={loadingAction} onClick={analyzeCameraNow} style={{ ...buttonStyle, background: "#101826", color: "#facc15", border: "1px solid #334155" }}>
          Analizar cámara
        </button>

        <button disabled={loadingAction} onClick={() => setEditing(!editing)} style={{ ...buttonStyle, background: "#101826", color: "#93c5fd", border: "1px solid #334155" }}>
          {editing ? "Cerrar edición" : "Editar cámara"}
        </button>

        <button disabled={loadingAction} onClick={deleteCamera} style={{ ...buttonStyle, background: "#2a1010", color: "#ff8b8b", border: "1px solid #6a2a2a" }}>
          Borrar cámara
        </button>
      </div>

      {editing && (
        <div style={{ ...cardStyle, marginBottom: 30 }}>
          <h2 style={{ color: "#93c5fd" }}>Editar cámara</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <input style={inputStyle} value={editCamera.name} onChange={(e) => setEditCamera({ ...editCamera, name: e.target.value })} />
            <input style={inputStyle} value={editCamera.location} onChange={(e) => setEditCamera({ ...editCamera, location: e.target.value })} />
            <input style={inputStyle} value={editCamera.zone} onChange={(e) => setEditCamera({ ...editCamera, zone: e.target.value })} />

            <select style={inputStyle} value={editCamera.status} onChange={(e) => setEditCamera({ ...editCamera, status: e.target.value })}>
              <option value="online">online</option>
              <option value="offline">offline</option>
            </select>

            <select style={inputStyle} value={editCamera.feedType} onChange={(e) => setEditCamera({ ...editCamera, feedType: e.target.value })}>
              <option value="simulated">simulated</option>
              <option value="rtsp">rtsp</option>
              <option value="ip">ip</option>
            </select>
          </div>

          <button disabled={loadingAction} onClick={saveCameraChanges} style={{ ...buttonStyle, marginTop: 16, background: "#0f2d1d", color: "#7fffd4", border: "1px solid #2e6d52" }}>
            Guardar cambios
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 30 }}>
        <div style={{ ...cardStyle, border: `1px solid ${online ? "#2e6d52" : "#5c2b2b"}` }}>
          <h2 style={{ color: online ? "#7fffd4" : "#ff8b8b" }}>{camera.name}</h2>

          <div style={{ height: 380, marginTop: 20, borderRadius: 16, border: "1px solid #223344", background: "radial-gradient(circle at center, #102b3d 0%, #071018 70%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: online ? "#7fffd4" : "#ff8b8b", fontSize: 28, fontWeight: "bold" }}>
            <div>{online ? "FEED SIMULADO ACTIVO" : "CÁMARA OFFLINE"}</div>
            <div style={{ fontSize: 14, opacity: 0.65, marginTop: 12 }}>
              Preparado para feed {camera.feedType?.toUpperCase()}
            </div>
          </div>

          <p style={{ marginTop: 20 }}>ID: {camera.id}</p>
          <p>Ubicación: {camera.location}</p>
          <p>Zona: {camera.zone}</p>
          <p>Feed: {camera.feedType}</p>
          <p>Estado: {camera.status.toUpperCase()}</p>
        </div>

        <div style={{ ...cardStyle, border: `1px solid ${riskColor}` }}>
          <h2 style={{ color: riskColor }}>Observer</h2>
          <p>Riesgo: {risk.toUpperCase()}</p>
          <p>Estado: {analysis?.status || "estable"}</p>
          <p>Requiere humano: {analysis?.requiresHuman ? "Sí" : "No"}</p>
          <p style={{ marginTop: 20, opacity: 0.85 }}>
            {analysis?.recommendation || "Cámara operando normalmente."}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 30 }}>
        <div style={cardStyle}>
          <h2 style={{ color: "#7fffd4" }}>Último evento</h2>
          {lastEvent ? (
            <>
              <b>{lastEvent.eventType}</b>
              <p>{lastEvent.location}</p>
              <p>Zona: {lastEvent.zone}</p>
              <p>Confianza: {lastEvent.confidence ?? "N/A"}%</p>
              <p>Hora: {lastEvent.timestamp}</p>
            </>
          ) : (
            <p style={{ opacity: 0.6 }}>Sin eventos recientes.</p>
          )}
        </div>

        <div style={{ ...cardStyle, background: "#1a1010", border: "1px solid #4a2222" }}>
          <h2 style={{ color: "#ff8b8b" }}>Última alerta</h2>
          {lastAlert ? (
            <>
              <b>{lastAlert.title}</b>
              <p>{lastAlert.location}</p>
              <p>Zona: {lastAlert.zone}</p>
              <p>Nivel: {lastAlert.level}</p>
              <p>Hora: {lastAlert.timestamp}</p>
            </>
          ) : (
            <p style={{ opacity: 0.6 }}>Sin alertas recientes.</p>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ ...cardStyle, background: "#0d1a26", border: "1px solid #1d3b52" }}>
          <h2 style={{ color: "#7fffd4" }}>Eventos de esta zona</h2>
          <p>Total: {events.length}</p>

          {events.slice().reverse().map((event) => (
            <div key={event.id} style={{ marginTop: 12, padding: 10, border: "1px solid #183042", borderRadius: 10 }}>
              <b>{event.eventType}</b>
              <div>{event.location}</div>
              <div>Zona: {event.zone}</div>
              <div>Confianza: {event.confidence ?? "N/A"}%</div>
              <div>Hora: {event.timestamp}</div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, background: "#1a1010", border: "1px solid #4a2222" }}>
          <h2 style={{ color: "#ff8b8b" }}>Alertas de esta zona</h2>
          <p>Total: {alerts.length}</p>

          {alerts.slice().reverse().map((alert) => (
            <div key={alert.id} style={{ marginTop: 12, padding: 10, border: "1px solid #4a2222", borderRadius: 10 }}>
              <b>{alert.title}</b>
              <div>{alert.location}</div>
              <div>Zona: {alert.zone}</div>
              <div>Nivel: {alert.level}</div>
              <div>Hora: {alert.timestamp}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
