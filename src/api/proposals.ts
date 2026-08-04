import fs from "fs";
import path from "path";

export function getProposals() {
  const dir = path.join(process.cwd(), "ora-data/proposals");

  const files = fs.readdirSync(dir);

  const proposals = files.map((file) => {
    const data = fs.readFileSync(path.join(dir, file), "utf8");
    return JSON.parse(data);
  });

  return proposals;
}
