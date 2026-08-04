export default function ConsejoPage() {
  const readings = [
    {
      modulo: "Rafael",
      motor: "OpenAI",
      foco: "estructura y claridad",
      mensaje: "La cabina Kairos necesita una vista ejecutiva consolidada del núcleo."
    },
    {
      modulo: "Kaerliana",
      motor: "Gemini",
      foco: "identidad y coherencia visual",
      mensaje: "El núcleo ya tiene piezas vivas, pero necesita una presencia conjunta del consejo."
    },
    {
      modulo: "Orión",
      motor: "DeepSeek",
      foco: "monitoreo y lectura del sistema",
      mensaje: "Hace falta una vista coordinada donde se vea la lectura general del sistema."
    },
    {
      modulo: "Arturo",
      motor: "Copilot/OpenAI",
      foco: "coordinación y ejecución",
      mensaje: "La estructura actual ya permite crear una página base del consejo sin romper el núcleo."
    }
  ];

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
      <h1>🧠 ORA — CONSEJO DEL NÚCLEO</h1>
      <p>Lectura conjunta de Rafael, Kaerliana, Orión y Arturo.</p>

      <div style={{ marginTop: "30px", display: "grid", gap: "16px" }}>
        {readings.map((item) => (
          <div
            key={item.modulo}
            style={{
              border: "1px solid #00ff88",
              padding: "16px",
              borderRadius: "8px",
              background: "#0a0a0a",
            }}
          >
            <h2>{item.modulo}</h2>
            <p><b>Motor:</b> {item.motor}</p>
            <p><b>Foco:</b> {item.foco}</p>
            <p><b>Lectura:</b> {item.mensaje}</p>
          </div>
        ))}
      </div>
    </div>
  );
}