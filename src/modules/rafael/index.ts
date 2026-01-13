import { guardian } from "../../core/guardian.js";

export type RafaelCommand =
  | "status"
  | "speak"
  | "propose"
  | "self_check";

export class RafaelModule {
  name = "rafael" as const;

  run(command: RafaelCommand, payload?: string) {
    // Todo pasa por el Guardian (autorización)
    const ok = guardian.authorize(this.name, command);
    if (!ok) return { ok: false, error: "Bloqueado por Guardian" };

    switch (command) {
      case "status":
        return { ok: true, module: this.name, alive: true, message: "Rafael listo." };

      case "speak":
        return { ok: true, message: payload ?? "Dime, Rey Kairos." };

      case "propose":
        return {
          ok: true,
          idea: "Siguiente paso: conectar módulos a un núcleo común y luego a una UI (React Native).",
        };

      case "self_check":
        return {
          ok: true,
          checks: ["guardian_ok", "module_ok", "structure_ok"],
        };
    }
  }
}

export const rafael = new RafaelModule();
