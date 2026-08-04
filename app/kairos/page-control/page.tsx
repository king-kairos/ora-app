"use client";

import { useEffect, useMemo, useState } from "react";

type HomePageContent = {
  version?: string;
  updatedAt?: string;
  hero: {
    badge: string;
    title: string;
    subtitle: string;
    chips: string[];
  };
  media: {
    type: "none" | "image" | "video";
    src: string;
    alt: string;
  };
  cta: {
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  welcome: {
    enabled: boolean;
    title: string;
    text: string;
  };
};

const DEFAULT_CONTENT: HomePageContent = {
  version: "1.0.0",
  updatedAt: "",
  hero: {
    badge: "ORA REAL",
    title: "Bienvenido a ORA",
    subtitle:
      "Centro vivo de soberanía, propuesta, evolución y ejecución controlada por Kairos.",
    chips: [
      "Soberanía real",
      "Propuesta sin límites",
      "Nada se ejecuta sin sello",
    ],
  },
  media: {
    type: "none",
    src: "",
    alt: "",
  },
  cta: {
    primaryLabel: "Entrar a Kairos",
    primaryHref: "/kairos",
    secondaryLabel: "Abrir WAR",
    secondaryHref: "/soberania",
  },
  welcome: {
    enabled: true,
    title: "Presencia activa",
    text:
      "ORA se prepara desde la propuesta y crece bajo la decisión soberana de Kairos.",
  },
};

function normalizeIncomingContent(input: any): HomePageContent {
  return {
    version: String(input?.version || DEFAULT_CONTENT.version || "1.0.0"),
    updatedAt: String(input?.updatedAt || ""),
    hero: {
      badge: String(input?.hero?.badge || DEFAULT_CONTENT.hero.badge),
      title: String(input?.hero?.title || DEFAULT_CONTENT.hero.title),
      subtitle: String(input?.hero?.subtitle || DEFAULT_CONTENT.hero.subtitle),
      chips: Array.isArray(input?.hero?.chips)
        ? input.hero.chips.map((x: any) => String(x || "")).slice(0, 8)
        : [...DEFAULT_CONTENT.hero.chips],
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
      primaryLabel: String(
        input?.cta?.primaryLabel || DEFAULT_CONTENT.cta.primaryLabel
      ),
      primaryHref: String(
        input?.cta?.primaryHref || DEFAULT_CONTENT.cta.primaryHref
      ),
      secondaryLabel: String(
        input?.cta?.secondaryLabel || DEFAULT_CONTENT.cta.secondaryLabel
      ),
      secondaryHref: String(
        input?.cta?.secondaryHref || DEFAULT_CONTENT.cta.secondaryHref
      ),
    },
    welcome: {
      enabled:
        typeof input?.welcome?.enabled === "boolean"
          ? input.welcome.enabled
          : DEFAULT_CONTENT.welcome.enabled,
      title: String(input?.welcome?.title || DEFAULT_CONTENT.welcome.title),
      text: String(input?.welcome?.text || DEFAULT_CONTENT.welcome.text),
    },
  };
}

export default function KairosPageControlPage() {
  const [content, setContent] = useState<HomePageContent>(DEFAULT_CONTENT);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [loaded, setLoaded] = useState(false);

  function getKairosSeal() {
    if (typeof window === "undefined") return "";
    return String(
      localStorage.getItem("KAIROS_SEAL") ||
        localStorage.getItem("kairos_seal") ||
        sessionStorage.getItem("KAIROS_SEAL") ||
        sessionStorage.getItem("kairos_seal") ||
        ""
    ).trim();
  }

  async function parseResponse(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { ok: false, raw: text };
    }
  }

  async function loadConfig() {
    try {
      setMsg("");

      const headers: Record<string, string> = {};
      const seal = getKairosSeal();
      if (seal) headers["x-kairos-seal"] = seal;

      const res = await fetch("/api/autoprog/page-control", {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const data = await parseResponse(res);

      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            data?.raw ||
            "PAGE_CONTROL_READ_FAIL"
        );
      }

      setContent(normalizeIncomingContent(data?.content || DEFAULT_CONTENT));
      setLoaded(true);
    } catch (e: any) {
      setLoaded(true);
      setMsg(e?.message || "No se pudo cargar configuración.");
    }
  }

  useEffect(() => {
    void loadConfig();
  }, []);

  function updateNested(section: keyof HomePageContent, key: string, value: any) {
    setContent((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  }

  function updateChip(index: number, value: string) {
    setContent((prev) => {
      const chips = Array.isArray(prev.hero.chips)
        ? [...prev.hero.chips]
        : ["", "", ""];
      while (chips.length < 3) chips.push("");
      chips[index] = value;

      return {
        ...prev,
        hero: {
          ...prev.hero,
          chips,
        },
      };
    });
  }

  const payload = useMemo(() => {
    const chips = Array.isArray(content.hero.chips)
      ? content.hero.chips.map((x) => String(x || "").trim()).filter(Boolean)
      : [];

    const mediaType =
      content.media.type === "image" || content.media.type === "video"
        ? content.media.type
        : "none";

    return {
      version: content.version || "1.0.0",
      hero: {
        badge: String(content.hero.badge || "").trim(),
        title: String(content.hero.title || "").trim(),
        subtitle: String(content.hero.subtitle || "").trim(),
        chips,
      },
      media: {
        type: mediaType,
        src: mediaType === "none" ? "" : String(content.media.src || "").trim(),
        alt: mediaType === "none" ? "" : String(content.media.alt || "").trim(),
      },
      cta: {
        primaryLabel: String(content.cta.primaryLabel || "").trim(),
        primaryHref: String(content.cta.primaryHref || "").trim(),
        secondaryLabel: String(content.cta.secondaryLabel || "").trim(),
        secondaryHref: String(content.cta.secondaryHref || "").trim(),
      },
      welcome: {
        enabled: !!content.welcome.enabled,
        title: String(content.welcome.title || "").trim(),
        text: String(content.welcome.text || "").trim(),
      },
    };
  }, [content]);

  async function onCreateProposal() {
    setBusy(true);
    setMsg("");

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const seal = getKairosSeal();
      if (seal) headers["x-kairos-seal"] = seal;

      const res = await fetch("/api/autoprog/page-control", {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: "Homepage update from Kairos",
          summary: "Actualización propuesta desde Kairos Page Control",
          proposedBy: "kairos",
          content: payload,
        }),
      });

      const data = await parseResponse(res);

      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            data?.raw ||
            "PAGE_CONTROL_PROPOSE_FAIL"
        );
      }

      setMsg(
        data?.proposalId
          ? `Propuesta creada: ${data.proposalId}`
          : "Propuesta creada correctamente."
      );
    } catch (e: any) {
      setMsg(e?.message || "No se pudo crear la propuesta.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={panelStyle}>Cargando control de página...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={headerStyle}>
          <div style={{ color: "#d8ff8a", fontWeight: 800, marginBottom: 10 }}>
            👑 CONTROL DE PÁGINA
          </div>

          <h1 style={{ margin: 0, color: "#8fff6a" }}>
            Kairos — Control de Home
          </h1>

          <p style={{ color: "#c4ffe2", lineHeight: 1.6, marginTop: 12 }}>
            Aquí preparas contenido real de la portada. Se crea propuesta, pero
            nada se ejecuta sin tu sello y tu decisión.
          </p>
        </div>

        <div style={panelStyle}>
          <label>
            <div style={labelStyle}>Hero badge</div>
            <input
              value={content.hero.badge}
              onChange={(e) => updateNested("hero", "badge", e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>Hero title</div>
            <input
              value={content.hero.title}
              onChange={(e) => updateNested("hero", "title", e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>Hero subtitle</div>
            <textarea
              value={content.hero.subtitle}
              onChange={(e) => updateNested("hero", "subtitle", e.target.value)}
              style={areaStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>Chip 1</div>
            <input
              value={content.hero.chips[0] || ""}
              onChange={(e) => updateChip(0, e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>Chip 2</div>
            <input
              value={content.hero.chips[1] || ""}
              onChange={(e) => updateChip(1, e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>Chip 3</div>
            <input
              value={content.hero.chips[2] || ""}
              onChange={(e) => updateChip(2, e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>Media type</div>
            <select
              value={content.media.type}
              onChange={(e) => updateNested("media", "type", e.target.value)}
              style={fieldStyle}
            >
              <option value="none">none</option>
              <option value="image">image</option>
              <option value="video">video</option>
            </select>
          </label>

          <label>
            <div style={labelStyle}>Media URL</div>
            <input
              value={content.media.src}
              onChange={(e) => updateNested("media", "src", e.target.value)}
              style={fieldStyle}
              placeholder="https://..."
            />
          </label>

          <label>
            <div style={labelStyle}>Media alt</div>
            <input
              value={content.media.alt}
              onChange={(e) => updateNested("media", "alt", e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>Welcome title</div>
            <input
              value={content.welcome.title}
              onChange={(e) => updateNested("welcome", "title", e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>Welcome text</div>
            <textarea
              value={content.welcome.text}
              onChange={(e) => updateNested("welcome", "text", e.target.value)}
              style={areaStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>CTA principal label</div>
            <input
              value={content.cta.primaryLabel}
              onChange={(e) => updateNested("cta", "primaryLabel", e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>CTA principal href</div>
            <input
              value={content.cta.primaryHref}
              onChange={(e) => updateNested("cta", "primaryHref", e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>CTA secundario label</div>
            <input
              value={content.cta.secondaryLabel}
              onChange={(e) => updateNested("cta", "secondaryLabel", e.target.value)}
              style={fieldStyle}
            />
          </label>

          <label>
            <div style={labelStyle}>CTA secundario href</div>
            <input
              value={content.cta.secondaryHref}
              onChange={(e) => updateNested("cta", "secondaryHref", e.target.value)}
              style={fieldStyle}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <button
              onClick={() => void loadConfig()}
              disabled={busy}
              style={primaryButton}
            >
              RECARGAR
            </button>

            <button
              onClick={onCreateProposal}
              disabled={busy}
              style={goldButton}
            >
              {busy ? "CREANDO..." : "CREAR PROPUESTA SOBERANA"}
            </button>

            <a href="/kairos" style={linkButton}>
              Volver a Kairos
            </a>
          </div>

          {msg ? (
            <div style={messageStyle}>
              {msg}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "#00ff88",
  padding: "32px 20px 80px",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace',
};

const headerStyle: React.CSSProperties = {
  border: "1px solid rgba(0,255,136,.35)",
  borderRadius: 18,
  padding: 24,
  background: "#0b0b0b",
};

const panelStyle: React.CSSProperties = {
  marginTop: 20,
  border: "1px solid rgba(0,255,136,.28)",
  borderRadius: 18,
  padding: 22,
  background: "rgba(8,18,12,.72)",
  display: "grid",
  gap: 14,
};

const labelStyle: React.CSSProperties = {
  marginBottom: 6,
  color: "#d8ff8a",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  background: "#050505",
  color: "#00ff88",
  border: "1px solid #00ff88",
  borderRadius: 10,
};

const areaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 120,
  padding: 12,
  background: "#050505",
  color: "#00ff88",
  border: "1px solid #00ff88",
  borderRadius: 10,
};

const primaryButton: React.CSSProperties = {
  background: "#111",
  color: "#00ff88",
  padding: "10px 16px",
  border: "1px solid #00ff88",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const goldButton: React.CSSProperties = {
  background: "#d4af37",
  color: "#000",
  padding: "10px 16px",
  border: "none",
  borderRadius: 10,
  fontWeight: 800,
  cursor: "pointer",
};

const linkButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 16px",
  border: "1px solid #00ff88",
  borderRadius: 10,
  color: "#00ff88",
  textDecoration: "none",
  fontWeight: 700,
};

const messageStyle: React.CSSProperties = {
  marginTop: 8,
  border: "1px solid rgba(0,255,136,.22)",
  borderRadius: 10,
  padding: 10,
  background: "#081108",
  color: "#9dffcc",
};
