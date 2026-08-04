"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Patient = {
  id: string;
  name: string;
  cedula?: string;
  phone?: string;
  address?: string;
};

type Doctor = {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  email?: string;
};

type Consultation = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  reason: string;
  diagnosis?: string;
  notes?: string;
};

type Prescription = {
  id: string;
  patientId: string;
  doctorId: string;
  consultationId?: string;
  medicationName: string;
  dose: string;
  frequency: string;
  duration: string;
  notes?: string;
};

type Analytic = {
  id: string;
  patientId: string;
  consultationId?: string;
  testName?: string;
  result?: string;
  unit?: string;
  referenceRange?: string;
  date?: string;
  notes?: string;
};

type PatientsResponse = {
  result?: {
    patients?: Patient[];
  };
};

type DoctorsResponse = {
  result?: {
    doctors?: Doctor[];
  };
};

type ConsultationsResponse = {
  result?: {
    consultations?: Consultation[];
  };
};

type PrescriptionsResponse = {
  result?: {
    prescriptions?: Prescription[];
  };
};

type AnalyticsResponse = {
  result?: {
    analytics?: Analytic[];
  };
};

export default function OraHealthDashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [analytics, setAnalytics] = useState<Analytic[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    return (await res.json()) as T;
  }

  async function loadDashboard(): Promise<void> {
    try {
      setLoading(true);
      setError("");

      const [
        patientsRes,
        doctorsRes,
        consultationsRes,
        prescriptionsRes,
        analyticsRes,
      ] = await Promise.all([
        postJson<PatientsResponse>("/api/ora/health-smg/patients", {}),
        postJson<DoctorsResponse>("/api/ora/health-smg/doctors", {}),
        postJson<ConsultationsResponse>("/api/ora/health-smg/consultations", {}),
        postJson<PrescriptionsResponse>("/api/ora/health-smg/prescriptions", {}),
        postJson<AnalyticsResponse>("/api/ora/health-smg/analytics", {}),
      ]);

      setPatients(Array.isArray(patientsRes?.result?.patients) ? patientsRes.result?.patients ?? [] : []);
      setDoctors(Array.isArray(doctorsRes?.result?.doctors) ? doctorsRes.result?.doctors ?? [] : []);
      setConsultations(
        Array.isArray(consultationsRes?.result?.consultations)
          ? consultationsRes.result?.consultations ?? []
          : []
      );
      setPrescriptions(
        Array.isArray(prescriptionsRes?.result?.prescriptions)
          ? prescriptionsRes.result?.prescriptions ?? []
          : []
      );
      setAnalytics(
        Array.isArray(analyticsRes?.result?.analytics)
          ? analyticsRes.result?.analytics ?? []
          : []
      );
    } catch (_err) {
      setError("No se pudo cargar el dashboard.");
      setPatients([]);
      setDoctors([]);
      setConsultations([]);
      setPrescriptions([]);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }

  const recentPatients = [...patients].slice(-5).reverse();
  const recentConsultations = [...consultations].slice(-5).reverse();

  return (
    <div style={pageStyle}>
      <div style={headerRowStyle}>
        <div>
          <div style={badgeStyle}>ORA HEALTH SMG</div>
          <h1 style={titleStyle}>Dashboard</h1>
          <p style={subtitleStyle}>
            Centro clínico operativo de pacientes, consultas, recetas y analíticas.
          </p>
        </div>

        <button type="button" style={reloadButtonStyle} onClick={() => void loadDashboard()}>
          Recargar
        </button>
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
        <StatCard title="Pacientes" value={patients.length} href="/health/patients" />
        <StatCard title="Doctores" value={doctors.length} href="/health/doctors" />
        <StatCard title="Consultas" value={consultations.length} href="/health/consultations" />
        <StatCard title="Recetas" value={prescriptions.length} href="/health/prescriptions" />
        <StatCard title="Analíticas" value={analytics.length} href="/health/analytics" />
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
                <div style={listItemTitleStyle}>{patient.name}</div>
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
                <div style={listItemTitleStyle}>{consultation.date}</div>
                <div style={listItemMetaStyle}>{consultation.reason}</div>
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
