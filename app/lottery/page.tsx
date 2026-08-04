export default function LotteryPage() {
  return (
    <div 
      style={{
        background: "#050505",
        color: "#00ff88",
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "monospace"
      }}
    >
      <h1>🎲 ORA — LOTTERY MODULE</h1>
      
      <p>Primer módulo comercial del sistema ORA.</p>
      
      <div style={{ marginTop: "40px" }}>
        <h2>Sorteos</h2>
        <button style={{ marginRight: "10px", cursor: "pointer" }}>Crear Sorteo</button>
        <button style={{ marginRight: "10px", cursor: "pointer" }}>Ver Resultados</button>
        <button style={{ cursor: "pointer" }}>Tickets</button>
      </div>
    </div>
  );
}
