import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  acquisitionCodeFormSchema,
  launchMemberFormSchema,
  launchPlanFileSchema,
  launchSettingsFormSchema,
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

// Réglages et cibles FICTIFS et neutres : les vraies cibles sont importées depuis le fichier gardé
// hors du dépôt public (ADR 0209).
describe("fichier d'import : réglages et cibles des chiffres (F-66, lot 2)", () => {
  const cibles = [
    { indicateur: "valides_cumul", jour: "2026-11-02", valeur: 4 },
    { indicateur: "valides_cumul", member: "membre-a", jour: "2026-11-02", valeur: 1 },
    { indicateur: "dossiers_48h_pct", member: null, jour: null, valeur: 50 },
    { indicateur: "demandes_par_artisan", jour: "2026-12-31", valeur: 1.5 },
  ];

  it("facultatifs : sans « reglages » ni « cibles », rien n'est ajouté", () => {
    const parsed = launchPlanFileSchema.parse(plan);
    expect(parsed).not.toHaveProperty("reglages");
    expect(parsed).not.toHaveProperty("cibles");
  });

  it("réglages lus, champs absents à null ; cibles lues, membre absent à null", () => {
    const parsed = launchPlanFileSchema.parse({
      ...plan,
      reglages: { debut_recrutement: "2026-11-02", seuil_couverture: 2 },
      cibles,
    });
    expect(parsed.reglages).toEqual({
      debut_recrutement: "2026-11-02",
      fin_recrutement: null,
      seuil_couverture: 2,
      seuil_fiche_complete: null,
    });
    expect(parsed.cibles).toEqual([
      { indicateur: "valides_cumul", member: null, jour: "2026-11-02", valeur: 4 },
      { indicateur: "valides_cumul", member: "membre-a", jour: "2026-11-02", valeur: 1 },
      { indicateur: "dossiers_48h_pct", member: null, jour: null, valeur: 50 },
      { indicateur: "demandes_par_artisan", member: null, jour: "2026-12-31", valeur: 1.5 },
    ]);
    expect(launchPlanFileSchema.parse({ ...plan, reglages: {}, cibles: [] })).toMatchObject({
      reglages: {
        debut_recrutement: null,
        fin_recrutement: null,
        seuil_couverture: null,
        seuil_fiche_complete: null,
      },
      cibles: [],
    });
  });

  it("réglages : objet, dates réelles dans l'ordre, seuils entiers dans leurs bornes", () => {
    const settings = (reglages: unknown) => issues({ ...plan, reglages });
    expect(settings([])).toEqual([["reglages", messages.launchSettingsItem]]);
    expect(settings("2026-11-02")).toEqual([["reglages", messages.launchSettingsItem]]);
    expect(settings({ debut_recrutement: "2026-02-30" })).toEqual([
      ["reglages.debut_recrutement", messages.dateInvalid],
    ]);
    expect(settings({ fin_recrutement: "2207-03-31" })).toEqual([
      ["reglages.fin_recrutement", messages.launchDateRange],
    ]);
    expect(settings({ debut_recrutement: "2027-04-01", fin_recrutement: "2027-03-31" })).toEqual([
      ["reglages.debut_recrutement", messages.launchRecruitmentOrder],
    ]);
    expect(settings({ debut_recrutement: "2027-03-31", fin_recrutement: "2027-03-31" })).toEqual(
      [],
    );
    for (const seuil of [0, 21, 2.5, "3"]) {
      expect(settings({ seuil_couverture: seuil })).toEqual([
        ["reglages.seuil_couverture", messages.launchCoverageThresholdInvalid],
      ]);
    }
    for (const seuil of [49, 101, 75.5, "80"]) {
      expect(settings({ seuil_fiche_complete: seuil })).toEqual([
        ["reglages.seuil_fiche_complete", messages.launchProfileThresholdInvalid],
      ]);
    }
    expect(settings({ seuil_couverture: 1, seuil_fiche_complete: 50 })).toEqual([]);
    expect(settings({ seuil_couverture: 20, seuil_fiche_complete: 100 })).toEqual([]);
  });

  it("cibles : liste, indicateur connu, date réelle ou aucune, valeur de 0 à 1 000 000", () => {
    const one = (cible: Record<string, unknown>) =>
      issues({ ...plan, cibles: [{ indicateur: "valides_cumul", valeur: 1, ...cible }] });
    expect(issues({ ...plan, cibles: {} })).toEqual([["cibles", messages.launchTargetsList]]);
    expect(issues({ ...plan, cibles: [3] })).toEqual([["cibles.0", messages.launchPlanItem]]);
    expect(one({ indicateur: "budget" })).toEqual([
      [
        "cibles.0.indicateur",
        `${messages.launchValueUnknown} valides_cumul, inscrits_cumul, valides_semaine, cases_sous_seuil, dossiers_48h_pct, fiches_completes_pct, app_installee_pct, premier_devis_perso_pct, demandes_semaine, demandes_par_artisan, reponse_72h_pct, devis_envoye_pct, abonnes_pct.`,
      ],
    ]);
    expect(one({ jour: "2026-11-31" })).toEqual([["cibles.0.jour", messages.dateInvalid]]);
    expect(one({ jour: "2019-12-28" })).toEqual([["cibles.0.jour", messages.launchDateRange]]);
    for (const valeur of [-1, 1_000_001, "4", null, Number.POSITIVE_INFINITY]) {
      expect(one({ valeur })).toEqual([["cibles.0.valeur", messages.launchTargetValueInvalid]]);
    }
    expect(one({})).toEqual([]);
    expect(one({ valeur: 0 })).toEqual([]);
    expect(one({ valeur: 1_000_000, jour: "2040-12-31" })).toEqual([]);
    // Référence mal formée : signalée en premier (c'est le message affiché).
    expect(one({ member: "Membre A" })[0]).toEqual(["cibles.0.member", messages.launchRefInvalid]);
  });

  it("cibles : membre du fichier ou aucun ; une seule par indicateur, membre et date", () => {
    expect(
      issues({ ...plan, cibles: [{ indicateur: "valides_cumul", member: "membre-z", valeur: 1 }] }),
    ).toEqual([["cibles.0.member", messages.launchMemberUnknown]]);
    expect(
      issues({
        ...plan,
        cibles: [
          ...cibles,
          { indicateur: "valides_cumul", member: null, jour: "2026-11-02", valeur: 9 },
        ],
      }),
    ).toEqual([["cibles.4", messages.launchTargetDuplicate]]);
    expect(
      issues({
        ...plan,
        cibles: [
          { indicateur: "abonnes_pct", valeur: 10 },
          { indicateur: "abonnes_pct", jour: null, member: null, valeur: 20 },
        ],
      }),
    ).toEqual([["cibles.1", messages.launchTargetDuplicate]]);
    // Même indicateur et même date pour l'équipe et pour un membre : deux cibles distinctes.
    expect(issues({ ...plan, cibles: cibles.slice(0, 2) })).toEqual([]);
  });

  it("2 000 cibles au plus", () => {
    const many = Array.from({ length: 2001 }, (_, i) => ({
      indicateur: "valides_cumul",
      jour: new Date(Date.UTC(2027, 0, 1 + i)).toISOString().slice(0, 10),
      valeur: i,
    }));
    expect(issues({ ...plan, cibles: many })).toEqual([
      ["cibles", messages.launchPlanTooManyTargets],
    ]);
    expect(launchPlanFileSchema.safeParse({ ...plan, cibles: many.slice(0, 2000) }).success).toBe(
      true,
    );
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

describe("formulaire d'un code de suivi (F-66, lot 2)", () => {
  const codeForm = {
    code: "  Essai-Flyer ",
    libelle: " Flyer d'essai ",
    canal: "flyer",
    member_id: "",
  };
  const errors = (form: Record<string, unknown>) => {
    const result = acquisitionCodeFormSchema.safeParse(form);
    return result.success ? {} : z.flattenError(result.error).fieldErrors;
  };

  it("création : code en minuscules sans espaces autour, actif sans case à cocher", () => {
    expect(acquisitionCodeFormSchema.parse(codeForm)).toEqual({
      id: null,
      code: "essai-flyer",
      libelle: "Flyer d'essai",
      canal: "flyer",
      member_id: null,
      active: true,
    });
    expect(
      acquisitionCodeFormSchema.parse({
        ...codeForm,
        member_id: "b6520000-0000-4000-8000-000000000003",
        active: "on",
      }),
    ).toMatchObject({ member_id: "b6520000-0000-4000-8000-000000000003", active: true });
    expect(acquisitionCodeFormSchema.parse({ ...codeForm, active: "" }).active).toBe(true);
    expect(acquisitionCodeFormSchema.parse({ ...codeForm, active: "false" }).active).toBe(false);
  });

  it("création : code obligatoire, au format des liens /p/<code>", () => {
    expect(errors({ ...codeForm, code: "" })).toEqual({ code: [messages.acquisitionCodeRequired] });
    expect(errors({ ...codeForm, code: null })).toEqual({
      code: [messages.acquisitionCodeRequired],
    });
    for (const code of ["ab", "-flyer", "flyer-", "flyer salon", "flyér", "x".repeat(33)]) {
      expect(errors({ ...codeForm, code })).toEqual({ code: [messages.acquisitionCodeInvalid] });
    }
    expect(acquisitionCodeFormSchema.parse({ ...codeForm, code: "abc" }).code).toBe("abc");
    expect(
      acquisitionCodeFormSchema.parse({ ...codeForm, code: "x".repeat(32) }).code,
    ).toHaveLength(32);
  });

  it("modification : code définitif, non contrôlé ; case décochée → désactivé", () => {
    const id = "b6540000-0000-4000-8000-000000000001";
    expect(acquisitionCodeFormSchema.parse({ ...codeForm, id, code: undefined })).toEqual({
      id,
      code: null,
      libelle: "Flyer d'essai",
      canal: "flyer",
      member_id: null,
      active: false,
    });
    expect(acquisitionCodeFormSchema.parse({ ...codeForm, id, active: "on" })).toMatchObject({
      code: "essai-flyer",
      active: true,
    });
    expect(acquisitionCodeFormSchema.parse({ ...codeForm, id, code: "mal formé" }).code).toBeNull();
  });

  it("erreurs par champ", () => {
    expect(
      errors({ id: "x", code: "", libelle: " ", canal: "affiche", member_id: "personne" }),
    ).toEqual({
      id: [messages.acquisitionCodeUnknown],
      libelle: [messages.acquisitionLabelRequired],
      canal: [messages.required],
      member_id: [messages.launchMemberInvalid],
    });
    expect(errors({ ...codeForm, libelle: "x".repeat(81) })).toEqual({
      libelle: [messages.tooLong],
    });
    expect(errors({ ...codeForm, code: "", libelle: "" })).toEqual({
      code: [messages.acquisitionCodeRequired],
      libelle: [messages.acquisitionLabelRequired],
    });
    // Canal ou identifiant illisibles : le code est vérifié une fois ces champs corrigés.
    expect(errors({ ...codeForm, code: "", canal: "" })).toEqual({ canal: [messages.required] });
  });
});

describe("formulaire des réglages des chiffres (F-66, lot 2)", () => {
  const settingsForm = {
    debut_recrutement: "",
    fin_recrutement: "",
    seuil_couverture: "",
    seuil_fiche_complete: "",
  };
  const errors = (form: Record<string, unknown>) => {
    const result = launchSettingsFormSchema.safeParse(form);
    return result.success ? {} : z.flattenError(result.error).fieldErrors;
  };

  it("champs vides à null (seuils par défaut en base)", () => {
    expect(launchSettingsFormSchema.parse(settingsForm)).toEqual({
      debut_recrutement: null,
      fin_recrutement: null,
      seuil_couverture: null,
      seuil_fiche_complete: null,
    });
    expect(launchSettingsFormSchema.parse({})).toEqual({
      debut_recrutement: null,
      fin_recrutement: null,
      seuil_couverture: null,
      seuil_fiche_complete: null,
    });
  });

  it("dates et seuils saisis", () => {
    expect(
      launchSettingsFormSchema.parse({
        debut_recrutement: "2026-11-02",
        fin_recrutement: "2027-03-29",
        seuil_couverture: " 2 ",
        seuil_fiche_complete: "80",
      }),
    ).toEqual({
      debut_recrutement: "2026-11-02",
      fin_recrutement: "2027-03-29",
      seuil_couverture: 2,
      seuil_fiche_complete: 80,
    });
  });

  it("erreurs par champ", () => {
    expect(
      errors({ ...settingsForm, debut_recrutement: "2027-04-01", fin_recrutement: "2027-03-29" }),
    ).toEqual({ debut_recrutement: [messages.launchRecruitmentOrder] });
    // Seuils illisibles : l'ordre des dates est vérifié une fois ces champs corrigés.
    expect(
      errors({
        debut_recrutement: "2027-04-01",
        fin_recrutement: "2027-03-29",
        seuil_couverture: "0",
        seuil_fiche_complete: "101",
      }),
    ).toEqual({
      seuil_couverture: [messages.launchCoverageThresholdInvalid],
      seuil_fiche_complete: [messages.launchProfileThresholdInvalid],
    });
    expect(
      errors({ ...settingsForm, debut_recrutement: "2026-02-30", seuil_couverture: "2,5" }),
    ).toEqual({
      debut_recrutement: [messages.dateInvalid],
      seuil_couverture: [messages.launchCoverageThresholdInvalid],
    });
    expect(
      errors({ ...settingsForm, fin_recrutement: "0027-03-29", seuil_fiche_complete: "49" }),
    ).toEqual({
      fin_recrutement: [messages.launchDateRange],
      seuil_fiche_complete: [messages.launchProfileThresholdInvalid],
    });
    expect(errors({ ...settingsForm, seuil_couverture: "21" })).toEqual({
      seuil_couverture: [messages.launchCoverageThresholdInvalid],
    });
  });
});
