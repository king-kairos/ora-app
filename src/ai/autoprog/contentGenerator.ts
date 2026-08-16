import fs from "fs";
import path from "path";

  function clean(value: unknown) {
  return String(value || "").trim();
}

function normalizeText(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function escapeText(value: string) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\${/g, "\\${");
}

function extractTitle(intent: string) {
  const match =
    intent.match(/mensaje\s+(.+)$/i) ||
    intent.match(/que diga\s+(.+)$/i) ||
    intent.match(/mostrando\s+(.+)$/i);

  return clean(match?.[1] || intent);
}

function pascalCase(value: string) {
  const base = clean(value)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();

  const out = base
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return out || "GeneratedComponent";
}

function branchFromTarget(target: string) {
  const text = normalizeText(target);

  if (text.includes("/presence/")) return "presence";
  if (text.includes("/marketing/")) return "marketing";
  if (text.includes("/agriculture/")) return "agriculture";
  if (text.includes("/pollera/")) return "pollera";
  if (text.includes("/health/")) return "health";
  if (text.includes("/security/")) return "security";

  return "";
}

function branchFromIntent(intent: string) {
  const text = normalizeText(intent);

  if (
    text.includes("presence") ||
    text.includes("presencia") ||
    text.includes("meditacion") ||
    text.includes("crisis") ||
    text.includes("emocional") ||
    text.includes("acompanamiento")
  ) return "presence";

  if (
    text.includes("agriculture") ||
    text.includes("agricultura") ||
    text.includes("cultivo") ||
    text.includes("cultivos") ||
    text.includes("riego") ||
    text.includes("parcela") ||
    text.includes("parcelas") ||
    text.includes("humedad") ||
    text.includes("sensores") ||
    text.includes("plaga") ||
    text.includes("plagas") ||
    text.includes("inventario agricola") ||
    text.includes("campo") ||
    text.includes("ganaderia")
  ) return "agriculture";

  if (
    text.includes("pollera") ||
    text.includes("pollo") ||
    text.includes("pollos")
  ) return "pollera";

  if (
    text.includes("marketing") ||
    text.includes("campana") ||
    text.includes("campanas") ||
    text.includes("leads") ||
    text.includes("clientes") ||
    text.includes("embudo") ||
    text.includes("ventas")
  ) return "marketing";

  if (
    text.includes("ora security") ||
    text.includes("security") ||
    text.includes("seguridad") ||
    text.includes("camara") ||
    text.includes("camaras") ||
    text.includes("vigilancia") ||
    text.includes("monitoreo de camaras")
  ) return "security";

  if (
    text.includes("health") ||
    text.includes("salud") ||
    text.includes("clinica") ||
    text.includes("paciente") ||
    text.includes("pacientes") ||
    text.includes("medico")
  ) return "health";

  return "general";
}

function labelForBranch(branch: string) {
  const labels: Record<string, string> = {
    presence: "ORA PRESENCE",
    marketing: "ORA MARKETING",
    security: "ORA SECURITY",
    pollera: "ORA POLLERA",
    agriculture: "ORA AGRICULTURE",
    health: "ORA HEALTH",
    general: "ORA AUTOPROGRAMMING",
  };

  return labels[branch] || labels.general;
}

function descriptionForBranch(branch: string) {
  const descriptions: Record<string, string> = {
    presence:
      "Acompañamiento humano para conversación, crisis, meditación, registro emocional, inspiración personal y biblioteca de equilibrio. No reemplaza profesionales; acompaña sin imponer creencias.",
    marketing:
      "Dashboard para campañas, leads, clientes, redes sociales, embudo de ventas, analíticas, contenido y seguimiento comercial.",
    security:
      "Dashboard para cámaras, negocios, eventos, alertas, zonas, vigilancia y control operativo.",
    pollera:
      "Dashboard operativo para producción diaria, pollos procesados, libras vendidas, costos, ganancias, pedidos, clientes, inventario frío y entregas.",
    agriculture:
      "Dashboard agrícola para cultivos, sensores de humedad, riego, inventario agrícola, alertas de plagas y mapa de parcelas.",
    health:
      "Dashboard de salud para pacientes, consultas, seguimiento clínico, alertas y organización médica.",
    general:
      "Página generada por ORA/Kairos desde intención natural. La ejecución permanece bloqueada hasta aprobación soberana.",
  };

  return descriptions[branch] || descriptions.general;
}

function modulesForBranch(branch: string) {
  const modules: Record<string, string[]> = {
    presence: [
      "Compañero de conversación",
      "Modo crisis",
      "Inspiración personal",
      "Registro emocional",
      "Centro de meditación",
      "Biblioteca de equilibrio",
    ],
    marketing: [
      "Campañas activas",
      "Leads",
      "Clientes",
      "Embudo de ventas",
      "Redes sociales",
      "Analíticas",
    ],
    security: [
      "Cámaras",
      "Alertas",
      "Eventos",
      "Negocios",
      "Zonas",
      "Monitoreo",
    ],
    pollera: [
      "Producción diaria",
      "Pollos procesados",
      "Libras vendidas",
      "Inventario frío",
      "Pedidos",
      "Entregas",
    ],
    agriculture: [
      "Cultivos",
      "Sensores de humedad",
      "Riego inteligente",
      "Alertas de plagas",
      "Parcelas",
      "Inventario agrícola",
    ],
    health: [
      "Pacientes",
      "Consultas",
      "Alertas clínicas",
      "Seguimiento",
      "Historial",
      "Agenda",
    ],
    general: [
      "Plan",
      "Preview",
      "Proposal",
      "Apply",
      "Build",
      "Publish",
    ],
  };

  return modules[branch] || modules.general;
}

function buildPageTsx(input: {
  title: string;
  branch: string;
  proposedBy: string;
  risk: string;
}) {
  const label = labelForBranch(input.branch);
  const description = descriptionForBranch(input.branch);
  const modules = modulesForBranch(input.branch);

  return `export default function Page() {
  const modules = ${JSON.stringify(modules, null, 4)};

  return (
    <main style={{ minHeight: "100vh", background: "#050805", color: "#d9ffea", padding: 32, fontFamily: "monospace" }}>
      <section style={{ border: "1px solid rgba(0,255,136,.35)", borderRadius: 18, padding: 24, background: "#071108" }}>
        <p style={{ color: "#d4af37", fontWeight: 800, margin: 0 }}>${label}</p>
        <h1 style={{ color: "#39ff88", fontSize: 38, margin: "10px 0" }}>${input.title}</h1>
        <p style={{ color: "#b8ffd9", maxWidth: 900 }}>
          ${description}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginTop: 24 }}>
          {modules.map((module) => (
            <div key={module} style={{ border: "1px solid rgba(0,255,136,.25)", borderRadius: 14, padding: 16, background: "#020402" }}>
              <div style={{ color: "#d4af37", fontSize: 13 }}>{module}</div>
              <div style={{ color: "#9fffcc", fontSize: 12, marginTop: 8 }}>
                Base inicial lista para expansión soberana.
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ marginTop: 24, color: "#7fffb2", fontSize: 12 }}>
        Esencia propuesta: ${input.proposedBy}. Riesgo: ${input.risk}. Ejecución bloqueada hasta aprobación soberana.
      </footer>
    </main>
  );
}
`;
}

function buildComponentTsx(target: string, branch: string) {
  const fileName = target.split("/").pop() || "GeneratedComponent.tsx";
  const componentName = pascalCase(fileName);

  return `export default function ${componentName}() {
  return (
    <section style={{ border: "1px solid rgba(0,255,136,.25)", borderRadius: 14, padding: 18, background: "#020402", color: "#d9ffea" }}>
      <h2 style={{ color: "#d4af37", marginTop: 0 }}>${componentName}</h2>
      <p style={{ color: "#b8ffd9" }}>
        Componente base de ${labelForBranch(branch)} generado por ORA/Kairos.
      </p>
    </section>
  );
}
`;
}

function buildRouteTs(branch: string) {
  return `export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    branch: "${branch}",
    status: "${labelForBranch(branch)} ONLINE",
    modules: ${JSON.stringify(modulesForBranch(branch), null, 4)},
    createdBy: "ORA/Kairos",
    createdAt: new Date().toISOString(),
  });
}
`;
}

function buildTypesTs(branch: string) {
  const name = pascalCase(branch);

  return `export type ${name}Status = {
  ok: boolean;
  branch: string;
  status: string;
  createdBy?: string;
  createdAt?: string;
};

export type ${name}Event = {
  id: string;
  title: string;
  note: string;
  createdAt: string;
};

export type ${name}Module = {
  id: string;
  label: string;
  status: "pending" | "active" | "paused";
};
`;
}

function buildMockDataTs(branch: string) {
  const pascalName = pascalCase(branch) || "General";
  const identifier =
    pascalName.charAt(0).toLowerCase() +
    pascalName.slice(1);

  return `export const ${identifier}MockModules = ${JSON.stringify(
    modulesForBranch(branch).map((label, index) => ({
      id: `module-${index + 1}`,
      label,
      status: "pending",
    })),
    null,
    2
  )};

export const ${identifier}MockEvents = [
  {
    id: "initial",
    title: "${labelForBranch(branch)} inicializado",
    note: "Base creada por ORA/Kairos.",
    createdAt: new Date().toISOString(),
  },
];
`;
}

function buildGenericTs(branch: string) {
  return `export const autoprogGenerated = {
  ok: true,
  branch: "${branch}",
  label: "${labelForBranch(branch)}",
  modules: ${JSON.stringify(modulesForBranch(branch), null, 2)},
  createdBy: "ORA/Kairos",
  createdAt: new Date().toISOString(),
};
`;
}

export function generateAutoprogContent(input: {
  intent: string;
  target: string;
  proposedBy: string;
  risk: string;
  branch?: string | null;
}) {
  const intent = clean(input.intent);
  const target = clean(input.target);
  const proposedBy = clean(input.proposedBy || "rafael");
  const risk = clean(input.risk || "medium");
  const title = escapeText(extractTitle(intent));

  const explicitBranch = clean(input.branch);
  const targetBranch = branchFromTarget(target);

  const branch =
    explicitBranch ||
    targetBranch ||
    branchFromIntent(intent);

  if (target.endsWith("/route.ts")) return buildRouteTs(branch);
  if (target.endsWith("/types.ts") || target.endsWith("types.ts")) return buildTypesTs(branch);
  if (target.endsWith("mockData.ts")) return buildMockDataTs(branch);

  if (target.endsWith(".tsx") && target.includes("/components/")) {
    return buildComponentTsx(target, branch);
  }

  if (target.endsWith(".tsx")) {
    const existingBranchTargets = [
      "app/security/page.tsx",
      "app/health/page.tsx",
      "app/presence/page.tsx",
      "app/marketing/page.tsx",
      "app/agriculture/page.tsx",
      "app/pollera/page.tsx",
    ];

    if (
      target === "app/security/page.tsx" &&
      (
        normalizeText(intent).includes("estado del sistema") ||
        normalizeText(intent).includes("status") ||
        normalizeText(intent).includes("tarjeta") ||
        normalizeText(intent).includes("card")
      )
    ) {
      const currentTargetPath = path.resolve(process.cwd(), target);
      const currentTargetContent = fs.existsSync(currentTargetPath)
        ? fs.readFileSync(currentTargetPath, "utf8")
        : "";

      if (currentTargetContent.includes("ORA_STATUS_CARD_V1")) {
        return JSON.stringify({
          title: "Estado del Sistema ya materializado",
          summary:
            "La tarjeta Estado del Sistema ya existe en ORA Security. No se genera una nueva mutación.",
          files: [],
          alreadyMaterialized: true,
          requiresApproval: false,
          sealRequired: true,
          canExecute: false,
          branch,
          proposedBy
        }, null, 2);
      }

      const find =
        '          ))}\n        </div>\n      </section>';

      const replaceWith =
        '          ))}\n' +
        '        </div>\n' +
        '        {/* ORA_STATUS_CARD_V1 */}\n' +
        '        <div style={{ marginTop: 24, border: "1px solid rgba(0,255,136,.35)", borderRadius: 14, padding: 18, background: "#020402" }}>\n' +
        '          <div style={{ color: "#d4af37", fontSize: 13 }}>Estado del Sistema</div>\n' +
        '          <div style={{ color: "#39ff88", fontSize: 20, fontWeight: 800, marginTop: 8 }}>ORA SECURITY ONLINE</div>\n' +
        '          <div style={{ color: "#9fffcc", fontSize: 12, marginTop: 8 }}>Cámaras · Alertas · Eventos · Zonas · Negocios · Observer</div>\n' +
        '        </div>\n' +
        '      </section>';

      return JSON.stringify({
        title: "Patch incremental: Estado del Sistema",
        summary:
          "Agrega una tarjeta Estado del Sistema al dashboard existente de ORA Security sin reemplazar la página completa.",
        files: [
          {
            path: target,
            operations: [
              {
                type: "replace-exact",
                find,
                replaceWith
              }
            ]
          }
        ],
        requiresApproval: true,
        sealRequired: true,
        canExecute: false,
        branch,
        proposedBy
      }, null, 2);
    }

    if (existingBranchTargets.includes(target)) {
      return JSON.stringify({
        title: `Patch soberano incremental para ${target}`,
        summary: "La rama existente está protegida. No se permite reemplazo completo. La esencia debe leer el archivo actual y devolver solo cambios incrementales seguros.",
        files: [
          {
            path: target,
            operations: [
              {
                type: "append-if-missing",
                content:
                  "\n/* ORA_STRUCTURED_PATCH_READY: Rama existente protegida. Solo cambios incrementales bajo Sello de Kairos. */\n"
              },
              {
                type: "append-if-missing",
                content:
                  "\n/* ORA_AUTONOMOUS_PROGRAMMING_RULE: Las esencias pueden proponer operaciones reales, pero ninguna ejecución ocurre sin aprobación explícita del Rey y Sello. */\n"
              },
              {
                type: "append-if-missing",
                content:
                  "\n/* ORA_ALLOWED_PATCH_OPS: replace-exact | append-if-missing | insert-before-marker | insert-after-marker | replace-between-markers */\n"
              }
            ]
          }
        ],
        requiresApproval: true,
        sealRequired: true,
        canExecute: false,
        branch,
        proposedBy
      }, null, 2);
    }

    return buildPageTsx({ title, branch, proposedBy, risk });
  }

  if (target.endsWith(".ts")) {
    return buildGenericTs(branch);
  }

  return `Generated by ORA/Kairos
Intent: ${intent}
Essence: ${proposedBy}
Risk: ${risk}
CreatedAt: ${new Date().toISOString()}
`;
}

export function generateAutoprogFiles(input: {
  intent: string;
  targetFiles: string[];
  proposedBy: string;
  risk: string;
  branch?: string | null;
}) {
  return input.targetFiles.map((file) => {
    const generated = generateAutoprogContent({
      intent: input.intent,
      target: file,
      proposedBy: input.proposedBy,
      risk: input.risk,
      branch: input.branch,
    });

    try {
      const parsed = JSON.parse(generated);
      const generatedFile = Array.isArray(parsed?.files)
        ? parsed.files.find((item: any) => clean(item?.path) === clean(file))
        : null;

      if (generatedFile && Array.isArray(generatedFile.operations)) {
        return {
          path: file,
          operations: generatedFile.operations,
        };
      }
    } catch {}

    const existingTarget = fs.existsSync(
      path.join(process.cwd(), clean(file))
    );

    if (existingTarget) {
      throw new Error(
        `AUTOPROG_EXISTING_TARGET_REQUIRES_OPERATIONS:${clean(file)}`
      );
    }

    return {
      path: file,
      content: generated,
    };
  });
}

export function isAutoprogAlreadyMaterialized(input: {
  intent: string; targetFiles: string[]; proposedBy: string; risk: string; branch?: string | null;
}) {
  return input.targetFiles.length > 0 && input.targetFiles.every((file) => {
    const generated = generateAutoprogContent({ ...input, target: file });
    try {
      return JSON.parse(generated)?.alreadyMaterialized === true;
    } catch {
      return false;
    }
  });
}
