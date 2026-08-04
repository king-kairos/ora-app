import { runOraHealthAudit } from "./index";

async function main() {
  const result = await runOraHealthAudit();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("ORA HEALTH TEST ERROR");
  console.error(error);
  process.exit(1);
});
