"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useParams } from "next/navigation";

type Patient = {
  id: string;
  name: string;
  cedula?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  emergencyContact?: string;
};

type Consultation = {
  id: string;
  date: string;
  reason: string;
  diagnosis?: string;
  notes?: string;
};

type Prescription = {
  id: string;
  medicationName: string;
  dose: string;
  frequency: string;
  duration: string;
  notes?: string;
};

type Analytic = {
  id: string;
  testName: string;
  result: string;
  unit?: string;
  referenceRange?: string;
  date: string;
  notes?: string;
};

type PatientRecordResponse = {
  result?: {
    ok?: boolean;
    error?: string;
    patient: Patient;
    summary: {
      consultations: number;
      prescriptions: number;
      analytics: number;
    };
    record: {
      consultations: Consultation[];
      prescriptions: Prescription[];
      analytics: Analytic[];
    };
  };
};

export default function PatientDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [data, setData] = useState<PatientRecordResponse["result"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRecord() {
      if (!id) return;

      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/ora/health-smg/patient-record", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ patientId: id }),
        });

        const json: PatientRecordResponse = await res.json();

        if (!json?.result?.ok) {
          setError(json?.result?.error || "No se pudo cargar el expediente.");
          return;
        }

        setData(json.result);
      } catch {
        setError("Error cargando expediente.");
      } finally {
        setLoading(false);
      }
    }

    void loadRecord();
  }, [id]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={loadingBoxStyle}>Cargando expediente del paciente...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={pageStyle}>
        <Link href="/health/patients" style={backLinkStyle}>
          ← Volver a pacientes
        </Link>

        <div style={errorBoxStyle}>{error || "Paciente no encontrado."}</div>
      </div>
    );
  }

  const patient = data.patient;

  return (
    <div style={pageStyle}>
      <div style={topBarStyle}>
        <Link href="/health/patients" style={backLinkStyle}>
          ← Volver a pacientes
        </Link>

        <div style={statusBadgeStyle}>EXPEDIENTE CLÍNICO</div>
      </div>

      <div style={heroCardStyle}>
        <div>
          <div style={heroBadgeStyle}>PACIENTE</div>
          <h1 style={heroTitleStyle}>{patient.name}</h1>
          <p style={heroSubtitleStyle}>
            Vista integral del historial clínico, recetas y analíticas.
          </p>
        </div>
      </div>

      <section style={panelStyle}>
        <h2 style={panelTitleStyle}>Perfil del paciente</h2>

        <div style={profileGridStyle}>
          <InfoItem label="Cédula" value={patient.cedula || "N/D"} />
          <InfoItem label="Teléfono" value={patient.phone || "N/D"} />
          <InfoItem label="Fecha de nacimiento" value={patient.birthDate || "N/D"} />
          <InfoItem label="Dirección" value={patient.address || "N/D"} />
          <InfoItem
            label="Contacto de emergencia"
            value={patient.emergencyContact || "N/D"}
          />
        </div>
      </section>

      <div style={statsGridStyle}>
        <StatCard label="Consultas" value={data.summary.consultations} />
        <StatCard label="Recetas" value={data.summary.prescriptions} />
        <StatCard label="Analíticas" value={data.summary.analytics} />
      </div>

      <Section title="Consultas">
        {data.record.consultations.length === 0 ? (
          <EmptyState text="Sin consultas registradas." />
        ) : (
          <div style={listGridStyle}>
            {[...data.record.consultations].reverse().map((c) => (
              <div key={c.id} style={itemStyle}>
                <div style={itemTitleStyle}>{c.date}</div>
                <div style={itemMetaStyle}>Motivo: {c.reason}</div>
                <div style={itemSubtleStyle}>
                  Diagnóstico: {c.diagnosis || "N/D"}
                </div>
                <div style={itemSubtleStyle}>Notas: {c.notes || "N/D"}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Recetas">
        {data.record.prescriptions.length === 0 ? (
          <EmptyState text="Sin recetas registradas." />
        ) : (
          <div style={listGridStyle}>
            {[...data.record.prescriptions].reverse().map((p) => (
              <div key={p.id} style={itemStyle}>
                <div style={itemTitleStyle}>{p.medicationName}</div>
                <div style={itemMetaStyle}>
                  {p.dose} | {p.frequency} | {p.duration}
                </div>
                <div style={itemSubtleStyle}>Notas: {p.notes || "N/D"}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Analíticas">
        {data.record.analytics.length === 0 ? (
          <EmptyState text="Sin analíticas registradas." />
        ) : (
          <div style={listGridStyle}>
            {[...data.record.analytics].reverse().map((a) => (
              <div key={a.id} style={itemStyle}>
                <div style={itemTitleStyle}>{a.testName}</div>
                <div style={itemMetaStyle}>
                  Resultado: {a.result} {a.unit || ""}
                </div>
                <div style={itemSubtleStyle}>
                  Rango: {a.referenceRange || "N/D"}
                </div>
                <div style={itemSubtleStyle}>Fecha: {a.date}</div>
                <div style={itemSubtleStyle}>Notas: {a.notes || "N/D"}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <h2 style={panelTitleStyle}>{title}</h2>
      {children}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={statCardStyle}>
      <div style={statLabelStyle}>{label}</div>
      <div style={statValueStyle}>{value}</div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoItemStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={emptyStateStyle}>{text}</div>;
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "#00ff88",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  padding: 24,
};

const topBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 18,
};

const backLinkStyle: CSSProperties = {
  color: "#7db5ff",
  textDecoration: "none",
  display: "inline-block",
};

const statusBadgeStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: "999px",
  padding: "6px 12px",
  fontSize: 12,
};

const heroCardStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: 18,
  padding: 20,
  marginBottom: 24,
  background: "#0b0b0b",
};

const heroBadgeStyle: CSSProperties = {
  display: "inline-block",
  border: "1px solid rgba(0,255,136,0.45)",
  borderRadius: "999px",
  padding: "6px 12px",
  marginBottom: 12,
  fontSize: 12,
};

const heroTitleStyle: CSSProperties = {
  fontSize: 48,
  lineHeight: 1,
  margin: 0,
  marginBottom: 10,
};

const heroSubtitleStyle: CSSProperties = {
  margin: 0,
  opacity: 0.85,
  fontSize: 16,
};

const panelStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: 18,
  padding: 20,
  marginBottom: 24,
  background: "#0b0b0b",
};

const panelTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 14,
  fontSize: 24,
};

const profileGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const infoItemStyle: CSSProperties = {
  border: "1px solid rgba(0,255,136,0.35)",
  borderRadius: 12,
  padding: 14,
  background: "#050505",
};

const infoLabelStyle: CSSProperties = {
  opacity: 0.72,
  fontSize: 13,
  marginBottom: 6,
};

const infoValueStyle: CSSProperties = {
  fontWeight: 700,
  lineHeight: 1.4,
};

const statsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 24,
};

const statCardStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: 16,
  padding: 16,
  background: "#0b0b0b",
};

const statLabelStyle: CSSProperties = {
  opacity: 0.8,
  marginBottom: 8,
};

const statValueStyle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
};

const listGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const itemStyle: CSSProperties = {
  border: "1px solid rgba(0,255,136,0.35)",
  borderRadius: 12,
  padding: 14,
  background: "#050505",
};

const itemTitleStyle: CSSProperties = {
  fontWeight: 700,
  marginBottom: 6,
};

const itemMetaStyle: CSSProperties = {
  marginBottom: 6,
  opacity: 0.92,
};

const itemSubtleStyle: CSSProperties = {
  opacity: 0.78,
  fontSize: 14,
  marginBottom: 4,
};

const emptyStateStyle: CSSProperties = {
  opacity: 0.72,
};

const loadingBoxStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: 16,
  padding: 18,
  background: "#0b0b0b",
};

const errorBoxStyle: CSSProperties = {
  marginTop: 16,
  border: "1px solid #ff6565",
  color: "#ff9b9b",
  borderRadius: 14,
  padding: 14,
  background: "#0b0b0b",
};
