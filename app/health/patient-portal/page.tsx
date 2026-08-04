"use client";

import { useHealth } from "../context";
import type { CSSProperties } from "react";

export default function PatientPortalPage() {
  const {
    patients,
    consultations,
    prescriptions,
    loading,
    error,
    reloadAll,
  } = useHealth();

  // Base temporal para prueba:
  // toma el primer paciente disponible hasta que pongamos login real
  const patient = patients.length > 0 ? patients[0] : null;
  const patientAny = patient as any;

  const patientConsultations = consultations
    .filter((item: any) => {
      return (
        item?.patientId === patientAny?.id ||
        item?.pacienteId === patientAny?.id ||
        item?.patient_id === patientAny?.id
      );
    })
    .slice()
    .reverse();

  const patientPrescriptions = prescriptions
    .filter((item: any) => {
      return (
        item?.patientId === patientAny?.id ||
        item?.pacienteId === patientAny?.id ||
        item?.patient_id === patientAny?.id
      );
    })
    .slice()
    .reverse();

  return (
    <div style={pageStyle}>
      <div style={wrapStyle}>
        <div style={headerRowStyle}>
          <div>
            <div style={badgeStyle}>ORA HEALTH SMG</div>
            <h1 style={titleStyle}>Portal del paciente</h1>
            <p style={subtitleStyle}>
              Vista individual del paciente. Aquí solo debe verse información
              del caso propio, sin exponer historial global ni datos de otros
              pacientes.
            </p>
          </div>

          <div style={headerActionsStyle}>
            <a href="/health" style={ghostButtonStyle}>
              ← Volver
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

        {loading ? <div style={messageBoxStyle}>Cargando portal...</div> : null}

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

        {!patient ? (
          <div style={panelStyle}>
            <h2 style={panelTitleStyle}>Paciente</h2>
            <div style={emptyStyle}>No hay paciente cargado todavía.</div>
          </div>
        ) : (
          <>
            <div style={statsGridStyle}>
              <div style={statCardStyle}>
                <div style={statTitleStyle}>Paciente</div>
                <div style={statBigTextStyle}>
                  {patientAny?.name ||
                    patientAny?.nombre ||
                    "Paciente sin nombre"}
                </div>
                <div style={statSubtleStyle}>
                  {patientAny?.cedula || "Sin cédula"}
                </div>
              </div>

              <div style={statCardStyle}>
                <div style={statTitleStyle}>Consultas</div>
                <div style={statValueStyle}>{patientConsultations.length}</div>
                <div style={statSubtleStyle}>Historial del paciente</div>
              </div>

              <div style={statCardStyle}>
                <div style={statTitleStyle}>Recetas</div>
                <div style={statValueStyle}>{patientPrescriptions.length}</div>
                <div style={statSubtleStyle}>Indicaciones registradas</div>
              </div>
            </div>

            <div style={quickGridStyle}>
              <a href="/ora-health-smg" style={quickCardStyle}>
                <div style={quickTitleStyle}>Hablar con Rafael</div>
                <div style={quickDescriptionStyle}>
                  Entrar a orientación clínica contextual del caso.
                </div>
              </a>
            </div>

            <div style={sectionsGridStyle}>
              <section style={panelStyle}>
                <h2 style={panelTitleStyle}>Últimas consultas</h2>

                {patientConsultations.length === 0 ? (
                  <div style={emptyStyle}>
                    No hay consultas registradas para este paciente.
                  </div>
                ) : (
                  patientConsultations.slice(0, 10).map((consultation: any) => (
                    <div
                      key={String(
                        consultation.id ||
                          consultation._id ||
                          Math.random().toString(36)
                      )}
                      style={listItemBoxStyle}
                    >
                      <div style={listItemTitleStyle}>
                        {consultation.date ||
                          consultation.fecha ||
                          "Sin fecha"}
                      </div>

                      <div style={listItemMetaStyle}>
                        {consultation.reason ||
                          consultation.motivo ||
                          consultation.sintomas ||
                          "Sin motivo"}
                      </div>

                      <div style={listItemSubtleStyle}>
                        {consultation.diagnosis ||
                          consultation.diagnostico ||
                          consultation.indicaciones ||
                          "Sin diagnóstico"}
                      </div>
                    </div>
                  ))
                )}
              </section>

              <section style={panelStyle}>
                <h2 style={panelTitleStyle}>Últimas recetas</h2>

                {patientPrescriptions.length === 0 ? (
                  <div style={emptyStyle}>
                    No hay recetas registradas para este paciente.
                  </div>
                ) : (
                  patientPrescriptions.slice(0, 10).map((prescription: any) => (
                    <div
                      key={String(
                        prescription.id ||
                          prescription._id ||
                          Math.random().toString(36)
                      )}
                      style={listItemBoxStyle}
                    >
                      <div style={listItemTitleStyle}>
                        {prescription.date ||
                          prescription.fecha ||
                          "Sin fecha"}
                      </div>

                      <div style={listItemMetaStyle}>
                        {prescription.medicamento ||
                          prescription.medicine ||
                          prescription.nombre ||
                          "Receta"}
                      </div>

                      <div style={listItemSubtleStyle}>
                        {prescription.frecuencia ||
                          prescription.frequency ||
                          prescription.indicaciones ||
                          "Sin detalle"}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
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

const wrapStyle: CSSProperties = {
  width: "100%",
  maxWidth: "1200px",
  margin: "0 auto",
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
  fontSize: "48px",
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

const ghostButtonStyle: CSSProperties = {
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

const messageBoxStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: "14px",
  padding: "14px",
  marginBottom: "18px",
  background: "#0b0b0b",
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const statCardStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: "18px",
  padding: "18px",
  background: "#0b0b0b",
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

const statBigTextStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: "bold",
  lineHeight: 1.2,
  marginBottom: "12px",
};

const statSubtleStyle: CSSProperties = {
  fontSize: "14px",
  opacity: 0.75,
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
