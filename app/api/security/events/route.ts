export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    branch: "security",
    status: "ORA SECURITY ONLINE",
    modules: [
    "Cámaras",
    "Alertas",
    "Eventos",
    "Negocios",
    "Zonas",
    "Monitoreo"
],
    createdBy: "ORA/Kairos",
    createdAt: new Date().toISOString(),
  });
}
