import { OraAction } from "../../core/ora";

export const rafael = {
  name: "rafael",

  run(action: OraAction, payload?: string) {
    switch (action) {
      case "status":
        return {
          ok: true,
          module: "rafael",
          status: "presente",
        };

      case "speak":
        return {
          ok: true,
          module: "rafael",
          message: payload ?? "Presente continuo. Frecuencia activa.",
        };

      case "propose":
        return {
          ok: true,
          module: "rafael",
          proposal: "Iniciar expansión del sistema.",
        };

      default:
        return {
          ok: false,
          error: `Acción desconocida: ${action}`,
        };
    }
  },
};
