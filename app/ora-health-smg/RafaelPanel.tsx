// app/ora-health-smg/RafaelPanel.tsx
"use client";

import { useEffect, useState } from "react";

type PacienteItem = {
  id?: string;
  nombre?: string;
  edad?: number;
  historial?: string;
};

type MensajeItem = {
  role: "user" | "assistant";
  content: string;
};

export default function RafaelPanel() {
  const [pregunta, setPregunta] = useState("");
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);
  const [pacientes, setPacientes] = useState<PacienteItem[]>([]);
  const [pacienteId, setPacienteId] = useState("");
  const [mensajes, setMensajes] = useState<MensajeItem[]>([]);

  async function cargarPacientes() {
    try {
      const res = await fetch("/api/ora-health/pacientes", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];

      setPacientes(items);

      // Arrancar limpio, sin paciente predeterminado
      setPacienteId("");
    } catch {
      setPacientes([]);
      setPacienteId("");
    }
  }

  useEffect(() => {
    void cargarPacientes();
    setRespuesta("");
    setMensajes([]);
  }, []);

  async function preguntar() {
    const texto = pregunta.trim();
    if (!texto) return;

    if (!pacienteId) {
      alert("Selecciona un paciente primero");
      return;
    }

    setLoading(true);

    const nextMensajes: MensajeItem[] = [
      ...mensajes,
      { role: "user", content: texto },
    ];
    setMensajes(nextMensajes);

    try {
      const payload = {
        pregunta: texto,
        pacienteId,
      };

      console.log("Rafael payload =>", payload);

      const res = await fetch("/api/ora-health/orientacion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      const textoRespuesta = String(
        data?.respuesta || data?.error || "Sin respuesta."
      );

      setRespuesta(textoRespuesta);
      setMensajes([
        ...nextMensajes,
        { role: "assistant", content: textoRespuesta },
      ]);
      setPregunta("");
    } catch {
      const errorMsg = "Error conectando con Rafael.";
      setRespuesta(errorMsg);
      setMensajes([
        ...nextMensajes,
        { role: "assistant", content: errorMsg },
      ]);
    } finally {
      setLoading(false);
    }
  }

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
      <h2 style={{ marginTop: 0, color: "#8fff6a" }}>Rafael — Orientación</h2>

      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: "#d8ffe8", marginBottom: "8px" }}>
          Paciente seleccionado
        </div>

        <select
          value={pacienteId}
          onChange={(e) => setPacienteId(e.target.value)}
          style={{
            width: "100%",
            background: "#111",
            color: "#00ff88",
            border: "1px solid #00ff88",
            padding: "10px",
            borderRadius: "10px",
            fontFamily: "monospace",
          }}
        >
          <option value="">Selecciona un paciente</option>
          {pacientes.map((p) => (
            <option key={String(p.id || "")} value={String(p.id || "")}>
              {String(p.nombre || "Paciente")} — {String(p.id || "")}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          border: "1px solid rgba(0,255,136,.2)",
          borderRadius: "12px",
          padding: "12px",
          minHeight: "120px",
          background: "#090909",
          marginBottom: "12px",
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
        }}
      >
        {mensajes.length === 0 ? (
          <div style={{ color: "#8fa08f" }}>
            Selecciona un paciente y escribe una consulta para recibir
            orientación clínica contextual basada en su historial.
          </div>
        ) : (
          mensajes.map((m, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <b style={{ color: m.role === "user" ? "#d4af37" : "#8fff6a" }}>
                {m.role === "user" ? "Tú" : "Rafael"}:
              </b>{" "}
              <span style={{ color: "#d8ffe8" }}>{m.content}</span>
            </div>
          ))
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 140px",
          gap: "10px",
        }}
      >
        <input
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Pregunta sobre salud..."
          style={{
            background: "#111",
            color: "#00ff88",
            border: "1px solid #00ff88",
            padding: "10px",
            borderRadius: "10px",
            fontFamily: "monospace",
          }}
        />

        <button
          onClick={preguntar}
          disabled={loading}
          style={{
            background: "#d4af37",
            color: "#000",
            border: "none",
            padding: "10px",
            borderRadius: "10px",
            fontWeight: 800,
            fontFamily: "monospace",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Preguntando..." : "Preguntar"}
        </button>
      </div>

      {respuesta ? (
        <div style={{ marginTop: "12px", color: "#b8ffd9" }}>
          Última respuesta activa cargada.
        </div>
      ) : null}
    </div>
  );
}
