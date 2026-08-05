export const runtime = "nodejs";

import {
  NextRequest,
  NextResponse,
} from "next/server";
import fs from "fs/promises";
import fsSync from "fs";
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
        "apply_patch"
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

    const find = String(
      body?.find ?? ""
    );

    const replace = String(
      body?.replace ?? ""
    );

    if (!find) {
      return NextResponse.json(
        {
          ok: false,
          error: "FIND_TEXT_REQUIRED",
        },
        {
          status: 400,
        }
      );
    }

    const target =
      resolveKairosFileTarget(file);

    if (
      !fsSync.existsSync(
        target.absolute
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "FILE_NOT_FOUND",
          file: target.relative,
        },
        {
          status: 404,
        }
      );
    }

    const original =
      await fs.readFile(
        target.absolute,
        "utf8"
      );

    const occurrences =
      original.split(find).length - 1;

    if (occurrences === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "TEXT_NOT_FOUND",
          file: target.relative,
        },
        {
          status: 404,
        }
      );
    }

    const replaceAll =
      body?.replaceAll === true;

    if (
      occurrences > 1 &&
      !replaceAll
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "TEXT_MATCH_NOT_UNIQUE",
          matches: occurrences,
          message:
            "Existen varias coincidencias. Use replaceAll únicamente después de revisar la propuesta.",
        },
        {
          status: 409,
        }
      );
    }

    const updated = replaceAll
      ? original.split(find).join(replace)
      : original.replace(find, replace);

    const backupDir = path.resolve(
      target.root,
      "ora-data/backups/files-patch"
    );

    fsSync.mkdirSync(backupDir, {
      recursive: true,
    });

    const backup = path.join(
      backupDir,
      target.relative.replace(
        /[\/\\]/g,
        "__"
      ) +
        "." +
        Date.now() +
        ".bak"
    );

    await fs.copyFile(
      target.absolute,
      backup
    );

    await fs.writeFile(
      target.absolute,
      updated,
      "utf8"
    );

    return NextResponse.json({
      ok: true,
      action: "apply_patch",
      authorizedBy:
        authorization.authorizedBy,
      file: target.relative,
      matchesReplaced: replaceAll
        ? occurrences
        : 1,
      backup: path.relative(
        target.root,
        backup
      ),
      message:
        "Patch aplicado bajo autorización Kairos.",
    });
  } catch (error: any) {
    const message =
      error?.message ||
      "PATCH_FAILED";

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
