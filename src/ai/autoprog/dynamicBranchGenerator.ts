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

function slugify(value: string) {
  return normalizeText(value)
    .replace(/^crear\s+rama\s+ora\s+/i, "")
    .replace(/^crear\s+rama\s+/i, "")
    .replace(/^crear\s+ora\s+/i, "")
    .replace(/^ora\s+/i, "")
    .replace(/\s+con\s+.*$/i, "")
    .replace(/\s+para\s+.*$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function pascalCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function generateDynamicBranchTargets(intent: string) {
  const raw = clean(intent);
  const slug = slugify(raw) || "custom-branch";
  const name = pascalCase(slug) || "CustomBranch";

  return {
    slug,
    name,
    targets: [
      `app/${slug}/page.tsx`,
      `app/${slug}/components/${name}Dashboard.tsx`,
      `app/${slug}/components/StatsPanel.tsx`,
      `app/${slug}/components/EventsPanel.tsx`,
      `app/${slug}/components/ControlPanel.tsx`,
      `app/api/${slug}/state/route.ts`,
      `src/${slug}/types.ts`,
      `src/${slug}/mockData.ts`,
    ],
  };
}
