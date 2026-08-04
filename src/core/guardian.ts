export type ModuleName = "rafael" | "kaerliana" | "orion";

class Guardian {
  // Por ahora todo permitido (modo principiante / desbloqueo)
  authorize(module: string, action: string): boolean {
    // Si luego quieres volver a bloquear, aquí se pone la lógica.
    // Por ahora: siempre true para que compile limpio.
    return true;
  }
}

export const guardian = new Guardian();
