"use client";

import { mockItems } from "@/pollera/mockData";

export default function PolleraDashboard() {
  return (
    <main style={{ minHeight: "100vh", background: "#050805", color: "#d9ffea", padding: 32, fontFamily: "monospace" }}>
      <h1 style={{ color: "#39ff88" }}>ORA Pollera</h1>
      <p>Rama generada por intención bajo Sello de Kairos.</p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
        {mockItems.map((item) => (
          <div key={item.id} style={{ border: "1px solid rgba(0,255,136,.35)", borderRadius: 14, padding: 16, background: "#071108" }}>
            <b style={{ color: "#d4af37" }}>{item.title}</b>
            <p>{item.description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
