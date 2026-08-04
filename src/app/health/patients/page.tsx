"use client";

import { useEffect, useState } from "react";

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/ora/health-smg/patients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
      .then((res) => res.json())
      .then((data) => {
        setPatients(data.result?.patients || []);
      });
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Pacientes</h1>

      {patients.map((p) => (
        <div key={p.id} style={{ marginBottom: 10 }}>
          <a href={`/health/patient/${p.id}`}>
            {p.name} — {p.cedula}
          </a>
        </div>
      ))}
    </div>
  );
}
