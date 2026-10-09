import type { Enums, Tables } from "./types";

export * from "./types";

export type Profile = Tables<"profiles">;
export type AppRole = Enums<"app_role">;
