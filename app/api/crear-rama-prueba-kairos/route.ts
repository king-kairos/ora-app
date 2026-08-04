export async function GET() {
  return Response.json({
    ok: true,
    module: "crear-rama-prueba-kairos",
    title: "ORA — Crear Rama Prueba Kairos",
    branch: "general",
    status: "active",
    source: "intent-engine",
  });
}