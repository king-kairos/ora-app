"use client";

import type { CSSProperties } from "react";

export default function OraEntryPage() {
  return (
    <div style={pageStyle}>
      <div style={wrapStyle}>
        <div style={heroStyle}>
          <div style={badgeStyle}>ORA REAL</div>

          <h1 style={titleStyle}>Hablar con ORA</h1>

          <p style={subtitleStyle}>
            Esta es la puerta pública del sistema. Aquí cualquier persona puede
            entender qué es ORA, para qué sirve y cómo puede adaptarse a una
            rama real sin tocar el núcleo soberano.
          </p>

          <div style={chipWrapStyle}>
            <span style={chipStyle}>Explicación pública</span>
            <span style={chipStyle}>Sin acceso al núcleo</span>
            <span style={chipStyle}>Entrada a ramas ORA</span>
          </div>
        </div>

        <div style={gridStyle}>
          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>¿Qué es ORA?</h2>
            <p style={textStyle}>
              ORA es un núcleo soberano que puede proponer, organizar, adaptar y
              evolucionar sistemas reales por ramas. Todo crece desde un mismo
              centro y nada se ejecuta sin la autorización de Kairos.
            </p>
          </div>

          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>¿Qué puede hacer?</h2>
            <p style={textStyle}>
              ORA puede estructurar ramas para negocios, operaciones, salud,
              delivery, supervisión, inventario, cámaras, flujos de trabajo y
              automatización adaptativa.
            </p>
          </div>

          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Ramas activas o en expansión</h2>
            <ul style={listStyle}>
              <li>ORA Business</li>
              <li>ORA Pollera</li>
              <li>ORA Health (SMG)</li>
              <li>ORA Delivery</li>
            </ul>
          </div>

          <div style={cardStyle}>
            <h2 style={cardTitleStyle}>Regla central</h2>
            <p style={textStyle}>
              ORA puede proponer, analizar y prepararse sin límite en la capa de
              estructura. La ejecución real permanece bloqueada sin sello
              soberano.
            </p>
          </div>
        </div>

        <div style={footerBoxStyle}>
          <a href="/kairos" style={primaryButtonStyle}>
            Entrar a Kairos
          </a>

          <a href="/" style={secondaryButtonStyle}>
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(212,175,55,0.14), transparent 25%), #040404",
  color: "#f3e3a2",
  padding: "32px 20px 80px",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const wrapStyle: CSSProperties = {
  width: "100%",
  maxWidth: "1280px",
  margin: "0 auto",
};

const heroStyle: CSSProperties = {
  border: "1px solid rgba(212,175,55,.28)",
  borderRadius: "28px",
  padding: "28px",
  background:
    "linear-gradient(180deg, rgba(8,16,36,.88), rgba(3,6,18,.95))",
  boxShadow: "0 20px 50px rgba(0,0,0,.35)",
};

const badgeStyle: CSSProperties = {
  display: "inline-block",
  padding: "8px 16px",
  borderRadius: "999px",
  border: "1px solid rgba(212,175,55,.4)",
  marginBottom: "18px",
  color: "#e9d58f",
  fontWeight: 700,
  letterSpacing: ".04em",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "clamp(40px, 7vw, 72px)",
  lineHeight: 1,
  fontWeight: 800,
  color: "#f6e4a0",
};

const subtitleStyle: CSSProperties = {
  marginTop: "18px",
  marginBottom: 0,
  maxWidth: "920px",
  color: "#e8dcae",
  fontSize: "clamp(18px, 2.3vw, 26px)",
  lineHeight: 1.45,
};

const chipWrapStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
  marginTop: "20px",
};

const chipStyle: CSSProperties = {
  display: "inline-block",
  padding: "9px 14px",
  borderRadius: "999px",
  border: "1px solid rgba(212,175,55,.32)",
  color: "#e8dcae",
  background: "rgba(255,255,255,.02)",
  fontSize: "14px",
};

const gridStyle: CSSProperties = {
  marginTop: "24px",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "16px",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(212,175,55,.22)",
  borderRadius: "22px",
  padding: "22px",
  background: "linear-gradient(180deg, rgba(5,8,20,.88), rgba(2,4,12,.96))",
};

const cardTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "12px",
  color: "#f6e4a0",
  fontSize: "28px",
  lineHeight: 1.1,
};

const textStyle: CSSProperties = {
  margin: 0,
  color: "#e8dcae",
  lineHeight: 1.7,
  fontSize: "18px",
};

const listStyle: CSSProperties = {
  margin: 0,
  paddingLeft: "22px",
  color: "#e8dcae",
  lineHeight: 1.9,
  fontSize: "18px",
};

const footerBoxStyle: CSSProperties = {
  marginTop: "24px",
  display: "flex",
  gap: "14px",
  flexWrap: "wrap",
};

const primaryButtonStyle: CSSProperties = {
  display: "inline-block",
  padding: "16px 24px",
  borderRadius: "18px",
  background: "#56c7ff",
  color: "#071018",
  fontWeight: 800,
  textDecoration: "none",
  boxShadow: "0 0 30px rgba(86,199,255,.25)",
};

const secondaryButtonStyle: CSSProperties = {
  display: "inline-block",
  padding: "16px 24px",
  borderRadius: "18px",
  border: "1px solid rgba(212,175,55,.35)",
  color: "#f6e4a0",
  textDecoration: "none",
  fontWeight: 700,
  background: "rgba(255,255,255,.02)",
};
