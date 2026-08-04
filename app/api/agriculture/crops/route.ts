export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    branch: "agriculture",
    status: "ORA AGRICULTURE ONLINE",
    modules: [
    "Cultivos",
    "Sensores de humedad",
    "Riego inteligente",
    "Alertas de plagas",
    "Parcelas",
    "Inventario agrícola"
],
    createdBy: "ORA/Kairos",
    createdAt: new Date().toISOString(),
  });
}
