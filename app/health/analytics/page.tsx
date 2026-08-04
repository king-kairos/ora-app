"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Patient = {
  id: string;
  name: string;
};

type Consultation = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  reason: string;
};

type Analytic = {
  id: string;
  patientId: string;
  consultationId?: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange?: string;
  date: string;
  notes?: string;
};

export default function AnalyticsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [analytics, setAnalytics] = useState<Analytic[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    patientId: "",
    consultationId: "",
    testName: "",
    result: "",
    unit: "",
    referenceRange: "",
    date: "",
    notes: "",
  });

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [patientsRes, consultationsRes, analyticsRes] = await Promise.all([
        fetch("/api/ora/health-smg/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        fetch("/api/ora/health-smg/consultations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        fetch("/api/ora/health-smg/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      ]);

      const patientsData = await patientsRes.json();
      const consultationsData = await consultationsRes.json();
      const analyticsData = await analyticsRes.json();

      const nextPatients = patientsData.result?.patients || [];
      const nextConsultations = consultationsData.result?.consultations || [];
      const nextAnalytics = analyticsData.result?.analytics || [];

      setPatients(nextPatients);
      setConsultations(nextConsultations);
      setAnalytics(nextAnalytics);

      setForm((prev) => ({
        ...prev,
        patientId: prev.patientId || nextPatients[0]?.id || "",
      }));
    } catch {
      setError("No se pudieron cargar las analíticas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleCreateAnalytic(e: React.FormEvent) {
    e.preventDefault();

    if (
      !form.patientId ||
      !form.testName.trim() ||
      !form.result.trim() ||
      !form.unit.trim() ||
      !form.date.trim()
    ) {
      setError("Paciente, prueba, resultado, unidad y fecha son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/ora/health-smg/analytics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          patientId: form.patientId,
          consultationId: form.consultationId || undefined,
          testName: form.testName,
          result: form.result,
          unit: form.unit,
          referenceRange: form.referenceRange,
          date: form.date,
          notes: form.notes,
        }),
      });

      const data = await res.json();

      if (!data?.result?.ok) {
        setError(data?.result?.error || "No se pudo crear la analítica.");
        return;
      }

      setForm({
        patientId: patients[0]?.id || "",
        consultationId: "",
        testName: "",
        result: "",
        unit: "",
        referenceRange: "",
        date: "",
        notes: "",
      });

      await loadAll();
    } catch {
      setError("Error creando analítica.");
    } finally {
      setSaving(false);
    }
  }

  function getPatientName(patientId: string) {
    return patients.find((p) => p.id === patientId)?.name || "Paciente desconocido";
  }

  function getConsultationLabel(consultationId?: string) {
    if (!consultationId) return "Sin consulta vinculada";
    const consultation = consultations.find((c) => c.id === consultationId);
    if (!consultation) return "Consulta no encontrada";
    return `${consultation.date} — ${consultation.reason}`;
  }

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <div style={badgeStyle}>ANALÍTICAS</div>
          <h1 style={titleStyle}>Gestión de analíticas</h1>
          <p style={subtitleStyle}>
            Resultados clínicos, unidades, rangos de referencia y notas.
          </p>
        </div>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={gridStyle}>
        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Registrar analítica</h2>

          <form onSubmit={handleCreateAnalytic}>
            <div style={formGridStyle}>
              <select
                value={form.patientId}
                onChange={(e) => updateField("patientId", e.target.value)}
                style={inputStyle}
              >
                <option value="">Selecciona paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>

              <select
                value={form.consultationId}
                onChange={(e) => updateField("consultationId", e.target.value)}
                style={inputStyle}
              >
                <option value="">Sin consulta vinculada</option>
                {consultations.map((consultation) => (
                  <option key={consultation.id} value={consultation.id}>
                    {consultation.date} — {consultation.reason}
                  </option>
                ))}
              </select>

              <input
                value={form.testName}
                onChange={(e) => updateField("testName", e.target.value)}
                placeholder="Nombre de prueba"
                style={inputStyle}
              />

              <input
                value={form.result}
                onChange={(e) => updateField("result", e.target.value)}
                placeholder="Resultado"
                style={inputStyle}
              />

              <input
                value={form.unit}
                onChange={(e) => updateField("unit", e.target.value)}
                placeholder="Unidad"
                style={inputStyle}
              />

              <input
                value={form.referenceRange}
                onChange={(e) => updateField("referenceRange", e.target.value)}
                placeholder="Rango de referencia"
                style={inputStyle}
              />

              <input
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                placeholder="Fecha (YYYY-MM-DD)"
                style={inputStyle}
              />

              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Notas"
                style={textareaStyle}
              />

              <button type="submit" disabled={saving} style={buttonStyle}>
                {saving ? "Guardando..." : "Crear analítica"}
              </button>
            </div>
          </form>
        </section>

        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Lista de analíticas</h2>

          {loading ? (
            <div style={emptyStyle}>Cargando analíticas...</div>
          ) : analytics.length === 0 ? (
            <div style={emptyStyle}>No hay analíticas registradas todavía.</div>
          ) : (
            <div style={listGridStyle}>
              {[...analytics].reverse().map((analytic) => (
                <div key={analytic.id} style={itemStyle}>
                  <div style={itemTitleStyle}>{analytic.testName}</div>
                  <div style={itemMetaStyle}>
                    Resultado: {analytic.result} {analytic.unit}
                  </div>
                  <div style={itemSubtleStyle}>
                    Paciente: {getPatientName(analytic.patientId)}
                  </div>
                  <div style={itemSubtleStyle}>
                    Consulta: {getConsultationLabel(analytic.consultationId)}
                  </div>
                  <div style={itemSubtleStyle}>
                    Fecha: {analytic.date}
                  </div>
                  <div style={itemSubtleStyle}>
                    Rango: {analytic.referenceRange || "Sin rango"}
                  </div>
                  <div style={itemSubtleStyle}>
                    Notas: {analytic.notes || "Sin notas"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "#00ff88",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  padding: 24,
};

const heroStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 24,
};

const badgeStyle: CSSProperties = {
  display: "inline-block",
  border: "1px solid #00ff88",
  borderRadius: "999px",
  padding: "6px 12px",
  marginBottom: 12,
  fontSize: 12,
};

const titleStyle: CSSProperties = {
  margin: 0,
  marginBottom: 10,
  fontSize: 48,
  lineHeight: 1,
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  opacity: 0.85,
  fontSize: 16,
};

const errorStyle: CSSProperties = {
  marginBottom: 18,
  border: "1px solid #ff6565",
  color: "#ff9b9b",
  borderRadius: 14,
  padding: 14,
  background: "#0b0b0b",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 18,
};

const panelStyle: CSSProperties = {
  border: "1px solid #00ff88",
  borderRadius: 18,
  padding: 18,
  background: "#0b0b0b",
};

const panelTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 14,
  fontSize: 24,
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const listGridStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const itemStyle: CSSProperties = {
  border: "1px solid rgba(0,255,136,0.35)",
  borderRadius: 12,
  padding: 14,
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
  opacity: 0.8,
  fontSize: 14,
  marginBottom: 4,
};

const emptyStyle: CSSProperties = {
  opacity: 0.75,
};

const inputStyle: CSSProperties = {
  background: "#050505",
  color: "#00ff88",
  border: "1px solid rgba(0,255,136,0.4)",
  borderRadius: 10,
  padding: "12px 14px",
  outline: "none",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const textareaStyle: CSSProperties = {
  background: "#050505",
  color: "#00ff88",
  border: "1px solid rgba(0,255,136,0.4)",
  borderRadius: 10,
  padding: "12px 14px",
  outline: "none",
  minHeight: 110,
  resize: "vertical",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const buttonStyle: CSSProperties = {
  background: "#00ff88",
  color: "#050505",
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};
