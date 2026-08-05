export const runtime = "nodejs";

import {
  NextRequest,
  NextResponse,
} from "next/server";
import fs from "fs";
import path from "path";

import {
  authorizeKairosExecution,
} from "../../../../../src/security/kairosExecutionGate";

import {
  resolveKairosFileTarget,
} from "../../../../../src/security/kairosFileTarget";

export async function POST(
  req: NextRequest
) {
  try {
    const authorization =
      authorizeKairosExecution(
        req,
        "write_file"
      );

    if (!authorization.ok) {
      return NextResponse.json(
        {
          ok: false,
          action:
            authorization.action,
          error:
            authorization.error,
        },
        {
          status:
            authorization.status,
        }
      );
    }

    const body = await req
      .json()
      .catch(() => ({}));

    const file = String(
      body?.file || ""
    ).trim();

    const content = String(
      body?.content ?? ""
    );

    const overwrite =
      body?.overwrite !== false;

    const target =
      resolveKairosFileTarget(file);

    if (
      fs.existsSync(target.absolute) &&
      !overwrite
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "FILE_EXISTS",
          file: target.relative,
        },
        {
          status: 409,
        }
      );
    }

    fs.mkdirSync(
      path.dirname(target.absolute),
      {
        recursive: true,
      }
    );

    let backup: string | null = null;

    if (fs.existsSync(target.absolute)) {
      const backupDir = path.resolve(
        target.root,
        "ora-data/backups/files-write"
      );

      fs.mkdirSync(backupDir, {
        recursive: true,
      });

      backup = path.join(
        backupDir,
        target.relative.replace(
          /[\/\\]/g,
          "__"
        ) +
          "." +
          Date.now() +
          ".bak"
      );

      fs.copyFileSync(
        target.absolute,
        backup
      );
    }

    fs.writeFileSync(
      target.absolute,
      content,
      "utf8"
    );

    return NextResponse.json({
      ok: true,
      action: "write_file",
      authorizedBy:
        authorization.authorizedBy,
      file: target.relative,
      bytes: Buffer.byteLength(
        content,
        "utf8"
      ),
      backup: backup
        ? path.relative(
            target.root,
            backup
          )
        : null,
      message:
        "Archivo escrito bajo autorización Kairos.",
    });
  } catch (error: any) {
    const message =
      error?.message ||
      "WRITE_FAILED";

    const status =
      message.includes("PATH") ||
      message.includes("BLOCKED") ||
      message.includes("SYMLINK") ||
      message.includes("FILE_PATH")
        ? 400
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status,
      }
    );
  }
}
