"use client";

import { useEffect, useState, type CSSProperties } from "react";

type Doctor = {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    specialty: "",
    phone: "",
    email: "",
    licenseNumber: "",
  });

  async function loadDoctors() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/ora/health-smg/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      setDoctors(data.result?.doctors || []);
    } catch {
      setError("No se pudieron cargar los doctores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDoctors();
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleCreateDoctor(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim() || !form.specialty.trim()) {
      setError("Nombre y especialidad son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/ora/health-smg/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create",
          name: form.name,
          specialty: form.specialty,
          phone: form.phone,
          email: form.email,
          licenseNumber: form.licenseNumber,
        }),
      });

      const data = await res.json();

      if (!data?.result?.ok) {
        setError(data?.result?.error || "No se pudo crear el doctor.");
        return;
      }

      setForm({
        name: "",
        specialty: "",
        phone: "",
        email: "",
        licenseNumber: "",
      });

      await loadDoctors();
    } catch {
      setError("Error creando doctor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div>
          <div style={badgeStyle}>DOCTORES</div>
          <h1 style={titleStyle}>Gestión de doctores</h1>
          <p style={subtitleStyle}>
            Registro médico del núcleo ORA Health con especialidad, contacto y licencia.
          </p>
        </div>
      </div>

      {error ? <div style={errorStyle}>{error}</div> : null}

      <div style={gridStyle}>
        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Crear doctor</h2>

          <form onSubmit={handleCreateDoctor}>
            <div style={formGridStyle}>
              <input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Nombre completo"
                style={inputStyle}
              />
              <input
                value={form.specialty}
                onChange={(e) => updateField("specialty", e.target.value)}
                placeholder="Especialidad"
                style={inputStyle}
              />
              <input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Teléfono"
                style={inputStyle}
              />
              <input
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Correo"
                style={inputStyle}
              />
              <input
                value={form.licenseNumber}
                onChange={(e) => updateField("licenseNumber", e.target.value)}
                placeholder="Número de exequátur / licencia"
                style={inputStyle}
              />

              <button type="submit" disabled={saving} style={buttonStyle}>
                {saving ? "Guardando..." : "Crear doctor"}
              </button>
            </div>
          </form>
        </section>

        <section style={panelStyle}>
          <h2 style={panelTitleStyle}>Lista de doctores</h2>

          {loading ? (
            <div style={emptyStyle}>Cargando doctores...</div>
          ) : doctors.length === 0 ? (
            <div style={emptyStyle}>No hay doctores registrados todavía.</div>
          ) : (
            <div style={listGridStyle}>
              {doctors.map((d) => (
                <div key={d.id} style={itemStyle}>
                  <div style={itemTitleStyle}>{d.name}</div>
                  <div style={itemMetaStyle}>{d.specialty || "Sin especialidad"}</div>
                  <div style={itemSubtleStyle}>
                    {d.phone || "Sin teléfono"}
                    {" | "}
                    {d.email || "Sin correo"}
                  </div>
                  <div style={itemSubtleStyle}>
                    {d.licenseNumber || "Sin licencia"}
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

const buttonStyle: CSSProperties = {
  background: "#00ff88",
  color: "#050505",
  border: "none",
  borderRadius: 10,
  padding: "12px 16px",
  fontWeight: 700,
  cursor: "pointer",
};
