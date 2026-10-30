import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  launchMemberFormSchema,
  launchPlanFileSchema,
  launchTaskFormSchema,
  parseMyLaunchPlan,
} from "../src/launch-plan";
import { messages } from "../src/messages";

// Plan FICTIF et neutre : les vraies tâches de l'équipe sont importées depuis un fichier gardé
// hors du dépôt public (ADR 0208).
const plan = {
  version: 1,
  members: [
    {
      ref: "membre-a",
      nom: "  Membre Exemple A ",
      mission: "Mission fictive",
      kind: "commercial",
      ordre: 1,
      objectif_valides: 5,
    },
    { ref: "membre-b", nom: "Membre Exemple B" },
  ],
  tasks: [
    {
      ref: "T1",
      member: "membre-a",
      titre: " Tâche fictive ",
      detail: "",
      phase: "pre_ouverture",
      categorie: "terrain",
      debut: "2026-11-02",
      echeance: "2026-11-06",
      recurrence: null,
      jalon: false,
      partage: false,
    },
    { ref: "T2", member: null, titre: "Date clé fictive", echeance: "2026-12-01", jalon: true },
    { ref: "T3.point_hebdo", titre: "Point fictif", recurrence: " Chaque lundi à 9 h " },
  ],
};

const issues = (data: unknown) => {
  const result = launchPlanFileSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => [i.path.join("."), i.message]);
};

describe("fichier d'import du plan de lancement (F-66)", () => {
  it("fichier valide : textes nettoyés, champs vides à null", () => {
    const parsed = launchPlanFileSchema.parse(plan);
    expect(parsed.members[0]).toEqual({
      ref: "membre-a",
      nom: "Membre Exemple A",
      mission: "Mission fictive",
      kind: "commercial",
      ordre: 1,
      objectif_valides: 5,
    });
    expect(parsed.members[1]).toMatchObject({ ref: "membre-b", nom: "Membre Exemple B" });
    expect(parsed.tasks[0]).toMatchObject({ titre: "Tâche fictive", detail: null });
    expect(parsed.tasks[2]).toMatchObject({ recurrence: "Chaque lundi à 9 h" });
  });

  it("version 1 seulement", () => {
    expect(issues({ ...plan, version: 2 })).toEqual([["version", messages.launchPlanVersion]]);
    expect(issues({ members: [], tasks: [] })).toHaveLength(1);
    expect(issues(null)).toEqual([["", messages.launchPlanVersion]]);
    expect(issues([])).toEqual([["", messages.launchPlanVersion]]);
  });

  it("listes des membres et des tâches obligatoires, éléments entre accolades", () => {
    expect(issues({ version: 1, tasks: [] })).toEqual([["members", messages.launchPlanLists]]);
    expect(issues({ version: 1, members: [], tasks: {} })).toEqual([
      ["tasks", messages.launchPlanLists],
    ]);
    expect(issues({ ...plan, members: ["membre-a"], tasks: [] })).toEqual([
      ["members.0", messages.launchPlanItem],
    ]);
    expect(issues({ ...plan, tasks: [3] })).toEqual([["tasks.0", messages.launchPlanItem]]);
  });

  it("messages en français pour chaque champ d'un fichier préparé à la main", () => {
    const task = (extra: Record<string, unknown>) =>
      issues({ ...plan, tasks: [{ ref: "T1", echeance: "2026-11-06", titre: "Tâche", ...extra }] });
    expect(task({ categorie: "Digital" })).toEqual([
      [
        "tasks.0.categorie",
        `${messages.launchValueUnknown} digital, terrain, reseaux, contenus, presse, ambassadeurs, produit, juridique, pilotage, equipe, validation, evenement.`,
      ],
    ]);
    expect(task({ phase: "demain" })).toEqual([
      [
        "tasks.0.phase",
        `${messages.launchValueUnknown} preparation, pre_ouverture, lancement, essais, apres.`,
      ],
    ]);
    expect(task({ jalon: "oui" })).toEqual([["tasks.0.jalon", messages.launchBooleanInvalid]]);
    expect(task({ partage: 1 })).toEqual([["tasks.0.partage", messages.launchBooleanInvalid]]);
    expect(task({ detail: 12 })).toEqual([["tasks.0.detail", messages.launchTextInvalid]]);
    expect(task({ echeance: 20261106 })).toEqual([["tasks.0.echeance", messages.dateInvalid]]);
    const member = (extra: Record<string, unknown>) =>
      issues({ ...plan, members: [{ ref: "m", nom: "Membre", ...extra }], tasks: [] });
    expect(member({ kind: "Associé" })).toEqual([
      ["members.0.kind", `${messages.launchValueUnknown} associe, commercial, validation, autre.`],
    ]);
    expect(member({ ordre: "1" })).toEqual([["members.0.ordre", messages.launchOrderInvalid]]);
    expect(member({ ordre: 1.5 })).toEqual([["members.0.ordre", messages.launchOrderInvalid]]);
    expect(member({ objectif_valides: "5" })).toEqual([
      ["members.0.objectif_valides", messages.launchObjectiveInvalid],
    ]);
    expect(member({ objectif_valides: 0 })).toEqual([
      ["members.0.objectif_valides", messages.launchObjectiveInvalid],
    ]);
  });

  it("50 membres et 2 000 tâches au plus", () => {
    const members = Array.from({ length: 51 }, (_, i) => ({ ref: `m${i}`, nom: `Membre ${i}` }));
    expect(issues({ ...plan, members, tasks: [] })).toEqual([
      ["members", messages.launchPlanTooManyMembers],
    ]);
    const tasks = Array.from({ length: 2001 }, (_, i) => ({
      ref: `t${i}`,
      titre: "Tâche fictive",
      echeance: "2026-11-06",
    }));
    expect(issues({ ...plan, members: [], tasks })).toEqual([
      ["tasks", messages.launchPlanTooManyTasks],
    ]);
    expect(launchPlanFileSchema.safeParse({ ...plan, tasks: tasks.slice(0, 2000) }).success).toBe(
      true,
    );
  });

  it("références uniques, au bon format", () => {
    expect(
      issues({ ...plan, members: [...plan.members, { ref: "membre-a", nom: "Doublon" }] }),
    ).toEqual([["members.2.ref", messages.launchRefDuplicate]]);
    expect(
      issues({
        ...plan,
        tasks: [...plan.tasks, { ref: "T2", titre: "Doublon", echeance: "2026-11-06" }],
      }),
    ).toEqual([["tasks.3.ref", messages.launchRefDuplicate]]);
    expect(issues({ ...plan, members: [{ ref: "Membre A", nom: "X" }], tasks: [] })).toEqual([
      ["members.0.ref", messages.launchRefInvalid],
    ]);
    expect(
      issues({ ...plan, tasks: [{ ref: "-t1", titre: "Tâche", echeance: "2026-11-06" }] }),
    ).toEqual([["tasks.0.ref", messages.launchRefInvalid]]);
  });

  it("membre d'une tâche : référence d'un membre du fichier, ou aucun", () => {
    expect(
      issues({
        ...plan,
        tasks: [{ ref: "T9", member: "membre-z", titre: "Tâche", echeance: "2026-11-06" }],
      }),
    ).toEqual([["tasks.0.member", messages.launchMemberUnknown]]);
  });

  it("dates réelles AAAA-MM-JJ ; échéance ou rendez-vous régulier ; début avant l'échéance", () => {
    const one = (task: Record<string, unknown>) =>
      issues({ ...plan, tasks: [{ ref: "T1", titre: "Tâche", ...task }] });
    expect(one({ echeance: "2026-02-30" })).toEqual([["tasks.0.echeance", messages.dateInvalid]]);
    expect(one({ echeance: "06/11/2026" })).toEqual([["tasks.0.echeance", messages.dateInvalid]]);
    expect(one({ echeance: "2028-02-29" })).toEqual([]);
    expect(one({})).toEqual([["tasks.0.echeance", messages.launchDateRequired]]);
    expect(one({ recurrence: "  " })).toEqual([["tasks.0.echeance", messages.launchDateRequired]]);
    expect(one({ debut: "2026-11-07", echeance: "2026-11-06" })).toEqual([
      ["tasks.0.debut", messages.launchDateOrder],
    ]);
    expect(one({ debut: "2026-11-06", echeance: "2026-11-06" })).toEqual([]);
  });

  it("dates entre 2020 et 2040 (année mal tapée refusée)", () => {
    const one = (task: Record<string, unknown>) =>
      issues({ ...plan, tasks: [{ ref: "T1", titre: "Tâche", ...task }] });
    expect(one({ echeance: "0027-01-15" })).toEqual([
      ["tasks.0.echeance", messages.launchDateRange],
    ]);
    expect(one({ echeance: "2207-01-15" })).toEqual([
      ["tasks.0.echeance", messages.launchDateRange],
    ]);
    expect(one({ debut: "2019-12-31", echeance: "2027-01-15" })).toEqual([
      ["tasks.0.debut", messages.launchDateRange],
    ]);
    expect(one({ echeance: "2020-01-01" })).toEqual([]);
    expect(one({ echeance: "2040-12-31" })).toEqual([]);
    expect(one({ echeance: "2041-01-01" })).toEqual([
      ["tasks.0.echeance", messages.launchDateRange],
    ]);
  });

  it("mêmes bornes qu'en base", () => {
    const task = (extra: Record<string, unknown>) =>
      issues({ ...plan, tasks: [{ ref: "T1", echeance: "2026-11-06", titre: "Tâche", ...extra }] });
    expect(task({ titre: " " })).toEqual([["tasks.0.titre", messages.launchTitleRequired]]);
    expect(task({ titre: "x".repeat(141) })).toEqual([["tasks.0.titre", messages.tooLong]]);
    expect(task({ detail: "x".repeat(1001) })).toEqual([["tasks.0.detail", messages.tooLong]]);
    expect(task({ recurrence: "x".repeat(81) })).toEqual([
      ["tasks.0.recurrence", messages.tooLong],
    ]);
    expect(task({ categorie: "inconnue" })).toHaveLength(1);
    expect(task({ phase: "inconnue" })).toHaveLength(1);
    const member = (extra: Record<string, unknown>) =>
      issues({ ...plan, members: [{ ref: "m", nom: "Membre", ...extra }], tasks: [] });
    expect(member({ nom: "x".repeat(81) })).toEqual([["members.0.nom", messages.tooLong]]);
    expect(member({ mission: "x".repeat(301) })).toEqual([["members.0.mission", messages.tooLong]]);
    expect(member({ objectif_valides: 0 })).toHaveLength(1);
    expect(member({ objectif_valides: 10_001 })).toHaveLength(1);
    expect(member({ objectif_valides: 2.5 })).toHaveLength(1);
    expect(member({ kind: "inconnu" })).toHaveLength(1);
  });

  it("champs inconnus retirés", () => {
    const parsed = launchPlanFileSchema.parse({
      ...plan,
      budget: 1,
      members: [{ ...plan.members[1], extra: true }],
      tasks: [],
    });
    expect(parsed).not.toHaveProperty("budget");
    expect(parsed.members[0]).not.toHaveProperty("extra");
  });
});

const memberForm = {
  nom: " Membre Exemple ",
  mission: "",
  kind: "associe",
  user_id: "",
  objectif_valides: "",
  ordre: "",
};

describe("formulaire d'un membre de l'équipe", () => {
  it("champs vides à null", () => {
    expect(launchMemberFormSchema.parse(memberForm)).toEqual({
      nom: "Membre Exemple",
      mission: null,
      kind: "associe",
      user_id: null,
      objectif_valides: null,
      ordre: null,
    });
  });

  it("compte, objectif et ordre", () => {
    expect(
      launchMemberFormSchema.parse({
        ...memberForm,
        kind: "commercial",
        user_id: "a0000000-0000-4000-8000-000000000018",
        objectif_valides: "12",
        ordre: "3",
      }),
    ).toMatchObject({
      user_id: "a0000000-0000-4000-8000-000000000018",
      objectif_valides: 12,
      ordre: 3,
    });
  });

  it("erreurs par champ", () => {
    const result = launchMemberFormSchema.safeParse({
      nom: " ",
      mission: "x".repeat(301),
      kind: "",
      user_id: "pas-un-compte",
      objectif_valides: "0",
      ordre: "1,5",
    });
    expect(result.success ? {} : z.flattenError(result.error).fieldErrors).toEqual({
      nom: [messages.launchNameRequired],
      mission: [messages.tooLong],
      kind: [messages.required],
      user_id: [messages.launchAccountInvalid],
      objectif_valides: [messages.launchObjectiveInvalid],
      ordre: [messages.launchOrderInvalid],
    });
  });
});

const taskForm = {
  titre: " Tâche fictive ",
  member_id: "",
  detail: "",
  phase: "preparation",
  categorie: "pilotage",
  debut: "",
  echeance: "2026-11-06",
  recurrence: "",
  statut: "a_faire",
};

describe("formulaire d'une tâche", () => {
  it("champs vides à null, cases non cochées à false", () => {
    expect(launchTaskFormSchema.parse(taskForm)).toEqual({
      titre: "Tâche fictive",
      member_id: null,
      detail: null,
      phase: "preparation",
      categorie: "pilotage",
      debut: null,
      echeance: "2026-11-06",
      recurrence: null,
      jalon: false,
      partage: false,
      statut: "a_faire",
    });
  });

  it("cases cochées (« on ») et membre", () => {
    expect(
      launchTaskFormSchema.parse({
        ...taskForm,
        member_id: "b6520000-0000-4000-8000-000000000001",
        jalon: "on",
        partage: true,
      }),
    ).toMatchObject({
      member_id: "b6520000-0000-4000-8000-000000000001",
      jalon: true,
      partage: true,
    });
  });

  it("rendez-vous régulier sans échéance", () => {
    expect(
      launchTaskFormSchema.parse({ ...taskForm, echeance: "", recurrence: "Chaque lundi à 9 h" }),
    ).toMatchObject({ echeance: null, recurrence: "Chaque lundi à 9 h" });
  });

  it("erreurs par champ", () => {
    const errors = (form: Record<string, unknown>) => {
      const result = launchTaskFormSchema.safeParse(form);
      return result.success ? {} : z.flattenError(result.error).fieldErrors;
    };
    expect(errors({ ...taskForm, titre: "", echeance: "", recurrence: "" })).toEqual({
      titre: [messages.launchTitleRequired],
      echeance: [messages.launchDateRequired],
    });
    expect(errors({ ...taskForm, debut: "2026-11-07" })).toEqual({
      debut: [messages.launchDateOrder],
    });
    expect(errors({ ...taskForm, echeance: "2026-13-01", member_id: "x" })).toEqual({
      echeance: [messages.dateInvalid],
      member_id: [messages.launchMemberInvalid],
    });
    expect(errors({ ...taskForm, echeance: "0027-01-15" })).toEqual({
      echeance: [messages.launchDateRange],
    });
    expect(errors({ ...taskForm, statut: "termine", categorie: "", phase: "" })).toEqual({
      statut: [messages.required],
      categorie: [messages.required],
      phase: [messages.required],
    });
    expect(errors({ ...taskForm, detail: "x".repeat(1001) })).toEqual({
      detail: [messages.tooLong],
    });
  });
});

describe("planning d'un membre (my_launch_plan)", () => {
  const row = {
    id: "b6530000-0000-4000-8000-000000000001",
    titre: "Tâche fictive",
    detail: null,
    phase: "pre_ouverture",
    categorie: "terrain",
    debut: null,
    echeance: "2026-11-01",
    recurrence: null,
    jalon: false,
    partage: false,
    statut: "a_faire",
    fait_le: null,
    own: true,
  };

  it("membre et tâches", () => {
    const member = { id: "m1", nom: "Membre Exemple", mission: null, kind: "commercial" };
    expect(parseMyLaunchPlan({ member, tasks: [row] })).toEqual({ member, tasks: [row] });
  });

  it("pas dans l'équipe ou réponse inattendue : aucun membre, aucune tâche", () => {
    expect(parseMyLaunchPlan({ member: null, tasks: [] })).toEqual({ member: null, tasks: [] });
    expect(parseMyLaunchPlan(null)).toEqual({ member: null, tasks: [] });
    expect(parseMyLaunchPlan({ member: { id: "m1" }, tasks: [row] })).toEqual({
      member: null,
      tasks: [],
    });
  });

  it("lignes inattendues ignorées", () => {
    expect(
      parseMyLaunchPlan({ member: null, tasks: [row, { ...row, statut: "inconnu" }, 3] }).tasks,
    ).toEqual([row]);
  });
});
