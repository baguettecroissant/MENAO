/**
 * Retour de la connexion avec Google ou Apple dans l'application (ADR 0108) : Supabase rouvre
 * l'application avec les jetons de session dans l'adresse (fragment `#access_token=…`), ou une
 * erreur (`error=access_denied` si l'utilisateur a refusé).
 */
export type OAuthCallback =
  | { ok: true; tokens: { access_token: string; refresh_token: string } }
  | { ok: false; cancelled: boolean };

export function sessionFromCallbackUrl(url: string): OAuthCallback {
  const params = new URLSearchParams();
  const hash = url.indexOf("#");
  const query = url.indexOf("?");
  const add = (part: string) => new URLSearchParams(part).forEach((v, k) => params.set(k, v));
  if (query >= 0) add(url.slice(query + 1, hash > query ? hash : undefined));
  if (hash >= 0) add(url.slice(hash + 1));
  const access = params.get("access_token");
  const refresh = params.get("refresh_token");
  if (access && refresh)
    return { ok: true, tokens: { access_token: access, refresh_token: refresh } };
  return { ok: false, cancelled: params.get("error") === "access_denied" };
}
