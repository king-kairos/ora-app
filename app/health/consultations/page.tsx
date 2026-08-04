"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Patient = {
  id: string;
  name: string;
};

type Doctor = {
  id: string;
  name: string;
  specialty?: string;
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

export default function ConsultationsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    patientId: "",
    doctorId: "",
    date: "",
    reason: "",
    diagnosis: "",
    notes: "",
  });

  async function loadAll() {
    try {
      setLoading(true);
      setError("");

      const [patientsRes, doctorsRes, consultationsRes] = await Promise.all([
        fetch("/api/ora/health-smg/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        fetch("/api/ora/health-smg/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
        fetch("/api/ora/health-smg/consultations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      ]);

      const patientsData = await patientsRes.json();
      const doctorsData = await doctorsRes.json();
      const consultationsData = await consultationsRes.json();

      const nextPatients = patientsData.result?.patients || [];
      const nextDoctors = doctorsData.result?.doctors || [];
      const nextConsultations = consultationsData.result?.consultations || [];

      setPatients(nextPatients);
      setDoctors(nextDoctors);
      setConsultations(nextConsultations);

      setForm((prev) => ({
        ...prev,
        patientId: prev.patientId || nextPatients[0]?.id || "",
        doctorId: prev.doctorId || nextDoctors[0]?.id || "",
      }));
    } catch {
      setError("No se pudieron cargar las consultas.");
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

  async function handleCreateConsultation(e: React.FormEvent) {
    e.preventDefault();

    if (!form.patientId || !form.doctorId || !form.date.trim() || !form.reason.trim()) {
      setError("Paciente, doctor, fecha y motivo son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/ora/health-smg/consultations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          patientId: form.patientId,
          doctorId: form.doctorId,
          date: form.date,
          reason: form.reason,
          diagnosis: form.diagnosis,
          notes: form.notes,
        }),
      });

      const data = await res.json();

      if (!data?.result?.ok) {
        setError(data?.result?.error || "No se pudo crear la consulta.");
        return;
      }

      setForm({
        patientId: patients[0]?.id || "",
        doctorId: doctors[0]?.id || "",
        date: "",
        reason: "",
        diagnosis: "",
        notes: "",
      });

      await loadAll();
    } catch {
      setError("Error creando consulta.");
    } finally {
      setSaving(false);
    }
  }

  function getPatientName(patientId: string) {
    return patients.find((p) => p.id === patientId)?.name || "Paciente desconocido";
  }

  function getDoctorName(doctorId: string) {
    return doctors.find((d) => d.id === doctorId)?.name || "Doctor desconocido";
  }

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <div style={badgeStyle}>CONSULTAS</div>
          <h1 style={titleStyle}>Gestión de consultas</h1>
          <p style={subtitleStyle}>
            Registro clínico de evaluaciones médicas, motivo, diagnóstico y notas.
          </p>
        </div>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={gridStyle}>
        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Registrar consulta</h2>

          <form onSubmit={handleCreateConsultation}>
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
                value={form.doctorId}
                onChange={(e) => updateField("doctorId", e.target.value)}
                style={inputStyle}
              >
                <option value="">Selecciona doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name}
                    {doctor.specialty ? ` — ${doctor.specialty}` : ""}
                  </option>
                ))}
              </select>

              <input
                value={form.date}
                onChange={(e) => updateField("date", e.target.value)}
                placeholder="Fecha (YYYY-MM-DD)"
                style={inputStyle}
              />

              <input
                value={form.reason}
                onChange={(e) => updateField("reason", e.target.value)}
                placeholder="Motivo de consulta"
                style={inputStyle}
              />

              <input
                value={form.diagnosis}
                onChange={(e) => updateField("diagnosis", e.target.value)}
                placeholder="Diagnóstico"
                style={inputStyle}
              />

              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Notas clínicas"
                style={textareaStyle}
              />

              <button type="submit" disabled={saving} style={buttonStyle}>
                {saving ? "Guardando..." : "Crear consulta"}
              </button>
            </div>
          </form>
        </section>

        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Lista de consultas</h2>

          {loading ? (
            <div style={emptyStyle}>Cargando consultas...</div>
          ) : consultations.length === 0 ? (
            <div style={emptyStyle}>No hay consultas registradas todavía.</div>
          ) : (
            <div style={listGridStyle}>
              {[...consultations].reverse().map((consultation) => (
                <div key={consultation.id} style={itemStyle}>
                  <div style={itemTitleStyle}>{consultation.date}</div>
                  <div style={itemMetaStyle}>{consultation.reason}</div>
                  <div style={itemSubtleStyle}>
                    Paciente: {getPatientName(consultation.patientId)}
                  </div>
                  <div style={itemSubtleStyle}>
                    Doctor: {getDoctorName(consultation.doctorId)}
                  </div>
                  <div style={itemSubtleStyle}>
                    Diagnóstico: {consultation.diagnosis || "Sin diagnóstico"}
                  </div>
                  <div style={itemSubtleStyle}>
                    Notas: {consultation.notes || "Sin notas"}
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
