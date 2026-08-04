"use client";

import { useEffect, useState } from "react";

type Observacion = {
  tipo?: string;
  mensaje?: string;
  accion_sugerida?: string;
  prioridad?: string;
};

export default function ObservacionesPanel() {
  const [items, setItems] = useState<Observacion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/ora-health/observaciones", {
        method: "GET",
        cache: "no-store",
      });

      const text = await res.text();

      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { ok: false, raw: text };
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "OBSERVACIONES_LOAD_FAIL");
      }

      const nextItems = Array.isArray(data?.observaciones)
        ? data.observaciones
        : [];

      setItems(nextItems);
      setTotal(Number(data?.total || nextItems.length || 0));
    } catch (e: any) {
      setError(e?.message || "No se pudieron cargar las observaciones.");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();

    const t = setInterval(() => {
      void load();
    }, 8000);

    return () => clearInterval(t);
  }, []);

  function priorityColor(value?: string) {
    const p = String(value || "").toLowerCase();
    if (p === "alta") return "#ff8a8a";
    if (p === "media") return "#ffd36a";
    return "#9dffcc";
  }

  return (
    <div
      style={{
        border: "1px solid rgba(0,255,136,.28)",
        borderRadius: "18px",
        padding: "22px",
        background: "rgba(8,18,12,.72)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: "#8fff6a" }}>Observaciones</h2>
          <div style={{ color: "#c4ffe2", marginTop: 6 }}>
            El observador analiza eventos recientes y propone señales útiles.
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(0,255,136,.25)",
            borderRadius: "999px",
            padding: "6px 12px",
            color: "#9dffcc",
            background: "#0f140f",
            fontSize: "13px",
          }}
        >
          total: {total}
        </div>
      </div>

      {loading ? (
        <div style={{ color: "#9dffcc" }}>Cargando observaciones...</div>
      ) : error ? (
        <div
          style={{
            color: "#ff9d9d",
            border: "1px solid rgba(255,120,120,.25)",
            background: "#140909",
            padding: "12px",
            borderRadius: "12px",
          }}
        >
          {error}
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            color: "#c4ffe2",
            border: "1px solid rgba(0,255,136,.18)",
            background: "#0b0b0b",
            padding: "12px",
            borderRadius: "12px",
          }}
        >
          No hay observaciones todavía.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                border: "1px solid rgba(0,255,136,.18)",
                borderRadius: "12px",
                padding: "14px",
                background: "#090909",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div style={{ color: "#8fff6a", fontWeight: 800 }}>
                  {item.tipo || "observacion"}
                </div>

                <div
                  style={{
                    color: priorityColor(item.prioridad),
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: "999px",
                    padding: "3px 10px",
                    fontSize: "12px",
                  }}
                >
                  prioridad: {item.prioridad || "normal"}
                </div>
              </div>

              <div style={{ color: "#e9fff4", marginBottom: "8px" }}>
                {item.mensaje || "Sin mensaje"}
              </div>

              <div style={{ color: "#9dffcc" }}>
                acción sugerida: {item.accion_sugerida || "N/D"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
