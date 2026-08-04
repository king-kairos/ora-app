"use client";

import { useEffect, useMemo, useState } from "react";

type HomePageContent = {
  version?: string;
  updatedAt?: string;
  hero?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    chips?: string[];
  };
  media?: {
    type?: "none" | "image" | "video";
    src?: string;
    alt?: string;
  };
  cta?: {
    primaryLabel?: string;
    primaryHref?: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  };
  welcome?: {
    enabled?: boolean;
    title?: string;
    text?: string;
  };
};

function getSealHeader() {
  if (typeof window === "undefined") return "";

  return String(
    localStorage.getItem("KAIROS_SEAL") ||
      localStorage.getItem("kairos_seal") ||
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

async function sealedFetch(url: string, init: RequestInit = {}) {
  const seal = getSealHeader();

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (seal) {
    headers["x-kairos-seal"] = seal;
  }

  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
}

function normalizeContent(input: any): HomePageContent {
  return {
    version: String(input?.version || "1.0.0"),
    updatedAt: String(input?.updatedAt || ""),
    hero: {
      badge: String(input?.hero?.badge || "ORA REAL"),
      title: String(input?.hero?.title || "Bienvenido a ORA"),
      subtitle: String(
        input?.hero?.subtitle ||
          "Centro vivo de soberanía, propuesta, evolución y ejecución controlada por Kairos."
      ),
      chips: Array.isArray(input?.hero?.chips)
        ? input.hero.chips.map((x: any) => String(x || "").trim()).filter(Boolean)
        : ["Soberanía real", "Propuesta sin límites", "Nada se ejecuta sin sello"],
    },
    media: {
      type:
        input?.media?.type === "image" || input?.media?.type === "video"
          ? input.media.type
          : "none",
      src: String(input?.media?.src || ""),
      alt: String(input?.media?.alt || ""),
    },
    cta: {
      primaryLabel: String(input?.cta?.primaryLabel || "Entrar a Kairos"),
      primaryHref: String(input?.cta?.primaryHref || "/kairos"),
      secondaryLabel: String(input?.cta?.secondaryLabel || "Abrir WAR"),
      secondaryHref: String(input?.cta?.secondaryHref || "/soberania"),
    },
    welcome: {
      enabled:
        typeof input?.welcome?.enabled === "boolean"
          ? input.welcome.enabled
          : true,
      title: String(input?.welcome?.title || "Presencia activa"),
      text: String(
        input?.welcome?.text ||
          "ORA se prepara desde la propuesta y crece bajo la decisión soberana de Kairos."
      ),
    },
  };
}

export default function KairosHomeControlPanel() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [content, setContent] = useState<HomePageContent>(normalizeContent({}));

  const [proposalTitle, setProposalTitle] = useState(
    "Kairos Homepage Control Proposal"
  );
  const [proposalSummary, setProposalSummary] = useState(
    "Actualización propuesta para el contenido de la página principal de ORA."
  );

  async function loadCurrent() {
    setLoading(true);
    setMessage("");

    try {
      const res = await sealedFetch("/api/autoprog/page-control", {
        method: "GET",
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "PAGE_CONTROL_READ_FAIL");
      }

      setContent(normalizeContent(data?.content || {}));
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || "No se pudo cargar el control de la home.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCurrent();
  }, []);

  const chipsText = useMemo(
    () => (content.hero?.chips || []).join(", "),
    [content.hero?.chips]
  );

  function setChipValue(value: string) {
    const chips = value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);

    setContent((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        chips,
      },
    }));
  }

  async function createProposal() {
    setLoading(true);
    setMessage("");

    try {
      const res = await sealedFetch("/api/autoprog/page-control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: proposalTitle.trim() || "Kairos Homepage Control Proposal",
          summary:
            proposalSummary.trim() ||
            "Actualización propuesta para el contenido de la página principal de ORA.",
          proposedBy: "kairos",
          action: "propose-homepage-update",
          content,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "PAGE_CONTROL_PROPOSE_FAIL");
      }

      setMessage(
        data?.proposalId
          ? `Propuesta creada: ${data.proposalId}`
          : "Propuesta creada correctamente."
      );

      if (data?.preview) {
        setContent(normalizeContent(data.preview));
      }
    } catch (e: any) {
      console.error(e);
      setMessage(e?.message || "No se pudo crear la propuesta.");
    } finally {
      setLoading(false);
    }
  }

  const blockStyle: React.CSSProperties = {
    border: "1px solid rgba(0,255,136,.28)",
    borderRadius: "18px",
    padding: "22px",
    background: "rgba(8,18,12,.72)",
  };

  const panelStyle: React.CSSProperties = {
    border: "1px solid rgba(0,255,136,.2)",
    borderRadius: "14px",
    padding: "16px",
    background: "#0b0b0b",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 6,
    color: "#d8ff8a",
    fontWeight: 700,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    background: "#050505",
    color: "#00ff88",
    border: "1px solid #00ff88",
    borderRadius: "10px",
    outline: "none",
    fontFamily: "monospace",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "92px",
    resize: "vertical",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 14px",
    cursor: "pointer",
    background: "#111",
    color: "#00ff88",
    border: "1px solid #00ff88",
    borderRadius: "10px",
    fontFamily: "monospace",
    fontWeight: 700,
  };

  return (
    <div style={blockStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ marginTop: 0, marginBottom: "8px", color: "#8fff6a" }}>
            Control soberano de Home
          </h2>
          <p style={{ margin: 0, color: "#c4ffe2", lineHeight: 1.6 }}>
            Aquí modificas el contenido de la homepage pública en modo propuesta.
            El cambio queda preparado y luego tú decides si lo aplicas/publicas.
          </p>
        </div>

        <div
          style={{
            border: "1px solid rgba(0,255,136,.2)",
            borderRadius: "12px",
            padding: "12px",
            background: "#090909",
            minWidth: "260px",
          }}
        >
          <div style={{ color: "#8fff6a", fontWeight: 800, marginBottom: 8 }}>
            Estado actual
          </div>
          <div style={{ color: "#d8ffe8", lineHeight: 1.7, fontSize: "14px" }}>
            <div>
              <b>Versión:</b> {content.version || "1.0.0"}
            </div>
            <div>
              <b>Actualizado:</b> {content.updatedAt || "—"}
            </div>
            <div>
              <b>Media:</b> {content.media?.type || "none"}
            </div>
            <div>
              <b>Welcome:</b> {content.welcome?.enabled ? "activo" : "apagado"}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0, color: "#8fff6a" }}>Hero principal</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Hero badge</label>
            <input
              value={content.hero?.badge || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, badge: e.target.value },
                }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Hero title</label>
            <textarea
              value={content.hero?.title || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, title: e.target.value },
                }))
              }
              style={textareaStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Hero subtitle</label>
            <textarea
              value={content.hero?.subtitle || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  hero: { ...prev.hero, subtitle: e.target.value },
                }))
              }
              style={textareaStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>
              Hero chips (separados por comas)
            </label>
            <input
              value={chipsText}
              onChange={(e) => setChipValue(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={panelStyle}>
          <h3 style={{ marginTop: 0, color: "#8fff6a" }}>Welcome + CTA</h3>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Welcome title</label>
            <input
              value={content.welcome?.title || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  welcome: { ...prev.welcome, title: e.target.value },
                }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Welcome text</label>
            <textarea
              value={content.welcome?.text || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  welcome: { ...prev.welcome, text: e.target.value },
                }))
              }
              style={textareaStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>
              <input
                type="checkbox"
                checked={!!content.welcome?.enabled}
                onChange={(e) =>
                  setContent((prev) => ({
                    ...prev,
                    welcome: { ...prev.welcome, enabled: e.target.checked },
                  }))
                }
                style={{ marginRight: 8 }}
              />
              Welcome enabled
            </label>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>CTA principal label</label>
            <input
              value={content.cta?.primaryLabel || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  cta: { ...prev.cta, primaryLabel: e.target.value },
                }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>CTA principal href</label>
            <input
              value={content.cta?.primaryHref || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  cta: { ...prev.cta, primaryHref: e.target.value },
                }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>CTA secundario label</label>
            <input
              value={content.cta?.secondaryLabel || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  cta: { ...prev.cta, secondaryLabel: e.target.value },
                }))
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>CTA secundario href</label>
            <input
              value={content.cta?.secondaryHref || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  cta: { ...prev.cta, secondaryHref: e.target.value },
                }))
              }
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      <div style={{ ...panelStyle, marginTop: "16px" }}>
        <h3 style={{ marginTop: 0, color: "#8fff6a" }}>Media + propuesta</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          <div>
            <label style={labelStyle}>Media type</label>
            <select
              value={content.media?.type || "none"}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  media: {
                    ...prev.media,
                    type: e.target.value as "none" | "image" | "video",
                  },
                }))
              }
              style={inputStyle}
            >
              <option value="none">none</option>
              <option value="image">image</option>
              <option value="video">video</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Media alt</label>
            <input
              value={content.media?.alt || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  media: { ...prev.media, alt: e.target.value },
                }))
              }
              style={inputStyle}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Media src</label>
            <input
              value={content.media?.src || ""}
              onChange={(e) =>
                setContent((prev) => ({
                  ...prev,
                  media: { ...prev.media, src: e.target.value },
                }))
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Título de la propuesta</label>
            <input
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Resumen de la propuesta</label>
            <input
              value={proposalSummary}
              onChange={(e) => setProposalSummary(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
            marginTop: "14px",
          }}
        >
          <button
            type="button"
            onClick={() => void loadCurrent()}
            style={buttonStyle}
            disabled={loading}
          >
            {loading ? "cargando..." : "recargar"}
          </button>

          <button
            type="button"
            onClick={() => void createProposal()}
            style={{
              ...buttonStyle,
              background: "#d4af37",
              color: "#000",
              border: "1px solid #d4af37",
            }}
            disabled={loading}
          >
            {loading ? "creando..." : "crear propuesta soberana"}
          </button>
        </div>

        {message ? (
          <div
            style={{
              marginTop: "12px",
              border: "1px solid rgba(0,255,136,.22)",
              borderRadius: "10px",
              padding: "10px",
              color: "#9dffcc",
              background: "#081108",
              whiteSpace: "pre-wrap",
            }}
          >
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
