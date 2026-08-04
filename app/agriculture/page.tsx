export default function Page() {
  const modules = [
    "Cultivos",
    "Sensores de humedad",
    "Riego inteligente",
    "Alertas de plagas",
    "Parcelas",
    "Inventario agrícola"
];

  return (
    <main style={{ minHeight: "100vh", background: "#050805", color: "#d9ffea", padding: 32, fontFamily: "monospace" }}>
      <section style={{ border: "1px solid rgba(0,255,136,.35)", borderRadius: 18, padding: 24, background: "#071108" }}>
        <p style={{ color: "#d4af37", fontWeight: 800, margin: 0 }}>ORA AGRICULTURE</p>
        <h1 style={{ color: "#39ff88", fontSize: 38, margin: "10px 0" }}>Crear rama ORA Agriculture para monitoreo de cultivos, humedad, riego inteligente, sensores, alertas de plagas e inventario agrícola.</h1>
        <p style={{ color: "#b8ffd9", maxWidth: 900 }}>
          Dashboard agrícola para cultivos, sensores de humedad, riego, inventario agrícola, alertas de plagas y mapa de parcelas.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginTop: 24 }}>
          {modules.map((module) => (
            <div key={module} style={{ border: "1px solid rgba(0,255,136,.25)", borderRadius: 14, padding: 16, background: "#020402" }}>
              <div style={{ color: "#d4af37", fontSize: 13 }}>{module}</div>
              <div style={{ color: "#9fffcc", fontSize: 12, marginTop: 8 }}>
                Base inicial lista para expansión soberana.
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: 24, color: "#7fffb2", fontSize: 12 }}>
        Esencia propuesta: ignis. Riesgo: medium. Ejecución bloqueada hasta aprobación soberana.
      </footer>
    </main>
  );
}
