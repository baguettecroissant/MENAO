// Edge Function staff-invite (F-67, ADR 0210) : un admin (session aal2) invite un autre admin ou
// un membre du support. La clé serveur crée le compte et pose le rôle (jamais obtenu par
// l'inscription) ; l'invitation est enregistrée au nom de l'admin (admin_record_staff_invite :
// contrôle des rôles, journal d'audit). Supabase envoie l'e-mail d'invitation (modèle
// supabase/templates/invite.html, version « équipe ») pour choisir le mot de passe ; la double
// authentification est imposée à la première visite du back-office (ADR 0008).
// Même déroulé que commercial-invite (ADR 0205). Aucune donnée personnelle dans les journaux.
import { createClient } from "@supabase/supabase-js";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["admin", "support"] as const;
const MAX_INVITES_PER_HOUR = 10;

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
  const role = ROLES.find((r) => r === body?.role) ?? null;
  if (!firstName || !lastName || !email || !EMAIL.test(email) || !role) {
    return json({ status: "invalid" }, 400);
  }

  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `staff-invite:${caller.id}`,
    p_max: MAX_INVITES_PER_HOUR,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  // Jamais l'adresse d'un compte existant, même non confirmé : l'invitation le reprendrait et
  // donnerait le rôle admin à un compte déjà utilisé.
  const { data: exists, error: existsError } = await admin.rpc("auth_email_exists", {
    p_email: email,
  });
  if (existsError) return json({ status: "unavailable" }, 503);
  if (exists === true) return json({ status: "email_taken" }, 409);

  const siteUrl = (env("SITE_URLS").split(",")[0] ?? "").trim();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    // « equipe » choisit la version du modèle d'e-mail : simple libellé, jamais un droit (le rôle
    // est dans app_metadata, règle 7).
    data: { first_name: firstName, last_name: lastName, equipe: true },
    redirectTo: siteUrl ? `${siteUrl}/nouveau-mot-de-passe` : undefined,
  });
  if (inviteError || !invited?.user) {
    const taken = inviteError?.status === 422 || /already/i.test(inviteError?.message ?? "");
    if (!taken) console.error("staff-invite : invitation", inviteError?.status ?? "");
    return json({ status: taken ? "email_taken" : "unavailable" }, taken ? 409 : 503);
  }
  const userId = invited.user.id;
  // Compte créé entre la vérification et l'invitation : on n'y touche pas.
  if (invited.user.app_metadata?.role !== "particulier" || invited.user.email_confirmed_at) {
    return json({ status: "email_taken" }, 409);
  }

  const { error: roleError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });
  // Client au nom de l'admin : la base vérifie elle-même son rôle et sa session aal2.
  const asAdmin = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: recordError } = roleError
    ? { error: roleError }
    : await asAdmin.rpc("admin_record_staff_invite", { p_user_id: userId, p_role: role });
  if (roleError || recordError) {
    // Pas de compte à moitié créé : l'invitation est retirée.
    console.error("staff-invite : enregistrement", recordError?.code ?? "role");
    await admin.auth.admin.deleteUser(userId);
    return json({ status: "unavailable" }, 503);
  }
  return json({ status: "ok" });
});
