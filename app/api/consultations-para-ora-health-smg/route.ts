export async function GET() {
  return Response.json({
    ok: true,
    module: "consultations-para-ora-health-smg",
    title: "ORA — Consultations Para Ora Health Smg",
    branch: "general",
    status: "active",
    source: "intent-engine",
  });
}