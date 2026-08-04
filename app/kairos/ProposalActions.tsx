"use client";

import { useState } from "react";

type ProposalActionsProps = {
  proposalId: string;
};

type ActionType = "" | "apply" | "deny" | "archive";

export default function ProposalActions({
  proposalId,
}: ProposalActionsProps) {
  const [busy, setBusy] = useState<ActionType>("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);

  async function run(action: Exclude<ActionType, "">) {
    setBusy(action);
    setMessage("");
    setOk(null);

    try {
      const res = await fetch("/api/kairos-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          action,
          proposalId,
        }),
      });

      const text = await res.text();
      let data: any = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok || data?.ok === false) {
        setOk(false);
        setMessage(data?.error || data?.message || "La acción falló.");
        return;
      }

      setOk(true);
      setMessage(data?.message || "Acción ejecutada.");

      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (e: any) {
      setOk(false);
      setMessage(e?.message || "Fallo ejecutando acción.");
    } finally {
      setBusy("");
    }
  }

  const buttonBase: React.CSSProperties = {
    padding: "10px 14px",
    cursor: "pointer",
    borderRadius: "10px",
    fontWeight: 800,
    fontFamily: "monospace",
    minWidth: "130px",
  };

  return (
    <div style={{ marginTop: "14px" }}>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={() => run("apply")}
          disabled={!!busy}
          style={{
            ...buttonBase,
            background: "#00ff88",
            color: "#000",
            border: "none",
          }}
        >
          {busy === "apply" ? "Aplicando..." : "✅ Aplicar"}
        </button>

        <button
          onClick={() => run("deny")}
          disabled={!!busy}
          style={{
            ...buttonBase,
            background: "#1b1010",
            color: "#ff8d8d",
            border: "1px solid #ff8080",
          }}
        >
          {busy === "deny" ? "Denegando..." : "❌ Denegar"}
        </button>

        <button
          onClick={() => run("archive")}
          disabled={!!busy}
          style={{
            ...buttonBase,
            background: "#2a2308",
            color: "#ffd86b",
            border: "1px solid #d4af37",
          }}
        >
          {busy === "archive" ? "Archivando..." : "📦 Archivar"}
        </button>
      </div>

      {message ? (
        <div
          style={{
            marginTop: "10px",
            color: ok ? "#9dffcc" : "#ffb3b3",
            border: ok
              ? "1px solid rgba(0,255,136,.18)"
              : "1px solid rgba(255,120,120,.25)",
            borderRadius: "10px",
            padding: "10px",
            background: ok ? "#081108" : "#160b0b",
          }}
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
