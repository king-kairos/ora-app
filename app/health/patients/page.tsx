"use client";

import Link from "next/link";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { useHealth } from "../context";

export default function PatientsPage() {
  const {
    patients,
    loading,
    error,
    createPatient,
    savingPatient,
  } = useHealth();

  const [form, setForm] = useState({
    name: "",
    cedula: "",
    phone: "",
    birthDate: "",
    address: "",
    emergencyContact: "",
  });

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleCreatePatient(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.name.trim() || !form.cedula.trim()) {
      return;
    }

    const ok = await createPatient({
      name: form.name.trim(),
      cedula: form.cedula.trim(),
      phone: form.phone.trim(),
      birthDate: form.birthDate.trim(),
      address: form.address.trim(),
      emergencyContact: form.emergencyContact.trim(),
    });

    if (!ok) return;

    setForm({
      name: "",
      cedula: "",
      phone: "",
      birthDate: "",
      address: "",
      emergencyContact: "",
    });
  }

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <div style={badgeStyle}>PACIENTES</div>
          <h1 style={titleStyle}>Gestión de pacientes</h1>
          <p style={subtitleStyle}>
            Registro clínico base del núcleo ORA Health.
          </p>
        </div>
      </div>

      <div style={gridStyle}>
        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Crear paciente</h2>

          <form onSubmit={handleCreatePatient}>
            <div style={formGridStyle}>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Nombre completo"
                style={inputStyle}
              />
              <input
                value={form.cedula}
                onChange={(e) => updateField("cedula", e.target.value)}
                placeholder="Cédula"
                style={inputStyle}
              />
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Teléfono"
                style={inputStyle}
              />
              <input
                value={form.birthDate}
                onChange={(e) => updateField("birthDate", e.target.value)}
                placeholder="Fecha de nacimiento (YYYY-MM-DD)"
                style={inputStyle}
              />
              <input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Dirección"
                style={inputStyle}
              />
              <input
                value={form.emergencyContact}
                onChange={(e) => updateField("emergencyContact", e.target.value)}
                placeholder="Contacto de emergencia"
                style={inputStyle}
              />

              <button type="submit" disabled={savingPatient} style={buttonStyle}>
                {savingPatient ? "Guardando..." : "Crear paciente"}
              </button>
            </div>
          </form>

          {error ? <div style={errorStyle}>{error}</div> : null}
        </section>

        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Lista de pacientes</h2>

          {loading ? (
            <div style={emptyStyle}>Cargando pacientes...</div>
          ) : patients.length === 0 ? (
            <div style={emptyStyle}>No hay pacientes registrados todavía.</div>
          ) : (
            <div style={listStyle}>
              {patients.map((p) => (
                <div key={p.id} style={patientCardStyle}>
                  <Link
                    href={`/health/patient/${p.id}`}
                    style={patientLinkStyle}
                  >
                    {p.name} — {p.cedula || "Sin cédula"}
                  </Link>

                  <div style={patientMetaStyle}>
                    {p.phone || "Sin teléfono"} | {p.address || "Sin dirección"}
                  </div>

                  <div style={patientSubtleStyle}>
                    {p.birthDate || "Sin fecha de nacimiento"}
                    {p.emergencyContact ? ` | Emergencia: ${p.emergencyContact}` : ""}
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
  padding: "24px",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const heroStyle: CSSProperties = {
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
  margin: 0,
  marginBottom: "10px",
  fontSize: "48px",
  lineHeight: 1,
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  opacity: 0.85,
  fontSize: "16px",
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
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
  fontSize: "24px",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const inputStyle: CSSProperties = {
  background: "#050505",
  color: "#00ff88",
  border: "1px solid rgba(0,255,136,0.4)",
  borderRadius: "10px",
  padding: "12px 14px",
  outline: "none",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const buttonStyle: CSSProperties = {
  background: "#00ff88",
  color: "#050505",
  border: "none",
  borderRadius: "10px",
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

const errorStyle: CSSProperties = {
  marginTop: "14px",
  color: "#ff8c8c",
};

const emptyStyle: CSSProperties = {
  opacity: 0.75,
};

const listStyle: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const patientCardStyle: CSSProperties = {
  border: "1px solid rgba(0,255,136,0.35)",
  borderRadius: "12px",
  padding: "14px",
};

const patientLinkStyle: CSSProperties = {
  color: "#00ff88",
  textDecoration: "none",
  fontWeight: 700,
};

const patientMetaStyle: CSSProperties = {
  marginTop: "6px",
  opacity: 0.92,
};

const patientSubtleStyle: CSSProperties = {
  marginTop: "6px",
  opacity: 0.72,
  fontSize: "14px",
};
