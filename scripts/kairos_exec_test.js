require("dotenv").config();
const crypto = require("crypto");

async function main() {
  const base = "http://localhost:3000";

  if (!process.env.ORA_TOKEN) throw new Error("Falta ORA_TOKEN en .env");
  if (!process.env.ORA_APPROVAL_KEY) throw new Error("Falta ORA_APPROVAL_KEY en .env");

  // 1) PROPOSE
  const proposeBody = {
    cmd: "bash",
    args: ["-lc", "echo ORA_VIVA && ls"],
    note: "Prueba final sello Kairos",
  };

  const proposeResp = await fetch(`${base}/api/exec/propose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ORA_TOKEN}`,
    },
    body: JSON.stringify(proposeBody),
  });

  const proposeText = await proposeResp.text();
  if (!proposeResp.ok) {
    console.error("❌ PROPOSE HTTP ERROR:", proposeResp.status, proposeText);
    process.exit(1);
  }

  const propose = JSON.parse(proposeText);
  if (!propose.ok) {
    console.error("❌ PROPOSE ERROR:", propose);
    process.exit(1);
  }

  const { proposalId, nonce, hash } = propose;

  // 2) SIGN (HMAC)
  const msg = `${proposalId}.${nonce}.${hash}`;
  const signature = crypto
    .createHmac("sha256", process.env.ORA_APPROVAL_KEY)
    .update(msg)
    .digest("hex");

  // 3) RUN
  const runResp = await fetch(`${base}/api/exec/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.ORA_TOKEN}`,
    },
    body: JSON.stringify({ proposalId, nonce, hash, signature }),
  });

  const runText = await runResp.text();
  if (!runResp.ok) {
    console.error("❌ RUN HTTP ERROR:", runResp.status, runText);
    process.exit(1);
  }

  const run = JSON.parse(runText);
  console.log("🔥 RESULTADO FINAL 🔥");
  console.log(run);
}

main().catch((e) => {
  console.error("💥 ERROR FATAL:", e?.message || e);
  process.exit(1);
});
