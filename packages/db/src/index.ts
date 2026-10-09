import type { Database } from "./types";

export type { Database, Json } from "./types";

type PublicSchema = Database["public"];

/** Ligne d'une table du schéma public. */
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Profile = Tables<"profiles">;
export type AppRole = Enums<"app_role">;
