export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { authorizeKairosExecution } from "../../../../../src/security/kairosExecutionGate";

function computeArtifactDigest(
  rootDir: string
): string {
  const hash =
    crypto.createHash("sha256");

  function walk(
    currentDir: string
  ) {
    const entries =
      fs.readdirSync(
        currentDir,
        {
          withFileTypes: true,
        }
      ).sort(
        (a, b) =>
          a.name === b.name
            ? 0
            : a.name < b.name
              ? -1
              : 1
      );

    for (const entry of entries) {
      const fullPath =
        path.join(
          currentDir,
          entry.name
        );

      const relativePath =
        path
          .relative(
            rootDir,
            fullPath
          )
          .split(path.sep)
          .join("/");

      if (
        relativePath ===
        ".ora-validated-artifact.json"
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isSymbolicLink()) {
        hash.update(
          `L:${relativePath}\0`,
          "utf8"
        );
        hash.update(
          fs.readlinkSync(fullPath),
          "utf8"
        );
        hash.update("\0");
        continue;
      }

      if (entry.isFile()) {
        hash.update(
          `F:${relativePath}\0`,
          "utf8"
        );
        hash.update(
          fs.readFileSync(fullPath)
        );
        hash.update("\0");
      }
    }
  }

  walk(rootDir);

  return hash.digest("hex");
}

function run(cmd: string) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string }>((resolve) => {
    exec(cmd, { cwd: process.cwd(), timeout: 1000 * 60 * 8, maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout || ""),
        stderr: String(stderr || ""),
      });
    });
  });
}

export async function POST(req: Request) {
  try {
    const authorization = authorizeKairosExecution(
      req,
      "modify_runtime"
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

    const body = await req.json().catch(() => ({}));
    const proposalId = String(body?.proposalId || "").trim() || null;
    const branch = String(body?.branch || "").trim() || null;

    const buildDirName = ".next-build-validate";
    const buildDir = path.join(process.cwd(), buildDirName);
    const lockDir = path.join(
      process.cwd(),
      ".next-build-validate.lock"
    );

    try {
      fs.mkdirSync(lockDir);
    } catch (error: any) {
      if (error?.code === "EEXIST") {
        return NextResponse.json(
          {
            ok: false,
            mode: "BUILD_VALIDATION_ENGINE",
            canPublish: false,
            buildPassed: false,
            error: "BUILD_VALIDATION_ALREADY_RUNNING",
          },
          { status: 409 }
        );
      }

      throw error;
    }

    let result;
    let buildIdPresent = false;
    let buildPassed = false;
    let buildId: string | null = null;
    let artifactId: string | null = null;
    let artifactDigest: string | null = null;

    try {
      fs.rmSync(buildDir, { recursive: true, force: true });

      result = await run(
        `NEXT_DIST_DIR=${buildDirName} npm run build`
      );

      buildIdPresent =
        result.ok &&
        fs.existsSync(path.join(buildDir, "BUILD_ID"));

      buildPassed =
        result.ok && buildIdPresent;

      buildId = buildPassed
        ? fs.readFileSync(
            path.join(buildDir, "BUILD_ID"),
            "utf8"
          ).trim()
        : null;

      artifactId = buildPassed
        ? `validated-${Date.now()}-${crypto
            .randomBytes(6)
            .toString("hex")}`
        : null;

      if (buildPassed && buildId && artifactId) {
        artifactDigest =
          computeArtifactDigest(
            buildDir
          );

        const validatedRoot =
          path.join(process.cwd(), ".next-validated");

        const artifactDir =
          path.join(validatedRoot, artifactId);

        fs.mkdirSync(validatedRoot, {
          recursive: true,
        });

        if (fs.existsSync(artifactDir)) {
          throw new Error(
            "VALIDATED_ARTIFACT_ID_COLLISION"
          );
        }

        fs.writeFileSync(
          path.join(
            buildDir,
            ".ora-validated-artifact.json"
          ),
          JSON.stringify(
            {
              artifactId,
              buildId,
              artifactDigest,
              proposalId,
              branch,
              createdAt:
                new Date().toISOString(),
            },
            null,
            2
          ),
          "utf8"
        );

        fs.renameSync(
          buildDir,
          artifactDir
        );
      }
    } finally {
      fs.rmSync(lockDir, { recursive: true, force: true });
    }

    return NextResponse.json({
      ok: buildPassed,
      mode: "BUILD_VALIDATION_ENGINE",
      canPublish: buildPassed,
      buildPassed,
      isolatedBuild: true,
      buildIdPresent,
      buildId,
      artifactId,
      artifactDigest,
      proposalId,
      branch,
      stdout: result.stdout.slice(-8000),
      stderr: result.stderr.slice(-8000),
      message: buildPassed
        ? "Build aislado validado correctamente. Puede continuar a publish."
        : "Build aislado falló o no generó BUILD_ID. No publicar.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "BUILD_VALIDATE_FAIL" },
      { status: 500 }
    );
  }
}
