export async function GET() {
  return Response.json({
    ok: true,
    branchName: "delivery-para-charo",
    title: "ORA — Delivery Para Charo",
    status: "active",
    source: "kairos-command-layer",
  });
}
