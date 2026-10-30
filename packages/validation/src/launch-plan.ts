import {
  ACQUISITION_CHANNELS,
  LAUNCH_CATEGORIES,
  LAUNCH_FIGURES_LIMITS,
  LAUNCH_INDICATORS,
  LAUNCH_LIMITS,
  LAUNCH_MEMBER_KINDS,
  LAUNCH_MEMBER_REF_PATTERN,
  LAUNCH_PHASES,
  LAUNCH_TASK_REF_PATTERN,
  LAUNCH_TASK_STATUSES,
  normalizePartnerCode,
} from "@menao/core";
import { z } from "zod";
import { messages } from "./messages";

/** Bornes d'un `integer` Postgres (ordre d'affichage, sans autre contrôle en base). */
const INT_MIN = -2_147_483_648;
const INT_MAX = 2_147_483_647;

const filled = (required: string, max: number) =>
  z
    .string({ error: required })
    .trim()
    .min(1, { error: required })
    .max(max, { error: messages.tooLong });

/** Texte facultatif : vide, absent ou null → null. */
const optionalText = (max: number) =>
  z
    .string({ error: messages.launchTextInvalid })
    .trim()
    .max(max, { error: messages.tooLong })
    .nullish()
    .transform((value) => value || null);

/**
 * Date AAAA-MM-JJ réelle (le 30 février est refusé), entre 2020 et 2040 comme en base (une année
 * mal tapée, 0027 ou 2207, est refusée) ; vide, absente ou null → null.
 */
const optionalDate = z
  .string({ error: messages.dateInvalid })
  .trim()
  .nullish()
  .transform((value, ctx) => {
    if (!value) return null;
    if (!z.iso.date().safeParse(value).success) {
      ctx.addIssue({ code: "custom", message: messages.dateInvalid });
      return z.NEVER;
    }
    if (value < LAUNCH_LIMITS.minDate || value > LAUNCH_LIMITS.maxDate) {
      ctx.addIssue({ code: "custom", message: messages.launchDateRange });
      return z.NEVER;
    }
    return value;
  });

/** Échéance ou rendez-vous régulier obligatoire, début au plus tard à l'échéance (comme en base). */
function checkDates(
  task: { debut: string | null; echeance: string | null; recurrence: string | null },
  ctx: z.RefinementCtx,
) {
  if (!task.echeance && !task.recurrence) {
    ctx.addIssue({ code: "custom", path: ["echeance"], message: messages.launchDateRequired });
  }
  if (task.debut && task.echeance && task.debut > task.echeance) {
    ctx.addIssue({ code: "custom", path: ["debut"], message: messages.launchDateOrder });
  }
}

/** Période de recrutement : début au plus tard à la fin (comme `admin_save_launch_settings`). */
function checkRecruitment(
  settings: { debut_recrutement: string | null; fin_recrutement: string | null },
  ctx: z.RefinementCtx,
) {
  const { debut_recrutement: debut, fin_recrutement: fin } = settings;
  if (debut && fin && debut > fin) {
    ctx.addIssue({
      code: "custom",
      path: ["debut_recrutement"],
      message: messages.launchRecruitmentOrder,
    });
  }
}

// ---------------------------------------------------------------------------
// Fichier d'import (`admin_import_launch_plan`)
// Fichier préparé à la main : chaque champ a son message en français (valeurs possibles d'une
// liste comprises), jamais le message anglais de zod.
// ---------------------------------------------------------------------------

/** Valeur d'une liste fermée, avec les valeurs possibles dans le message. */
const oneOf = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values, { error: `${messages.launchValueUnknown} ${values.join(", ")}.` });

const flag = z.boolean({ error: messages.launchBooleanInvalid });

const memberRef = z
  .string({ error: messages.launchRefInvalid })
  .regex(LAUNCH_MEMBER_REF_PATTERN, { error: messages.launchRefInvalid });

const planMemberSchema = z.object(
  {
    ref: memberRef,
    nom: filled(messages.launchNameRequired, LAUNCH_LIMITS.memberNameMaxLength),
    mission: optionalText(LAUNCH_LIMITS.missionMaxLength),
    kind: oneOf(LAUNCH_MEMBER_KINDS).optional(),
    ordre: z
      .number({ error: messages.launchOrderInvalid })
      .int()
      .min(INT_MIN)
      .max(INT_MAX)
      .optional(),
    objectif_valides: z
      .number({ error: messages.launchObjectiveInvalid })
      .int()
      .min(1)
      .max(LAUNCH_LIMITS.objectiveMax)
      .nullish(),
  },
  { error: messages.launchPlanItem },
);

const planTaskSchema = z
  .object(
    {
      ref: z
        .string({ error: messages.launchRefInvalid })
        .regex(LAUNCH_TASK_REF_PATTERN, { error: messages.launchRefInvalid }),
      member: memberRef.nullish(),
      titre: filled(messages.launchTitleRequired, LAUNCH_LIMITS.titleMaxLength),
      detail: optionalText(LAUNCH_LIMITS.detailMaxLength),
      phase: oneOf(LAUNCH_PHASES).optional(),
      categorie: oneOf(LAUNCH_CATEGORIES).optional(),
      debut: optionalDate,
      echeance: optionalDate,
      recurrence: optionalText(LAUNCH_LIMITS.recurrenceMaxLength),
      jalon: flag.optional(),
      partage: flag.optional(),
    },
    { error: messages.launchPlanItem },
  )
  .superRefine(checkDates);

/** Seuil entier du fichier, entre deux bornes ; absent ou null → null (valeur par défaut en base). */
const planThreshold = (min: number, max: number, error: string) =>
  z
    .number({ error })
    .int({ error })
    .min(min, { error })
    .max(max, { error })
    .nullish()
    .transform((value) => value ?? null);

/**
 * Réglages des chiffres (lot 2, ADR 0209) : période de recrutement (bornes de la courbe) et seuils.
 * Présents, ils remplacent les réglages en place (champ absent : null, seuils par défaut en base).
 */
const planSettingsSchema = z
  .object(
    {
      debut_recrutement: optionalDate,
      fin_recrutement: optionalDate,
      seuil_couverture: planThreshold(
        LAUNCH_FIGURES_LIMITS.coverageThresholdMin,
        LAUNCH_FIGURES_LIMITS.coverageThresholdMax,
        messages.launchCoverageThresholdInvalid,
      ),
      seuil_fiche_complete: planThreshold(
        LAUNCH_FIGURES_LIMITS.profileThresholdMin,
        LAUNCH_FIGURES_LIMITS.profileThresholdMax,
        messages.launchProfileThresholdInvalid,
      ),
    },
    { error: messages.launchSettingsItem },
  )
  .superRefine(checkRecruitment);

const targetValueError = { error: messages.launchTargetValueInvalid };

/**
 * Cible d'un indicateur (lot 2, ADR 0209) : pour toute l'équipe (sans membre) ou un membre du
 * fichier ; datée (lundi de la semaine pour une série hebdomadaire, échéance sinon) ou permanente
 * (sans date) ; valeur de 0 à 1 000 000, décimales permises (demandes par artisan).
 */
const planTargetSchema = z.object(
  {
    indicateur: oneOf(LAUNCH_INDICATORS),
    member: memberRef.nullish().transform((value) => value ?? null),
    jour: optionalDate,
    valeur: z
      .number(targetValueError)
      .min(0, targetValueError)
      .max(LAUNCH_FIGURES_LIMITS.targetValueMax, targetValueError),
  },
  { error: messages.launchPlanItem },
);

/**
 * Plan de lancement importé par un admin (F-66, ADR 0208), depuis un fichier gardé hors du dépôt
 * public : version 1, 50 membres et 2 000 tâches au plus, références uniques, dates réelles entre
 * 2020 et 2040, échéance ou rendez-vous régulier, début au plus tard à l'échéance, membre présent
 * dans le fichier (ou aucun : tâche de toute l'équipe). Lot 2 (ADR 0209), facultatifs : réglages
 * des chiffres et cibles (2 000 au plus, une seule par indicateur, membre et date, membre présent
 * dans le fichier). Clé absente : rien n'est changé en base. Champs inconnus retirés ; la base
 * refait les contrôles ligne par ligne.
 */
export const launchPlanFileSchema = z
  .object(
    {
      version: z.literal(1, { error: messages.launchPlanVersion }),
      members: z
        .array(planMemberSchema, { error: messages.launchPlanLists })
        .max(LAUNCH_LIMITS.maxMembers, { error: messages.launchPlanTooManyMembers }),
      tasks: z
        .array(planTaskSchema, { error: messages.launchPlanLists })
        .max(LAUNCH_LIMITS.maxTasks, { error: messages.launchPlanTooManyTasks }),
      reglages: planSettingsSchema.optional(),
      cibles: z
        .array(planTargetSchema, { error: messages.launchTargetsList })
        .max(LAUNCH_FIGURES_LIMITS.maxTargets, { error: messages.launchPlanTooManyTargets })
        .optional(),
    },
    { error: messages.launchPlanVersion },
  )
  .superRefine((plan, ctx) => {
    const memberRefs = new Set<string>();
    plan.members.forEach((member, i) => {
      if (memberRefs.has(member.ref)) {
        ctx.addIssue({
          code: "custom",
          path: ["members", i, "ref"],
          message: messages.launchRefDuplicate,
        });
      }
      memberRefs.add(member.ref);
    });
    const taskRefs = new Set<string>();
    plan.tasks.forEach((task, i) => {
      if (taskRefs.has(task.ref)) {
        ctx.addIssue({
          code: "custom",
          path: ["tasks", i, "ref"],
          message: messages.launchRefDuplicate,
        });
      }
      taskRefs.add(task.ref);
      if (task.member && !memberRefs.has(task.member)) {
        ctx.addIssue({
          code: "custom",
          path: ["tasks", i, "member"],
          message: messages.launchMemberUnknown,
        });
      }
    });
    // Une cible par indicateur, membre et date (contrainte unique de `launch_targets`).
    const targetKeys = new Set<string>();
    (plan.cibles ?? []).forEach((target, i) => {
      const key = [target.indicateur, target.member ?? "", target.jour ?? ""].join("|");
      if (targetKeys.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["cibles", i],
          message: messages.launchTargetDuplicate,
        });
      }
      targetKeys.add(key);
      if (target.member && !memberRefs.has(target.member)) {
        ctx.addIssue({
          code: "custom",
          path: ["cibles", i, "member"],
          message: messages.launchMemberUnknown,
        });
      }
    });
  });
export type LaunchPlanFileInput = z.input<typeof launchPlanFileSchema>;
export type LaunchPlanFile = z.output<typeof launchPlanFileSchema>;
export type LaunchPlanMember = LaunchPlanFile["members"][number];
export type LaunchPlanTask = LaunchPlanFile["tasks"][number];
export type LaunchPlanSettings = NonNullable<LaunchPlanFile["reglages"]>;
export type LaunchPlanTarget = NonNullable<LaunchPlanFile["cibles"]>[number];

// ---------------------------------------------------------------------------
// Formulaires du back-office (valeurs lues dans le FormData)
// ---------------------------------------------------------------------------

const optionalId = (error: string) =>
  z
    .string()
    .trim()
    .nullish()
    .transform((value, ctx) => {
      if (!value) return null;
      if (!z.uuid().safeParse(value).success) {
        ctx.addIssue({ code: "custom", message: error });
        return z.NEVER;
      }
      return value;
    });

/** Nombre entier saisi (texte du formulaire ou nombre) ; vide, absent ou null → null. */
const optionalInt = (min: number, max: number, error: string) =>
  z
    .union([z.string(), z.number()])
    .nullish()
    .transform((value, ctx) => {
      const text = value === null || value === undefined ? "" : String(value).trim();
      if (text === "") return null;
      const number = Number(text);
      if (!/^-?\d+$/.test(text) || number < min || number > max) {
        ctx.addIssue({ code: "custom", message: error });
        return z.NEVER;
      }
      return number;
    });

/** Case à cocher : « on » (formulaire), « true » ou true. */
const checkbox = z
  .union([z.boolean(), z.string()])
  .nullish()
  .transform((value) => value === true || value === "on" || value === "true");

/**
 * Membre de l'équipe de lancement (`admin_save_launch_member`), mêmes bornes qu'en base. Compte
 * relié, objectif et ordre facultatifs (ordre vide : l'actuel est gardé, 0 à la création). Le
 * rôle du compte (« commercial » pour un membre commercial) est contrôlé par la base.
 */
export const launchMemberFormSchema = z.object({
  nom: filled(messages.launchNameRequired, LAUNCH_LIMITS.memberNameMaxLength),
  mission: optionalText(LAUNCH_LIMITS.missionMaxLength),
  kind: z.enum(LAUNCH_MEMBER_KINDS, { error: messages.required }),
  user_id: optionalId(messages.launchAccountInvalid),
  objectif_valides: optionalInt(1, LAUNCH_LIMITS.objectiveMax, messages.launchObjectiveInvalid),
  ordre: optionalInt(INT_MIN, INT_MAX, messages.launchOrderInvalid),
});
export type LaunchMemberFormInput = z.input<typeof launchMemberFormSchema>;
export type LaunchMemberForm = z.output<typeof launchMemberFormSchema>;

/**
 * Tâche, jalon ou rendez-vous régulier (`admin_save_launch_task`), mêmes bornes qu'en base. Sans
 * membre : tâche de toute l'équipe ; « partage » : visible par tous les membres.
 */
export const launchTaskFormSchema = z
  .object({
    titre: filled(messages.launchTitleRequired, LAUNCH_LIMITS.titleMaxLength),
    member_id: optionalId(messages.launchMemberInvalid),
    detail: optionalText(LAUNCH_LIMITS.detailMaxLength),
    phase: z.enum(LAUNCH_PHASES, { error: messages.required }),
    categorie: z.enum(LAUNCH_CATEGORIES, { error: messages.required }),
    debut: optionalDate,
    echeance: optionalDate,
    recurrence: optionalText(LAUNCH_LIMITS.recurrenceMaxLength),
    jalon: checkbox,
    partage: checkbox,
    statut: z.enum(LAUNCH_TASK_STATUSES, { error: messages.required }),
  })
  .superRefine(checkDates);
export type LaunchTaskFormInput = z.input<typeof launchTaskFormSchema>;
export type LaunchTaskForm = z.output<typeof launchTaskFormSchema>;

/** Valeur d'une case à cocher, ou null quand le formulaire ne l'envoie pas (case décochée). */
const isChecked = (value: boolean | string | null | undefined): boolean | null =>
  value === null || value === undefined || value === ""
    ? null
    : value === true || value === "on" || value === "true";

/**
 * Code de suivi /p/<code> (`admin_save_acquisition_code`, lot 2, ADR 0209). Création (sans `id`) :
 * code obligatoire, en minuscules et sans espaces autour, même format que les codes partenaires et
 * commerciaux (la base vérifie qu'il n'est pas déjà pris). Modification (`id`) : le code est
 * définitif, renvoyé normalisé s'il est lisible (sinon null) sans être contrôlé. Libellé, canal et
 * membre responsable (facultatif) comme en base. Actif : case cochée ; sans case, un code se crée
 * actif, et une case décochée le désactive en modification.
 */
export const acquisitionCodeFormSchema = z
  .object({
    id: optionalId(messages.acquisitionCodeUnknown),
    code: z.string({ error: messages.acquisitionCodeInvalid }).nullish(),
    libelle: filled(messages.acquisitionLabelRequired, LAUNCH_FIGURES_LIMITS.codeLabelMaxLength),
    canal: z.enum(ACQUISITION_CHANNELS, { error: messages.required }),
    member_id: optionalId(messages.launchMemberInvalid),
    active: z.union([z.boolean(), z.string()]).nullish(),
  })
  .superRefine((form, ctx) => {
    if (form.id !== null || normalizePartnerCode(form.code) !== null) return;
    ctx.addIssue({
      code: "custom",
      path: ["code"],
      message: form.code?.trim()
        ? messages.acquisitionCodeInvalid
        : messages.acquisitionCodeRequired,
    });
  })
  .transform((form) => ({
    id: form.id,
    code: normalizePartnerCode(form.code),
    libelle: form.libelle,
    canal: form.canal,
    member_id: form.member_id,
    active: isChecked(form.active) ?? form.id === null,
  }));
export type AcquisitionCodeFormInput = z.input<typeof acquisitionCodeFormSchema>;
export type AcquisitionCodeForm = z.output<typeof acquisitionCodeFormSchema>;

/**
 * Réglages des chiffres (`admin_save_launch_settings`, lot 2, ADR 0209), remplacés en entier :
 * début et fin du recrutement (bornes de la courbe ; vides : les 12 dernières semaines), seuil de
 * couverture (1 à 20 artisans par case) et seuil d'une fiche complète (50 à 100 % de la jauge de
 * « Mon profil ») ; seuil vide → null, la base remet la valeur par défaut (3 et 100).
 */
export const launchSettingsFormSchema = z
  .object({
    debut_recrutement: optionalDate,
    fin_recrutement: optionalDate,
    seuil_couverture: optionalInt(
      LAUNCH_FIGURES_LIMITS.coverageThresholdMin,
      LAUNCH_FIGURES_LIMITS.coverageThresholdMax,
      messages.launchCoverageThresholdInvalid,
    ),
    seuil_fiche_complete: optionalInt(
      LAUNCH_FIGURES_LIMITS.profileThresholdMin,
      LAUNCH_FIGURES_LIMITS.profileThresholdMax,
      messages.launchProfileThresholdInvalid,
    ),
  })
  .superRefine(checkRecruitment);
export type LaunchSettingsFormInput = z.input<typeof launchSettingsFormSchema>;
export type LaunchSettingsForm = z.output<typeof launchSettingsFormSchema>;

// ---------------------------------------------------------------------------
// Planning d'un membre (`my_launch_plan`)
// ---------------------------------------------------------------------------

const myLaunchMemberSchema = z.object({
  id: z.string(),
  nom: z.string(),
  mission: z.string().nullable(),
  kind: z.enum(LAUNCH_MEMBER_KINDS),
});

const myLaunchTaskSchema = z.object({
  id: z.string(),
  titre: z.string(),
  detail: z.string().nullable(),
  phase: z.enum(LAUNCH_PHASES),
  categorie: z.enum(LAUNCH_CATEGORIES),
  debut: z.string().nullable(),
  echeance: z.string().nullable(),
  recurrence: z.string().nullable(),
  jalon: z.boolean(),
  partage: z.boolean(),
  statut: z.enum(LAUNCH_TASK_STATUSES),
  fait_le: z.string().nullable(),
  /** Tâche du membre (sinon : tâche partagée avec toute l'équipe, en lecture). */
  own: z.boolean(),
});
export type MyLaunchTask = z.infer<typeof myLaunchTaskSchema>;
export type MyLaunchPlan = {
  member: z.infer<typeof myLaunchMemberSchema> | null;
  tasks: MyLaunchTask[];
};

/**
 * Réponse de `my_launch_plan` : le membre (sans objectif ni compte) et ses tâches puis les tâches
 * partagées. Pas dans l'équipe ou réponse inattendue : aucun membre, aucune tâche ; lignes
 * inattendues ignorées.
 */
export function parseMyLaunchPlan(data: unknown): MyLaunchPlan {
  const parsed = z
    .object({ member: myLaunchMemberSchema.nullable(), tasks: z.array(z.unknown()) })
    .safeParse(data);
  if (!parsed.success) return { member: null, tasks: [] };
  return {
    member: parsed.data.member,
    tasks: parsed.data.tasks.flatMap((row) => {
      const task = myLaunchTaskSchema.safeParse(row);
      return task.success ? [task.data] : [];
    }),
  };
}
