/**
 * Valide un chemin de redirection reçu en paramètre (`?next=`) pour éviter les
 * redirections ouvertes : seuls les chemins internes absolus sont acceptés.
 */
export function safeRedirectPath(value: unknown, fallback = "/mon-espace"): string {
  if (typeof value !== "string") return fallback;
  // Les navigateurs ignorent tabulations et retours à la ligne : « /\t/x » devient « //x ».
  if ([...value].some((c) => c.charCodeAt(0) <= 0x20 || c.charCodeAt(0) === 0x7f)) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
