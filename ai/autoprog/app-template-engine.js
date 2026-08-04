const fs = require("fs");
const path = require("path");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFileSafe(filePath, content) {
  ensureDir(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function createBranchAppSkeleton(branchDir, meta) {
  const frontendDir = path.join(branchDir, "frontend");
  const backendDir = path.join(branchDir, "backend");
  const adminDir = path.join(branchDir, "admin");
  const configDir = path.join(branchDir, "config");
  const memoryDir = path.join(branchDir, "memory");

  ensureDir(frontendDir);
  ensureDir(backendDir);
  ensureDir(adminDir);
  ensureDir(configDir);
  ensureDir(memoryDir);

  ensureDir(path.join(frontendDir, "app"));
  ensureDir(path.join(frontendDir, "components"));
  ensureDir(path.join(frontendDir, "public"));

  ensureDir(path.join(backendDir, "routes"));
  ensureDir(path.join(backendDir, "services"));

  ensureDir(path.join(adminDir, "dashboard"));

  writeFileSafe(
    path.join(configDir, "manifest.json"),
    JSON.stringify(
      {
        name: meta.name,
        slug: meta.slug,
        branchId: meta.id,
        celestialId: meta.celestialId,
        status: meta.status,
        generatedAt: new Date().toISOString(),
        type: "ora-branch-app",
      },
      null,
      2
    )
  );

  writeFileSafe(
    path.join(memoryDir, "events.json"),
    JSON.stringify(
      {
        events: [],
      },
      null,
      2
    )
  );

  writeFileSafe(
    path.join(branchDir, "README.md"),
    `# ${meta.name}

Rama creada por ORA.

- Branch ID: ${meta.id}
- Slug: ${meta.slug}
- Caballero asignado: ${meta.celestialId}
- Estado: ${meta.status}

Esta rama fue generada automáticamente por el núcleo soberano de ORA.
`
  );

  writeFileSafe(
    path.join(frontendDir, "app", "page.tsx"),
    `"use client";

export default function BranchHomePage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#081018",
      color: "#eaf2ff",
      padding: "40px",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1>${meta.name}</h1>
      <p>Rama activa creada por ORA.</p>
      <p>Slug: ${meta.slug}</p>
      <p>Caballero: ${meta.celestialId}</p>
    </main>
  );
}
`
  );

  writeFileSafe(
    path.join(backendDir, "routes", "health.js"),
    `module.exports = function healthRoute(req, res) {
  res.json({
    ok: true,
    branch: "${meta.slug}",
    status: "active"
  });
};
`
  );

  writeFileSafe(
    path.join(adminDir, "dashboard", "index.md"),
    `# Dashboard de ${meta.name}

Panel inicial de administración de la rama.
`
  );

  return {
    ok: true,
    generated: true,
    branchDir,
  };
}

module.exports = {
  createBranchAppSkeleton,
};
