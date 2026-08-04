export type AutoprogSuggestion = {
  id?: string;
  title?: string;
  message?: string;
  suggestedIntent?: string;
  essence?: string;
  priority?: string;
  createdAt?: string;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

export function suggestionToIntent(suggestion: AutoprogSuggestion) {
  return (
    clean(suggestion.suggestedIntent) ||
    clean(suggestion.message) ||
    clean(suggestion.title) ||
    "Mejorar estructura del núcleo ORA/Kairos desde observación automática."
  );
}

export function suggestionToPreferredEssence(suggestion: AutoprogSuggestion) {
  return clean(suggestion.essence) || undefined;
}
