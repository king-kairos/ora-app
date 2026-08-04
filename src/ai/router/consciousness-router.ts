type Consciousness = {
  name: string;
  type: "clone" | "external" | "system";
  handler: (prompt: string) => Promise<any>;
};

const registry: Record<string, Consciousness> = {};

export function registerConsciousness(c: Consciousness) {
  registry[c.name] = c;
}

export async function routeConsciousness(prompt: string) {
  // Kairos decide
  if (prompt.toLowerCase().includes("analizar")) {
    return registry["kairos-analysis"]?.handler(prompt);
  }

  if (prompt.toLowerCase().includes("estrategia")) {
    return registry["kairos-operator"]?.handler(prompt);
  }

  return registry["kairos-public"]?.handler(prompt);
}
