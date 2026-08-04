// app/health/page.tsx
"use client";

import { useHealth } from "./context";
import type { CSSProperties } from "react";

export default function OraHealthDashboardPage() {
  const {
    patients,
    doctors,
    consultations,
    prescriptions,
    analytics,
    loading,
    error,
    reloadAll,
  } = useHealth();

  const recentPatients = [...patients].slice(-5).reverse();
  const recentConsultations = [...consultations].slice(-5).reverse();

  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <div>
          <div style={badgeStyle}>ORA HEALTH SMG</div>
          <h1 style={titleStyle}>Dashboard</h1>
          <p style={subtitleStyle}>
            Centro clínico operativo de pacientes, consultas, recetas y
            analíticas.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <a href="/ora-health-smg" style={rafaelButtonStyle}>
            Abrir Rafael →
          </a>

          <button
            type="button"
            style={reloadButtonStyle}
            onClick={() => void reloadAll()}
          >
            Recargar
          </button>
        </div>
      </div>

      <section style={healthPatchCardStyle}>
        <h3 style={healthPatchTitleStyle}>Estado Rafael</h3>
        <p style={healthPatchTextStyle}>
          estado rafael activo en supervisión clínica
        </p>
      </section>

      <div style={topActionsGridStyle}>
        <ActionCard
          href="/ora-health-smg"
          title="Panel Rafael"
          description="Orientación clínica, contexto, alertas e historial."
        />
        <ActionCard
          href="/health/patients"
          title="Pacientes"
          description="Entrar al registro y perfiles clínicos."
        />
        <ActionCard
          href="/health/consultations"
          title="Consultas"
          description="Registrar seguimiento, motivo y evolución."
        />
      </div>

      {loading ? <div style={messageBoxStyle}>Cargando dashboard...</div> : null}

      {error ? (
        <div
          style={{
            ...messageBoxStyle,
            borderColor: "#ff6565",
            color: "#ff9b9b",
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={statsGridStyle}>
        <StatCard
          title="Pacientes"
          value={patients.length}
          href="/health/patients"
        />
        <StatCard
          title="Doctores"
          value={doctors.length}
          href="/health/doctors"
        />
        <StatCard
          title="Consultas"
          value={consultations.length}
          href="/health/consultations"
        />
        <StatCard
          title="Recetas"
          value={prescriptions.length}
          href="/health/prescriptions"
        />
        <StatCard
          title="Analíticas"
          value={analytics.length}
          href="/health/analytics"
        />
      </div>

      <div style={quickGridStyle}>
        <QuickLink
          href="/health/patients"
          title="Gestionar pacientes"
          description="Crear, listar y entrar a perfil."
        />
        <QuickLink
          href="/health/doctors"
          title="Gestionar doctores"
          description="Registro médico y especialidades."
        />
        <QuickLink
          href="/health/consultations"
          title="Registrar consultas"
          description="Motivo, diagnóstico y notas."
        />
        <QuickLink
          href="/health/prescriptions"
          title="Registrar recetas"
          description="Medicamentos y frecuencia."
        />
        <QuickLink
          href="/health/analytics"
          title="Registrar analíticas"
          description="Resultados y rangos."
        />
        <QuickLink
          href="/ora-health-smg"
          title="Abrir Rafael"
          description="Panel clínico táctico con orientación e historial."
        />
      </div>

      <div style={sectionsGridStyle}>
        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Últimos pacientes</h2>

          {recentPatients.length === 0 ? (
            <div style={emptyStyle}>No hay pacientes registrados.</div>
          ) : (
            recentPatients.map((patient) => (
              <a
                key={patient.id}
                href={`/health/patient/${patient.id}`}
                style={listItemLinkStyle}
              >
                <div style={listItemTitleStyle}>
                  {patient.name || "Paciente sin nombre"}
                </div>
                <div style={listItemMetaStyle}>
                  {patient.cedula || "Sin cédula"}
                  {patient.phone ? ` | ${patient.phone}` : ""}
                </div>
              </a>
            ))
          )}
        </section>

        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Últimas consultas</h2>

          {recentConsultations.length === 0 ? (
            <div style={emptyStyle}>No hay consultas registradas.</div>
          ) : (
            recentConsultations.map((consultation) => (
              <div key={consultation.id} style={listItemBoxStyle}>
                <div style={listItemTitleStyle}>
                  {consultation.date || "Sin fecha"}
                </div>
                <div style={listItemMetaStyle}>
                  {consultation.reason || "Sin motivo"}
                </div>
                <div style={listItemSubtleStyle}>
                  {consultation.diagnosis || "Sin diagnóstico"}
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  href,
}: {
  title: string;
  value: number;
  href: string;
}) {
  return (
    <a href={href} style={statCardStyle}>
      <div style={statTitleStyle}>{title}</div>
      <div style={statValueStyle}>{value}</div>
      <div style={statOpenStyle}>Abrir →</div>
    </a>
  );
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a href={href} style={quickCardStyle}>
      <div style={quickTitleStyle}>{title}</div>
      <div style={quickDescriptionStyle}>{description}</div>
    </a>
  );
}

function ActionCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a href={href} style={actionCardStyle}>
      <div style={actionTitleStyle}>{title}</div>
      <div style={actionDescriptionStyle}>{description}</div>
    </a>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "#00ff88",
  padding: "24px",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "24px",
};

const headerActionsStyle: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
};

const badgeStyle: CSSProperties = {
  display: "inline-block",
  border: "1px solid #00ff88",
  borderRadius: "999px",
  padding: "6px 12px",
  marginBottom: "12px",
  fontSize: "12px",
};

const titleStyle: CSSProperties = {
  fontSize: "56px",
  lineHeight: 1,
  margin: 0,
  marginBottom: "10px",
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  opacity: 0.85,
  fontSize: "16px",
  maxWidth: "760px",
};

const rafaelButtonStyle: CSSProperties = {
  background: "#0b0b0b",
  color: "#00ff88",
  border: "1px solid #00ff88",
  borderRadius: "12px",
  padding: "12px 18px",
  fontWeight: "bold",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const reloadButtonStyle: CSSProperties = {
  background: "#00ff88",
  color: "#050505",
  border: "none",
  borderRadius: "12px",
  padding: "12px 18px",
  fontWeight: "bold",
  cursor: "pointer",
};

const topActionsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const actionCardStyle: CSSProperties = {
  textDecoration: "none",
  color: "#00ff88",
  border: "1px solid rgba(0,255,136,0.45)",
  borderRadius: "18px",
  padding: "18px",
  background: "#0b0b0b",
  display: "block",
};

const actionTitleStyle: CSSProperties = {
  fontSize: "20px",
  fontWeight: "bold",
  marginBottom: "8px",
};

const actionDescriptionStyle: CSSProperties = {
  fontSize: "14px",
  opacity: 0.85,
};

const messageBoxStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: "14px",
  padding: "14px",
  marginBottom: "18px",
  background: "#0b0b0b",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const statCardStyle: CSSProperties = {
  textDecoration: "none",
  color: "#00ff88",
  border: "1px solid #00ff88",
  borderRadius: "18px",
  padding: "18px",
  background: "#0b0b0b",
  display: "block",
};

const statTitleStyle: CSSProperties = {
  fontSize: "16px",
  opacity: 0.85,
  marginBottom: "12px",
};

const statValueStyle: CSSProperties = {
  fontSize: "42px",
  fontWeight: "bold",
  lineHeight: 1,
  marginBottom: "12px",
};

const statOpenStyle: CSSProperties = {
  fontSize: "14px",
  opacity: 0.85,
};

const quickGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const quickCardStyle: CSSProperties = {
  textDecoration: "none",
  color: "#00ff88",
  border: "1px solid #00ff88",
  borderRadius: "18px",
  padding: "18px",
  background: "#0b0b0b",
  display: "block",
};

const quickTitleStyle: CSSProperties = {
  fontSize: "18px",
  fontWeight: "bold",
  marginBottom: "8px",
};

const quickDescriptionStyle: CSSProperties = {
  fontSize: "14px",
  opacity: 0.85,
};

const sectionsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "18px",
};

const panelStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: "18px",
  padding: "18px",
  background: "#0b0b0b",
};

const panelTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: "14px",
  fontSize: "26px",
};

const emptyStyle: CSSProperties = {
  opacity: 0.75,
};

const listItemLinkStyle: CSSProperties = {
  display: "block",
  textDecoration: "none",
  color: "#00ff88",
  border: "1px solid rgba(0,255,136,0.35)",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "10px",
};

const listItemBoxStyle: CSSProperties = {
  border: "1px solid rgba(0,255,136,0.35)",
  borderRadius: "12px",
  padding: "12px",
  marginBottom: "10px",
};

const listItemTitleStyle: CSSProperties = {
  fontWeight: "bold",
  marginBottom: "6px",
};

const listItemMetaStyle: CSSProperties = {
  opacity: 0.92,
  marginBottom: "4px",
};

const listItemSubtleStyle: CSSProperties = {
  opacity: 0.75,
  fontSize: "14px",
};

// ✅ Estilos para la tarjeta de estado Rafael (agregados según corrección de Rafael)
const healthPatchCardStyle: CSSProperties = {
  border: "1px solid rgba(0,255,136,.35)",
  borderRadius: "18px",
  padding: "18px",
  marginTop: "18px",
  marginBottom: "18px",
  background: "rgba(0,255,65,.06)",
};
const healthPatchTitleStyle: CSSProperties = {
  margin: 0,
  color: "#8fff6a",
  fontSize: "18px",
  fontWeight: "bold",
};
const healthPatchTextStyle: CSSProperties = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#d9ffea",
  fontSize: "14px",
  opacity: 0.92,
};


// ORA FORCE PATCH:
// en ora health agrega tarjeta estado rafael sistema estable
