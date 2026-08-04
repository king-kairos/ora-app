export async function GET() {
  return Response.json({
    ok: true,
    module: "doctors-para-ora-health-smg",
    title: "ORA — Doctors Para Ora Health Smg",
    branch: "general",
    status: "active",
    source: "intent-engine",
  });
}