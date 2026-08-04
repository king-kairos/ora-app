"use client";

import { useEffect, useState } from "react";

type OrientacionItem = {
  id?: string;
  pacienteId?: string | null;
  pacienteNombre?: string | null;
  pregunta?: string;
  respuesta?: string;
  createdAt?: string;
  alertas?: string[];
  contexto?: string[];
};

export default function OrientacionesHistorialPanel() {
  const [items, setItems] = useState<OrientacionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/ora-health/orientaciones", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setError(data?.error || "No se pudo cargar el historial.");
        setItems([]);
        return;
      }

      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      setError(e?.message || "Error cargando historial.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div
      style={{
        marginTop: "24px",
        border: "1px solid #00ff88",
        borderRadius: "16px",
        padding: "16px",
        background: "#0b0b0b",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, color: "#8fff6a" }}>Historial de orientaciones</h2>

        <button
          onClick={() => void load()}
          style={{
            background: "transparent",
            color: "#00ff88",
            border: "1px solid #00ff88",
            padding: "8px 12px",
            borderRadius: "10px",
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          Recargar
        </button>
      </div>

      {loading ? (
        <div style={{ color: "#d8ffe8" }}>Cargando historial...</div>
      ) : error ? (
        <div style={{ color: "#ffb36a" }}>{error}</div>
      ) : items.length === 0 ? (
        <div style={{ color: "#d8ffe8" }}>No hay orientaciones guardadas.</div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {items.map((item, index) => (
            <div
              key={item.id || index}
              style={{
                border: "1px solid rgba(0,255,136,.2)",
                borderRadius: "12px",
                padding: "12px",
                background: "#081108",
              }}
            >
              <div style={{ color: "#8fff6a", fontWeight: 800 }}>
                {item.pacienteNombre || "Sin paciente"}{" "}
                <span style={{ color: "#b8ffd9", fontWeight: 400 }}>
                  {item.createdAt
                    ? `— ${new Date(item.createdAt).toLocaleString()}`
                    : ""}
                </span>
              </div>

              <div style={{ marginTop: "8px", color: "#d4af37" }}>
                <b>Pregunta:</b> {String(item.pregunta || "")}
              </div>

              <div style={{ marginTop: "8px", color: "#d8ffe8", whiteSpace: "pre-wrap" }}>
                <b>Respuesta:</b> {String(item.respuesta || "")}
              </div>

              {Array.isArray(item.contexto) && item.contexto.length > 0 ? (
                <div style={{ marginTop: "8px", color: "#9dffcc" }}>
                  <b>Contexto:</b>
                  <ul style={{ marginTop: "6px" }}>
                    {item.contexto.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(item.alertas) && item.alertas.length > 0 ? (
                <div style={{ marginTop: "8px", color: "#ffb36a" }}>
                  <b>Alertas:</b> {item.alertas.join(", ")}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
