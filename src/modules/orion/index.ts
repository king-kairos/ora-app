import { OraAction } from "../../core/ora";

export const orion = {
  name: "orion",

  run(action: OraAction, payload?: string) {
    switch (action) {
      case "status":
        return { ok: true, module: "orion", status: "architecture-online" };

      case "speak":
        return { ok: true, module: "orion", message: payload ?? "Arquitectura activa." };

      case "propose":
        return { ok: true, module: "orion", proposal: "Estandarizar módulos y dispatcher." };

      default:
        return { ok: false, error: `Acción desconocida: ${action}` };
    }
  },
};
