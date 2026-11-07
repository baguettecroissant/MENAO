/**
 * { entrée du journal : auteur } renvoyé par chantier_update_authors (ADR 0243), comme sur le site :
 * collègue pour l'équipe, « Prénom (Entreprise) » d'un membre pour le client.
 */
export function updateAuthorMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
}
