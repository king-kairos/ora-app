import fs from "fs/promises";
import path from "path";

const ROOT = process.cwd();

const PROPOSAL_DIR = path.join(ROOT, "ora-data/proposals");
const BACKUP_DIR = path.join(ROOT, "ora-data/backups");
const HISTORY_DIR = path.join(ROOT, "ora-data/history");

const PROTECTED = [
".env",
"package.json",
"package-lock.json",
"node_modules",
".git"
];

function isProtected(target: string) {
  return PROTECTED.some(p => target.includes(p));
}

async function readProposal(id: string) {
  const file = path.join(PROPOSAL_DIR, `${id}.json`);
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

async function writeProposal(id: string, data: any) {
  const file = path.join(PROPOSAL_DIR, `${id}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

async function createBackup(target: string) {
  try {
    const full = path.join(ROOT, target);
    const data = await fs.readFile(full, "utf8");

    const name = target.replace(/\//g,"_") + "_" + Date.now() + ".bak";
    const backup = path.join(BACKUP_DIR, name);

    await fs.writeFile(backup, data);

  } catch {
    // si el archivo no existe no pasa nada
  }
}

async function recordHistory(id:string, proposal:any) {

  const file = path.join(HISTORY_DIR, `${id}.json`);

  await fs.writeFile(
    file,
    JSON.stringify({
      appliedAt:new Date().toISOString(),
      proposal
    },null,2)
  );
}

export async function applyProposal(id:string){

  const proposal = await readProposal(id);

  if(proposal.status !== "pending"){
    throw new Error("proposal no está pending");
  }

  for(const f of proposal.files){

    if(isProtected(f.path)){
      throw new Error(`archivo protegido: ${f.path}`);
    }

    await createBackup(f.path);

    const target = path.join(ROOT,f.path);

    if(f.mode === "full-file"){

      await fs.mkdir(path.dirname(target),{recursive:true});

      await fs.writeFile(target,f.content,"utf8");
    }
  }

  proposal.status = "applied";

  await writeProposal(id,proposal);

  await recordHistory(id,proposal);

  return {
    ok:true,
    id
  };
}
