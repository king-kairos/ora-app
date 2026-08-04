export type GeneratedFile = {
  path: string;
  purpose: string;
  content: string;
};

function slug(text: string) {
  return String(text || "ora-module")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "ora-module";
}

function inferBranch(intent: string, branch?: string) {
  if (branch?.trim()) return slug(branch);
  const t = intent.toLowerCase();
  if (t.includes("security")) return "security";
  if (t.includes("presence")) return "presence";
  if (t.includes("health")) return "health";
  if (t.includes("pollera")) return "pollera";
  if (t.includes("marketing")) return "marketing";
  if (t.includes("agriculture")) return "agriculture";
  return slug(intent);
}

export function generateMultiFileCode(input: {
  intent: string;
  branch?: string;
  essence?: string;
}) {
  const intent = input.intent || "";
  const branch = inferBranch(intent, input.branch);
  const title = branch
    .split("-")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");

  const files: GeneratedFile[] = [
    {
      path: `app/${branch}/page.tsx`,
      purpose: "Página principal de la rama.",
      content: `import ${title.replace(/[^A-Za-z0-9]/g, "")}Dashboard from "./components/${title.replace(/[^A-Za-z0-9]/g, "")}Dashboard";

export default function Page() {
  return <${title.replace(/[^A-Za-z0-9]/g, "")}Dashboard />;
}
`,
    },
    {
      path: `app/${branch}/components/${title.replace(/[^A-Za-z0-9]/g, "")}Dashboard.tsx`,
      purpose: "Dashboard visual principal.",
      content: `"use client";

import { mockItems } from "@/${branch}/mockData";

export default function ${title.replace(/[^A-Za-z0-9]/g, "")}Dashboard() {
  return (
    <main style={{ minHeight: "100vh", background: "#050805", color: "#d9ffea", padding: 32, fontFamily: "monospace" }}>
      <h1 style={{ color: "#39ff88" }}>ORA ${title}</h1>
      <p>Rama generada por intención bajo Sello de Kairos.</p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
        {mockItems.map((item) => (
          <div key={item.id} style={{ border: "1px solid rgba(0,255,136,.35)", borderRadius: 14, padding: 16, background: "#071108" }}>
            <b style={{ color: "#d4af37" }}>{item.title}</b>
            <p>{item.description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
`,
    },
    {
      path: `src/${branch}/types.ts`,
      purpose: "Tipos base de la rama.",
      content: `export type ${title.replace(/[^A-Za-z0-9]/g, "")}Item = {
  id: string;
  title: string;
  description: string;
  status: "active" | "pending" | "archived";
};
`,
    },
    {
      path: `src/${branch}/mockData.ts`,
      purpose: "Datos iniciales seguros.",
      content: `import type { ${title.replace(/[^A-Za-z0-9]/g, "")}Item } from "./types";

export const mockItems: ${title.replace(/[^A-Za-z0-9]/g, "")}Item[] = [
  {
    id: "item-1",
    title: "Base inicial",
    description: "Módulo creado desde intención natural. Pendiente de evolución por cabina.",
    status: "active",
  },
  {
    id: "item-2",
    title: "Sello de Kairos",
    description: "Nada se ejecuta sin autorización soberana.",
    status: "pending",
  },
];
`,
    },
    {
      path: `app/api/${branch}/state/route.ts`,
      purpose: "Endpoint de estado inicial.",
      content: `import { NextResponse } from "next/server";
import { mockItems } from "@/${branch}/mockData";

export async function GET() {
  return NextResponse.json({
    ok: true,
    branch: "${branch}",
    status: "online",
    items: mockItems,
  });
}
`,
    },
  ];

  return {
    ok: true,
    mode: "MULTI_FILE_CODE_PREVIEW",
    intent,
    branch,
    essence: input.essence || "auto",
    canExecute: false,
    sealRequired: true,
    files,
  };
}
