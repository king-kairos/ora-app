// src/app/soberania/apply/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

const LS_SERVER = "ora_server_base"; // ejemplo: http://localhost:3001
const LS_SEAL = "kairos_seal";
const LS_ACTOR = "ora_actor";

type ProposalItem = {
  id: string;
  title?: string;
  status?: string;
  createdAt?: number;
  updatedAt?: number;
};

function safeJson(x: any) {
  try {
    return JSON.stringify(x, null, 2);
  } catch {
    return String(x);
  }
}

export default function KairosApplyPage() {
  const [serverBase, setServerBase] = useState("");
  const [seal, setSeal] = useState("");
  const [actor, setActor] = useState("kairos");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [log, setLog] = useState<string>("");

  const [items, setItems] = useState<ProposalItem[]>([]);
  const [selectedId, setSelectedId] = useState("");

  const headers = useMemo(() => {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      "x-kairos-seal": seal.trim(),
      "x-ora-actor": actor.trim() || "kairos",
    };
    return h;
  }, [seal, actor]);

  useEffect(() => {
    const s = localStorage.getItem(LS_SERVER) || "http://localhost:3001";
    const k = localStorage.getItem(LS_SEAL) || "";
    const a = localStorage.getItem(LS_ACTOR) || "kairos";
    setServerBase(s);
    setSeal(k);
    setActor(a);
  }, []);

  function persist() {
    localStorage.setItem(LS_SERVER, serverBase.trim());
    localStorage.setItem(LS_SEAL, seal.trim());
    localStorage.setItem(LS_ACTOR, actor.trim() || "kairos");
    setLog("✅ Guardado en este navegador.");
    setTimeout(() => setLog(""), 1500);
  }

  function clearLocal() {
    localStorage.removeItem(LS_SERVER);
    localStorage.removeItem(LS_SEAL);
    localStorage.removeItem(LS_ACTOR);
    setServerBase("http://localhost:3001");
    setSeal("");
    setActor("kairos");
    setItems([]);
    setSelectedId("");
    setLog("🧹 Borrado local.");
    setTimeout(() => setLog(""), 1500);
  }

  async function call(path: string, init?: RequestInit) {
    const base = serverBase.trim().replace(/\/+$/, "");
    const url = base + path;
    const r = await fetch(url, init);
    const text = await r.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!r.ok) {
      const msg = data?.error || data?.message || `HTTP_${r.status}`;
      throw new Error(typeof msg === "string" ? msg : safeJson(msg));
    }
    return data;
  }

  async function health() {
    setError("");
    setLoading(true);
    try {
      const data = await call("/api/ora/health", { method: "GET", headers });
      setLog("✅ HEALTH:\n" + safeJson(data));
    } catch (e: any) {
      setError(e?.message || "HEALTH_FAIL");
    } finally {
      setLoading(false);
    }
  }

  async function list() {
    setError("");
    setLoading(true);
    try {
      const data = await call("/api/ora/patches/list", { method: "GET", headers });
      const list = Array.isArray(data?.items) ? data.items : [];
      setItems(list);
      setLog(`✅ LIST: ${list.length} proposals`);
      if (!selectedId && list[0]?.id) setSelectedId(String(list[0].id));
    } catch (e: any) {
      setError(e?.message || "LIST_FAIL");
    } finally {
      setLoading(false);
    }
  }

  async function apply(id: string) {
    const pid = String(id || "").trim();
    if (!pid) {
      setError("Falta el id del proposal");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await call(`/api/ora/autoprog/apply/${encodeURIComponent(pid)}`, {
        method: "POST",
        headers,
        body: JSON.stringify({}), // cuerpo vacío ok
      });
      setLog("✅ APPLY OK:\n" + safeJson(data));
      // refresca lista para ver status
      await list();
    } catch (e: any) {
      setError(e?.message || "APPLY_FAIL");
    } finally {
      setLoading(false);
    }
  }

  async function archive(id: string) {
    const pid = String(id || "").trim();
    if (!pid) {
      setError("Falta el id del proposal");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await call(`/api/ora/autoprog/archive/${encodeURIComponent(pid)}`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      setLog("✅ ARCHIVE:\n" + safeJson(data));
      await list();
    } catch (e: any) {
      setError(e?.message || "ARCHIVE_FAIL");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 28, fontFamily: "system-ui", maxWidth: 1100 }}>
      <h1>🏛️ Soberanía — Apply (Solo Kairos)</h1>

      <p style={{ opacity: 0.85 }}>
        Esta pantalla es para ti. Manda <b>x-kairos-seal</b> y te deja listar/aplicar proposals. (Fase 0)
      </p>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ minWidth: 320 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Server (Express)</label>
          <input
            value={serverBase}
            onChange={(e) => setServerBase(e.target.value)}
            placeholder="http://localhost:3001"
            style={{ padding: 10, width: "100%" }}
          />
        </div>

        <div style={{ minWidth: 320 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>KAIROS_SEAL</label>
          <input
            type="password"
            value={seal}
            onChange={(e) => setSeal(e.target.value)}
            placeholder="Pega tu sello aquí"
            style={{ padding: 10, width: "100%" }}
          />
        </div>

        <div style={{ minWidth: 220 }}>
          <label style={{ display: "block", fontWeight: 700, marginBottom: 6 }}>Actor</label>
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="kairos"
            style={{ padding: 10, width: "100%" }}
          />
        </div>

        <button
          onClick={persist}
          disabled={loading}
          style={{ padding: "10px 14px", fontWeight: 700 }}
        >
          Guardar
        </button>

        <button
          onClick={clearLocal}
          disabled={loading}
          style={{ padding: "10px 14px" }}
        >
          Borrar local
        </button>

        <button
          onClick={health}
          disabled={loading}
          style={{ padding: "10px 14px" }}
        >
          Health
        </button>

        <button
          onClick={list}
          disabled={loading}
          style={{ padding: "10px 14px", fontWeight: 700 }}
        >
          Listar proposals
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: 12, background: "#ffe8e8", borderRadius: 8 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {log && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#f5f5f5",
            borderRadius: 8,
            overflowX: "auto",
          }}
        >
          {log}
        </pre>
      )}

      <hr style={{ margin: "22px 0" }} />

      <h2>Proposals</h2>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          placeholder="proposal id..."
          style={{ padding: 10, width: 340 }}
        />

        <button
          onClick={() => apply(selectedId)}
          disabled={loading || !selectedId.trim()}
          style={{ padding: "10px 14px", fontWeight: 800 }}
        >
          ✅ Apply
        </button>

        <button
          onClick={() => archive(selectedId)}
          disabled={loading || !selectedId.trim()}
          style={{ padding: "10px 14px" }}
        >
          🧊 Archive
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {items.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No hay proposals cargados (dale a “Listar proposals”).</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>ID</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Title</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Status</th>
                  <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8, fontFamily: "monospace" }}>
                      {p.id}
                    </td>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>
                      {p.title || ""}
                    </td>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8 }}>
                      {p.status || ""}
                    </td>
                    <td style={{ borderBottom: "1px solid #f0f0f0", padding: 8, textAlign: "right" }}>
                      <button
                        onClick={() => {
                          setSelectedId(p.id);
                          apply(p.id);
                        }}
                        disabled={loading}
                        style={{ padding: "8px 12px", fontWeight: 700 }}
                      >
                        Apply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{ marginTop: 16, opacity: 0.7 }}>
        Nota: Si tu Next corre en <b>3000</b> y tu Express en <b>3001</b>, esto llama directo al Express por URL.
        Si te da CORS, tu server.ts ya tiene <code>app.use(cors())</code>, así que debe pasar.
      </p>
    </div>
  );
}
