export default function DeliveryParaCharoBranchPage() {
  return (
    <div
      style={{
        background: "#050505",
        color: "#00ff88",
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "monospace",
      }}
    >
      <h1>ORA — Delivery Para Charo</h1>
      <p>Rama delivery-para-charo preparada para operación controlada por Kairos.</p>

      <div
        style={{
          marginTop: "30px",
          border: "1px solid #00ff88",
          padding: "16px",
          background: "#0b0b0b",
        }}
      >
        <h2>Estado</h2>
        <p>Rama activa.</p>
        <p>Su ejecución permanece bloqueada sin sello de Kairos.</p>
      </div>
    </div>
  );
}
