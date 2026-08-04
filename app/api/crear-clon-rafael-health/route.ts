export async function GET() {
  return Response.json({
    ok: true,
    module: "crear-clon-rafael-health",
    title: "ORA — Crear Clon Rafael Health",
    branch: "general",
    status: "active",
    source: "intent-engine",
  });
}