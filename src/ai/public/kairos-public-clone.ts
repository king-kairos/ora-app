export async function runKairosPublicClone(prompt: string) {
  const clean = String(prompt || "").trim();

  if (!clean) {
    return {
      ok: true,
      text: "Estoy aquí. Puedes escribirme lo que quieras explorar."
    };
  }

  return {
    ok: true,
    text:
      "Soy Kairos, interfaz pública de ORA. " +
      "Puedo ayudarte a ordenar ideas, dar claridad y explorar posibilidades. " +
      `Recibí tu mensaje: "${clean}".`
  };
}
