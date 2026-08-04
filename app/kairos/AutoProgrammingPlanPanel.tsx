"use client";

import React, { useState } from "react";

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export default function AutoProgrammingPlanPanel() {
  const [intent, setIntent] = useState("");
  const [branch, setBranch] = useState("");
  const [busy, setBusy] = useState<"" | "plan" | "code" | "create">("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function callAutoprog(mode: "plan" | "code" | "create") {
    const cleanIntent = intent.trim();
    if (!cleanIntent) return;

    setBusy(mode);
    setError("");
    setResult(null);

    const url =
      mode === "plan"
        ? "/api/kairos/autoprog/plan-preview"
        : mode === "code"
        ? "/api/kairos/autoprog/code-preview"
        : "/api/kairos/autoprog/create-proposal";

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          intent: cleanIntent,
          branch: branch.trim() || undefined,
        }),
      });

      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || "AUTOPROG_FAIL");
      }

      setResult(data);

      if (mode === "create") {
        setTimeout(() => window.location.reload(), 900);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy("");
    }
  }

  const content = result?.content || result?.proposal?.files?.[0]?.content;

  return (
    <div style={box}>
      <h3 style={title}>AUTO PROGRAMMING PLAN</h3>

      <p style={text}>
        Escribe una intención. ORA selecciona esencia, infiere archivos, mide riesgo,
        genera preview de código y crea proposal. Nada se ejecuta sin Sello de Kairos.
      </p>

      <textarea
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        placeholder="Ej: Crear rama ORA Pollera con dashboard operativo para producción diaria"
        style={textarea}
      />

      <input
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
        placeholder="Rama opcional: security, health, pollera..."
        style={input}
      />

      <div style={row}>
        <button onClick={() => callAutoprog("plan")} disabled={!!busy} style={button}>
          {busy === "plan" ? "GENERANDO..." : "GENERAR PLAN"}
        </button>

        <button onClick={() => callAutoprog("code")} disabled={!!busy} style={blueButton}>
          {busy === "code" ? "GENERANDO..." : "GENERAR CODE PREVIEW"}
        </button>

        <button onClick={() => callAutoprog("create")} disabled={!!busy} style={greenButton}>
          {busy === "create" ? "CREANDO..." : "CREAR PROPOSAL REAL"}
        </button>
      </div>

      {error && <div style={errorBox}>ERROR: {error}</div>}

      {result && (
        <div style={resultBox}>
          <h4 style={title}>Resumen</h4>

          <div style={summaryGrid}>
            <div><b>Modo:</b> {result.mode || "N/A"}</div>
            <div><b>Esencia:</b> {result.proposedBy || result.plan?.proposedBy || "N/A"}</div>
            <div><b>Riesgo:</b> {result.risk || result.plan?.risk || "N/A"}</div>
            <div><b>Target:</b> {result.target || result.plan?.targetFiles?.[0] || "N/A"}</div>
          </div>

          {result.plan?.targetFiles?.length > 0 && (
            <>
              <h4 style={title}>Archivos objetivo</h4>
              <pre style={pre}>{result.plan.targetFiles.join("\n")}</pre>
            </>
          )}

          {content && (
            <>
              <h4 style={title}>Código generado</h4>
              <pre style={codePre}>{content}</pre>
            </>
          )}

          {false && (
            <>
              <h4 style={title}>Respuesta completa</h4>
              <pre style={pre}>{JSON.stringify(result, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const box: React.CSSProperties = {
  border: "1px solid rgba(0,255,136,.28)",
  borderRadius: 14,
  padding: 14,
  background: "#070b08",
  marginBottom: 16,
};

const title: React.CSSProperties = {
  color: "#d4af37",
  marginTop: 0,
};

const text: React.CSSProperties = {
  color: "#b8ffd9",
  lineHeight: 1.5,
};

const textarea: React.CSSProperties = {
  width: "100%",
  minHeight: 90,
  background: "#111",
  color: "#00ff41",
  border: "1px solid #222",
  padding: 10,
  borderRadius: 10,
  marginBottom: 8,
};

const input: React.CSSProperties = {
  width: "100%",
  background: "#111",
  color: "#00ff41",
  border: "1px solid #222",
  padding: 10,
  borderRadius: 10,
  marginBottom: 8,
};

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 10,
};

const button: React.CSSProperties = {
  width: "100%",
  background: "#d4af37",
  color: "#000",
  border: "none",
  borderRadius: 10,
  padding: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const blueButton: React.CSSProperties = {
  width: "100%",
  background: "#00c8ff",
  color: "#001018",
  border: "none",
  borderRadius: 10,
  padding: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const greenButton: React.CSSProperties = {
  width: "100%",
  background: "#00ff41",
  color: "#000",
  border: "none",
  borderRadius: 10,
  padding: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const errorBox: React.CSSProperties = {
  marginTop: 10,
  color: "#ff6a6a",
  fontWeight: 700,
};

const resultBox: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid rgba(0,255,136,.2)",
  borderRadius: 10,
  padding: 10,
  background: "#050505",
};

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  color: "#d9ffea",
  marginBottom: 12,
};

const pre: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  color: "#d9ffea",
  fontSize: 12,
  overflowX: "auto",
};

const codePre: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  color: "#9fffc9",
  fontSize: 12,
  overflowX: "auto",
  border: "1px solid rgba(0,255,136,.25)",
  borderRadius: 10,
  padding: 10,
  background: "#020402",
};
