import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import {
  LAUNCH_CATEGORIES,
  LAUNCH_LIMITS,
  LAUNCH_MEMBER_KINDS,
  LAUNCH_MEMBER_REF_PATTERN,
  LAUNCH_PHASES,
  LAUNCH_STRIP_WEEKS,
  LAUNCH_TASK_REF_PATTERN,
  LAUNCH_TASK_STATUSES,
  daysUntil,
  initials,
  launchBoardTasks,
  launchCounts,
  launchPhaseSummary,
  launchProgress,
  launchTaskState,
  launchWeekStrip,
  launchWeeks,
  upcomingMilestones,
  type LaunchTaskLike,
} from "../src/launch-plan";

// Tâches fictives et neutres : les vraies tâches de l'équipe sont importées en base depuis un
// fichier gardé hors du dépôt (ADR 0208).
let next = 0;
function task(overrides: Partial<LaunchTaskLike> = {}): LaunchTaskLike {
  next += 1;
  return {
    id: `t${next}`,
    titre: `Tâche ${next}`,
    phase: "preparation",
    debut: null,
    echeance: "2026-11-10",
    recurrence: null,
    jalon: false,
    statut: "a_faire",
    ...overrides,
  };
}

// Jeudi 29 octobre 2026 : semaine du lundi 26 octobre au dimanche 1er novembre (à cheval sur
// deux mois).
const THURSDAY = "2026-10-29";
const SUNDAY = "2026-11-01";
const MONDAY = "2026-11-02";

describe("tableaux de lancement : listes de la base (F-66)", () => {
  it("reprend les enums de la base (types générés) et ses catégories, dans le même ordre", () => {
    expect([...LAUNCH_PHASES]).toEqual([...Constants.public.Enums.launch_phase]);
    expect([...LAUNCH_TASK_STATUSES]).toEqual([...Constants.public.Enums.launch_task_status]);
    expect([...LAUNCH_MEMBER_KINDS]).toEqual([...Constants.public.Enums.launch_member_kind]);
    // Catégories : simple contrôle `check` en base, sans enum généré.
    expect(LAUNCH_CATEGORIES).toEqual([
      "digital",
      "terrain",
      "reseaux",
      "contenus",
      "presse",
      "ambassadeurs",
      "produit",
      "juridique",
      "pilotage",
      "equipe",
      "validation",
      "evenement",
    ]);
  });

  it("mêmes bornes qu'en base", () => {
    expect(LAUNCH_LIMITS).toEqual({
      memberNameMaxLength: 80,
      missionMaxLength: 300,
      objectiveMax: 10_000,
      titleMaxLength: 140,
      detailMaxLength: 1000,
      recurrenceMaxLength: 80,
      maxMembers: 50,
      maxTasks: 2000,
      minDate: "2020-01-01",
      maxDate: "2040-12-31",
    });
  });

  it("références : membres en minuscules, tâches plus libres", () => {
    expect(LAUNCH_MEMBER_REF_PATTERN.test("equipe-terrain")).toBe(true);
    expect(LAUNCH_MEMBER_REF_PATTERN.test("a")).toBe(true);
    expect(LAUNCH_MEMBER_REF_PATTERN.test("-equipe")).toBe(false);
    expect(LAUNCH_MEMBER_REF_PATTERN.test("Equipe")).toBe(false);
    expect(LAUNCH_MEMBER_REF_PATTERN.test("a".repeat(41))).toBe(false);
    expect(LAUNCH_TASK_REF_PATTERN.test("T1.terrain_02-b")).toBe(true);
    expect(LAUNCH_TASK_REF_PATTERN.test(".t1")).toBe(false);
    expect(LAUNCH_TASK_REF_PATTERN.test("t 1")).toBe(false);
    expect(LAUNCH_TASK_REF_PATTERN.test("t".repeat(61))).toBe(false);
  });
});

describe("état d'une tâche", () => {
  it("semaine à cheval sur deux mois (aujourd'hui jeudi)", () => {
    const state = (echeance: string) => launchTaskState(task({ echeance }), THURSDAY);
    expect(state("2026-10-28")).toBe("en_retard");
    expect(state("2026-10-26")).toBe("en_retard");
    expect(state(THURSDAY)).toBe("cette_semaine");
    expect(state(SUNDAY)).toBe("cette_semaine");
    expect(state(MONDAY)).toBe("a_venir");
  });

  it("aujourd'hui dimanche : la semaine se termine le jour même", () => {
    const state = (echeance: string) => launchTaskState(task({ echeance }), SUNDAY);
    expect(state("2026-10-31")).toBe("en_retard");
    expect(state(SUNDAY)).toBe("cette_semaine");
    expect(state(MONDAY)).toBe("a_venir");
  });

  it("aujourd'hui lundi : toute la semaine qui commence", () => {
    const state = (echeance: string) => launchTaskState(task({ echeance }), MONDAY);
    expect(state(SUNDAY)).toBe("en_retard");
    expect(state(MONDAY)).toBe("cette_semaine");
    expect(state("2026-11-08")).toBe("cette_semaine");
    expect(state("2026-11-09")).toBe("a_venir");
  });

  it("semaine à cheval sur deux années", () => {
    expect(launchTaskState(task({ echeance: "2027-01-03" }), "2026-12-28")).toBe("cette_semaine");
    expect(launchTaskState(task({ echeance: "2027-01-04" }), "2026-12-31")).toBe("a_venir");
  });

  it("faite : « fait », même en retard", () => {
    expect(launchTaskState(task({ statut: "fait", echeance: "2026-10-01" }), THURSDAY)).toBe(
      "fait",
    );
    expect(launchTaskState(task({ statut: "en_cours", echeance: "2026-10-01" }), THURSDAY)).toBe(
      "en_retard",
    );
  });

  it("rendez-vous régulier : « regulier », avec ou sans échéance, même coché", () => {
    expect(
      launchTaskState(task({ echeance: null, recurrence: "Chaque lundi à 9 h" }), THURSDAY),
    ).toBe("regulier");
    expect(
      launchTaskState(
        task({ echeance: "2026-10-01", recurrence: "Chaque vendredi", statut: "fait" }),
        THURSDAY,
      ),
    ).toBe("regulier");
  });

  it("sans échéance ni rendez-vous (impossible en base) : à venir", () => {
    expect(launchTaskState(task({ echeance: null }), THURSDAY)).toBe("a_venir");
  });
});

describe("progression et compteurs", () => {
  it("aucune tâche : 0 sur 0, 0 %", () => {
    expect(launchProgress([])).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("seulement des rendez-vous réguliers : 0 %, hors progression", () => {
    expect(
      launchProgress([task({ recurrence: "Chaque lundi", statut: "fait", echeance: null })]),
    ).toEqual({ done: 0, total: 0, percent: 0 });
  });

  it("pourcentage entier arrondi ; « en cours » ne compte pas comme fait", () => {
    expect(
      launchProgress([task({ statut: "fait" }), task(), task({ statut: "en_cours" })]),
    ).toEqual({ done: 1, total: 3, percent: 33 });
    expect(
      launchProgress([task({ statut: "fait" }), task({ statut: "fait" }), task(), task()]),
    ).toEqual({ done: 2, total: 4, percent: 50 });
    expect(launchProgress([task({ statut: "fait" }), task({ statut: "fait" }), task()])).toEqual({
      done: 2,
      total: 3,
      percent: 67,
    });
  });

  it("compteurs par état, tous présents", () => {
    expect(launchCounts([], THURSDAY)).toEqual({
      fait: 0,
      en_retard: 0,
      cette_semaine: 0,
      a_venir: 0,
      regulier: 0,
    });
    expect(
      launchCounts(
        [
          task({ statut: "fait" }),
          task({ echeance: "2026-10-20" }),
          task({ echeance: "2026-10-21" }),
          task({ echeance: SUNDAY }),
          task({ echeance: MONDAY }),
          task({ echeance: null, recurrence: "Chaque lundi" }),
        ],
        THURSDAY,
      ),
    ).toEqual({ fait: 1, en_retard: 2, cette_semaine: 1, a_venir: 1, regulier: 1 });
  });
});

describe("tableau d'un membre : ce qui compte", () => {
  it("ses tâches toutes ; les tâches partagées seulement à venir ou régulières", () => {
    const tasks = [
      { ...task({ id: "mienne-retard", echeance: "2026-10-20" }), own: true },
      { ...task({ id: "mienne-faite", statut: "fait" }), own: true },
      { ...task({ id: "equipe-retard", echeance: "2026-10-20" }), own: false },
      { ...task({ id: "equipe-faite", statut: "fait", echeance: SUNDAY }), own: false },
      { ...task({ id: "equipe-semaine", echeance: SUNDAY }), own: false },
      { ...task({ id: "equipe-a-venir", echeance: MONDAY, jalon: true }), own: false },
      {
        ...task({ id: "equipe-reguliere", echeance: null, recurrence: "Chaque lundi" }),
        own: false,
      },
    ];
    expect(launchBoardTasks(tasks, THURSDAY).map((t) => t.id)).toEqual([
      "mienne-retard",
      "mienne-faite",
      "equipe-semaine",
      "equipe-a-venir",
      "equipe-reguliere",
    ]);
    // Compteurs du tableau : jamais un retard ni un « fait » qui n'est pas le sien.
    expect(launchCounts(launchBoardTasks(tasks, THURSDAY), THURSDAY)).toEqual({
      fait: 1,
      en_retard: 1,
      cette_semaine: 1,
      a_venir: 1,
      regulier: 1,
    });
  });
});

describe("semaines du planning", () => {
  it("groupées par lundi, triées, seulement les semaines qui ont des tâches", () => {
    const tasks = [
      task({ id: "b", titre: "Bêta", echeance: "2026-11-12" }),
      task({ id: "a", titre: "Alpha", echeance: "2026-11-12" }),
      task({ id: "r", titre: "Retard", echeance: "2026-10-27" }),
      task({ id: "f", titre: "Faite", echeance: "2026-10-26", statut: "fait" }),
      task({ id: "c", titre: "Courante", echeance: SUNDAY }),
      task({ id: "p", titre: "Passée", echeance: "2026-10-20", statut: "fait" }),
      task({ id: "reg", titre: "Point", echeance: null, recurrence: "Chaque lundi" }),
      task({ id: "z", titre: "Zêta", echeance: "2026-11-09" }),
    ];
    const weeks = launchWeeks(tasks, THURSDAY);
    expect(weeks.map((w) => [w.start, w.end, w.state])).toEqual([
      ["2026-10-19", "2026-10-25", "passee"],
      ["2026-10-26", "2026-11-01", "courante"],
      ["2026-11-09", "2026-11-15", "a_venir"],
    ]);
    // La semaine du 2 novembre n'a aucune tâche : absente.
    expect(weeks[1]?.tasks.map((t) => t.id)).toEqual(["f", "r", "c"]);
    expect(weeks[1]).toMatchObject({ done: 1, total: 3, late: 1 });
    // Même échéance : par titre.
    expect(weeks[2]?.tasks.map((t) => t.id)).toEqual(["z", "a", "b"]);
    expect(weeks[2]).toMatchObject({ done: 0, total: 3, late: 0 });
    expect(weeks[0]).toMatchObject({ done: 1, total: 1, late: 0 });
  });

  it("garde les champs en plus des tâches", () => {
    const weeks = launchWeeks([{ ...task(), owner: "Membre fictif" }], THURSDAY);
    expect(weeks[0]?.tasks[0]?.owner).toBe("Membre fictif");
  });

  it("aucune tâche datée : aucune semaine", () => {
    expect(launchWeeks([], THURSDAY)).toEqual([]);
    expect(launchWeeks([task({ echeance: null, recurrence: "Chaque lundi" })], THURSDAY)).toEqual(
      [],
    );
  });

  it("frise continue : semaines vides comprises, semaine du jour repérée", () => {
    const strip = launchWeekStrip(
      [
        task({ echeance: "2026-10-20", statut: "fait" }),
        task({ echeance: "2026-10-27" }),
        task({ echeance: "2026-11-12" }),
        task({ echeance: null, recurrence: "Chaque lundi" }),
      ],
      THURSDAY,
    );
    expect(strip).toEqual([
      { start: "2026-10-19", total: 1, done: 1, late: 0, current: false },
      { start: "2026-10-26", total: 1, done: 0, late: 1, current: true },
      { start: "2026-11-02", total: 0, done: 0, late: 0, current: false },
      { start: "2026-11-09", total: 1, done: 0, late: 0, current: false },
    ]);
  });

  it("frise : semaine du jour hors de l'intervalle, non ajoutée", () => {
    const strip = launchWeekStrip(
      [task({ echeance: "2026-12-30" }), task({ echeance: "2027-01-05" })],
      THURSDAY,
    );
    expect(strip.map((w) => w.start)).toEqual(["2026-12-28", "2027-01-04"]);
    expect(strip.some((w) => w.current)).toBe(false);
    expect(launchWeekStrip([], THURSDAY)).toEqual([]);
  });

  it("frise de six mois au plus, la semaine du jour à l'écran (4 semaines avant)", () => {
    expect(LAUNCH_STRIP_WEEKS).toEqual({ max: 26, before: 4 });
    // Planning du 2 novembre 2026 au 26 avril 2027 (26 semaines), nous sommes le 15 février.
    const plan = [task({ echeance: "2026-11-02" }), task({ echeance: "2027-04-26" })];
    const strip = launchWeekStrip(plan, "2027-02-15");
    expect(strip).toHaveLength(15);
    expect(strip[0]?.start).toBe("2027-01-18");
    expect(strip[4]).toMatchObject({ start: "2027-02-15", current: true });
    expect(strip[strip.length - 1]?.start).toBe("2027-04-26");
    // Avant le début du planning : depuis la première semaine, 26 au plus.
    const long = [task({ echeance: "2026-11-02" }), task({ echeance: "2027-10-25" })];
    const early = launchWeekStrip(long, "2026-10-01");
    expect(early).toHaveLength(26);
    expect(early[0]?.start).toBe("2026-11-02");
    expect(early[25]?.start).toBe("2027-04-26");
    // Planning terminé : ses dernières semaines.
    const after = launchWeekStrip(long, "2027-12-01");
    expect(after.map((w) => w.start)).toEqual([
      "2027-09-27",
      "2027-10-04",
      "2027-10-11",
      "2027-10-18",
      "2027-10-25",
    ]);
    expect(after.some((w) => w.current)).toBe(false);
  });

  it("frise : une échéance lointaine (année mal tapée) ne l'étire pas", () => {
    const strip = launchWeekStrip(
      [task({ echeance: "2026-10-27" }), task({ echeance: "2072-01-08" })],
      THURSDAY,
    );
    expect(strip).toHaveLength(26);
    expect(strip[0]).toMatchObject({ start: "2026-10-26", current: true });
  });
});

describe("jalons et compte à rebours", () => {
  it("jours calendaires, négatif si passé, changement d'heure et année bissextile", () => {
    expect(daysUntil(SUNDAY, THURSDAY)).toBe(3);
    expect(daysUntil(THURSDAY, THURSDAY)).toBe(0);
    expect(daysUntil("2026-10-27", THURSDAY)).toBe(-2);
    // Passage à l'heure d'hiver le 25 octobre 2026.
    expect(daysUntil("2026-10-26", "2026-10-24")).toBe(2);
    expect(daysUntil("2028-03-01", "2028-02-28")).toBe(2);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
  });

  it("jalons non faits à partir d'aujourd'hui, triés, 3 par défaut", () => {
    const tasks = [
      task({ id: "j4", titre: "Jalon D", jalon: true, echeance: "2026-12-15" }),
      task({ id: "j1", titre: "Jalon A", jalon: true, echeance: THURSDAY }),
      task({ id: "j3", titre: "Jalon C", jalon: true, echeance: "2026-11-28" }),
      task({ id: "j2", titre: "Jalon B", jalon: true, echeance: "2026-11-28" }),
      task({ id: "passe", jalon: true, echeance: "2026-10-28" }),
      task({ id: "fait", jalon: true, echeance: "2026-11-05", statut: "fait" }),
      task({ id: "simple", echeance: "2026-11-01" }),
    ];
    expect(upcomingMilestones(tasks, THURSDAY)).toEqual([
      { id: "j1", titre: "Jalon A", echeance: THURSDAY, daysLeft: 0 },
      { id: "j2", titre: "Jalon B", echeance: "2026-11-28", daysLeft: 30 },
      { id: "j3", titre: "Jalon C", echeance: "2026-11-28", daysLeft: 30 },
    ]);
    expect(upcomingMilestones(tasks, THURSDAY, 10).map((m) => m.id)).toEqual([
      "j1",
      "j2",
      "j3",
      "j4",
    ]);
    expect(upcomingMilestones([], THURSDAY)).toEqual([]);
  });
});

describe("phases du lancement", () => {
  it("les 5 phases dans l'ordre, phases vides comprises", () => {
    const summary = launchPhaseSummary([], THURSDAY);
    expect(summary.map((p) => p.phase)).toEqual([...LAUNCH_PHASES]);
    expect(summary[0]).toEqual({
      phase: "preparation",
      start: null,
      end: null,
      done: 0,
      total: 0,
      percent: 0,
      current: false,
    });
  });

  it("début (début ou échéance), fin (dernière échéance), avancement et phase en cours", () => {
    const summary = launchPhaseSummary(
      [
        task({ phase: "preparation", debut: "2026-10-01", echeance: "2026-10-15", statut: "fait" }),
        task({ phase: "preparation", echeance: "2026-10-20", statut: "fait" }),
        task({ phase: "pre_ouverture", echeance: "2026-10-25", statut: "fait" }),
        task({ phase: "pre_ouverture", debut: "2026-10-22", echeance: "2026-11-30" }),
        task({ phase: "pre_ouverture", echeance: "2026-11-10" }),
        task({
          phase: "pre_ouverture",
          echeance: null,
          recurrence: "Chaque lundi",
          statut: "fait",
        }),
        task({ phase: "lancement", echeance: "2027-01-10" }),
      ],
      THURSDAY,
    );
    expect(summary).toEqual([
      {
        phase: "preparation",
        start: "2026-10-01",
        end: "2026-10-20",
        done: 2,
        total: 2,
        percent: 100,
        current: false,
      },
      {
        phase: "pre_ouverture",
        start: "2026-10-22",
        end: "2026-11-30",
        done: 1,
        total: 3,
        percent: 33,
        current: true,
      },
      {
        phase: "lancement",
        start: "2027-01-10",
        end: "2027-01-10",
        done: 0,
        total: 1,
        percent: 0,
        current: false,
      },
      {
        phase: "essais",
        start: null,
        end: null,
        done: 0,
        total: 0,
        percent: 0,
        current: false,
      },
      {
        phase: "apres",
        start: null,
        end: null,
        done: 0,
        total: 0,
        percent: 0,
        current: false,
      },
    ]);
  });

  it("phases qui se chevauchent : une seule en cours, la dernière commencée", () => {
    const tasks = [
      task({ phase: "preparation", debut: "2026-10-01", echeance: "2026-12-15" }),
      task({ phase: "pre_ouverture", debut: "2026-12-01", echeance: "2027-01-31" }),
    ];
    const current = (today: string) =>
      launchPhaseSummary(tasks, today)
        .filter((p) => p.current)
        .map((p) => p.phase);
    expect(current("2026-11-15")).toEqual(["preparation"]);
    expect(current("2026-12-05")).toEqual(["pre_ouverture"]);
    expect(current("2027-01-10")).toEqual(["pre_ouverture"]);
    expect(current("2027-02-10")).toEqual([]);
  });

  it("phase en cours : bornes incluses", () => {
    const tasks = [task({ phase: "essais", debut: "2026-11-01", echeance: "2026-11-30" })];
    const current = (today: string) =>
      launchPhaseSummary(tasks, today).find((p) => p.phase === "essais")?.current;
    expect(current("2026-10-31")).toBe(false);
    expect(current("2026-11-01")).toBe(true);
    expect(current("2026-11-30")).toBe(true);
    expect(current("2026-12-01")).toBe(false);
  });
});

describe("initiales (pastilles des membres)", () => {
  it("prénom et nom, ou un seul mot", () => {
    expect(initials("Rémi Commercial")).toBe("RC");
    expect(initials("Léa")).toBe("L");
    expect(initials("  membre   exemple ")).toBe("ME");
  });

  it("accents, tirets et particules : première lettre du premier et du dernier mot", () => {
    expect(initials("élodie exemple")).toBe("ÉE");
    expect(initials("Jean-Marc Fictif")).toBe("JF");
    expect(initials("Anne-Lise")).toBe("AL");
    expect(initials("Paul de la Fontaine")).toBe("PF");
    expect(initials("Équipe d'exemple")).toBe("ÉD");
    expect(initials("Les associés")).toBe("LA");
  });

  it("deux lettres au plus, vide sans lettre", () => {
    expect(initials("Alpha Bêta Gamma Delta")).toHaveLength(2);
    expect(initials("")).toBe("");
    expect(initials(" - ")).toBe("");
  });
});
