/** Variable d'environnement, en ignorant une valeur « env(…) » non résolue par la CLI en local. */
export function env(name: string): string {
  const value = Deno.env.get(name) ?? "";
  return value.startsWith("env(") ? "" : value;
}
