import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://127.0.0.1:3000";
const INTERVAL_MS = 120_000;
const LOG_FILE = path.join(
  process.cwd(),
  "ora-data",
  "logs",
  "autorepair-worker.jsonl"
);

let running = false;

function now() {
  return new Date().toISOString();
}

async function log(event) {
  const record = {
    timestamp: now(),
    ...event,
  };

  console.log(JSON.stringify(record));

  await fs.mkdir(path.dirname(LOG_FILE), {
    recursive: true,
  });

  await fs.appendFile(
    LOG_FILE,
    JSON.stringify(record) + "\n",
    "utf8"
  );
}

function getKairosSeal() {
  const raw = execFileSync(
    "pm2",
    ["jlist"],
    {
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 8 * 1024 * 1024,
    }
  );

  const processes = JSON.parse(raw);

  const front = processes.find(
    (item) => item?.name === "ora-front"
  );

  const seal = String(
    front?.pm2_env?.KAIROS_SEAL ||
    ""
  ).trim();

  if (!seal) {
    throw new Error("KAIROS_SEAL_NOT_FOUND_IN_PM2");
  }

  return seal;
}

async function requestJson(
  url,
  {
    method = "GET",
    seal,
    body,
    timeout = 120_000,
  } = {}
) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

  try {
    const response = await fetch(
      `${BASE_URL}${url}`,
      {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "x-kairos-seal": seal,
        },
        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),
        cache: "no-store",
        signal: controller.signal,
      }
    );

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {
        raw: text,
      };
    }

    if (
      !response.ok ||
      data?.ok === false
    ) {
      throw new Error(
        data?.error ||
        data?.message ||
        data?.raw ||
        `HTTP_${response.status}`
      );
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeStatus(value) {
  return String(
    value || "pending"
  )
    .trim()
    .toLowerCase();
}

function proposalFiles(proposal) {
  const targets = Array.isArray(
    proposal?.targetFiles
  )
    ? proposal.targetFiles
    : [];

  const files = Array.isArray(
    proposal?.files
  )
    ? proposal.files
        .map((item) => item?.path)
        .filter(Boolean)
    : [];

  return [
    ...new Set([
      ...targets,
      ...files,
    ]),
  ].map((item) =>
    String(item).trim()
  );
}

function isSafePath(file) {
  const normalized = file
    .replaceAll("\\", "/")
    .replace(/^\/+/, "");

  const blocked = [
    ".env",
    ".env.local",
    "package.json",
    "package-lock.json",
    "middleware.ts",
    "next.config",
    "src/app.ts",
    "src/ai/",
    "app/kairos/",
    "app/api/kairos/",
    "app/api/ora/system/",
    "scripts/",
    "node_modules/",
    ".next/",
    "ora-backups/",
  ];

  if (
    !normalized.startsWith("app/")
  ) {
    return false;
  }

  return !blocked.some(
    (entry) =>
      normalized === entry ||
      normalized.startsWith(entry)
  );
}

function isEligible(proposal) {
  const status = normalizeStatus(
    proposal?.status
  );

  const risk = String(
    proposal?.risk || ""
  )
    .trim()
    .toLowerCase();

  const source = String(
    proposal?.source || ""
  )
    .trim()
    .toLowerCase();

  const proposedBy = String(
    proposal?.proposedBy || ""
  )
    .trim()
    .toLowerCase();

  const autoRepair =
    proposal?.metadata?.autoRepair === true ||
    source.includes("auto-repair") ||
    proposedBy.includes("autorepair") ||
    proposedBy.includes("auto-repair");

  const files =
    proposalFiles(proposal);

  return (
    status === "pending" &&
    risk === "low" &&
    autoRepair &&
    files.length > 0 &&
    files.every(isSafePath)
  );
}

function routeFromFile(file) {
  const normalized = String(file)
    .replaceAll("\\", "/");

  const match = normalized.match(
    /^app\/(.+)\/page\.(tsx|ts|jsx|js)$/
  );

  if (!match) return null;

  return `/${match[1]}`;
}

async function validateRoutes(
  proposal
) {
  const routes = proposalFiles(
    proposal
  )
    .map(routeFromFile)
    .filter(Boolean);

  const results = [];

  for (const route of routes) {
    const response = await fetch(
      `${BASE_URL}${route}`,
      {
        method: "HEAD",
        cache: "no-store",
      }
    );

    results.push({
      route,
      status: response.status,
      ok:
        response.status >= 200 &&
        response.status < 400,
    });
  }

  return results;
}

async function processProposal(
  proposal,
  seal
) {
  const id = String(
    proposal?.id || ""
  ).trim();

  if (!id) return;

  await log({
    type: "proposal-selected",
    id,
    title: proposal?.title || "",
    risk: proposal?.risk || "",
    files: proposalFiles(proposal),
  });

  const approval =
    await requestJson(
      "/api/ora/autoprog/patch/approve",
      {
        method: "POST",
        seal,
        body: {
          id,
        },
      }
    );

  await log({
    type: "proposal-approved",
    id,
    result: approval,
  });

  const applied =
    await requestJson(
      "/api/kairos/autoprog/apply",
      {
        method: "POST",
        seal,
        body: {
          id,
        },
        timeout: 180_000,
      }
    );

  await log({
    type: "proposal-applied",
    id,
    result: applied,
  });

  const deploy =
    await requestJson(
      "/api/ora/system/deploy",
      {
        method: "POST",
        seal,
        body: {
          id,
        },
        timeout: 600_000,
      }
    );

  await log({
    type: "proposal-deployed",
    id,
    result: deploy,
  });

  const routeValidation =
    await validateRoutes(proposal);

  const status =
    await requestJson(
      "/api/kairos/status",
      {
        seal,
        timeout: 30_000,
      }
    );

  const routesOk =
    routeValidation.every(
      (item) => item.ok
    );

  await log({
    type: "proposal-validated",
    id,
    routesOk,
    routes: routeValidation,
    systemStatus: status,
  });

  if (!routesOk) {
    throw new Error(
      `ROUTE_VALIDATION_FAILED:${id}`
    );
  }
}

async function cycle() {
  if (running) return;

  running = true;

  try {
    const seal =
      getKairosSeal();

    const data =
      await requestJson(
        "/api/ora/patches/list",
        {
          seal,
          timeout: 30_000,
        }
      );

    const proposals =
      Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.patches)
        ? data.patches
        : [];

    const eligible =
      proposals.filter(
        isEligible
      );

    await log({
      type: "scan-complete",
      total: proposals.length,
      eligible: eligible.length,
    });

    for (const proposal of eligible) {
      try {
        await processProposal(
          proposal,
          seal
        );
      } catch (error) {
        await log({
          type: "proposal-failed",
          id:
            proposal?.id || null,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    }
  } catch (error) {
    await log({
      type: "worker-error",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  } finally {
    running = false;
  }
}

await cycle();

setInterval(() => {
  void cycle();
}, INTERVAL_MS);

process.on(
  "SIGTERM",
  async () => {
    await log({
      type: "worker-stopped",
      signal: "SIGTERM",
    });

    process.exit(0);
  }
);

process.on(
  "SIGINT",
  async () => {
    await log({
      type: "worker-stopped",
      signal: "SIGINT",
    });

    process.exit(0);
  }
);

await log({
  type: "worker-started",
  intervalMs: INTERVAL_MS,
  policy:
    "Solo AutoRepair pending, risk low y archivos no críticos dentro de app/.",
});
