"use client";

import { useState } from "react";

export default function ObservatorioButton() {
  const [loadingObservatory, setLoadingObservatory] = useState(false);

  async function runObservatoryDetect() {
    try {
      setLoadingObservatory(true);

      const res = await fetch("/api/autoprog/detect", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();

      if (data?.ok) {
        alert(
          `Observatorio ejecutado correctamente. Propuestas creadas: ${
            data?.createdCount ?? 0
          }`
        );
      } else {
        alert(`Falló el observatorio: ${data?.error || "Error desconocido"}`);
      }

      window.location.reload();
    } catch (error) {
      console.error("Error ejecutando observatorio:", error);
      alert("Error ejecutando observatorio.");
    } finally {
      setLoadingObservatory(false);
    }
  }

  return (
    <button
      onClick={runObservatoryDetect}
      disabled={loadingObservatory}
      style={{
        cursor: loadingObservatory ? "not-allowed" : "pointer",
        minHeight: "44px",
        padding: "10px 14px",
        backgroundColor: "#111",
        color: "#00ff88",
        border: "1px solid #00ff88",
        borderRadius: "10px",
        fontFamily: "monospace",
        fontWeight: 700,
        opacity: loadingObservatory ? 0.7 : 1,
      }}
      type="button"
    >
      {loadingObservatory
        ? "⏳ Escaneando Observatorio..."
        : "🧠 Escanear con Observatorio"}
    </button>
  );
}
