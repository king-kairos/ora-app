import fs from "fs";
import path from "path";
import type { CSSProperties } from "react";

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

function defaultHomepageContent(): HomePageContent {
  return {
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
}

function readHomepageContent(): HomePageContent {
  const filePath = path.join(
    process.cwd(),
    "data",
    "page-control",
    "homepage.json"
  );

  const base = defaultHomepageContent();

  try {
    if (!fs.existsSync(filePath)) return base;

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);

    return {
      ...base,
      ...parsed,
      hero: {
        ...base.hero,
        ...(parsed?.hero || {}),
      },
      media: {
        ...base.media,
        ...(parsed?.media || {}),
      },
      cta: {
        ...base.cta,
        ...(parsed?.cta || {}),
      },
      welcome: {
        ...base.welcome,
        ...(parsed?.welcome || {}),
      },
    };
  } catch {
    return base;
  }
}

export default function Home() {
  const content = readHomepageContent();

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1a2238 0%, #090b12 45%, #030303 100%)",
        color: "#f4e7b7",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 24px 28px",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(212, 186, 104, 0.45)",
            borderRadius: 24,
            overflow: "hidden",
            background:
              "linear-gradient(180deg, rgba(13,18,31,0.94) 0%, rgba(6,8,14,0.98) 100%)",
            boxShadow: "0 0 30px rgba(212,186,104,0.10)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: 24,
              padding: 32,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 12px",
                  border: "1px solid rgba(212,186,104,0.45)",
                  borderRadius: 999,
                  color: "#d8bf72",
                  fontSize: 13,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  marginBottom: 18,
                }}
              >
                {content.hero.badge}
              </div>

              <h1
                style={{
                  fontSize: "clamp(2.2rem, 5vw, 4.6rem)",
                  lineHeight: 1,
                  margin: "0 0 16px",
                  color: "#f6e7b0",
                  letterSpacing: 1,
                }}
              >
                {content.hero.title}
              </h1>

              <h2
                style={{
                  fontSize: "clamp(1rem, 2vw, 1.4rem)",
                  margin: "0 0 18px",
                  fontWeight: 500,
                  color: "#cdb980",
                  letterSpacing: 1.1,
                  textTransform: "uppercase",
                }}
              >
                {content.hero.subtitle}
              </h2>

              {content.welcome.enabled && (
                <div
                  style={{
                    marginTop: 18,
                    marginBottom: 18,
                    padding: 18,
                    borderRadius: 18,
                    border: "1px solid rgba(212,186,104,0.18)",
                    background: "rgba(10,12,18,0.58)",
                  }}
                >
                  <div
                    style={{
                      color: "#f2e0a4",
                      marginBottom: 8,
                      fontWeight: 700,
                    }}
                  >
                    {content.welcome.title}
                  </div>

                  <div
                    style={{
                      margin: 0,
                      fontSize: 17,
                      lineHeight: 1.7,
                      color: "#e9e0c6",
                      maxWidth: 650,
                    }}
                  >
                    {content.welcome.text}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 14,
                  marginTop: 28,
                }}
              >
                {(content.hero.chips || []).slice(0, 3).map((chip, idx) => (
                  <div key={`${chip}-${idx}`} style={featureCard}>
                    <div style={featureTitle}>{chip}</div>
                    <div style={featureText}>
                      Configurado desde Kairos Page Control.
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginTop: 24,
                }}
              >
                <a href={content.cta.primaryHref} style={ctaPrimary}>
                  {content.cta.primaryLabel}
                </a>

                <a href={content.cta.secondaryHref} style={ctaSecondary}>
                  {content.cta.secondaryLabel}
                </a>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                minHeight: 420,
                borderRadius: 22,
                border: "1px solid rgba(212,186,104,0.25)",
                background:
                  content.media.type === "none"
                    ? "radial-gradient(circle at 50% 45%, rgba(247,223,146,0.95) 0%, rgba(201,171,88,0.55) 12%, rgba(35,43,72,0.28) 28%, rgba(8,10,18,0.92) 60%, rgba(3,3,6,1) 100%)"
                    : "#070b12",
                overflow: "hidden",
              }}
            >
              {content.media.type === "image" && content.media.src ? (
                <img
                  src={content.media.src}
                  alt={content.media.alt || content.hero.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : content.media.type === "video" && content.media.src ? (
                <video
                  src={content.media.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <>
                  <div style={ring1} />
                  <div style={ring2} />
                  <div style={ring3} />
                  <div style={triangleGlow} />

                  <div
                    style={{
                      position: "absolute",
                      left: 18,
                      top: 18,
                      padding: "10px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(212,186,104,0.35)",
                      background: "rgba(8,10,18,0.55)",
                      color: "#f3e8c0",
                      fontSize: 14,
                      lineHeight: 1.4,
                      maxWidth: 180,
                    }}
                  >
                    Núcleo
                    <br />
                    soberano
                    <br />
                    ORA
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      right: 18,
                      bottom: 24,
                      padding: "10px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(212,186,104,0.35)",
                      background: "rgba(8,10,18,0.55)",
                      color: "#f3e8c0",
                      fontSize: 14,
                      lineHeight: 1.4,
                      maxWidth: 180,
                      textAlign: "right",
                    }}
                  >
                    Propuesta
                    <br />
                    sin límite
                    <br />
                    ejecución con sello
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 42,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 64,
                        letterSpacing: 4,
                        color: "#f5e4a7",
                        textShadow: "0 0 18px rgba(245,228,167,0.18)",
                        fontFamily: "Georgia, serif",
                      }}
                    >
                      ORA
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "#d6c288",
                        textTransform: "uppercase",
                        letterSpacing: 2.2,
                        fontSize: 13,
                      }}
                    >
                      Interfaz central de conciencia
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

const featureCard: CSSProperties = {
  border: "1px solid rgba(212,186,104,0.24)",
  borderRadius: 18,
  padding: "16px 14px",
  background: "rgba(10,12,18,0.58)",
};

const featureTitle: CSSProperties = {
  color: "#f2e0a4",
  marginBottom: 8,
  fontWeight: 700,
};

const featureText: CSSProperties = {
  color: "#cfc6aa",
  lineHeight: 1.5,
  fontSize: 14,
};

const ctaPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "12px 18px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 700,
  background: "linear-gradient(180deg, #59d0ff 0%, #2da7ff 100%)",
  color: "#03131f",
  boxShadow: "0 0 18px rgba(52,170,255,0.22)",
};

const ctaSecondary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "12px 18px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 700,
  border: "1px solid rgba(212,186,104,0.35)",
  color: "#f3e8c0",
  background: "rgba(8,10,18,0.55)",
};

const ring1: CSSProperties = {
  position: "absolute",
  inset: "11%",
  border: "1px solid rgba(220,199,129,0.22)",
  borderRadius: "50%",
};

const ring2: CSSProperties = {
  position: "absolute",
  inset: "18%",
  border: "1px solid rgba(220,199,129,0.18)",
  borderRadius: "50%",
};

const ring3: CSSProperties = {
  position: "absolute",
  inset: "27%",
  border: "1px solid rgba(220,199,129,0.16)",
  borderRadius: "50%",
};

const triangleGlow: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "42%",
  width: 230,
  height: 230,
  transform: "translate(-50%, -50%) rotate(45deg)",
  border: "1px solid rgba(245,226,154,0.28)",
  boxShadow: "0 0 40px rgba(245,226,154,0.10)",
};
