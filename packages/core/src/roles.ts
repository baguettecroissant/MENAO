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
