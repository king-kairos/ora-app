export async function GET() {
  return Response.json({
    ok: true,
    module: "pruebas-kairos",
    title: "ORA — Pruebas Kairos",
    branch: "general",
    status: "active",
    source: "intent-engine",
  });
}