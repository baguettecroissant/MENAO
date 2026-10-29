/**
 * Rôles applicatifs (spec §3). Le rôle d'un utilisateur connecté est stocké dans
 * `auth.users.app_metadata.role`, modifiable uniquement côté serveur.
 * `visiteur` désigne l'absence de session : il n'est jamais stocké.
 */
export const ROLES = [
  "particulier",
  "artisan",
  "artisan_en_attente",
  "admin",
  "support",
  // Commercial de terrain (F-65, ADR 0205) : compte créé par un admin, jamais à l'inscription.
  "commercial",
  "visiteur",
] as const;

export type Role = (typeof ROLES)[number];
export type StoredRole = Exclude<Role, "visiteur">;

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isStaff(role: Role): boolean {
  return role === "admin" || role === "support";
}

export function isAdmin(role: Role): boolean {
  return role === "admin";
}

/** Lit le rôle depuis `app_metadata` (jamais depuis `user_metadata`). */
export function roleFromAppMetadata(appMetadata: unknown): Role {
  if (typeof appMetadata !== "object" || appMetadata === null) return "visiteur";
  const role = (appMetadata as { role?: unknown }).role;
  return isRole(role) ? role : "visiteur";
}

/** Page d'accueil après connexion selon le rôle. */
export function homePathForRole(role: Role): string {
  switch (role) {
    case "artisan":
      return "/pro/tableau-de-bord";
    case "artisan_en_attente":
      return "/pro/onboarding";
    case "admin":
      return "/admin";
    case "support":
      // Équipe restreinte (spec §4) : tickets, modération et litiges (ADR 0049).
      return "/admin/tickets";
    case "commercial":
      return "/commercial";
    case "visiteur":
      return "/connexion";
    default:
      return "/mon-espace";
  }
}

/**
 * Espace de l'application native selon le rôle (phase 6). Les visiteurs et les particuliers
 * partagent l'espace client : on visite et on cherche sans compte (ADR 0055). L'équipe MENAO
 * utilise le back-office web, les commerciaux leur espace sur le site (ADR 0205).
 */
export type AppSpace = "client" | "artisan" | "equipe";

export function appSpaceForRole(role: Role): AppSpace {
  if (isStaff(role) || role === "commercial") return "equipe";
  if (role === "artisan" || role === "artisan_en_attente") return "artisan";
  return "client";
}
