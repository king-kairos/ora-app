import { readModuleRegistry } from "./module-registry";

type EvolutionNode = {
  moduleName: string;
  title: string;
  branch: string;
  status: "existing" | "missing";
  dependsOn: string[];
  priority: "alta" | "media" | "baja";
};

type BranchTemplate = {
  branch: string;
  modules: {
    moduleName: string;
    title: string;
    dependsOn: string[];
    priority: "alta" | "media" | "baja";
  }[];
};

const TEMPLATES: BranchTemplate[] = [
  {
    branch: "core-expansion",
    modules: [
      { moduleName: "booking", title: "ORA — Booking", dependsOn: [], priority: "media" },
      { moduleName: "vault", title: "ORA — Vault", dependsOn: [], priority: "media" },
      { moduleName: "signal", title: "ORA — Signal", dependsOn: ["vault"], priority: "baja" },
    ],
  },
  {
    branch: "community",
    modules: [
      { moduleName: "community", title: "ORA — Community", dependsOn: [], priority: "alta" },
      { moduleName: "social", title: "ORA — Social", dependsOn: ["community"], priority: "media" },
    ],
  },
  {
    branch: "public-gateway",
    modules: [
      { moduleName: "camera", title: "ORA — Camera", dependsOn: [], priority: "alta" },
      { moduleName: "eco", title: "ORA — Eco", dependsOn: ["camera"], priority: "media" },
      { moduleName: "gateway", title: "ORA — Gateway", dependsOn: ["camera", "eco"], priority: "alta" },
    ],
  },
  {
    branch: "business",
    modules: [
      { moduleName: "business", title: "ORA — Business", dependsOn: [], priority: "alta" },
      { moduleName: "pollera", title: "ORA — Pollera", dependsOn: ["business"], priority: "alta" },
      { moduleName: "granja", title: "ORA — Granja", dependsOn: ["pollera"], priority: "media" },
    ],
  },
  {
    branch: "lottery",
    modules: [
      { moduleName: "lottery", title: "ORA — Lottery", dependsOn: [], priority: "alta" },
    ],
  },
];

function hasModule(existing: { moduleName: string }[], moduleName: string) {
  return existing.some((item) => item.moduleName === moduleName);
}

export function buildEvolutionGraph() {
  const registry = readModuleRegistry();

  const nodes: EvolutionNode[] = [];

  for (const template of TEMPLATES) {
    for (const mod of template.modules) {
      nodes.push({
        moduleName: mod.moduleName,
        title: mod.title,
        branch: template.branch,
        status: hasModule(registry, mod.moduleName) ? "existing" : "missing",
        dependsOn: mod.dependsOn,
        priority: mod.priority,
      });
    }
  }

  const existing = nodes.filter((n) => n.status === "existing");
  const missing = nodes.filter((n) => n.status === "missing");

  return {
    ok: true,
    totalNodes: nodes.length,
    totalExisting: existing.length,
    totalMissing: missing.length,
    nodes,
    existing,
    missing,
  };
}

export function getNextEvolutionCandidates() {
  const graph = buildEvolutionGraph();

  const ready = graph.missing.filter((node) => {
    return node.dependsOn.every((dep) =>
      graph.existing.some((existing) => existing.moduleName === dep)
    );
  });

  const order = { alta: 0, media: 1, baja: 2 };

  ready.sort((a, b) => order[a.priority] - order[b.priority]);

  return {
    ok: true,
    totalReady: ready.length,
    ready,
    next: ready[0] || null,
    graph,
  };
}
