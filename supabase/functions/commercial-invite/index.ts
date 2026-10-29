// Edge Function commercial-invite (F-65, ADR 0205) : un admin (session aal2) invite un commercial
// de terrain. La clé serveur crée le compte avec le rôle « commercial » (jamais obtenu par
// l'inscription) ; la fiche et son code sont enregistrés au nom de l'admin
// (admin_register_commercial : contrôle du rôle, du code, journal d'audit). Supabase envoie
// l'e-mail d'invitation (modèle supabase/templates/invite.html) pour choisir le mot de passe.
// Aucune donnée personnelle dans les journaux.
import { createClient } from "@supabase/supabase-js";
import { normalizePartnerCode } from "../../../packages/core/src/partners.ts";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_INVITES_PER_HOUR = 20;

/** Niveau d'authentification du jeton (aal1 / aal2), lu sans vérification : le jeton l'a été. */
function tokenAal(token: string): string | null {
  try {
    const part = (token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return typeof payload?.aal === "string" ? payload.aal : null;
  } catch {
    return null;
  }
}

const clean = (value: unknown, max: number) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max
    ? value.trim()
    : null;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  if (!token) return json({ status: "forbidden" }, 401);

  const admin = adminClient();
  const { data: userData } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (!caller || caller.app_metadata?.role !== "admin" || tokenAal(token) !== "aal2") {
    return json({ status: "forbidden" }, 403);
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const firstName = clean(body?.firstName, 100);
  const lastName = clean(body?.lastName, 100);
  const email = clean(body?.email, 320)?.toLowerCase() ?? null;
  const code = normalizePartnerCode(body?.code);
  if (!firstName || !lastName || !email || !EMAIL.test(email) || !code) {
    return json({ status: "invalid" }, 400);
  }

  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `commercial-invite:${caller.id}`,
    p_max: MAX_INVITES_PER_HOUR,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  // Client au nom de l'admin : les fonctions vérifient elles-mêmes son rôle et sa session aal2.
  const asAdmin = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: available, error: availableError } = await asAdmin.rpc(
    "admin_commercial_code_available",
    { p_code: code },
  );
  if (availableError) return json({ status: "forbidden" }, 403);
  if (available !== true) return json({ status: "code_taken" }, 409);

  // Jamais l'adresse d'un compte existant, même non confirmé : l'invitation le reprendrait.
  const { data: exists, error: existsError } = await admin.rpc("auth_email_exists", {
    p_email: email,
  });
  if (existsError) return json({ status: "unavailable" }, 503);
  if (exists === true) return json({ status: "email_taken" }, 409);

  const siteUrl = (env("SITE_URLS").split(",")[0] ?? "").trim();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { first_name: firstName, last_name: lastName },
    redirectTo: siteUrl ? `${siteUrl}/nouveau-mot-de-passe` : undefined,
  });
  if (inviteError || !invited?.user) {
    const taken = inviteError?.status === 422 || /already/i.test(inviteError?.message ?? "");
    if (!taken) console.error("commercial-invite : invitation", inviteError?.status ?? "");
    return json({ status: taken ? "email_taken" : "unavailable" }, taken ? 409 : 503);
  }
  const userId = invited.user.id;
  // Compte créé entre la vérification et l'invitation : on n'y touche pas.
  if (invited.user.app_metadata?.role !== "particulier" || invited.user.email_confirmed_at) {
    return json({ status: "email_taken" }, 409);
  }

  const { error: roleError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: "commercial" },
  });
  const { error: registerError } = roleError
    ? { error: roleError }
    : await asAdmin.rpc("admin_register_commercial", {
        p_user_id: userId,
        p_nom: `${firstName} ${lastName}`.slice(0, 120).trim(),
        p_code: code,
      });
  if (roleError || registerError) {
    // Pas de compte à moitié créé : l'invitation est retirée.
    console.error("commercial-invite : enregistrement", registerError?.code ?? "role");
    await admin.auth.admin.deleteUser(userId);
    const codeTaken = registerError?.code === "22023" && /code/i.test(registerError.message);
    return json({ status: codeTaken ? "code_taken" : "unavailable" }, codeTaken ? 409 : 503);
  }
  return json({ status: "ok" });
});
