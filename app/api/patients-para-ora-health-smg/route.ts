export async function GET() {
  return Response.json({
    ok: true,
    module: "patients-para-ora-health-smg",
    title: "ORA — Patients Para Ora Health Smg",
    branch: "general",
    status: "active",
    source: "intent-engine",
  });
}