import {
  LAUNCH_CATEGORIES,
  LAUNCH_LIMITS,
  LAUNCH_MEMBER_KINDS,
  LAUNCH_MEMBER_REF_PATTERN,
  LAUNCH_PHASES,
  LAUNCH_TASK_REF_PATTERN,
  LAUNCH_TASK_STATUSES,
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

/**
 * Plan de lancement importé par un admin (F-66, ADR 0208), depuis un fichier gardé hors du dépôt
 * public : version 1, 50 membres et 2 000 tâches au plus, références uniques, dates réelles entre
 * 2020 et 2040, échéance ou rendez-vous régulier, début au plus tard à l'échéance, membre présent
 * dans le fichier (ou aucun : tâche de toute l'équipe). Champs inconnus retirés ; la base refait
 * les contrôles ligne par ligne.
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
  });
export type LaunchPlanFileInput = z.input<typeof launchPlanFileSchema>;
export type LaunchPlanFile = z.output<typeof launchPlanFileSchema>;
export type LaunchPlanMember = LaunchPlanFile["members"][number];
export type LaunchPlanTask = LaunchPlanFile["tasks"][number];

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
