import fs from "fs/promises";
import path from "path";

type BranchInfo = {
  branch: string;
  label: string;
  appPath: string;
  essence: string;
  priority: "low" | "medium" | "high";
  modules: string[];
};

const BRANCHES: BranchInfo[] = [
  {
    branch: "presence",
    label: "ORA Presence",
    appPath: "app/presence",
    essence: "kaerliana",
    priority: "high",
    modules: ["acompañamiento", "crisis", "registro emocional", "comunidad"],
  },
  {
    branch: "security",
    label: "ORA Security",
    appPath: "app/security",
    essence: "ignis",
    priority: "high",
    modules: ["cámaras", "alertas", "eventos", "zonas", "negocios", "observer"],
  },
  {
    branch: "health",
    label: "ORA Health",
    appPath: "app/health",
    essence: "rafael",
    priority: "high",
    modules: ["pacientes", "consultas", "doctores", "recetas", "analíticas"],
  },
  {
    branch: "agriculture",
    label: "ORA Agriculture",
    appPath: "app/agriculture",
    essence: "ignis",
    priority: "medium",
    modules: ["cultivos", "sensores", "riego", "plagas", "parcelas", "inventario"],
  },
  {
    branch: "marketing",
    label: "ORA Marketing",
    appPath: "app/marketing",
    essence: "arturo",
    priority: "medium",
    modules: ["campañas", "leads", "clientes", "redes sociales", "embudo"],
  },
  {
    branch: "pollera",
    label: "ORA Pollera",
    appPath: "app/pollera",
    essence: "rafael",
    priority: "medium",
    modules: ["producción", "inventario frío", "pedidos", "entregas", "costos"],
  },
];

async function exists(filePath: string) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function observeExistingBranches(root = process.cwd()) {
  const observations = [];

  for (const branch of BRANCHES) {
    const fullPath = path.join(root, branch.appPath);
    const branchExists = await exists(fullPath);

    if (!branchExists) continue;

    observations.push({
      branch: branch.branch,
      title: `Mejorar ${branch.label}`,
      message: `El observador recomienda fortalecer ${branch.label} sin tocar el núcleo. La rama ya existe; esto debe evolucionar la estructura actual, no crear una rama duplicada.`,
      suggestedIntent: `Mejorar ${branch.label} con módulos de ${branch.modules.join(", ")} manteniendo clon operativo aislado, observador celestial y Sello de Kairos obligatorio.`,
      essence: branch.essence,
      priority: branch.priority,
      status: "pending",
      appPath: branch.appPath,
      createdAt: new Date().toISOString(),
    });
  }

  return observations;
}
