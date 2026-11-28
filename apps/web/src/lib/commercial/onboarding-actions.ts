"use server";

import {
  FORMATION_QUIZ_LENGTH,
  formationModulePassed,
  gradeQuiz,
  isFormationModule,
  normalizeRsacNumber,
  RSAC_GREFFE_MAX_LENGTH,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { formationModule } from "@/content/commercial/formation";
import { fr } from "@/i18n/fr";
import { text, type FormState } from "@/lib/auth/form";
import { getCommercialSpace } from "./space";

const START = "/commercial/demarrer";
const t = fr.commercialField;

/** Conseiller actif (la démo et un conseiller suspendu n'écrivent rien). */
async function activeSpace() {
  const space = await getCommercialSpace();
  return space.active && !space.demo ? space : null;
}

/** Numéro RSAC et greffe (F-194, ADR 0394). */
export async function saveRsac(_prev: FormState, formData: FormData): Promise<FormState> {
  const numero = normalizeRsacNumber(text(formData, "numero") ?? "");
  const greffe = (text(formData, "greffe") ?? "").replace(/\s+/g, " ").trim();
  const values = { numero: text(formData, "numero") ?? "", greffe };
  if (!numero) {
    return { fieldErrors: { numero: ["Numéro RSAC : entre 3 et 40 caractères."] }, values };
  }
  if (greffe.length > RSAC_GREFFE_MAX_LENGTH) {
    return { fieldErrors: { greffe: ["Greffe : 80 caractères au plus."] }, values };
  }
  const space = await activeSpace();
  if (!space) return { error: fr.commercialProspects.errors.suspended, values };
  const { error } = await space.supabase.rpc("commercial_save_rsac", {
    p_numero: numero,
    p_greffe: greffe || undefined,
  });
  if (error) return { error: error.code === "22023" ? error.message : fr.errors.generic, values };
  revalidatePath(START);
  return { success: t.start.steps.rsac.saved };
}

/** MENAO ouvert depuis l'icône de l'écran d'accueil (mode plein écran). */
export async function markHomeScreen(): Promise<void> {
  const space = await activeSpace();
  if (!space) return;
  await space.supabase.rpc("commercial_mark_home_screen");
  revalidatePath(START);
}

/** L'écran « Prêt pour le terrain » a été vu. */
export async function markBadgeSeen(): Promise<void> {
  const space = await activeSpace();
  if (!space) return;
  await space.supabase.rpc("commercial_mark_badge_seen");
  revalidatePath(START);
}

export type QuizCheck =
  { status: "ok"; correct: boolean; answer: number; explanation: string } | { status: "invalid" };

/** Correction d'une réponse, une question à la fois (rien n'est enregistré). */
export async function checkQuizAnswer(
  module: string,
  index: number,
  choice: number,
): Promise<QuizCheck> {
  const content = formationModule(module);
  const question = content?.questions[index];
  if (!question || !Number.isInteger(choice)) return { status: "invalid" };
  return {
    status: "ok",
    correct: question.answer === choice,
    answer: question.answer,
    explanation: question.explanation,
  };
}

export type QuizResult = { status: "ok"; score: number; passed: boolean } | { status: "error" };

/** Note du quiz entier, calculée ici avec les bonnes réponses, puis enregistrée. */
export async function submitQuiz(module: string, answers: number[]): Promise<QuizResult> {
  const content = formationModule(module);
  if (!content || !isFormationModule(module) || !Array.isArray(answers)) return { status: "error" };
  const keys = content.questions.slice(0, FORMATION_QUIZ_LENGTH).map((q) => q.answer);
  const score = gradeQuiz(
    answers.slice(0, keys.length).map((a) => (Number.isInteger(a) ? a : -1)),
    keys,
  );
  const space = await activeSpace();
  if (!space) return { status: "error" };
  const { error } = await space.supabase.rpc("commercial_save_formation", {
    p_module: module,
    p_score: score,
  });
  if (error) return { status: "error" };
  revalidatePath(START);
  return { status: "ok", score, passed: formationModulePassed(score) };
}

export type DocumentKind = "contrat" | "urssaf" | "rib";
const PURPOSES: Record<DocumentKind, string> = {
  contrat: "commercial_contract",
  urssaf: "commercial_urssaf",
  rib: "commercial_rib",
};

/** Pièce déposée dans « uploads » par le navigateur, vérifiée et rangée par process-upload. */
export async function storeCommercialDocument(
  kind: DocumentKind,
  path: string,
): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  const errors = t.start.upload.errors;
  if (!(kind in PURPOSES) || typeof path !== "string" || path.length > 200) {
    return { status: "error", message: errors.unavailable ?? fr.errors.generic };
  }
  const space = await activeSpace();
  if (!space) return { status: "error", message: fr.commercialProspects.errors.suspended };
  const { data, error } = await space.supabase.functions.invoke<{ status: string }>(
    "process-upload",
    { method: "POST", body: { purpose: PURPOSES[kind], path } },
  );
  let status = data?.status ?? "unavailable";
  if (error instanceof FunctionsHttpError) {
    const payload = (await error.context.json().catch(() => null)) as { status?: string } | null;
    status = payload?.status ?? "unavailable";
  } else if (error) {
    status = "unavailable";
  }
  if (status !== "ok") {
    return { status: "error", message: errors[status] ?? errors.unavailable ?? fr.errors.generic };
  }
  revalidatePath(START);
  return { status: "ok" };
}
