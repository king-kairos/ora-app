export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { authorizeKairosExecution } from "../../../../../src/security/kairosExecutionGate";
const run = promisify(exec);
async function runCommand(command: string) {
  const { stdout, stderr } = await run(command, {
    cwd: process.cwd(),
    timeout: 1000 * 60 * 5,
    maxBuffer: 1024 * 1024 * 10,
  });
  return {
    command,
    stdout,
    stderr,
  };
}
function runDetached(command: string, delay = 0) {
  setTimeout(() => {
    exec(command, {
      cwd: process.cwd(),
    });
  }, delay);
}
async function markProposalAsPublished(id: string) {
  try {
    if (!id) return;

    const patchesPath = path.join(process.cwd(), "data", "patches.json");

    if (!fs.existsSync(patchesPath)) {
      console.log("patches.json no encontrado:", patchesPath);
      return;
    }

    const raw = fs.readFileSync(patchesPath, "utf8");
    const store = JSON.parse(raw);

    if (!Array.isArray(store.proposals)) {
      console.log("proposals no es array");
      return;
    }

    const proposal = store.proposals.find(
      (item: any) => String(item?.id || "") === id
    );

    if (!proposal) {
      console.log("Proposal no encontrada en patches.json:", id);
      return;
    }

    proposal.status = "published";
    proposal.publishedAt = Date.now();
    proposal.updatedAt = Date.now();

    fs.writeFileSync(
      patchesPath,
      JSON.stringify(store, null, 2),
      "utf8"
    );

    console.log("Proposal publicada en patches.json:", id);
  } catch (err) {
    console.error("Error marcando proposal publicada:", err);
  }
}


async function runSmokeTestAfterDeploy(
  proposalId: string | null,
  receivedSeal: string
) {
  const branchFromProposal = proposalId
    ? await import("../../../../../src/ai/autoprog/patchStore")
        .then(async (m: any) => {
          const proposal = await m.getProposal(proposalId).catch(() => null);
          return String(
            proposal?.metadata?.branch ||
            proposal?.tags?.find?.((x: string) => x && !["autoprog","multi-file"].includes(x)) ||
            ""
          ).trim();
        })
        .catch(() => "")
    : "";

  const branch = branchFromProposal || "pipeline-test";

  const res = await fetch("http://127.0.0.1:3000/api/kairos/autoprog/smoke-test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-kairos-seal": receivedSeal,
    },
    body: JSON.stringify({ branch }),
  });

  const data = await res.json().catch(() => null);

  return {
    mode: "AUTO_SMOKE_TEST_AFTER_DEPLOY",
    branch,
    ok: !!data?.ok,
    result: data,
  };
}


export async function POST(req: Request) {
  try {
    const authorization = authorizeKairosExecution(
      req,
      "deploy"
    );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          action: authorization.action,
          error: authorization.error,
        },
        {
          status: authorization.status,
        }
      );
    }
    const receivedSeal = String(
      req.headers.get("x-kairos-seal") ||
      req.headers.get("kairos-seal") ||
      ""
    ).trim();

    const body = await req.json().catch(() => ({}));
    const proposalId = String(body?.proposalId || body?.id || "").trim();
    const logs: any[] = [];
    // BUILD REAL
    logs.push(await runCommand("npm run build"));
    // MARCAR COMO PUBLICADO
    markProposalAsPublished(proposalId);
    // RESPONDE PRIMERO
    // REINICIA DESPUÉS
    runDetached("pm2 restart ora-front --update-env", 1500);
    runDetached("pm2 restart ora --update-env", 3000);

    await new Promise((resolve) => setTimeout(resolve, 7000));
    const smokeTest = await runSmokeTestAfterDeploy(
      proposalId || null,
      receivedSeal
    );

    return NextResponse.json({
      ok: smokeTest.ok === true,
      message: smokeTest.ok
        ? "Deploy soberano completado y smoke test validado."
        : "Deploy ejecutado, pero smoke test falló.",
      proposalId,
      deploy: {
        build: "ok",
        restartFront: "done",
        restartCore: "done",
        proposalStatus: "published",
        smokeTest,
      },
      logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "DEPLOY_SOBERANO_FAIL",
        stdout: error?.stdout || "",
        stderr: error?.stderr || "",
      },
      {
        status: 500,
      }
    );
  }
}
