import { guardian } from "./guardian";

export type OraAction = "status" | "speak" | "propose";

export interface OraModule {
  name: string;
  run: (action: OraAction, payload?: string) => any;
}

class ORA {
  private registry = new Map<string, OraModule>();

  register(mod: OraModule) {
    this.registry.set(mod.name, mod);
  }

  list() {
    return Array.from(this.registry.keys());
  }

  exec(module: string, action: OraAction, payload?: string) {
    const mod = this.registry.get(module);

    if (!mod) {
      return { ok: false, error: `Módulo ${module} no existe.` };
    }

    if (!guardian.authorize(module, action)) {
      return { ok: false, blocked: true };
    }

    return mod.run(action, payload);
  }
}

export const ora = new ORA();
