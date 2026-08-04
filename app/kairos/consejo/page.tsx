"use client";

import { useMemo, useState } from "react";

type Vote = {
  module?: string;
  memberId?: string;
  memberName?: string;
  name?: string;
  role?: string;
  opinion?: string;
  reason?: string;
};

type CouncilResponse = {
  ok: boolean;
  topic?: string;
  branch?: string;
  objective?: string;
  votes?: Vote[];
  summary?: string;
  recommendation?: string;
  createdAt?: string;
  error?: string;
  message?: string;
};

function getSealValue() {
  if (typeof window === "undefined") return "";

  return String(
    localStorage.getItem("KAIROS_SEAL") ||
      localStorage.getItem("kairos_seal") ||
      sessionStorage.getItem("KAIROS_SEAL") ||
      sessionStorage.getItem("kairos_seal") ||
      ""
  ).trim();
}

function getPatchSigValue() {
  if (typeof window === "undefined") return "";

  return String(
    localStorage.getItem("KAIROS_PATCH_SIG") ||
      localStorage.getItem("kairos_patch_sig") ||
      sessionStorage.getItem("KAIROS_PATCH_SIG") ||
      sessionStorage.getItem("kairos_patch_sig") ||
      (process as any)?.env?.NEXT_PUBLIC_KAIROS_PATCH_SIG ||
      ""
  ).trim();
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const seal = getSealValue();
  const patchSig = getPatchSigValue();

  if (seal) headers["x-kairos-seal"] = seal;
  if (patchSig) headers["x-kairos-patch-sig"] = patchSig;

  return headers;
}

function normalizeVoteName(vote: Vote) {
  return (
    vote.memberName ||
    vote.name ||
    vote.memberId ||
    vote.module ||
    "Miembro del consejo"
  );
}

function normalizeVoteOpinion(vote: Vote) {
  return vote.opinion || vote.reason || "Sin opinión registrada.";
}

export default function KairosCouncilPage() {
  const [topic, setTopic] = useState("Definir primeros módulos de ORA Lottery");
  const [branch, setBranch] = useState("ora-lottery");
  const [objective, setObjective] = useState("Crear primera versión funcional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CouncilResponse | null>(null);

  const hasSeal = useMemo(() => !!getSealValue(), []);

  async function readCouncil() {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch("/api/autoprog/council-read", {
        method: "POST",
        headers: getAuthHeaders(),
        cache: "no-store",
        body: JSON.stringify({
          topic: String(topic || "").trim(),
          branch: String(branch || "").trim(),
          objective: String(objective || "").trim(),
        }),
      });

      const text = await res.text();
      let data: CouncilResponse;

      try {
        data = text ? JSON.parse(text) : { ok: false, error: "EMPTY_RESPONSE" };
      } catch {
        data = {
          ok: false,
          error: text || `HTTP_${res.status}`,
        };
      }

      if (!res.ok) {
        setResult({
          ok: false,
          error: data?.error || data?.message || `HTTP_${res.status}`,
        });
        return;
      }

      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : "Fallo leyendo consejo",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(0,255,136,0.08), transparent 28%), #050505",
        color: "#00ff88",
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        padding: "32px 20px 80px",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            border: "1px solid rgba(0,255,136,.45)",
            borderRadius: "18px",
            padding: "24px",
            background:
              "linear-gradient(180deg, rgba(0,255,136,.06), rgba(0,255,136,.02))",
            marginBottom: "22px",
          }}
        >
          <div style={{ color: "#d8ff8a", fontWeight: 800, marginBottom: 10 }}>
            👑 CONSEJO CELESTIAL
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(28px, 4vw, 48px)",
              lineHeight: 1.05,
              color: "#8fff6a",
            }}
          >
            KAIROS — CONSEJO
          </h1>

          <p
            style={{
              color: "#b8ffd9",
              marginTop: 14,
              marginBottom: 0,
              lineHeight: 1.7,
              maxWidth: 900,
            }}
          >
            Consulta conjunta del núcleo. El consejo analiza, recomienda y
            Kairos decide. La propuesta puede avanzar sin límites artificiales;
            la ejecución real sigue dependiendo de tu sello.
          </p>

          <div style={{ marginTop: 16 }}>
            <span
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: "999px",
                border: "1px solid rgba(0,255,136,.35)",
                background: "#0f140f",
                color: "#9dffcc",
                fontSize: "12px",
                marginRight: "8px",
                marginBottom: "8px",
              }}
            >
              endpoint: /api/autoprog/council-read
            </span>

            <span
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: "999px",
                border: "1px solid rgba(0,255,136,.35)",
                background: "#0f140f",
                color: hasSeal ? "#9dffcc" : "#ffb36a",
                fontSize: "12px",
                marginRight: "8px",
                marginBottom: "8px",
              }}
            >
              seal: {hasSeal ? "detectado" : "no detectado"}
            </span>
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(0,255,136,.3)",
            borderRadius: "16px",
            padding: "18px",
            background: "#0a0a0a",
            marginBottom: "22px",
          }}
        >
          <div style={{ display: "grid", gap: "14px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Tema</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={{
                  width: "100%",
                  background: "#000",
                  color: "#00ff88",
                  border: "1px solid #00ff88",
                  padding: "12px",
                  borderRadius: "10px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Rama</label>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                style={{
                  width: "100%",
                  background: "#000",
                  color: "#00ff88",
                  border: "1px solid #00ff88",
                  padding: "12px",
                  borderRadius: "10px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px" }}>Objetivo</label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  background: "#000",
                  color: "#00ff88",
                  border: "1px solid #00ff88",
                  padding: "12px",
                  borderRadius: "10px",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={readCouncil}
                disabled={loading}
                style={{
                  background: loading ? "#0a2a1c" : "#00ff88",
                  color: "#000",
                  border: "none",
                  padding: "12px 18px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  borderRadius: "10px",
                }}
              >
                {loading ? "Consultando consejo..." : "Consultar Consejo Celestial"}
              </button>

              <a
                href="/kairos"
                style={{
                  border: "1px solid #00ff88",
                  color: "#00ff88",
                  padding: "11px 18px",
                  textDecoration: "none",
                  display: "inline-block",
                  borderRadius: "10px",
                }}
              >
                Volver a /kairos
              </a>
            </div>
          </div>
        </div>

        {result && (
          <div
            style={{
              border: "1px solid rgba(0,255,136,.3)",
              borderRadius: "16px",
              padding: "18px",
              background: "#0a0a0a",
            }}
          >
            {!result.ok ? (
              <div>
                <h2 style={{ marginTop: 0, color: "#ffb36a" }}>Error</h2>
                <p style={{ marginBottom: 0 }}>{result.error || "Fallo interno"}</p>
              </div>
            ) : (
              <>
                <h2 style={{ marginTop: 0, color: "#8fff6a" }}>
                  Resultado del Consejo
                </h2>

                <div style={{ marginBottom: "18px", color: "#9affc9", lineHeight: 1.8 }}>
                  <div>
                    <strong>Tema:</strong> {result.topic || "N/D"}
                  </div>
                  <div>
                    <strong>Rama:</strong> {result.branch || "N/D"}
                  </div>
                  <div>
                    <strong>Objetivo:</strong> {result.objective || "N/D"}
                  </div>
                  <div>
                    <strong>Fecha:</strong> {result.createdAt || "N/D"}
                  </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <h3>Votos del Consejo</h3>

                  {!result.votes || result.votes.length === 0 ? (
                    <div
                      style={{
                        border: "1px solid #00aa66",
                        padding: "14px",
                        background: "#03150d",
                        borderRadius: "10px",
                      }}
                    >
                      Sin votos registrados.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "14px" }}>
                      {result.votes.map((vote, idx) => (
                        <div
                          key={`${vote.memberId || vote.module || vote.memberName || "vote"}-${idx}`}
                          style={{
                            border: "1px solid #00aa66",
                            padding: "14px",
                            background: "#03150d",
                            borderRadius: "10px",
                          }}
                        >
                          <div style={{ fontWeight: "bold", marginBottom: "6px" }}>
                            {normalizeVoteName(vote)}
                          </div>
                          <div style={{ color: "#9affc9", marginBottom: "8px" }}>
                            {vote.role || vote.module || "Consejero"}
                          </div>
                          <div>{normalizeVoteOpinion(vote)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    border: "1px solid #00aa66",
                    padding: "14px",
                    marginBottom: "16px",
                    background: "#03150d",
                    borderRadius: "10px",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Resumen</h3>
                  <p style={{ marginBottom: 0 }}>{result.summary || "Sin resumen."}</p>
                </div>

                <div
                  style={{
                    border: "1px solid #00ff88",
                    padding: "14px",
                    background: "#052012",
                    borderRadius: "10px",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Recomendación final</h3>
                  <p style={{ marginBottom: 0 }}>
                    {result.recommendation || "Sin recomendación final."}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
