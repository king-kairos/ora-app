import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const ROOT = process.cwd();
const DB_FILE = path.join(ROOT, "data", "patches.json");

const DIRS = [
  path.join(ROOT, "ora-data", "proposals"),
  path.join(ROOT, "data", "patches"),
  path.join(ROOT, "data", "coherencia", "proposals"),
];

function cleanId(value: any) {
  return String(value || "").trim().replace(/\.json$/i, "");
}

function safeResolve(filePath: string) {
  const clean = String(filePath || "").trim().replace(/^\/+/, "");
  const full = path.resolve(ROOT, clean);

  if (!full.startsWith(ROOT)) {
    throw new Error("INVALID_PATH_OUTSIDE_ROOT");
  }

  return full;
}

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file: string, data: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function makePageContent(intent: string) {
  const cleanIntent = String(intent || "ORA funcionando").replace(/`/g, "");

  return `export default function Page() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#050505",
      color: "#00ff88",
      padding: "48px",
      fontFamily: "monospace"
    }}>
      <h1>ORA funcionando</h1>
      <p>${cleanIntent}</p>
      <section style={{
        marginTop: "24px",
        border: "1px solid #00ff88",
        borderRadius: "14px",
        padding: "18px",
        background: "#0b0f0c"
      }}>
        <h2>Kairos Apply Engine</h2>
        <p>Archivo creado desde proposal aprobada bajo Sello de Kairos.</p>
      </section>
    </main>
  );
}
`;
}

function normalizeFiles(proposal: any) {
  const intent = proposal?.metadata?.intent || proposal?.title || "ORA funcionando";

  if (Array.isArray(proposal?.files) && proposal.files.length > 0) {
    return proposal.files.map((f: any) => {
      if (f?.content) return f;

      if (String(f?.path || "").endsWith("/page.tsx")) {
        return {
          ...f,
          mode: "full-file",
          content: makePageContent(intent),
        };
      }

      return f;
    });
  }

  if (Array.isArray(proposal?.targetFiles) && proposal.targetFiles.length > 0) {
    return proposal.targetFiles.map((file: string) => ({
      path: file,
      mode: "full-file",
      content: String(file).endsWith("/page.tsx")
        ? makePageContent(intent)
        : `// ORA generated file\n// Intent: ${intent}\n`,
    }));
  }

  return [];
}

function findInMainDb(id: string) {
  if (!fs.existsSync(DB_FILE)) return null;

  const db = readJson(DB_FILE);
  const items = Array.isArray(db)
    ? db
    : Array.isArray(db?.proposals)
    ? db.proposals
    : [];

  const index = items.findIndex((p: any) => cleanId(p?.id) === id);
  if (index < 0) return null;

  return { type: "db", db, items, index, proposal: items[index] };
}

function findInJsonFiles(id: string) {
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;

    const file = fs
      .readdirSync(dir)
      .find((f) => f.endsWith(".json") && cleanId(f).includes(id));

    if (!file) continue;

    const full = path.join(dir, file);
    const proposal = readJson(full);

    if (cleanId(proposal?.id || file) === id || file.includes(id)) {
      return { type: "file", file: full, proposal };
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = cleanId(body?.id);

    if (!id) {
      return NextResponse.json({ ok: false, error: "MISSING_ID" }, { status: 400 });
    }

    const found: any = findInMainDb(id) || findInJsonFiles(id);

    if (!found) {
      return NextResponse.json(
        { ok: false, error: "PROPOSAL_NOT_FOUND", id },
        { status: 404 }
      );
    }

    const proposal: any = found.proposal;
    const files = normalizeFiles(proposal);

    if (files.length === 0) {
      return NextResponse.json(
        { ok: false, error: "NO_FILES_TO_APPLY", id },
        { status: 400 }
      );
    }

    const written: string[] = [];
    const now = Date.now();

    for (const file of files) {
      const relPath = String(file?.path || "").trim();
      if (!relPath) continue;

      const fullPath = safeResolve(relPath);

      if (file?.delete === true) {
        if (fs.existsSync(fullPath)) fs.rmSync(fullPath, { force: true });
        written.push(relPath);
        continue;
      }

      const content = String(file?.content || "");
      if (!content) continue;

      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, "utf8");
      written.push(relPath);
    }

    proposal.status = "applied";
    proposal.appliedAt = now;
    proposal.updatedAt = now;
    proposal.files = files;

    if (found.type === "db") {
      found.items[found.index] = proposal;
      writeJson(DB_FILE, { proposals: found.items });
    } else {
      writeJson(found.file, proposal);
    }

    return NextResponse.json({
      ok: true,
      id,
      status: "applied",
      written,
      message: "Proposal aplicada correctamente.",
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
