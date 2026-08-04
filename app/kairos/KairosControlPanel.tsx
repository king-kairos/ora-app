"use client";

import React, { useState } from "react";

function readKairosSeal() {
  if (typeof window === "undefined") return "";

  return String(
    localStorage.getItem("KAIROS_PATCH_SECRET") ||
      localStorage.getItem("kairos_patch_secret") ||
      localStorage.getItem("KAIROS_SEAL") ||
      localStorage.getItem("kairos_seal") ||
      sessionStorage.getItem("KAIROS_PATCH_SECRET") ||
      sessionStorage.getItem("kairos_patch_secret") ||
      sessionStorage.getItem("KAIROS_SEAL") ||
      sessionStorage.getItem("kairos_seal") ||
      ""
  ).trim();
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export default function KairosControlPanel() {
  const [branchId, setBranchId] = useState("");
  const [branchName, setBranchName] = useState("");
  const [cloneId, setCloneId] = useState("");
  const [cloneName, setCloneName] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [type, setType] = useState<"idle" | "ok" | "error">("idle");
  const [lastResult, setLastResult] = useState<any>(null);

  function showOk(message: string, data?: any) {
    setType("ok");
    setMsg(message);
    if (data) setLastResult(data);
  }

  function showError(error: any) {
    setType("error");
    setMsg(error?.message || String(error));
  }

  async function runSystemAction(action: string) {
    setBusy(true);
    setMsg("");
    setLastResult(null);

    try {
      const res = await fetch("/api/ora/system/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ action }),
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "SYSTEM_ACTION_FAIL");
      }

      showOk(`Acción ejecutada: ${action}`, data);
    } catch (e: any) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  async function sendBranch() {
    if (!branchId.trim() || !branchName.trim()) return;

    setBusy(true);
    setMsg("");

    try {
      const res = await fetch("/api/ora/builder/branch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ id: branchId, name: branchName }),
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Error creando branch");
      }

      showOk("Branch creado correctamente.", data);
      setBranchId("");
      setBranchName("");
    } catch (e: any) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  async function sendClone() {
    if (!cloneId.trim() || !cloneName.trim()) return;

    setBusy(true);
    setMsg("");

    try {
      const res = await fetch("/api/ora/builder/clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ id: cloneId, name: cloneName }),
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Error creando clone");
      }

      showOk("Clone creado correctamente.", data);
      setCloneId("");
      setCloneName("");
    } catch (e: any) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={panel}>
      <h2 style={{ color: "#8fff6a" }}>CONTROL SOBERANO</h2>

      {msg && (
        <div style={{ marginBottom: 12, color: type === "error" ? "#ff6a6a" : "#00ff88" }}>
          {msg}
        </div>
      )}

      <div style={section}>
        <h3 style={title}>Acciones del sistema</h3>

        <div style={grid}>
          <button onClick={() => runSystemAction("pm2_status")} disabled={busy} style={buttonBlue}>
            PM2 STATUS
          </button>

          <button onClick={() => runSystemAction("build")} disabled={busy} style={button}>
            BUILD
          </button>

          <button onClick={() => runSystemAction("restart_front")} disabled={busy} style={button}>
            RESTART FRONT
          </button>

          <button onClick={() => runSystemAction("restart_core")} disabled={busy} style={button}>
            RESTART CORE
          </button>

          <button onClick={() => runSystemAction("deploy_full")} disabled={busy} style={buttonGold}>
            DEPLOY FULL
          </button>

          <button onClick={() => runSystemAction("logs_front")} disabled={busy} style={buttonDark}>
            LOGS FRONT
          </button>

          <button onClick={() => runSystemAction("logs_core")} disabled={busy} style={buttonDark}>
            LOGS CORE
          </button>
        </div>
      </div>

      <div style={section}>
        <h3 style={title}>Crear Branch</h3>

        <input value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="branch-id" style={input} />
        <input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Nombre del branch" style={input} />

        <button onClick={sendBranch} disabled={busy} style={button}>
          CREAR BRANCH
        </button>
      </div>

      <div style={section}>
        <h3 style={title}>Crear Clone</h3>

        <input value={cloneId} onChange={(e) => setCloneId(e.target.value)} placeholder="clone-id" style={input} />
        <input value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="Nombre del clone" style={input} />

        <button onClick={sendClone} disabled={busy} style={button}>
          CREAR CLONE
        </button>
      </div>

      {lastResult && (
        <div style={resultBox}>
          <h3 style={title}>Resultado</h3>
          <pre style={pre}>{JSON.stringify(lastResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

const panel: React.CSSProperties = {
  border: "1px solid rgba(0,255,136,.28)",
  borderRadius: "18px",
  padding: "22px",
  background: "rgba(8,18,12,.72)",
};

const section: React.CSSProperties = {
  marginBottom: 20,
  border: "1px solid rgba(0,255,136,.18)",
  borderRadius: 14,
  padding: 14,
  background: "#0b0b0b",
};

const title: React.CSSProperties = {
  color: "#d4af37",
  marginTop: 0,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 10,
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

const button: React.CSSProperties = {
  width: "100%",
  background: "#00ff41",
  color: "#000",
  padding: 10,
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
};

const buttonGold: React.CSSProperties = {
  ...button,
  background: "#d4af37",
};

const buttonBlue: React.CSSProperties = {
  ...button,
  background: "#1e90ff",
};

const buttonDark: React.CSSProperties = {
  ...button,
  background: "#111",
  color: "#00ff41",
  border: "1px solid #00ff41",
};

const resultBox: React.CSSProperties = {
  border: "1px solid rgba(0,255,136,.22)",
  borderRadius: 14,
  padding: 14,
  background: "#050505",
};

const pre: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  color: "#d9ffea",
  fontSize: 12,
  maxHeight: 360,
  overflow: "auto",
};
