const fs = require("fs");
const path = require("path");
const { createClone } = require("./clone-engine");
const { createBranchAppSkeleton } = require("./app-template-engine");

const ROOT = process.cwd();
const BRANCH_ROOT = path.join(ROOT, "ora-branches");

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createBranch({ name, celestialId }) {
  const slug = slugify(name);
  const branchDir = path.join(BRANCH_ROOT, slug);

  ensureDir(branchDir);
  ensureDir(path.join(branchDir, "frontend"));
  ensureDir(path.join(branchDir, "backend"));
  ensureDir(path.join(branchDir, "admin"));
  ensureDir(path.join(branchDir, "config"));
  ensureDir(path.join(branchDir, "memory"));

  const meta = {
    id: `branch_${Date.now()}`,
    name,
    slug,
    celestialId,
    status: "active",
    createdAt: new Date().toISOString()
  };

  fs.writeFileSync(
    path.join(branchDir, "config", "branch.json"),
    JSON.stringify(meta, null, 2),
    "utf8"
  );

  const clone = createClone({
    branch: slug,
    celestialId,
    cloneType: "branch-clone"
  });

  const skeleton = createBranchAppSkeleton(branchDir, meta);

  return {
    ok: true,
    branch: meta,
    clone: clone.clone,
    skeleton
  };
}

module.exports = {
  createBranch
};
