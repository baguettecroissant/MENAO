// Edge Function team-members (F-89, ADR 0240) : le patron d'une entreprise invite un membre de son
// équipe (chef d'équipe ou ouvrier) ou le retire. Même déroulé que staff-invite (ADR 0210) : la clé
// serveur crée le compte et pose le rôle 'artisan' (app_metadata, règle 7, jamais obtenu par
// l'inscription), puis l'invitation est enregistrée au nom du patron (artisan_record_team_invite :
// patron d'une entreprise validée, place libre dans la formule, une seule entreprise par personne,
// journal d'audit). Supabase envoie l'e-mail d'invitation (supabase/templates/invite.html, version
// « équipe d'un artisan ») pour choisir le mot de passe. Retrait : remove_team_member au nom du
// patron (le compte redevient particulier), puis suppression du compte s'il n'a jamais servi.
// Aucune donnée personnelle dans les journaux.
import { createClient } from "@supabase/supabase-js";
import { adminClient, json } from "../_shared/artisan.ts";
import { env } from "../_shared/env.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = ["chef", "ouvrier"] as const;
const MAX_INVITES_PER_HOUR = 10;

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
  if (!caller || caller.app_metadata?.role !== "artisan") return json({ status: "forbidden" }, 403);

  // Client au nom du patron : la base vérifie elle-même qu'il est titulaire de la fiche.
  const asPatron = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  if (body?.action === "remove") {
    const userId = typeof body.userId === "string" && UUID.test(body.userId) ? body.userId : null;
    if (!userId) return json({ status: "invalid" }, 400);
    const { data, error } = await asPatron.rpc("remove_team_member", { p_user_id: userId });
    if (error) {
      const forbidden = error.code === "42501";
      if (!forbidden && error.code !== "22023") console.error("team-members : retrait", error.code);
      return json(
        { status: forbidden ? "forbidden" : error.code === "22023" ? "not_found" : "unavailable" },
        forbidden ? 403 : error.code === "22023" ? 404 : 503,
      );
    }
    // Invitation jamais utilisée : le compte ne sert plus à rien.
    if ((data as { en_attente?: boolean } | null)?.en_attente === true) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
      if (deleteError) console.error("team-members : suppression", deleteError.status ?? "");
    }
    return json({ status: "ok" });
  }

  if (body?.action !== "invite") return json({ status: "invalid" }, 400);
  const firstName = clean(body.firstName, 100);
  const lastName = clean(body.lastName, 100);
  const email = clean(body.email, 320)?.toLowerCase() ?? null;
  const role = ROLES.find((r) => r === body.role) ?? null;
  if (!firstName || !lastName || !email || !EMAIL.test(email) || !role) {
    return json({ status: "invalid" }, 400);
  }

  // Patron et place libre, vérifiés avant de créer quoi que ce soit (la base revérifie ensuite).
  const { data: team, error: teamError } = await asPatron.rpc("my_team");
  if (teamError) {
    return teamError.code === "42501"
      ? json({ status: "forbidden" }, 403)
      : json({ status: "unavailable" }, 503);
  }
  const t = team as { entreprise?: string | null; places?: number; utilisees?: number } | null;
  if (!t || (t.places ?? 1) <= (t.utilisees ?? 1)) return json({ status: "no_seat" }, 409);

  const { data: allowed } = await admin.rpc("consume_rate_limit", {
    p_key: `team-invite:${caller.id}`,
    p_max: MAX_INVITES_PER_HOUR,
    p_window_seconds: 3600,
  });
  if (allowed !== true) return json({ status: "rate_limited" }, 429);

  // Jamais l'adresse d'un compte existant, même non confirmé : l'invitation le reprendrait.
  const { data: exists, error: existsError } = await admin.rpc("auth_email_exists", {
    p_email: email,
  });
  if (existsError) return json({ status: "unavailable" }, 503);
  if (exists === true) return json({ status: "email_taken" }, 409);

  const siteUrl = (env("SITE_URLS").split(",")[0] ?? "").trim();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    // « equipe_artisan » choisit la version du modèle d'e-mail et nomme l'entreprise : simple
    // libellé, jamais un droit (le rôle est dans app_metadata, règle 7).
    data: {
      first_name: firstName,
      last_name: lastName,
      equipe_artisan: (t.entreprise ?? "").slice(0, 120) || "votre entreprise",
    },
    redirectTo: siteUrl ? `${siteUrl}/nouveau-mot-de-passe` : undefined,
  });
  if (inviteError || !invited?.user) {
    const taken = inviteError?.status === 422 || /already/i.test(inviteError?.message ?? "");
    if (!taken) console.error("team-members : invitation", inviteError?.status ?? "");
    return json({ status: taken ? "email_taken" : "unavailable" }, taken ? 409 : 503);
  }
  const userId = invited.user.id;
  // Compte créé entre la vérification et l'invitation : on n'y touche pas.
  if (invited.user.app_metadata?.role !== "particulier" || invited.user.email_confirmed_at) {
    return json({ status: "email_taken" }, 409);
  }

  const { error: roleError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: "artisan" },
  });
  const { error: recordError } = roleError
    ? { error: roleError }
    : await asPatron.rpc("artisan_record_team_invite", { p_user_id: userId, p_role: role });
  if (roleError || recordError) {
    // Pas de compte à moitié créé : l'invitation est retirée.
    const code = recordError && "code" in recordError ? recordError.code : "role";
    console.error("team-members : enregistrement", code);
    await admin.auth.admin.deleteUser(userId);
    return code === "22023"
      ? json({ status: "no_seat" }, 409)
      : json({ status: "unavailable" }, 503);
  }
  return json({ status: "ok" });
});
