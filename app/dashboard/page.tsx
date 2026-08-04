"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { oraApi } from "@/lib/oraApi";

export default function DashboardPage() {
  const [status, setStatus] = useState("CARGANDO...");
  const [modules, setModules] = useState<string[]>([]);
  const [raw, setRaw] = useState<any>(null);

  async function load() {
    try {
      const data = await oraApi.health();
      setRaw(data);
      setStatus(data?.ok ? "ORA CORE ONLINE" : "OFFLINE");
      setModules(Array.isArray(data?.modules) ? data.modules : []);
    } catch (e: any) {
      setStatus("ERROR: " + (e?.message || "sin conexión"));
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#00ff41",
        fontFamily: "monospace",
        padding: 20,
      }}
    >
      <h1 style={{ marginBottom: 20 }}>ORA DASHBOARD</h1>

      <div
        style={{
          border: "1px solid #00ff41",
          padding: 16,
          marginBottom: 20,
          background: "#0b0b0b",
        }}
      >
        <div style={{ fontSize: 18, marginBottom: 10 }}>
          STATUS: <b>{status}</b>
        </div>

        <div style={{ marginBottom: 10 }}>
          MÓDULOS ACTIVOS:{" "}
          <b>{modules.length ? modules.join(", ") : "NINGUNO"}</b>
        </div>

        <button
          onClick={load}
          style={{
            background: "#d4af37",
            color: "#000",
            border: "none",
            padding: "10px 16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          RECARGAR
        </button>
      </div>

      <div
        style={{
          border: "1px solid #00ff41",
          padding: 16,
          marginBottom: 20,
          background: "#0b0b0b",
        }}
      >
        <h2 style={{ marginBottom: 10 }}>RAW DATA</h2>
        <pre style={{ fontSize: 12 }}>
          {JSON.stringify(raw, null, 2)}
        </pre>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link
          href="/soberania"
          style={{
            border: "1px solid #00ff41",
            color: "#00ff41",
            padding: "10px 14px",
            textDecoration: "none",
          }}
        >
          IR A SOBERANÍA
        </Link>

        <Link
          href="/soberania/apply"
          style={{
            border: "1px solid #d4af37",
            color: "#d4af37",
            padding: "10px 14px",
            textDecoration: "none",
          }}
        >
          PANEL DE EJECUCIÓN (FUTURO)
        </Link>
      </div>
    </div>
  );
}
