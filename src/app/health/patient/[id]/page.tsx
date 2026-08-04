"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function PatientDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    fetch("/api/ora/health-smg/patient-record", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ patientId: id }),
    })
      .then((res) => res.json())
      .then((res) => setData(res.result));
  }, [id]);

  if (!data) return <div>Cargando...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>{data.patient.name}</h1>

      <h2>Consultas</h2>
      {data.record.consultations.map((c: any) => (
        <div key={c.id}>
          {c.date} — {c.reason}
        </div>
      ))}

      <h2>Recetas</h2>
      {data.record.prescriptions.map((p: any) => (
        <div key={p.id}>
          {p.medicationName} — {p.dose}
        </div>
      ))}

      <h2>Analíticas</h2>
      {data.record.analytics.map((a: any) => (
        <div key={a.id}>
          {a.testName}: {a.result} {a.unit}
        </div>
      ))}
    </div>
  );
}
