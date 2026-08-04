export type ObserverSuggestion = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  essence: string;
  message: string;
  suggestedIntent: string;
  createdAt: string;
};

function id() {
  return `obs-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function generateObserverSuggestions(): ObserverSuggestion[] {
  const createdAt = new Date().toISOString();

  return [
    {
      id: id(),
      title: "Fortalecer creación multiarchivo",
      priority: "high",
      essence: "arturo",
      message:
        "Kairos, el núcleo ya puede crear ramas completas. Recomiendo mejorar el flujo para que cada rama genere página, componentes, API, types y mockData en una sola proposal.",
      suggestedIntent:
        "Mejorar el Auto Programming Engine para crear ramas completas multiarchivo desde una intención natural.",
      createdAt,
    },
    {
      id: id(),
      title: "Mejorar preview antes de aprobar",
      priority: "high",
      essence: "kaerliana",
      message:
        "Antes de aprobar una proposal, conviene mostrar el código de cada archivo con más claridad para que puedas revisar sin abrir terminal.",
      suggestedIntent:
        "Crear un panel visual de code preview multiarchivo dentro del Builder de Kairos.",
      createdAt,
    },
    {
      id: id(),
      title: "Preparar evolución autónoma supervisada",
      priority: "medium",
      essence: "orion",
      message:
        "ORA debe observar el sistema, sugerir mejoras y esperar tu Sello. Nada debe ejecutarse solo, pero el consejo puede preparar ideas cuando tú no estés.",
      suggestedIntent:
        "Crear un sistema de sugerencias automáticas del consejo celestial sin ejecución automática.",
      createdAt,
    },
  ];
}
