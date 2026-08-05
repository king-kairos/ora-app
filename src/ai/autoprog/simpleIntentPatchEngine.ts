import fs from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import {
  authorizeKairosExecution,
} from "../../security/kairosExecutionGate";

import {
  resolveKairosFileTarget,
} from "../../security/kairosFileTarget";

export type SimpleIntentPatchMode =
  | "single-file"
  | "search-first"
  | "search-all";

type JsonRecord =
  Record<string, unknown>;

type MatchResult = {
  file: string;
  changed: boolean;
  applied: boolean;
  backup: string | null;
  preview: {
    before: string;
    after: string;
  };
};

const ALLOWED_EXTENSIONS =
  new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".txt",
    ".css",
    ".scss",
    ".mjs",
    ".cjs",
  ]);

const SKIPPED_DIRECTORIES =
  new Set([
    "node_modules",
    ".next",
    ".git",
    "ora-backups",
    "backups",
  ]);

const MAX_SEARCH_FILES = 5000;
const MAX_MATCHES = 200;
const MAX_FILE_BYTES =
  2 * 1024 * 1024;

function responseError(
  error: string,
  status: number,
  extra: JsonRecord = {}
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...extra,
    },
    {
      status,
    }
  );
}

function normalizeBoolean(
  value: unknown
): boolean {
  return value === true;
}

function makeTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function makeBackupRelative(
  category: string,
  relativeFile: string
): string {
  const safeName = relativeFile
    .replace(/[\\/]/g, "__")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  return path.posix.join(
    "ora-data",
    "backups",
    category,
    `${safeName}.${makeTimestamp()}.bak`
  );
}

async function readUtf8File(
  absolute: string
): Promise<string> {
  const stat = await fs.lstat(absolute);

  if (stat.isSymbolicLink()) {
    throw new Error(
      "SYMLINK_TARGET_BLOCKED"
    );
  }

  if (!stat.isFile()) {
    throw new Error(
      "TARGET_NOT_FILE"
    );
  }

  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(
      "FILE_TOO_LARGE"
    );
  }

  return fs.readFile(
    absolute,
    "utf8"
  );
}

async function writeWithBackup(
  relativeFile: string,
  before: string,
  after: string,
  backupCategory: string
): Promise<string> {
  const target =
    resolveKairosFileTarget(
      relativeFile
    );

  const backupRelative =
    makeBackupRelative(
      backupCategory,
      target.relative
    );

  const backup =
    resolveKairosFileTarget(
      backupRelative
    );

  await fs.mkdir(
    path.dirname(
      backup.absolute
    ),
    {
      recursive: true,
    }
  );

  await fs.writeFile(
    backup.absolute,
    before,
    "utf8"
  );

  /*
   * Se resuelve nuevamente justo antes
   * de la escritura para reducir la ventana
   * entre validación y mutación.
   */
  const finalTarget =
    resolveKairosFileTarget(
      target.relative
    );

  await fs.writeFile(
    finalTarget.absolute,
    after,
    "utf8"
  );

  return backup.relative;
}

async function collectTextFiles(
  directoryAbsolute: string
): Promise<string[]> {
  const results: string[] = [];
  const pending: string[] = [
    directoryAbsolute,
  ];

  while (
    pending.length > 0 &&
    results.length <
      MAX_SEARCH_FILES
  ) {
    const current =
      pending.pop();

    if (!current) {
      break;
    }

    const entries =
      await fs.readdir(
        current,
        {
          withFileTypes: true,
        }
      );

    for (const entry of entries) {
      if (
        results.length >=
        MAX_SEARCH_FILES
      ) {
        break;
      }

      if (
        entry.isSymbolicLink()
      ) {
        continue;
      }

      if (
        entry.isDirectory() &&
        SKIPPED_DIRECTORIES.has(
          entry.name
        )
      ) {
        continue;
      }

      const absolute =
        path.join(
          current,
          entry.name
        );

      if (entry.isDirectory()) {
        pending.push(absolute);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension =
        path.extname(
          entry.name
        ).toLowerCase();

      if (
        !ALLOWED_EXTENSIONS.has(
          extension
        )
      ) {
        continue;
      }

      const relative =
        path.relative(
          process.cwd(),
          absolute
        );

      try {
        const target =
          resolveKairosFileTarget(
            relative
          );

        results.push(
          target.relative
        );
      } catch {
        /*
         * Archivos protegidos, sensibles,
         * externos o atravesados por enlaces
         * simbólicos se omiten.
         */
      }
    }
  }

  return results;
}

function authorizeMutation(
  req: Request,
  apply: boolean
):
  | {
      ok: true;
    }
  | {
      ok: false;
      response: NextResponse;
    } {
  if (!apply) {
    return {
      ok: true,
    };
  }

  const authorization =
    authorizeKairosExecution(
      req,
      "apply_patch"
    );

  if (!authorization.ok) {
    return {
      ok: false,
      response:
        NextResponse.json(
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
        ),
    };
  }

  return {
    ok: true,
  };
}

async function runSingleFile(
  req: Request,
  body: JsonRecord
) {
  const file = String(
    body?.file || ""
  ).trim();

  const find = String(
    body?.find ?? ""
  );

  const replace = String(
    body?.replace ?? ""
  );

  const apply =
    normalizeBoolean(
      body?.apply
    );

  if (!file) {
    return responseError(
      "MISSING_FILE",
      400
    );
  }

  if (!find) {
    return responseError(
      "MISSING_FIND",
      400
    );
  }

  const authority =
    authorizeMutation(
      req,
      apply
    );

  if (!authority.ok) {
    return authority.response;
  }

  const target =
    resolveKairosFileTarget(
      file
    );

  try {
    const before =
      await readUtf8File(
        target.absolute
      );

    if (
      !before.includes(find)
    ) {
      return responseError(
        "TEXT_NOT_FOUND",
        404,
        {
          file:
            target.relative,
          find,
        }
      );
    }

    const after =
      before.replace(
        find,
        replace
      );

    const changed =
      before !== after;

    let backup:
      string | null = null;

    if (
      apply &&
      changed
    ) {
      backup =
        await writeWithBackup(
          target.relative,
          before,
          after,
          "intent-patch"
        );
    }

    return NextResponse.json({
      ok: true,
      engine:
        "SOVEREIGN_SIMPLE_INTENT_PATCH",
      mode:
        "single-file",
      file:
        target.relative,
      changed,
      applied:
        apply && changed,
      backup,
      preview: {
        before: find,
        after: replace,
      },
      message: apply
        ? "Intent patch aplicado."
        : "Intent patch preview generado.",
    });
  } catch (error: any) {
    if (
      error?.code ===
      "ENOENT"
    ) {
      return responseError(
        "FILE_NOT_FOUND",
        404,
        {
          file:
            target.relative,
        }
      );
    }

    throw error;
  }
}

async function runSearch(
  req: Request,
  body: JsonRecord,
  mode:
    | "search-first"
    | "search-all"
) {
  const query = String(
    body?.query || ""
  ).trim();

  const replace = String(
    body?.replace ?? ""
  );

  const dir = String(
    body?.dir || "app"
  ).trim();

  const apply =
    normalizeBoolean(
      body?.apply
    );

  if (!query) {
    return responseError(
      "MISSING_QUERY",
      400
    );
  }

  /*
   * search-apply históricamente exigía
   * reemplazo no vacío. Multi-search
   * permite reemplazar por cadena vacía.
   */
  if (
    mode ===
      "search-first" &&
    replace === ""
  ) {
    return responseError(
      "MISSING_REPLACE",
      400
    );
  }

  const authority =
    authorizeMutation(
      req,
      apply
    );

  if (!authority.ok) {
    return authority.response;
  }

  const base =
    resolveKairosFileTarget(
      dir
    );

  let baseStat;

  try {
    baseStat =
      await fs.lstat(
        base.absolute
      );
  } catch (error: any) {
    if (
      error?.code ===
      "ENOENT"
    ) {
      return responseError(
        "DIR_NOT_FOUND",
        404,
        {
          dir:
            base.relative,
        }
      );
    }

    throw error;
  }

  if (
    baseStat.isSymbolicLink()
  ) {
    return responseError(
      "SYMLINK_TARGET_BLOCKED",
      403,
      {
        dir:
          base.relative,
      }
    );
  }

  if (
    !baseStat.isDirectory()
  ) {
    return responseError(
      "DIR_NOT_FOUND",
      404,
      {
        dir:
          base.relative,
      }
    );
  }

  const files =
    await collectTextFiles(
      base.absolute
    );

  const matches:
    MatchResult[] = [];

  for (const relative of files) {
    if (
      matches.length >=
      MAX_MATCHES
    ) {
      break;
    }

    try {
      const target =
        resolveKairosFileTarget(
          relative
        );

      const before =
        await readUtf8File(
          target.absolute
        );

      if (
        !before.includes(query)
      ) {
        continue;
      }

      const after =
        mode ===
        "search-all"
          ? before
              .split(query)
              .join(replace)
          : before.replace(
              query,
              replace
            );

      const changed =
        before !== after;

      let backup:
        string | null = null;

      if (
        apply &&
        changed
      ) {
        backup =
          await writeWithBackup(
            target.relative,
            before,
            after,
            mode ===
            "search-all"
              ? "multi-search-intent"
              : "search-intent-patch"
          );
      }

      matches.push({
        file:
          target.relative,
        changed,
        applied:
          apply && changed,
        backup,
        preview: {
          before: query,
          after: replace,
        },
      });

      if (
        mode ===
        "search-first"
      ) {
        break;
      }
    } catch {
      /*
       * Un archivo ilegible o cambiado durante
       * el recorrido no debe abrir otra vía de
       * ejecución ni detener el escaneo entero.
       */
    }
  }

  if (
    mode ===
      "search-first" &&
    matches.length === 0
  ) {
    return responseError(
      "TEXT_NOT_FOUND",
      404,
      {
        query,
        dir:
          base.relative,
      }
    );
  }

  return NextResponse.json({
    ok: true,
    engine:
      mode ===
      "search-first"
        ? "SOVEREIGN_SEARCH_INTENT_PATCH"
        : "SOVEREIGN_MULTI_SEARCH_INTENT_PATCH",
    mode,
    query,
    replace,
    dir:
      base.relative,
    apply,
    matches,
    ...(mode ===
    "search-all"
      ? {
          total:
            matches.length,
        }
      : {}),
    message:
      mode ===
      "search-first"
        ? apply
          ? "Search intent patch aplicado."
          : "Search intent patch preview generado."
        : apply
          ? "Multi search intent patch aplicado."
          : "Multi search intent preview generado.",
  });
}

export async function runSimpleIntentPatch(
  req: Request,
  mode:
    SimpleIntentPatchMode
) {
  try {
    const body =
      await req
        .json()
        .catch(() => ({}));

    if (
      mode ===
      "single-file"
    ) {
      return runSingleFile(
        req,
        body
      );
    }

    return runSearch(
      req,
      body,
      mode
    );
  } catch (error: any) {
    const message =
      error?.message ||
      "SIMPLE_INTENT_PATCH_ERROR";

    const knownClientErrors =
      new Set([
        "FILE_PATH_REQUIRED",
        "ABSOLUTE_PATH_NOT_ALLOWED",
        "INVALID_FILE_PATH",
        "SENSITIVE_FILE_BLOCKED",
        "PROTECTED_PATH_BLOCKED",
        "PATH_OUTSIDE_PROJECT",
        "SYMLINK_PATH_ESCAPE",
        "SYMLINK_TARGET_BLOCKED",
        "TARGET_NOT_FILE",
        "FILE_TOO_LARGE",
      ]);

    return responseError(
      message,
      knownClientErrors.has(
        message
      )
        ? 400
        : 500
    );
  }
}
