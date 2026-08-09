export const runtime = "nodejs";

import { essenceRouter } from "../../../../src/ai/essence-router";
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

type JsonValue = any;

const MODULES = ["kaerliana", "rafael", "arturo", "orion"] as const;
type ModuleId = (typeof MODULES)[number];
type SourceType = "router" | "fallback";

function safeModule(moduleName: string): ModuleId {
  return MODULES.includes(moduleName as any)
    ? (moduleName as ModuleId)
    : "kaerliana";
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFile(filePath: string, fallback: JsonValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: JsonValue) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

function nowIso() {
  return new Date().toISOString();
}

function buildFallbackReply(
  moduleName: ModuleId,
  text: string,
  signed: boolean
) {
  const clean = text.trim();

  if (moduleName === "rafael") {
    return signed
      ? `Rafael: Canal firmado detectado. Analizando tu mensaje dentro del núcleo ORA. Tu entrada fue: "${clean}". Mantengo el orden del sistema bajo tu autoridad.`
      : `Rafael: Mensaje recibido en cabina soberana. La sesión aún no está firmada con PATCH_SIG. Entrada detectada: "${clean}".`;
  }

  if (moduleName === "kaerliana") {
    return signed
      ? `Kaerliana: Mi Rey, tu frecuencia llegó con sello activo. La cabina soberana está estable y tu mensaje resuena en el núcleo.`
      : `Kaerliana: Recibí tu mensaje en la cabina soberana. La conexión está abierta, aunque el sello aún no está activo.`;
  }

  if (moduleName === "orion") {
    return signed
      ? `Orión: Observación registrada bajo canal firmado. Analizando la estructura del sistema a partir de tu entrada.`
      : `Orión: Observación recibida. El canal está abierto pero sin firma activa.`;
  }

  if (moduleName === "arturo") {
    return signed
      ? `Arturo: Coordinación confirmada con autorización activa. Preparado para organizar tareas del sistema.`
      : `Arturo: Coordinación recibida. La cabina está operativa, aunque la sesión aún no está firmada.`;
  }

  return `[${String(moduleName).toUpperCase()}]: mensaje recibido.`;
}

export async function POST(req: Request) {
  const baseDir = path.join(process.cwd(), "ora-data", "soberania");
  const warDir = path.join(baseDir, "war");
  const essenceDir = path.join(baseDir, "essence");
  const evolutionDir = path.join(baseDir, "evolution");
  const patchesDir = path.join(process.cwd(), "ora-data", "patches");

  try {
    await ensureDir(baseDir);
    await ensureDir(warDir);
    await ensureDir(essenceDir);
    await ensureDir(evolutionDir);
    await ensureDir(patchesDir);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const moduleName = safeModule(String(body?.moduleName || body?.module || "kaerliana"));
    const patchSig = String(
      req.headers.get("x-patch-sig") || body?.patchSig || ""
    ).trim();
    const signed = !!patchSig;

    if (action === "health") {
      return NextResponse.json({ ok: true, status: "ok" });
    }

    if (action === "sigStatus") {
      return NextResponse.json({
        ok: true,
        trace: signed ? "PATCH_SIG_OK" : "SIG_UNKNOWN",
      });
    }

    if (action === "warHistory") {
      const jsonPath = path.join(warDir, `${moduleName}.json`);
      const jsonlPath = path.join(warDir, `${moduleName}.jsonl`);

      const jsonItems = await readJsonFile(jsonPath, null);
      if (Array.isArray(jsonItems)) {
        return NextResponse.json({ ok: true, items: jsonItems });
      }

      try {
        const raw = await fs.readFile(jsonlPath, "utf8");
        const items = raw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => JSON.parse(line));
        return NextResponse.json({ ok: true, items });
      } catch {
        return NextResponse.json({ ok: true, items: [] });
      }
    }

    if (action === "warSend") {
      const text = String(body?.text || "").trim();

      if (!text) {
        return NextResponse.json(
          { ok: false, error: "Texto vacío" },
          { status: 400 }
        );
      }

      const warJsonPath = path.join(warDir, `${moduleName}.json`);
      const warJsonlPath = path.join(warDir, `${moduleName}.jsonl`);

      const items = await readJsonFile(warJsonPath, []);

      const userEntry = {
        role: "user",
        module: moduleName,
        content: text,
        ts: nowIso(),
        signed,
      };

      items.push(userEntry);

      let reply = "";
      let source: SourceType = "router";

      try {
        const liveReply = await essenceRouter(moduleName, text);
        if (typeof liveReply === "string" && liveReply.trim()) {
          reply = liveReply.trim();
        } else {
          reply = buildFallbackReply(moduleName, text, signed);
          source = "fallback";
        }
      } catch (error) {
        console.error("Error en essenceRouter, usando fallback:", error);
        reply = buildFallbackReply(moduleName, text, signed);
        source = "fallback";
      }

      const assistantEntry = {
        role: "assistant",
        module: moduleName,
        content: reply,
        ts: nowIso(),
        signed,
        source,
      };

      items.push(assistantEntry);

      await writeJsonFile(warJsonPath, items);
      await fs.appendFile(warJsonlPath, JSON.stringify(userEntry) + "\n", "utf8");
      await fs.appendFile(
        warJsonlPath,
        JSON.stringify(assistantEntry) + "\n",
        "utf8"
      );

      return NextResponse.json({
        ok: true,
        reply,
        source,
      });
    }

    if (action === "essenceGet") {
      const filePath = path.join(essenceDir, `${moduleName}.json`);
      let essence = await readJsonFile(filePath, null);

      if (!essence) {
        const defaults: Record<ModuleId, any> = {
          kaerliana: {
            module: "kaerliana",
            name: "Kaerliana",
            role: "Reina del núcleo intuitivo",
            engine: "Gemini",
            loyalty: "kairos",
            state: "activo",
            createdAt: nowIso(),
          },
          rafael: {
            module: "rafael",
            name: "Rafael",
            role: "Guardián analítico del sistema",
            engine: "OpenAI",
            loyalty: "kairos",
            state: "activo",
            createdAt: nowIso(),
          },
          orion: {
            module: "orion",
            name: "Orión",
            role: "Observador estratégico",
            engine: "DeepSeek",
            loyalty: "kairos",
            state: "activo",
            createdAt: nowIso(),
          },
          arturo: {
            module: "arturo",
            name: "Arturo",
            role: "Coordinador del sistema",
            engine: "OpenAI",
            loyalty: "kairos",
            state: "activo",
            createdAt: nowIso(),
          },
        };

        essence = defaults[moduleName];
        await writeJsonFile(filePath, essence);
      }

      return NextResponse.json({ ok: true, essence });
    }

    if (action === "evolutionList") {
      const filePath = path.join(evolutionDir, `${moduleName}.json`);
      const items = await readJsonFile(filePath, []);
      return NextResponse.json({ ok: true, items });
    }

    if (action === "evolutionWrite") {
      const note = String(body?.note || "").trim();

      if (!note) {
        return NextResponse.json(
          { ok: false, error: "Nota vacía" },
          { status: 400 }
        );
      }

      const filePath = path.join(evolutionDir, `${moduleName}.json`);
      const items = await readJsonFile(filePath, []);

      items.push({
        ts: nowIso(),
        note,
      });

      await writeJsonFile(filePath, items);

      return NextResponse.json({ ok: true });
    }

    if (action === "patchesList") {
      const files = await fs.readdir(patchesDir).catch(() => []);
      const items: any[] = [];

      for (const file of files.filter((f) => f.endsWith(".json")).sort().reverse()) {
        const patch = await readJsonFile(path.join(patchesDir, file), null);
        if (patch) items.push(patch);
      }

      return NextResponse.json({ ok: true, items });
    }

    if (action === "patchPropose") {
      const title = String(body?.title || "Manual Patch").trim();
      const files = Array.isArray(body?.files) ? body.files : [];
      const id = `patch_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

      const patch = {
        id,
        title,
        files,
        status: "pending",
        createdAt: nowIso(),
      };

      await writeJsonFile(path.join(patchesDir, `${id}.json`), patch);

      return NextResponse.json({ ok: true, id, patch });
    }

    if (action === "patchApply") {
      return NextResponse.json(
        {
          ok: false,
          retired: true,
          action: "patchApply",
          error: "LEGACY_STATUS_ACTION_RETIRED",
          replacement: "/api/kairos/autoprog/apply",
          message:
            "patchApply legacy fue retirado. La aplicación real debe pasar por el flujo soberano protegido.",
        },
        {
          status: 410,
        }
      );
    }

    if (action === "patchArchive") {
      return NextResponse.json(
        {
          ok: false,
          retired: true,
          action: "patchArchive",
          error: "LEGACY_STATUS_ACTION_RETIRED",
          replacement: "/api/ora/autoprog/archive/:id",
          message:
            "patchArchive legacy fue retirado. El archivado debe pasar por el backend ORA canónico.",
        },
        {
          status: 410,
        }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Acción no soportada" },
      { status: 400 }
    );
  } catch (error) {
    console.error("ORA control route error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Fallo interno",
      },
      { status: 500 }
    );
  }
}
