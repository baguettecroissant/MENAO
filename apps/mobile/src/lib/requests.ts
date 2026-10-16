import { joinNames, remainingSlots, roleFromAppMetadata } from "@menao/core";
import {
  parseArtisanProfile,
  requestFormSchema,
  type ArtisanProfile,
  type SignIn,
  type SignUp,
} from "@menao/validation";
import { fr } from "@/i18n/fr";
import { signIn, signUpParticulier } from "./auth";
import { requestConfirmUrl } from "./env";
import { kv } from "./kv";
import { matchArtisans, publicUrl, type MatchedArtisan } from "./project";
import { supabase } from "./supabase";

/** Demande commencée sans compte : reprise à la prochaine connexion dans l'application. */
const PENDING_KEY = "menao.demande-en-attente";
type Pending = { projectId: string; artisanIds: string[]; token: string };

/** Message d'une erreur SQL : ceux des règles métier (code 22023) sont rédigés pour l'utilisateur. */
function sqlError(error: { code?: string; message: string }): string {
  return error.code === "22023" ? error.message : fr.errors.generic;
}

export type ProjectRequests = { requested: Set<string>; slots: number; pendingNames: string[] };

/** Demandes déjà envoyées pour ce projet et places restantes (3 artisans au plus, F-11). */
export async function loadProjectRequests(projectId: string): Promise<ProjectRequests> {
  const { data } = await supabase.rpc("particulier_requests");
  const rows = (data ?? []).filter((r) => r.project_id === projectId);
  return {
    requested: new Set(rows.map((r) => r.artisan_id)),
    slots: remainingSlots(rows.map((r) => r.status)),
    pendingNames: rows
      .filter((r) => r.status === "envoyee" || r.status === "acceptee")
      .map((r) => r.artisan_name),
  };
}

export type PublicReview = {
  id: string;
  author: string;
  createdAt: string;
  experienceOn: string | null;
  score: number;
  comment: string;
  reply: string | null;
};

export type ArtisanPage = {
  profile: ArtisanProfile;
  avatarUrl: string | null;
  photoUrls: string[];
  reviews: PublicReview[];
};

/** Fiche publique d'un artisan et ses derniers avis publiés (F-10, F-28). */
export async function loadArtisanPage(artisanId: string): Promise<ArtisanPage | null> {
  const [{ data }, { data: reviews }] = await Promise.all([
    supabase.rpc("artisan_public_profile", { p_artisan_id: artisanId }),
    supabase.rpc("artisan_public_reviews", { p_artisan_id: artisanId, p_limit: 20 }),
  ]);
  const profile = parseArtisanProfile(data);
  if (!profile) return null;
  return {
    profile,
    avatarUrl: profile.avatar_path ? publicUrl("avatars", profile.avatar_path) : null,
    photoUrls: profile.photos.map((path) => publicUrl("portfolio", path)),
    reviews: (reviews ?? []).map((row) => ({
      id: row.review_id,
      author: row.author_name,
      createdAt: row.created_at,
      experienceOn: row.experience_on,
      score: row.score,
      comment: row.comment,
      reply: row.reply,
    })),
  };
}

export type SendContext = {
  artisans: MatchedArtisan[];
  names: string;
  email: string;
  phone: string;
};

/**
 * Artisans choisis encore joignables pour ce projet (proposés par la base et pas encore
 * sollicités), avec les coordonnées du compte. Null si aucun ne reste.
 */
export async function loadSendContext(
  projectId: string,
  artisanIds: string[],
): Promise<SendContext | null> {
  const [{ data: session }, matches, { data: sent }] = await Promise.all([
    supabase.auth.getSession(),
    matchArtisans(projectId, 20),
    supabase.from("requests").select("artisan_id").eq("project_id", projectId),
  ]);
  const already = new Set((sent ?? []).map((r) => r.artisan_id));
  const artisans = (matches ?? []).filter((m) => artisanIds.includes(m.id) && !already.has(m.id));
  const user = session.session?.user;
  if (!artisans.length || !user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("phone")
    .eq("user_id", user.id)
    .maybeSingle();
  return {
    artisans,
    names: joinNames(artisans.map((a) => a.name)),
    email: user.email ?? "",
    phone: profile?.phone ?? "",
  };
}

/** Jeton qui rattachera le projet de la session anonyme au compte (ADR 0012). */
async function createTransfer(projectId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("create_project_transfer", {
    p_project_id: projectId,
  });
  return error || !data ? null : data;
}

/**
 * Inscription au moment de la demande (F-08), comme sur le site : jeton de transfert, puis
 * inscription. Le lien de confirmation ouvre la page d'envoi du site ; la demande reste aussi
 * en attente ici, reprise à la connexion. Renvoie le message d'erreur, ou null.
 */
export async function signUpForRequest(
  projectId: string,
  artisanIds: string[],
  input: SignUp,
): Promise<string | null> {
  const token = await createTransfer(projectId);
  if (!token) return fr.request.transferError;
  const error = await signUpParticulier(input, requestConfirmUrl(projectId, artisanIds, token));
  if (error) return error;
  const pending: Pending = { projectId, artisanIds, token };
  await kv.set(PENDING_KEY, JSON.stringify(pending));
  return null;
}

/**
 * « Continuer avec Google / Apple » au moment de la demande (ADR 0108) : comme pour l'inscription
 * par e-mail, le jeton de transfert est gardé ; la demande est reprise après la connexion (et la
 * finalisation d'un nouveau compte) par resumePendingRequest. Renvoie le message d'erreur, ou null.
 */
export async function prepareProviderSignIn(
  projectId: string,
  artisanIds: string[],
): Promise<string | null> {
  const token = await createTransfer(projectId);
  if (!token) return fr.request.transferError;
  const pending: Pending = { projectId, artisanIds, token };
  await kv.set(PENDING_KEY, JSON.stringify(pending));
  return null;
}

/**
 * Connexion au moment de la demande : le projet de la session anonyme est rattaché au compte
 * (jeton créé avant la connexion, puis `claim_project`). Renvoie le message d'erreur, ou null.
 */
export async function signInForRequest(projectId: string, input: SignIn): Promise<string | null> {
  const pending = await readPending();
  const token = pending?.projectId === projectId ? pending.token : await createTransfer(projectId);
  if (!token) return fr.request.transferError;
  const { error, user } = await signIn(input);
  if (error || !user) return error ?? fr.errors.generic;
  if (roleFromAppMetadata(user.app_metadata) !== "particulier") return fr.request.notParticulier;
  await kv.remove(PENDING_KEY);
  const { error: claimError } = await supabase.rpc("claim_project", { p_token: token });
  // Déjà rattaché (lien de confirmation ouvert sur le site) : le projet est accessible, on continue.
  if (claimError) {
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (!project) return fr.request.transferError;
  }
  return null;
}

async function readPending(): Promise<Pending | null> {
  const raw = await kv.get(PENDING_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Pending;
    return value.projectId && value.token && Array.isArray(value.artisanIds) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Après une connexion depuis l'onglet Compte : une demande commencée sans compte est reprise
 * (projet rattaché au compte). Renvoie le projet et les artisans, ou null.
 */
export async function resumePendingRequest(): Promise<Omit<Pending, "token"> | null> {
  const pending = await readPending();
  if (!pending) return null;
  await kv.remove(PENDING_KEY);
  await supabase.rpc("claim_project", { p_token: pending.token });
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", pending.projectId)
    .maybeSingle();
  return project ? { projectId: pending.projectId, artisanIds: pending.artisanIds } : null;
}

export type RequestValues = {
  message: string;
  phone: string;
  callbackMode: "des_que_possible" | "plage";
  callbackFrom: string;
  callbackTo: string;
};

export type SendOutcome =
  | { ok: true; callbackFrom: string | null; callbackTo: string | null }
  | { ok: false; fieldErrors?: Partial<Record<keyof RequestValues, string>>; error?: string };

/** Envoi aux artisans choisis (F-11) : règles et éligibilité vérifiées en base. */
export async function sendRequests(
  projectId: string,
  artisanIds: string[],
  values: RequestValues,
): Promise<SendOutcome> {
  const parsed = requestFormSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof RequestValues, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof RequestValues | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }
  const r = parsed.data;
  const { error } = await supabase.rpc("send_project_requests", {
    p_project_id: projectId,
    p_artisan_ids: artisanIds,
    p_message: r.message,
    p_phone: r.phone,
    p_callback_mode: r.callbackMode,
    // Les types générés ne marquent pas ces paramètres comme pouvant être nuls.
    p_callback_from: r.callbackFrom as string,
    p_callback_to: r.callbackTo as string,
  });
  if (error) return { ok: false, error: sqlError(error) };
  return { ok: true, callbackFrom: r.callbackFrom, callbackTo: r.callbackTo };
}
