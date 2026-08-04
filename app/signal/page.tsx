export default function SignalPage() {
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
      <h1>ORA — Signal</h1>
      <p>Módulo signal generado desde intención por ORA.</p>

      <div style={{ marginTop: "30px", border: "1px solid #00ff88", padding: "16px" }}>
        <p>Módulo generado automáticamente por ORA.</p>
        <p>Nombre interno: signal</p>
      </div>
    </div>
  );
}
