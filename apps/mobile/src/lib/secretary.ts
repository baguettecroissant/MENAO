import {
  exampleSecretary,
  parseAiAgents,
  secretaryFigures,
  voiceGauge,
  type VoiceGauge,
} from "@menao/core";
import { fr } from "@/i18n/fr";
import { examplesActive } from "./examples";
import { supabase } from "./supabase";
import { myArtisanKey } from "./team";

/**
 * Secrétaire dédiée dans l'application (F-171, ADR 0362), comme la rubrique du site (ADR 0244) :
 * appels à traiter, historique, réglages. Mêmes tables et mêmes fonctions de la base ; les droits
 * (patron et chef d'équipe) sont ceux de la base. Aucun achat ici (règle 10).
 */

export type SecretaryCall = {
  id: string;
  kind: string;
  callerName: string;
  callerPhone: string;
  city: string | null;
  reason: string;
  urgent: boolean;
  appointmentAt: string | null;
  doneAt: string | null;
  createdAt: string;
};

export type SecretarySettings = {
  displayName: string;
  canBook: boolean;
  visitMinutes: number;
  instructions: string;
};

export type Secretary =
  | { included: false }
  | {
      included: true;
      /** Nom annoncé au téléphone, sinon celui de l'entreprise. */
      name: string;
      company: string;
      gauge: VoiceGauge;
      settings: SecretarySettings;
      /** Horaires renseignés : sans eux, elle ne prend pas de rendez-vous. */
      hours: boolean;
      todo: SecretaryCall[];
      done: SecretaryCall[];
      figures: ReturnType<typeof secretaryFigures>;
    };

const COLUMNS =
  "id, kind, caller_name, caller_phone, city, reason, urgent, appointment_at, done_at, created_at";

type Row = {
  id: string;
  kind: string;
  caller_name: string;
  caller_phone: string;
  city: string | null;
  reason: string;
  urgent: boolean;
  appointment_at: string | null;
  done_at: string | null;
  created_at: string;
};

const call = (r: Row): SecretaryCall => ({
  id: r.id,
  kind: r.kind,
  callerName: r.caller_name,
  callerPhone: r.caller_phone,
  city: r.city,
  reason: r.reason,
  urgent: r.urgent,
  appointmentAt: r.kind === "rendez_vous" ? r.appointment_at : null,
  doneAt: r.done_at,
  createdAt: r.created_at,
});

/** Début du mois en cours (heure de Paris approchée par le premier jour UTC, large d'un jour). */
function monthStart(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 86_400_000).toISOString();
}

/** Secrétaire d'exemple (ADR 0364) : les mêmes appels fictifs que sur le site. */
function exampleSecretaryView(): Secretary {
  const example = exampleSecretary();
  const todo = example.todo.map(call);
  return {
    included: true,
    name: fr.proSecretary.title,
    company: "",
    gauge: example.gauge,
    settings: {
      displayName: "",
      canBook: example.settings.can_book,
      visitMinutes: example.settings.visit_minutes,
      instructions: example.settings.instructions ?? "",
    },
    hours: true,
    todo,
    done: example.done.map(call),
    figures: secretaryFigures(todo, example.month),
  };
}

export async function loadSecretary(): Promise<Secretary | null> {
  if (examplesActive()) return exampleSecretaryView();
  const { data: agentsData, error } = await supabase.rpc("my_ai_agents");
  if (error) return null;
  const agents = parseAiAgents(agentsData);
  if (!agents.agents.secretary) return { included: false };
  const artisanId = await myArtisanKey();
  const [settings, todo, done, hours, month, artisan] = await Promise.all([
    supabase
      .from("secretary_settings")
      .select("display_name, can_book, visit_minutes, instructions")
      .eq("artisan_id", artisanId)
      .maybeSingle(),
    supabase
      .from("secretary_messages")
      .select(COLUMNS)
      .eq("artisan_id", artisanId)
      .is("done_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("secretary_messages")
      .select(COLUMNS)
      .eq("artisan_id", artisanId)
      .not("done_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("artisan_hours")
      .select("id", { count: "exact", head: true })
      .eq("artisan_id", artisanId),
    supabase
      .from("secretary_messages")
      .select("kind, created_at")
      .eq("artisan_id", artisanId)
      .gte("created_at", monthStart(new Date())),
    supabase
      .from("artisans")
      .select("nom_commercial, raison_sociale")
      .eq("id", artisanId)
      .maybeSingle(),
  ]);
  if (todo.error || done.error) return null;
  const company = artisan.data?.nom_commercial ?? artisan.data?.raison_sociale ?? "";
  const displayName = settings.data?.display_name?.trim() ?? "";
  const todoCalls = (todo.data ?? []).map(call);
  return {
    included: true,
    name: displayName || company || fr.proSecretary.title,
    company,
    gauge: voiceGauge(agents),
    settings: {
      displayName,
      canBook: settings.data?.can_book ?? true,
      visitMinutes: settings.data?.visit_minutes ?? 60,
      instructions: settings.data?.instructions ?? "",
    },
    hours: (hours.count ?? 0) > 0,
    todo: todoCalls,
    done: (done.data ?? []).map(call),
    figures: secretaryFigures(todoCalls, month.data ?? []),
  };
}

/** Appels à traiter, pour « Mon profil » et l'accueil : nombre et urgents ; null hors formule. */
export async function loadSecretaryTodo(): Promise<{ count: number; urgent: number } | null> {
  if (examplesActive()) {
    const { todo } = exampleSecretary();
    return { count: todo.length, urgent: todo.filter((c) => c.urgent).length };
  }
  const { data: agentsData, error } = await supabase.rpc("my_ai_agents");
  if (error || !parseAiAgents(agentsData).agents.secretary) return null;
  const { data } = await supabase
    .from("secretary_messages")
    .select("urgent")
    .eq("artisan_id", await myArtisanKey())
    .is("done_at", null)
    .limit(100);
  const rows = data ?? [];
  return { count: rows.length, urgent: rows.filter((r) => r.urgent).length };
}

/** Appel marqué traité, ou remis à traiter. Vrai si c'est fait. */
export async function markSecretaryCall(id: string, done: boolean): Promise<boolean> {
  const { error } = await supabase.rpc("secretary_message_done", { p_id: id, p_done: done });
  return !error;
}

/** Réglages de la secrétaire. Renvoie le message d'erreur à afficher, ou null. */
export async function saveSecretarySettings(settings: SecretarySettings): Promise<string | null> {
  const { error } = await supabase.rpc("save_secretary_settings", {
    p_display_name: settings.displayName.trim(),
    p_can_book: settings.canBook,
    p_visit_minutes: settings.visitMinutes,
    p_instructions: settings.instructions.trim(),
  });
  // 22023 : refus expliqué par la base.
  return error ? (error.code === "22023" ? error.message : fr.errors.generic) : null;
}
