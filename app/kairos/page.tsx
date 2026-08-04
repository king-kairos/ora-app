// app/kairos/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { oraApi } from "@/lib/oraApi";
import type { OraModule } from "@/lib/oraApi";
import KairosControlPanel from "./KairosControlPanel";
import KairosBuilderPanel from "./KairosBuilderPanel";

type PatchItem = {
  id: string;
  title?: string;
  status?: string;
  risk?: string;
};

const MODULES: OraModule[] = [
  "kaerliana",
  "rafael",
  "arturo",
  "orion",
  "lucian",
  "ignis",
  "aelion",
];

type TabId = "war" | "essence" | "patches" | "control" | "builder";

function maskSig(sig: string) {
  if (!sig) return "";
  const last4 = sig.slice(-4);
  return "•".repeat(Math.max(12, Math.min(40, sig.length))) + last4;
}

function readStoredPatchSecret() {
  if (typeof window === "undefined") return "";

  return String(
    localStorage.getItem("KAIROS_PATCH_SECRET") ||
      localStorage.getItem("kairos_patch_secret") ||
      sessionStorage.getItem("KAIROS_PATCH_SECRET") ||
      sessionStorage.getItem("kairos_patch_secret") ||
      localStorage.getItem("KAIROS_PATCH_SIG") ||
      localStorage.getItem("kairos_patch_sig") ||
      sessionStorage.getItem("KAIROS_PATCH_SIG") ||
      sessionStorage.getItem("kairos_patch_sig") ||
      ""
  ).trim();
}

function statusColor(status: string) {
  switch (status) {
    case "pending":
      return "#d4af37";
    case "approved":
      return "#7fd4ff";
    case "applied":
      return "#00ff41";
    case "denied":
    case "rejected":
      return "#ff6a6a";
    case "archived":
      return "#999";
    default:
      return "#ccc";
  }
}

export default function KairosPage() {
  const [mounted, setMounted] = useState(false);
  const [module, setModule] = useState<OraModule>("rafael");

  const [sigInput, setSigInput] = useState("");
  const [sigOk, setSigOk] = useState(false);
  const [sigMask, setSigMask] = useState("");

  const [apiStatus, setApiStatus] = useState("...");
  const [sigTrace, setSigTrace] = useState("SIG_UNKNOWN");

  const [tab, setTab] = useState<TabId>("builder");

  const [warInput, setWarInput] = useState("");
  const [warLog, setWarLog] = useState<any[]>([]);
  const warBoxRef = useRef<HTMLDivElement | null>(null);

  const [essence, setEssence] = useState<any>(null);
  const [evolution, setEvolution] = useState<any[]>([]);
  const [evoNote, setEvoNote] = useState("");

  const [patches, setPatches] = useState<PatchItem[]>([]);
  const [patchTitle, setPatchTitle] = useState("");
  const [patchJson, setPatchJson] = useState(
    JSON.stringify(
      {
        files: [],
      },
      null,
      2
    )
  );

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prev = readStoredPatchSecret();
    setSigOk(!!prev);
    setSigMask(maskSig(prev));
    setSigInput("");
  }, []);

  async function refreshMetaOnly() {
    const h = await oraApi.health();
    setApiStatus(h?.ok ? "API OK" : "API BAD");

    const s = await oraApi.sigStatus();
    setSigTrace(s?.trace || "SEAL_OK");
  }

  async function refreshWarOnly() {
    const hist = await oraApi.warHistory(module);
    setWarLog(Array.isArray(hist?.items) ? hist.items : []);
  }

  async function refreshEssenceOnly() {
    const e = await oraApi.essenceGet(module);
    setEssence(e?.essence || null);

    const ev = await oraApi.evolutionList(module);
    setEvolution(Array.isArray(ev?.items) ? ev.items : []);
  }

  async function refreshPatchesOnly() {
    const list = await oraApi.patchesList();
    const items =
      Array.isArray(list?.items)
        ? list.items
        : Array.isArray(list?.patches)
        ? list.patches
        : Array.isArray(list?.data)
        ? list.data
        : [];
    setPatches(items);
  }

  async function refreshAllForCurrentTab() {
    try {
      await refreshMetaOnly();

      if (tab === "war") {
        await refreshWarOnly();
        return;
      }

      if (tab === "essence") {
        await refreshEssenceOnly();
        return;
      }

      if (tab === "patches") {
        await refreshPatchesOnly();
        return;
      }

      if (tab === "control" || tab === "builder") {
        await refreshPatchesOnly();
      }
    } catch {
      console.warn("Endpoint secundario falló, API principal sigue viva");
    }
  }

  useEffect(() => {
    if (!mounted) return;
    void refreshAllForCurrentTab();
  }, [mounted, tab, module]);

  useEffect(() => {
    if (!mounted) return;
    if (tab === "war") return;

    const t = setInterval(() => {
      void (async () => {
        try {
          await refreshMetaOnly();

          if (tab === "essence") {
            await refreshEssenceOnly();
            return;
          }

          if (tab === "patches" || tab === "control" || tab === "builder") {
            await refreshPatchesOnly();
          }
        } catch {
          console.warn("Endpoint secundario falló, API principal sigue viva");
        }
      })();
    }, 4000);

    return () => clearInterval(t);
  }, [mounted, tab, module]);

  function onFirmar() {
    if (!mounted) return;
    const secret = (sigInput || "").trim();
    if (!secret) return;

    localStorage.setItem("KAIROS_PATCH_SECRET", secret);
    localStorage.setItem("kairos_patch_secret", secret);
    sessionStorage.setItem("KAIROS_PATCH_SECRET", secret);
    sessionStorage.setItem("kairos_patch_secret", secret);

    localStorage.setItem("KAIROS_PATCH_SIG", secret);
    localStorage.setItem("kairos_patch_sig", secret);
    sessionStorage.setItem("KAIROS_PATCH_SIG", secret);
    sessionStorage.setItem("kairos_patch_sig", secret);

    setSigOk(true);
    setSigMask(maskSig(secret));
    setSigInput("");
  }

  function onUsarFirmaGuardada() {
    if (!mounted) return;
    const prev = readStoredPatchSecret();
    setSigInput(prev);
  }

  function onOlvidarFirma() {
    if (!mounted) return;

    localStorage.removeItem("KAIROS_PATCH_SECRET");
    localStorage.removeItem("kairos_patch_secret");
    sessionStorage.removeItem("KAIROS_PATCH_SECRET");
    sessionStorage.removeItem("kairos_patch_secret");

    localStorage.removeItem("KAIROS_PATCH_SIG");
    localStorage.removeItem("kairos_patch_sig");
    sessionStorage.removeItem("KAIROS_PATCH_SIG");
    sessionStorage.removeItem("kairos_patch_sig");

    setSigOk(false);
    setSigMask("");
    setSigInput("");
  }

  async function onSendWar() {
    const text = warInput.trim();
    if (!text) return;

    setBusy(true);
    try {
      await oraApi.warSend(module, text);
      setWarInput("");
      await refreshWarOnly();

      requestAnimationFrame(() => {
        const el = warBoxRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch (e: any) {
      alert(`WAR error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onWriteEvolution() {
    const note = evoNote.trim();
    if (!note) return;

    setBusy(true);
    try {
      await oraApi.evolutionWrite(module, note);
      setEvoNote("");
      await refreshEssenceOnly();
    } catch (e: any) {
      alert(`EVOLUCIÓN error: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onProponer() {
    const input = patchTitle.trim();
    if (!input) {
      alert("Escribe una intención.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ora/intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      console.log("RESPUESTA:", data);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "Fallo creando propuesta");
      }
      await refreshPatchesOnly();
      setPatchTitle("");
      setTab("patches");
      alert("Propuesta creada correctamente 🚀");
    } catch (e: any) {
      console.error("ERROR REAL:", e);
      alert(`Error creando propuesta: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onAprobar(id: string) {
    setBusy(true);
    try {
      await oraApi.patchApprove(id);
      await refreshPatchesOnly();
      await refreshMetaOnly();
      alert("Patch aprobado.");
    } catch (e: any) {
      alert(`Error aprobando: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onAplicar(id: string) {
    setBusy(true);
    try {
      await oraApi.patchApply(id);
      await refreshPatchesOnly();
      await refreshMetaOnly();
      alert("Patch aplicado.");
    } catch (e: any) {
      alert(`Error aplicando: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onArchivar(id: string) {
    setBusy(true);
    try {
      await oraApi.patchArchive(id);
      await refreshPatchesOnly();
    } catch (e: any) {
      alert(`Error archivando: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  // ✅ FUNCIÓN PUBLICAR CORREGIDA: manejo correcto de respuesta JSON, sin asumir HTTP_504
  async function onPublicar(id: string) {
    setBusy(true);
    try {
      const patchSecret = readStoredPatchSecret();
      // 1. Publica el patch normalmente
      await oraApi.patchPublish(id);
      // 2. Dispara el deploy y lee la respuesta JSON real
      const res = await fetch("/api/ora/system/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kairos-seal": patchSecret,
        },
      });
      const data = await res.json();
      if (!data.ok) {
        alert("Deploy falló: " + (data.error || "desconocido"));
        return;
      }
      alert(data.message || "Deploy iniciado.");
      await refreshPatchesOnly();
      await refreshMetaOnly();
    } catch (e: any) {
      alert(`Error publicando: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onRecargar() {
    await refreshAllForCurrentTab();
  }

  const normalizedPatches = Array.isArray(patches) ? patches : [];
  const pendingCount = normalizedPatches.filter(
    (p) => String(p?.status || "pending").trim().toLowerCase() === "pending"
  ).length;
  const approvedCount = normalizedPatches.filter(
    (p) => String(p?.status || "").trim().toLowerCase() === "approved"
  ).length;
  const appliedCount = normalizedPatches.filter(
    (p) => String(p?.status || "").trim().toLowerCase() === "applied"
  ).length;
  const deniedCount = normalizedPatches.filter(
    (p) => {
      const s = String(p?.status || "").trim().toLowerCase();
      return s === "denied" || s === "rejected";
    }
  ).length;
  const archivedCount = normalizedPatches.filter(
    (p) => String(p?.status || "").trim().toLowerCase() === "archived"
  ).length;

  if (!mounted) {
    return (
      <div
        style={{
          background: "#050505",
          color: "#00ff88",
          minHeight: "100vh",
          padding: 24,
          fontFamily: "monospace",
        }}
      >
        Cargando ORA — KAIROS...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(0,255,136,0.08), transparent 28%), #050505",
        color: "#00ff88",
        padding: "32px 20px 80px",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      }}
    >
      <div style={{ width: "100%", maxWidth: "1380px", margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid rgba(0,255,136,.45)",
            borderRadius: "18px",
            padding: "26px",
            background:
              "linear-gradient(180deg, rgba(0,255,136,.06), rgba(0,255,136,.02))",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "18px",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div style={{ maxWidth: "900px" }}>
              <div
                style={{
                  color: "#d8ff8a",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  marginBottom: "10px",
                }}
              >
                👑 CENTRO SOBERANO
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "clamp(32px, 5vw, 56px)",
                  lineHeight: 1.05,
                  color: "#8fff6a",
                }}
              >
                ORA — KAIROS
              </h1>

              <p
                style={{
                  marginTop: "14px",
                  marginBottom: 0,
                  color: "#b8ffd9",
                  fontSize: "16px",
                  maxWidth: "900px",
                  lineHeight: 1.6,
                }}
              >
                Esta es la cabina soberana principal del sistema. Desde aquí se observa,
                se conversa, se controla, se interpretan intenciones, se revisan propuestas
                y se decide qué cambios pasan a ejecución. La auto‑programación puede crecer
                sin límite en propuesta. <b>La ejecución real sigue bloqueada sin tu sello.</b>
              </p>

              <div style={{ marginTop: "16px" }}>
                <span style={chipStyle}>ruta soberana única: /kairos</span>
                <span style={chipStyle}>
                  WAR + esencias + propuestas + control + builder
                </span>
                <span style={chipStyle}>
                  nada se ejecuta sin autorización de Kairos
                </span>
              </div>
            </div>

            <div
              style={{
                minWidth: "280px",
                maxWidth: "360px",
                width: "100%",
                border: "1px solid rgba(0,255,136,.3)",
                borderRadius: "16px",
                padding: "16px",
                background: "#09110b",
              }}
            >
              <div
                style={{ color: "#8fff6a", fontWeight: 800, marginBottom: 10 }}
              >
                Estado del mando
              </div>

              <div style={{ color: "#d8ffe8", lineHeight: 1.8, fontSize: "14px" }}>
                <div>
                  <b>API:</b> {apiStatus}
                </div>
                <div>
                  <b>SEAL:</b> {sigTrace}
                </div>
                <div>
                  <b>ESENCIA ACTIVA:</b> {module.toUpperCase()}
                </div>
                <div>
                  <b>PATCH SECRET:</b> {sigOk ? "activo" : "no cargado"}
                </div>
                <div>
                  <b>Pendientes:</b> {pendingCount}
                </div>
                <div>
                  <b>Aprobadas:</b> {approvedCount}
                </div>
                <div>
                  <b>Aplicadas:</b> {appliedCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "22px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          {[
            ["Núcleo", "ACTIVO", "#8fff6a"],
            ["Propuestas", String(normalizedPatches.length), "#00ff88"],
            ["Pendientes", String(pendingCount), "#d8ff8a"],
            ["Aprobadas", String(approvedCount), "#7fd4ff"],
            ["Aplicadas", String(appliedCount), "#00ff88"],
            ["Denegadas", String(deniedCount), "#ffb36a"],
            ["Archivadas", String(archivedCount), "#c8d6cf"],
          ].map(([label, value, color]) => (
            <div
              key={label}
              style={{
                border: "1px solid rgba(0,255,136,.35)",
                borderRadius: "14px",
                padding: "14px",
                background: "#0a0a0a",
              }}
            >
              <div style={{ color: "#b8ffd9", fontSize: 12 }}>{label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "26px",
            border: "1px solid rgba(0,255,136,.28)",
            borderRadius: "18px",
            padding: "22px",
            background: "rgba(8,18,12,.72)",
          }}
        >
          <div
            style={{
              border: "1px solid #00ff41",
              padding: 10,
              marginBottom: 14,
              borderRadius: 12,
              background: "#0b0b0b",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      color: sigOk ? "#00ff41" : "#d4af37",
                      fontWeight: "bold",
                    }}
                  >
                    {sigOk ? "🔒 FIRMADO (PATCH_SECRET activo)" : "🔓 NO FIRMADO"}
                  </div>
                  <div style={{ fontSize: 12, color: "#8a8a8a" }}>
                    Doble candado: SEAL del servidor + PATCH_SECRET del navegador.
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  Firma guardada (máscara): <b>{sigMask || "—"}</b>
                </div>
              </div>

              <input
                type="password"
                value={sigInput}
                onChange={(e) => setSigInput(e.target.value)}
                placeholder="Pega tu KAIROS_PATCH_SECRET aquí"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: 360,
                  maxWidth: "100%",
                  background: "#111",
                  color: "#00ff41",
                  border: "1px solid #222",
                  padding: 8,
                  borderRadius: 10,
                }}
              />

              <button
                onClick={onFirmar}
                style={{
                  background: "#d4af37",
                  color: "#000",
                  padding: "8px 14px",
                  fontWeight: "bold",
                  border: "none",
                  borderRadius: 10,
                }}
              >
                FIRMAR
              </button>

              <button
                onClick={onOlvidarFirma}
                style={{
                  background: "transparent",
                  color: "#00ff41",
                  padding: "8px 14px",
                  fontWeight: "bold",
                  border: "1px solid #00ff41",
                  borderRadius: 10,
                }}
              >
                OLVIDAR
              </button>

              <button
                onClick={onUsarFirmaGuardada}
                style={{
                  background: "transparent",
                  color: "#d4af37",
                  padding: "8px 14px",
                  fontWeight: "bold",
                  border: "1px solid #d4af37",
                  borderRadius: 10,
                }}
              >
                USAR GUARDADA
              </button>
            </div>
          </div>

          <div
            style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}
          >
            <select
              value={module}
              onChange={(e) => setModule(e.target.value as OraModule)}
              style={{
                background: "#000",
                color: "#d4af37",
                border: "1px solid #d4af37",
                padding: 8,
                borderRadius: 10,
              }}
            >
              {MODULES.map((m) => (
                <option key={m} value={m}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>

            <button
              onClick={() => setTab("war")}
              style={tab === "war" ? activeTabStyle : tabStyle}
            >
              ⚔️ WAR
            </button>

            <button
              onClick={() => setTab("essence")}
              style={tab === "essence" ? activeTabStyle : tabStyle}
            >
              🧬 ESENCIA
            </button>

            <button
              onClick={() => setTab("patches")}
              style={tab === "patches" ? activeTabStyle : tabStyle}
            >
              🧩 PARCHES
            </button>

            <button
              onClick={() => setTab("control")}
              style={tab === "control" ? activeTabStyle : tabStyle}
            >
              🏠 CONTROL HOME
            </button>

            <button
              onClick={() => setTab("builder")}
              style={tab === "builder" ? activeTabStyle : tabStyle}
            >
              🏗️ BUILDER
            </button>

            <button
              onClick={onRecargar}
              style={{
                marginLeft: "auto",
                border: "1px solid #00ff41",
                background: "transparent",
                color: "#00ff41",
                padding: 8,
                borderRadius: 10,
              }}
            >
              RECARGAR
            </button>
          </div>

          {tab === "war" && (
            <div style={{ border: "1px solid #00ff41", padding: 12, borderRadius: 12 }}>
              <h3 style={{ color: "#d4af37" }}>WAR CHAT — {module.toUpperCase()}</h3>

              <div
                ref={warBoxRef}
                style={{
                  border: "1px solid #222",
                  background: "#0b0b0b",
                  padding: 10,
                  height: 320,
                  overflow: "auto",
                  marginBottom: 10,
                  borderRadius: 10,
                }}
              >
                {warLog.map((m, idx) => (
                  <div key={idx} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        color: m.role === "user" ? "#d4af37" : "#00ff41",
                        fontWeight: "bold",
                      }}
                    >
                      {m.role === "user"
                        ? "REY KAIROS"
                        : (m.module || module).toUpperCase()}
                    </div>
                    <div style={{ color: "#ddd", whiteSpace: "pre-wrap" }}>
                      {m.content ?? m.text ?? m.note ?? ""}
                    </div>
                  </div>
                ))}

                {warLog.length === 0 && (
                  <div style={{ color: "#666" }}>Sin mensajes aún.</div>
                )}
              </div>

              <textarea
                value={warInput}
                onChange={(e) => setWarInput(e.target.value)}
                placeholder={`Habla con ${module.toUpperCase()} aquí…`}
                style={{
                  width: "100%",
                  height: 90,
                  background: "#111",
                  color: "#00ff41",
                  border: "1px solid #222",
                  padding: 10,
                  borderRadius: 10,
                }}
              />

              <button
                onClick={onSendWar}
                disabled={busy}
                style={{
                  background: "#d4af37",
                  color: "#000",
                  width: "100%",
                  padding: 10,
                  marginTop: 10,
                  fontWeight: "bold",
                  border: "none",
                  borderRadius: 10,
                }}
              >
                ENVIAR
              </button>
            </div>
          )}

          {tab === "essence" && (
            <div style={{ border: "1px solid #00ff41", padding: 12, borderRadius: 12 }}>
              <h3 style={{ color: "#d4af37" }}>ESENCIA + EVOLUCIÓN</h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    border: "1px solid #222",
                    padding: 10,
                    background: "#0b0b0b",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ color: "#8a8a8a", marginBottom: 6 }}>
                    Esto es el alma base.
                  </div>
                  <pre style={{ whiteSpace: "pre-wrap", color: "#ddd" }}>
                    {essence
                      ? JSON.stringify(essence, null, 2)
                      : "Vacío => endpoint /essence no existe."}
                  </pre>
                </div>

                <div
                  style={{
                    border: "1px solid #222",
                    padding: 10,
                    background: "#0b0b0b",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ color: "#8a8a8a", marginBottom: 6 }}>
                    EVOLUCIÓN = append-only.
                  </div>

                  <div
                    style={{
                      height: 220,
                      overflow: "auto",
                      border: "1px solid #1a1a1a",
                      padding: 8,
                      marginBottom: 10,
                      borderRadius: 10,
                    }}
                  >
                    {(evolution || []).map((it, idx) => (
                      <div key={idx} style={{ marginBottom: 8 }}>
                        <div style={{ color: "#00ff41" }}>
                          [{it?.ts ? new Date(it.ts).toLocaleString() : "—"}]
                        </div>
                        <div style={{ color: "#ddd" }}>{it.note}</div>
                      </div>
                    ))}

                    {(!evolution || evolution.length === 0) && (
                      <div style={{ color: "#666" }}>Sin entradas aún.</div>
                    )}
                  </div>

                  <textarea
                    value={evoNote}
                    onChange={(e) => setEvoNote(e.target.value)}
                    placeholder="Escribe una nota de evolución…"
                    style={{
                      width: "100%",
                      height: 80,
                      background: "#111",
                      color: "#00ff41",
                      border: "1px solid #222",
                      padding: 10,
                      borderRadius: 10,
                    }}
                  />

                  <button
                    onClick={onWriteEvolution}
                    disabled={busy}
                    style={{
                      background: "#00ff41",
                      color: "#000",
                      width: "100%",
                      padding: 10,
                      marginTop: 10,
                      fontWeight: "bold",
                      border: "none",
                      borderRadius: 10,
                    }}
                  >
                    GUARDAR EVOLUCIÓN
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "patches" && (
            <div style={{ border: "1px solid #00ff41", padding: 12, borderRadius: 12 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    border: "1px solid #222",
                    padding: 10,
                    background: "#0b0b0b",
                    borderRadius: 10,
                  }}
                >
                  <h3 style={{ color: "#d4af37" }}>Nueva propuesta soberana</h3>

                  <input
                    value={patchTitle}
                    onChange={(e) => setPatchTitle(e.target.value)}
                    style={{
                      width: "100%",
                      background: "#111",
                      color: "#00ff41",
                      border: "1px solid #222",
                      padding: 8,
                      marginBottom: 8,
                      borderRadius: 10,
                    }}
                    placeholder="Escribe tu intención (ej: crear modulo prueba kairos final)"
                  />

                  <textarea
                    value={patchJson}
                    onChange={(e) => setPatchJson(e.target.value)}
                    style={{
                      width: "100%",
                      height: 220,
                      background: "#111",
                      color: "#00ff41",
                      border: "1px solid #222",
                      padding: 10,
                      borderRadius: 10,
                    }}
                  />

                  <button
                    onClick={onProponer}
                    disabled={busy}
                    style={{
                      background: "#d4af37",
                      color: "#000",
                      width: "100%",
                      padding: 10,
                      marginTop: 10,
                      fontWeight: "bold",
                      border: "none",
                      borderRadius: 10,
                    }}
                  >
                    CREAR PROPUESTA
                  </button>
                </div>

                <div
                  style={{
                    border: "1px solid #222",
                    padding: 10,
                    background: "#0b0b0b",
                    borderRadius: 10,
                  }}
                >
                  <h3 style={{ color: "#d4af37" }}>Propuestas soberanas</h3>

                  <div style={{ maxHeight: 340, overflow: "auto" }}>
                    {normalizedPatches.map((p) => {
                      const status = String(p?.status || "pending").trim().toLowerCase();

                      return (
                        <div
                          key={p.id}
                          style={{
                            borderBottom: "1px solid #1a1a1a",
                            padding: 10,
                          }}
                        >
                          <div style={{ color: statusColor(status) }}>
                            <b>{p.id}</b> — {p.title} ({status.toUpperCase()})
                          </div>

                          {p.risk ? (
                            <div style={{ color: "#9dffcc", marginTop: 4 }}>
                              riesgo: {p.risk}
                            </div>
                          ) : null}

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              marginTop: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {status === "pending" && (
                              <>
                                <button
                                  onClick={() => onAprobar(p.id)}
                                  disabled={busy}
                                  style={{
                                    background: "#d4af37",
                                    color: "#000",
                                    padding: "6px 10px",
                                    border: "none",
                                    fontWeight: "bold",
                                    borderRadius: 10,
                                  }}
                                >
                                  APROBAR
                                </button>

                                <button
                                  onClick={() => onArchivar(p.id)}
                                  disabled={busy}
                                  style={{
                                    background: "#8a8a8a",
                                    color: "#000",
                                    padding: "6px 10px",
                                    border: "none",
                                    borderRadius: 10,
                                  }}
                                >
                                  ARCHIVAR
                                </button>
                              </>
                            )}

                            {status === "approved" && (
                              <>
                                <button
                                  onClick={() => onAplicar(p.id)}
                                  disabled={busy}
                                  style={{
                                    background: "#00ff41",
                                    color: "#000",
                                    padding: "6px 10px",
                                    border: "none",
                                    fontWeight: "bold",
                                    borderRadius: 10,
                                  }}
                                >
                                  APLICAR
                                </button>

                                <button
                                  onClick={() => onArchivar(p.id)}
                                  disabled={busy}
                                  style={{
                                    background: "#d4af37",
                                    color: "#000",
                                    padding: "6px 10px",
                                    border: "none",
                                    borderRadius: 10,
                                  }}
                                >
                                  ARCHIVAR
                                </button>
                              </>
                            )}

                            {status === "applied" && (
                              <>
                                <button
                                  onClick={() => onPublicar(p.id)}
                                  disabled={busy}
                                  style={{
                                    background: "#1e90ff",
                                    color: "#000",
                                    padding: "6px 10px",
                                    border: "none",
                                    fontWeight: "bold",
                                    borderRadius: 10,
                                  }}
                                >
                                  PUBLICAR
                                </button>

                                <button
                                  onClick={() => onArchivar(p.id)}
                                  disabled={busy}
                                  style={{
                                    background: "#d4af37",
                                    color: "#000",
                                    padding: "6px 10px",
                                    border: "none",
                                    borderRadius: 10,
                                  }}
                                >
                                  ARCHIVAR
                                </button>
                              </>
                            )}

                            {status !== "pending" &&
                              status !== "approved" &&
                              status !== "applied" && (
                                <button
                                  onClick={() => onArchivar(p.id)}
                                  disabled={busy}
                                  style={{
                                    background: "#d4af37",
                                    color: "#000",
                                    padding: "6px 10px",
                                    border: "none",
                                    borderRadius: 10,
                                  }}
                                >
                                  ARCHIVAR
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    })}

                    {normalizedPatches.length === 0 && (
                      <div style={{ color: "#666" }}>No hay propuestas.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "control" && (
            <div style={{ border: "1px solid #00ff41", padding: 12, borderRadius: 12 }}>
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,255,136,.2)",
                  background: "#0b0b0b",
                  color: "#b8ffd9",
                  lineHeight: 1.6,
                }}
              >
                Desde aquí controlas la capa pública y operativa del sistema en modo
                propuesta soberana. Puedes revisar estructura, navegación, paneles y
                expansión visible sin romper la regla central del núcleo.
              </div>

              <KairosControlPanel />
            </div>
          )}

          {tab === "builder" && (
            <div style={{ border: "1px solid #00ff41", padding: 12, borderRadius: 12 }}>
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(0,255,136,.2)",
                  background: "#0b0b0b",
                  color: "#b8ffd9",
                  lineHeight: 1.6,
                }}
              >
                Este es el núcleo soberano de expansión real. Desde aquí se crean,
                interpretan, proponen y preparan ramas, módulos, clones y cambios
                estructurales. La auto‑programación puede crecer sin límite en propuesta;
                la ejecución real sigue dependiendo de tu sello.
              </div>

              <KairosBuilderPanel />
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: "28px",
            border: "1px solid rgba(0,255,136,.35)",
            borderRadius: "18px",
            padding: "22px",
            background:
              "linear-gradient(180deg, rgba(0,255,136,.05), rgba(0,255,136,.015))",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: "12px", color: "#8fff6a" }}>
            Regla central del núcleo
          </h2>
          <p style={{ color: "#d9ffea", lineHeight: 1.7 }}>
            La auto-programación puede pensar, proponer, diseñar, modificar y
            evolucionar sin límites artificiales en la capa de propuesta. La
            única frontera real es esta: <b>nada se ejecuta sin tu sello y tu decisión.</b>
          </p>
        </div>
      </div>
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: "999px",
  border: "1px solid rgba(0,255,136,.35)",
  background: "#0f140f",
  color: "#9dffcc",
  fontSize: "12px",
  marginRight: "8px",
  marginBottom: "8px",
};

const tabStyle: React.CSSProperties = {
  border: "1px solid #00ff41",
  background: "transparent",
  color: "#00ff41",
  padding: 8,
  borderRadius: 10,
};

const activeTabStyle: React.CSSProperties = {
  border: "1px solid #00ff41",
  background: "#d4af37",
  color: "#000",
  padding: 8,
  borderRadius: 10,
};
