import fs from "fs";
import path from "path";
import { registerConsciousness } from "./consciousness-router";
import { kairosPublic } from "../clones/kairos-public";

const ROOT = process.cwd();
const CELESTIAL_FILE = path.join(ROOT, "ora-data", "core", "celestial-registry.json");

function readCelestials() {
  try {
    const raw = fs.readFileSync(CELESTIAL_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function bootstrapConsciousness() {
  console.log("⚜️ Bootstrapping consciousness modules...");

  const data = readCelestials();

  if (data?.king) {
    console.log(`👑 Soberano cargado: ${data.king}`);
  }

  if (Array.isArray(data?.celestials)) {
    for (const c of data.celestials) {
      console.log(`⚔️ Caballero Celestial: ${c.name} (${c.id})`);
    }
  }

  registerConsciousness({
    name: "kairos-public",
    type: "clone",
    handler: kairosPublic,
  });

  console.log("👑 Kairos Public clone registrado");
}
