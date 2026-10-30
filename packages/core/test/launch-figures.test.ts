import { Constants } from "@menao/db";
import { describe, expect, it } from "vitest";
import {
  ACQUISITION_CHANNELS,
  FUNNEL_STEPS,
  LAUNCH_CHANNELS,
  LAUNCH_FIGURES_LIMITS,
  LAUNCH_INDICATORS,
  WEEKLY_INDICATORS,
  axisLabelColumns,
  channelBreakdown,
  coverageGrid,
  currentWeekGap,
  curveGeometry,
  funnelSteps,
  indicatorSense,
  indicatorTarget,
  launchIndicatorValues,
  memberProgress,
  niceTicks,
  percentOf,
  targetFor,
  targetStatus,
  teamProgress,
  weekBars,
  weekTarget,
  type LaunchChannelRow,
  type LaunchCoverage,
  type LaunchFigures,
  type LaunchTarget,
  type LaunchTotals,
  type LaunchWeek,
} from "../src/launch-figures";

// Chiffres et cibles FICTIFS et neutres : les vraies cibles de l'équipe sont importées en base
// depuis un fichier gardé hors du dépôt public (ADR 0209).
const target = (
  indicateur: LaunchTarget["indicateur"],
  jour: string | null,
  valeur: number,
  member_id: string | null = null,
): LaunchTarget => ({ indicateur, member_id, jour, valeur });

const week = (semaine: string, valides_cumul: number, valides = 0): LaunchWeek => ({
  semaine,
  inscrits: 0,
  valides,
  inscrits_cumul: valides_cumul,
  valides_cumul,
});

// Jeudi 19 novembre 2026 : semaine du lundi 16 novembre.
const TODAY = "2026-11-19";
const MEMBER = "b6520000-0000-4000-8000-000000000001";

describe("chiffres du lancement : listes de la base (F-66, lot 2)", () => {
  it("indicateurs : même liste et même ordre que le contrôle de `launch_targets`", () => {
    expect(LAUNCH_INDICATORS).toEqual([
      "valides_cumul",
      "inscrits_cumul",
      "valides_semaine",
      "cases_sous_seuil",
      "dossiers_48h_pct",
      "fiches_completes_pct",
      "app_installee_pct",
      "premier_devis_perso_pct",
      "demandes_semaine",
      "demandes_par_artisan",
      "reponse_72h_pct",
      "devis_envoye_pct",
      "abonnes_pct",
    ]);
  });

  it("canaux : enum `acquisition_channel`, puis tous les canaux d'arrivée dans l'ordre", () => {
    expect(ACQUISITION_CHANNELS).toEqual([
      "terrain",
      "meta",
      "google",
      "flyer",
      "salon",
      "presse",
      "radio",
      "autre",
    ]);
    expect([...ACQUISITION_CHANNELS]).toEqual([...Constants.public.Enums.acquisition_channel]);
    expect(LAUNCH_CHANNELS).toEqual([
      "commercial",
      "partenaire",
      "terrain",
      "meta",
      "google",
      "flyer",
      "salon",
      "presse",
      "radio",
      "autre",
      "parrainage",
      "invitation",
      "direct",
    ]);
    expect(new Set(LAUNCH_CHANNELS).size).toBe(LAUNCH_CHANNELS.length);
  });

  it("mêmes bornes qu'en base", () => {
    expect(LAUNCH_FIGURES_LIMITS).toEqual({
      codeLabelMaxLength: 80,
      targetValueMax: 1_000_000,
      maxTargets: 2000,
      coverageThresholdMin: 1,
      coverageThresholdMax: 20,
      coverageThresholdDefault: 3,
      profileThresholdMin: 50,
      profileThresholdMax: 100,
      profileThresholdDefault: 100,
    });
  });

  it("seules les cases sous le seuil se lisent « moins vaut mieux »", () => {
    expect(indicatorSense("cases_sous_seuil")).toBe("lower");
    expect(LAUNCH_INDICATORS.filter((i) => indicatorSense(i) === "lower")).toEqual([
      "cases_sous_seuil",
    ]);
  });
});

describe("cible d'un indicateur", () => {
  it("aucune cible : null", () => {
    expect(targetFor([], "valides_cumul")).toBeNull();
    expect(targetFor([], "valides_cumul", { jour: TODAY })).toBeNull();
    // Cibles d'un autre indicateur ou d'un membre : ignorées pour l'équipe.
    const others = [target("inscrits_cumul", null, 9), target("valides_cumul", null, 4, MEMBER)];
    expect(targetFor(others, "valides_cumul")).toBeNull();
  });

  it("cible permanente seule : avec ou sans jour", () => {
    const targets = [target("dossiers_48h_pct", null, 90)];
    expect(targetFor(targets, "dossiers_48h_pct")).toBe(90);
    expect(targetFor(targets, "dossiers_48h_pct", { jour: TODAY })).toBe(90);
  });

  it("série hebdomadaire : cible de ce jour exact, sinon la prochaine, sinon la dernière", () => {
    const targets = [
      target("valides_cumul", "2026-11-23", 20),
      target("valides_cumul", "2026-11-09", 8),
      target("valides_cumul", "2026-11-16", 14),
    ];
    expect(targetFor(targets, "valides_cumul", { jour: "2026-11-16" })).toBe(14);
    expect(targetFor(targets, "valides_cumul", { jour: "2026-11-17" })).toBe(20);
    expect(targetFor(targets, "valides_cumul", { jour: "2026-10-01" })).toBe(8);
    expect(targetFor(targets, "valides_cumul", { jour: "2026-12-07" })).toBe(20);
  });

  it("sans jour : la dernière cible datée (objectif final)", () => {
    const targets = [
      target("valides_cumul", "2026-11-23", 20),
      target("valides_cumul", "2026-11-09", 8),
    ];
    expect(targetFor(targets, "valides_cumul")).toBe(20);
  });

  it("cible datée avant la cible permanente ; la permanente à défaut", () => {
    const targets = [target("fiches_completes_pct", null, 50)];
    const dated = [...targets, target("fiches_completes_pct", "2026-12-31", 80)];
    expect(targetFor(dated, "fiches_completes_pct")).toBe(80);
    expect(targetFor(dated, "fiches_completes_pct", { jour: TODAY })).toBe(80);
    // Échéance passée : la dernière datée reste la cible.
    expect(targetFor(dated, "fiches_completes_pct", { jour: "2027-02-01" })).toBe(80);
    expect(targetFor(targets, "fiches_completes_pct", { jour: "2027-02-01" })).toBe(50);
  });

  it("cible d'un membre : seulement les siennes, jamais celles de l'équipe", () => {
    const targets = [
      target("valides_cumul", "2026-11-30", 40),
      target("valides_cumul", "2026-11-30", 6, MEMBER),
    ];
    expect(targetFor(targets, "valides_cumul", { memberId: MEMBER })).toBe(6);
    expect(targetFor(targets, "valides_cumul", { memberId: null })).toBe(40);
    expect(targetFor(targets, "valides_cumul", { memberId: "autre" })).toBeNull();
  });

  it("cible de la semaine : datée dans la semaine (lundi ou un autre jour), la plus tardive", () => {
    const targets = [
      target("demandes_semaine", "2026-11-16", 10),
      target("demandes_semaine", "2026-11-23", 12),
      target("valides_semaine", "2026-11-18", 5),
      target("valides_semaine", "2026-11-22", 6),
      target("valides_semaine", "2026-11-16", 3, MEMBER),
    ];
    expect(weekTarget(targets, "demandes_semaine", "2026-11-16")).toBe(10);
    expect(weekTarget(targets, "valides_semaine", "2026-11-16")).toBe(6);
    expect(weekTarget(targets, "valides_semaine", "2026-11-16", MEMBER)).toBe(3);
    // Aucune cible cette semaine : null, jamais celle d'une autre semaine.
    expect(weekTarget(targets, "demandes_semaine", "2026-11-09")).toBeNull();
    expect(
      weekTarget([target("demandes_semaine", null, 9)], "demandes_semaine", "2026-11-16"),
    ).toBeNull();
  });

  it("indicateurs hebdomadaires : demandes et validés de la semaine", () => {
    expect(WEEKLY_INDICATORS).toEqual(["valides_semaine", "demandes_semaine"]);
  });

  it("cible affichée d'un indicateur hebdomadaire : celle de la semaine, sinon la permanente", () => {
    const permanent = [target("demandes_semaine", null, 40)];
    // Cible « 40 demandes par semaine » importée sans date : affichée chaque semaine.
    expect(indicatorTarget(permanent, "demandes_semaine", TODAY)).toBe(40);
    const dated = [...permanent, target("demandes_semaine", "2026-11-16", 12)];
    expect(indicatorTarget(dated, "demandes_semaine", TODAY)).toBe(12);
    // Échéance d'une autre semaine : jamais reprise, la permanente à défaut.
    expect(indicatorTarget(dated, "demandes_semaine", "2026-11-26")).toBe(40);
    expect(
      indicatorTarget([target("demandes_semaine", "2026-11-23", 12)], "demandes_semaine", TODAY),
    ).toBeNull();
    // Membre : ses cibles seulement.
    const member = [target("valides_semaine", null, 2, MEMBER), target("valides_semaine", null, 9)];
    expect(indicatorTarget(member, "valides_semaine", TODAY, MEMBER)).toBe(2);
    expect(indicatorTarget(member, "valides_semaine", TODAY)).toBe(9);
    expect(indicatorTarget(member, "valides_semaine", TODAY, "autre")).toBeNull();
  });

  it("cible affichée d'un autre indicateur : celle de targetFor au jour donné", () => {
    const targets = [
      target("fiches_completes_pct", null, 50),
      target("fiches_completes_pct", "2026-12-31", 80),
    ];
    expect(indicatorTarget(targets, "fiches_completes_pct", TODAY)).toBe(80);
    expect(
      indicatorTarget([target("fiches_completes_pct", null, 50)], "fiches_completes_pct", TODAY),
    ).toBe(50);
    expect(indicatorTarget([], "fiches_completes_pct", TODAY)).toBeNull();
  });
});

describe("écart à la cible de la semaine", () => {
  const weeks = [week("2026-11-02", 3), week("2026-11-09", 7), week("2026-11-16", 12)];

  it("semaine en cours : d'avance (écart positif) ou de retard (négatif)", () => {
    expect(currentWeekGap(weeks, [target("valides_cumul", "2026-11-16", 10)], TODAY)).toEqual({
      semaine: "2026-11-16",
      realise: 12,
      cible: 10,
      ecart: 2,
    });
    expect(currentWeekGap(weeks, [target("valides_cumul", "2026-11-20", 20)], TODAY)).toEqual({
      semaine: "2026-11-16",
      realise: 12,
      cible: 20,
      ecart: -8,
    });
  });

  it("semaine du jour hors de la série : la dernière semaine passée", () => {
    const targets = [target("valides_cumul", "2026-11-16", 10)];
    expect(currentWeekGap(weeks, targets, "2026-12-03")).toMatchObject({
      semaine: "2026-11-16",
      ecart: 2,
    });
    // Série pas encore commencée, ou vide : aucun écart.
    expect(currentWeekGap(weeks, targets, "2026-10-29")).toBeNull();
    expect(currentWeekGap([], targets, TODAY)).toBeNull();
  });

  it("aucune cible pour cette semaine : aucun écart (jamais l'objectif final)", () => {
    expect(currentWeekGap(weeks, [target("valides_cumul", "2027-03-29", 99)], TODAY)).toBeNull();
    expect(currentWeekGap(weeks, [target("valides_cumul", null, 99)], TODAY)).toBeNull();
    expect(currentWeekGap(weeks, [], TODAY)).toBeNull();
  });

  it("série dans le désordre : la semaine est retrouvée", () => {
    const shuffled = [weeks[2], weeks[0], weeks[1]].filter((w) => w !== undefined);
    expect(
      currentWeekGap(shuffled, [target("valides_cumul", "2026-11-16", 12)], TODAY),
    ).toMatchObject({ semaine: "2026-11-16", ecart: 0 });
  });
});

describe("artisans validés de l'équipe (chiffre héros)", () => {
  const base = {
    today: TODAY,
    weeks: [week("2026-11-09", 30), week("2026-11-16", 43)],
    channels: [{ canal: "direct" as const, inscrits: 50, valides: 43, valides_semaine: 4 }],
  };
  const totals = (valides: number): LaunchTotals => ({
    inscrits: 50,
    dossiers_envoyes: 45,
    valides,
    fiches_completes: 0,
    en_essai: 0,
    abonnes: 0,
  });

  it("une seule règle : statut actuel, pour le chiffre, l'objectif et l'écart de la semaine", () => {
    // 43 premières validations en cumul, dont 3 suspendus depuis : 40 validés aujourd'hui.
    const targets = [
      target("valides_cumul", "2026-11-16", 42),
      target("valides_cumul", "2027-03-29", 100),
      target("valides_semaine", null, 5),
    ];
    expect(teamProgress({ ...base, totals: totals(40), targets })).toEqual({
      valides: 40,
      objectif: 100,
      percent: 40,
      status: "loin",
      gap: { semaine: "2026-11-16", cible: 42, ecart: -2 },
      thisWeek: 4,
      weekGoal: 5,
    });
    // La courbe, elle, compare les premières validations : 1 d'avance.
    expect(currentWeekGap(base.weeks, targets, TODAY)?.ecart).toBe(1);
  });

  it("sans cible : ni objectif, ni écart, ni cible de la semaine", () => {
    expect(teamProgress({ ...base, totals: totals(12), targets: [] })).toEqual({
      valides: 12,
      objectif: null,
      percent: null,
      status: null,
      gap: null,
      thisWeek: 4,
      weekGoal: null,
    });
  });
});

describe("graduations rondes", () => {
  it("rien à graduer : 0 seulement", () => {
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(-3)).toEqual([0]);
    expect(niceTicks(Number.NaN)).toEqual([0]);
  });

  it("petits effectifs : pas entiers", () => {
    expect(niceTicks(1)).toEqual([0, 1]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(11)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(2.5)).toEqual([0, 1, 2, 3]);
  });

  it("centaines et milliers : 5 graduations au-dessus de 0 au plus", () => {
    expect(niceTicks(500)).toEqual([0, 100, 200, 300, 400, 500]);
    expect(niceTicks(2340)).toEqual([0, 500, 1000, 1500, 2000, 2500]);
    expect(niceTicks(1_000_000)).toEqual([0, 200_000, 400_000, 600_000, 800_000, 1_000_000]);
  });

  it("nombre de graduations choisi", () => {
    expect(niceTicks(7, 2)).toEqual([0, 5, 10]);
    expect(niceTicks(7, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    // Pas de 1, 2 ou 5 × 10ⁿ seulement : 250 n'en est pas un.
    expect(niceTicks(2340, 10)).toEqual([0, 500, 1000, 1500, 2000, 2500]);
    for (const max of [1, 7, 42, 500, 2340]) {
      const ticks = niceTicks(max, 3);
      expect(ticks.length - 1).toBeLessThanOrEqual(3);
      expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
    }
  });
});

describe("courbe hebdomadaire des validés", () => {
  const weeks = [
    week("2026-11-02", 3),
    week("2026-11-09", 7),
    week("2026-11-16", 12),
    // Semaine à venir : cumul recopié par la base, jamais tracé comme réalisé.
    week("2026-11-23", 12),
  ];
  const targets = [
    target("valides_cumul", "2026-11-09", 8),
    // Cible saisie un mercredi : rattachée à sa semaine.
    target("valides_cumul", "2026-11-18", 14),
    target("valides_cumul", "2026-11-23", 20),
    // Hors de la série, d'un membre ou d'un autre indicateur : ni tracées, ni dans l'échelle.
    target("valides_cumul", "2027-03-29", 900),
    target("valides_cumul", "2026-11-16", 300, MEMBER),
    target("inscrits_cumul", "2026-11-16", 400),
  ];

  it("réalisé jusqu'à la semaine du jour, cible aux semaines qui en ont une, graduations", () => {
    expect(curveGeometry(weeks, targets, { width: 300, height: 100, today: TODAY })).toEqual({
      columns: [
        { semaine: "2026-11-02", x: 0, current: false },
        { semaine: "2026-11-09", x: 100, current: false },
        { semaine: "2026-11-16", x: 200, current: true },
        { semaine: "2026-11-23", x: 300, current: false },
      ],
      realise: [
        { semaine: "2026-11-02", x: 0, y: 85, value: 3 },
        { semaine: "2026-11-09", x: 100, y: 65, value: 7 },
        { semaine: "2026-11-16", x: 200, y: 40, value: 12 },
      ],
      cible: [
        { semaine: "2026-11-09", x: 100, y: 60, value: 8 },
        { semaine: "2026-11-16", x: 200, y: 30, value: 14 },
        { semaine: "2026-11-23", x: 300, y: 0, value: 20 },
      ],
      ticks: [
        { value: 0, y: 100 },
        { value: 5, y: 75 },
        { value: 10, y: 50 },
        { value: 15, y: 25 },
        { value: 20, y: 0 },
      ],
      max: 20,
    });
  });

  it("coordonnées arrondies au dixième", () => {
    const geometry = curveGeometry(
      [week("2026-11-02", 1), week("2026-11-09", 2), week("2026-11-16", 3), week("2026-11-23", 3)],
      [],
      { width: 100, height: 90, today: "2026-12-01" },
    );
    expect(geometry.columns.map((c) => c.x)).toEqual([0, 33.3, 66.7, 100]);
    expect(geometry.realise.map((p) => p.y)).toEqual([60, 30, 0, 0]);
    expect(geometry.cible).toEqual([]);
    expect(geometry.max).toBe(3);
  });

  it("aucun validé ni cible : échelle de 0 à 1, points en bas", () => {
    const geometry = curveGeometry([week("2026-11-02", 0), week("2026-11-09", 0)], [], {
      width: 200,
      height: 80,
      today: TODAY,
    });
    expect(geometry.ticks).toEqual([
      { value: 0, y: 80 },
      { value: 1, y: 0 },
    ]);
    expect(geometry.max).toBe(1);
    expect(geometry.realise.map((p) => [p.x, p.y])).toEqual([
      [0, 80],
      [200, 80],
    ]);
  });

  it("une seule semaine : au milieu ; aucune semaine : rien à tracer", () => {
    const single = curveGeometry([week("2026-11-16", 4)], [], {
      width: 200,
      height: 80,
      today: TODAY,
    });
    expect(single.realise).toEqual([{ semaine: "2026-11-16", x: 100, y: 0, value: 4 }]);
    const empty = curveGeometry([], targets, { width: 200, height: 80, today: TODAY });
    expect(empty.columns).toEqual([]);
    expect(empty.realise).toEqual([]);
    expect(empty.cible).toEqual([]);
    expect(empty.max).toBe(1);
  });

  it("série pas encore commencée : aucun point réalisé, la cible quand même", () => {
    const geometry = curveGeometry(weeks, targets, {
      width: 300,
      height: 100,
      today: "2026-10-29",
    });
    expect(geometry.realise).toEqual([]);
    expect(geometry.cible).toHaveLength(3);
    expect(geometry.columns.some((c) => c.current)).toBe(false);
  });
});

describe("étiquettes sous l'axe de la courbe", () => {
  it("12 semaines : 4 étiquettes sur téléphone, 6 sur tablette, jamais collées à la dernière", () => {
    expect(axisLabelColumns(12, 4)).toEqual([0, 3, 6, 11]);
    expect(axisLabelColumns(12, 9)).toEqual([0, 2, 4, 6, 8, 11]);
  });

  it("au moins un pas plein entre la dernière étiquette intermédiaire et la dernière", () => {
    for (const columns of [2, 5, 7, 12, 13, 26, 52, 156]) {
      for (const maxLabels of [4, 9]) {
        const shown = axisLabelColumns(columns, maxLabels);
        const step = Math.ceil(columns / maxLabels);
        expect(shown.at(-1)).toBe(columns - 1);
        expect(shown.length).toBeLessThanOrEqual(maxLabels);
        const beforeLast = shown.at(-2);
        if (beforeLast !== undefined) expect(columns - 1 - beforeLast).toBeGreaterThanOrEqual(step);
      }
    }
  });

  it("une seule colonne, ou aucune", () => {
    expect(axisLabelColumns(1, 4)).toEqual([0]);
    expect(axisLabelColumns(0, 4)).toEqual([]);
  });
});

describe("entonnoir", () => {
  const totals: LaunchTotals = {
    inscrits: 40,
    dossiers_envoyes: 30,
    valides: 20,
    fiches_completes: 10,
    en_essai: 8,
    abonnes: 2,
  };

  it("étapes dans l'ordre, taux de passage depuis l'étape précédente, part de la plus grande", () => {
    expect(FUNNEL_STEPS).toEqual([
      "inscrits",
      "dossiers_envoyes",
      "valides",
      "fiches_completes",
      "en_essai",
      "abonnes",
    ]);
    expect(funnelSteps(totals)).toEqual([
      { step: "inscrits", value: 40, rateFromPrevious: null, ratio: 1 },
      { step: "dossiers_envoyes", value: 30, rateFromPrevious: 75, ratio: 0.75 },
      { step: "valides", value: 20, rateFromPrevious: 67, ratio: 0.5 },
      { step: "fiches_completes", value: 10, rateFromPrevious: 50, ratio: 0.25 },
      { step: "en_essai", value: 8, rateFromPrevious: 80, ratio: 0.2 },
      { step: "abonnes", value: 2, rateFromPrevious: 25, ratio: 0.05 },
    ]);
  });

  it("zéros : aucun taux après une étape vide, barres vides", () => {
    const empty = funnelSteps({
      inscrits: 0,
      dossiers_envoyes: 0,
      valides: 0,
      fiches_completes: 0,
      en_essai: 0,
      abonnes: 0,
    });
    expect(empty.map((s) => [s.rateFromPrevious, s.ratio])).toEqual([
      [null, 0],
      [null, 0],
      [null, 0],
      [null, 0],
      [null, 0],
      [null, 0],
    ]);
    const partial = funnelSteps({ ...totals, en_essai: 0, abonnes: 3 });
    expect(partial[4]).toMatchObject({ value: 0, rateFromPrevious: 0 });
    expect(partial[5]).toMatchObject({ value: 3, rateFromPrevious: null });
  });

  it("étapes qui ne sont pas des sous-ensembles stricts : taux au-delà de 100 % non plafonné", () => {
    expect(funnelSteps({ ...totals, en_essai: 4, abonnes: 6 })[5]?.rateFromPrevious).toBe(150);
  });
});

describe("couverture métier × zone", () => {
  const coverage: LaunchCoverage = {
    seuil: 3,
    communes: [
      { code_insee: "06088", nom: "Commune A" },
      { code_insee: "06029", nom: "Commune B" },
      { code_insee: "06004", nom: "Commune C" },
    ],
    trades: [
      { code: "plomberie", label: "Plomberie" },
      { code: "electricite", label: "Électricité" },
    ],
    cells: [
      { trade: "plomberie", code_insee: "06088", n: 4 },
      { trade: "plomberie", code_insee: "06029", n: 1 },
      { trade: "electricite", code_insee: "06004", n: 3 },
      // Métier ou commune hors de la liste : ignorés.
      { trade: "peinture", code_insee: "06088", n: 9 },
      { trade: "plomberie", code_insee: "99999", n: 9 },
    ],
  };

  it("toutes les cases métier × commune, même à 0, niveau selon le seuil", () => {
    expect(coverageGrid(coverage)).toEqual({
      rows: [
        {
          trade: "plomberie",
          label: "Plomberie",
          cells: [
            { code_insee: "06088", n: 4, level: "ok" },
            { code_insee: "06029", n: 1, level: "faible" },
            { code_insee: "06004", n: 0, level: "vide" },
          ],
        },
        {
          trade: "electricite",
          label: "Électricité",
          cells: [
            { code_insee: "06088", n: 0, level: "vide" },
            { code_insee: "06029", n: 0, level: "vide" },
            { code_insee: "06004", n: 3, level: "ok" },
          ],
        },
      ],
      under: 4,
      total: 6,
    });
  });

  it("seuil 1 : une case est vide ou couverte, jamais faible", () => {
    const grid = coverageGrid({ ...coverage, seuil: 1 });
    expect(grid.rows.flatMap((r) => r.cells.map((c) => c.level))).toEqual([
      "ok",
      "ok",
      "vide",
      "vide",
      "vide",
      "ok",
    ]);
    expect(grid.under).toBe(3);
  });

  it("grille vide : aucune ligne, aucune case", () => {
    expect(coverageGrid({ seuil: 3, communes: [], trades: [], cells: [] })).toEqual({
      rows: [],
      under: 0,
      total: 0,
    });
    const noCommune = coverageGrid({ ...coverage, communes: [] });
    expect(noCommune.rows.map((r) => r.cells)).toEqual([[], []]);
    expect(noCommune).toMatchObject({ under: 0, total: 0 });
  });
});

describe("pourcentages et état face à la cible", () => {
  it("pourcentage entier arrondi, null sans total", () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(2, 3)).toBe(67);
    expect(percentOf(1, 8)).toBe(13);
    expect(percentOf(3, 3)).toBe(100);
    expect(percentOf(0, 5)).toBe(0);
    expect(percentOf(0, 0)).toBeNull();
    expect(percentOf(4, 0)).toBeNull();
  });

  it("plus haut vaut mieux : atteint, proche (90 % au moins), loin", () => {
    expect(targetStatus(100, 100)).toBe("atteint");
    expect(targetStatus(120, 100)).toBe("atteint");
    expect(targetStatus(90, 100)).toBe("proche");
    expect(targetStatus(27, 30)).toBe("proche");
    expect(targetStatus(89, 100)).toBe("loin");
    expect(targetStatus(0, 0)).toBe("atteint");
  });

  it("plus bas vaut mieux : atteint, proche (110 % au plus), loin", () => {
    expect(targetStatus(3, 5, "lower")).toBe("atteint");
    expect(targetStatus(5, 5, "lower")).toBe("atteint");
    expect(targetStatus(5.5, 5, "lower")).toBe("proche");
    expect(targetStatus(33, 30, "lower")).toBe("proche");
    expect(targetStatus(6, 5, "lower")).toBe("loin");
    expect(targetStatus(0, 0, "lower")).toBe("atteint");
    expect(targetStatus(1, 0, "lower")).toBe("loin");
  });

  it("chiffre ou cible inconnus : aucun état", () => {
    expect(targetStatus(null, 10)).toBeNull();
    expect(targetStatus(10, null)).toBeNull();
    expect(targetStatus(null, null, "lower")).toBeNull();
  });
});

describe("canaux, mini-barres et membres", () => {
  const channel = (
    canal: LaunchChannelRow["canal"],
    inscrits: number,
    valides = 0,
    valides_semaine = 0,
  ): LaunchChannelRow => ({ canal, inscrits, valides, valides_semaine });

  it("canaux du plus fourni au moins fourni (égalité : ordre des canaux), part et barre", () => {
    expect(
      channelBreakdown([
        channel("direct", 5, 2),
        channel("flyer", 10, 6, 1),
        channel("commercial", 5, 4, 2),
      ]),
    ).toEqual({
      total: 20,
      rows: [
        { canal: "flyer", inscrits: 10, valides: 6, valides_semaine: 1, part: 50, ratio: 1 },
        { canal: "commercial", inscrits: 5, valides: 4, valides_semaine: 2, part: 25, ratio: 0.5 },
        { canal: "direct", inscrits: 5, valides: 2, valides_semaine: 0, part: 25, ratio: 0.5 },
      ],
    });
    expect(channelBreakdown([])).toEqual({ total: 0, rows: [] });
  });

  it("mini-barres des semaines : hauteur relative à la meilleure semaine", () => {
    expect(
      weekBars([
        { semaine: "2026-11-02", valides: 2 },
        { semaine: "2026-11-09", valides: 0 },
        { semaine: "2026-11-16", valides: 4 },
      ]),
    ).toEqual([
      { semaine: "2026-11-02", valides: 2, ratio: 0.5 },
      { semaine: "2026-11-09", valides: 0, ratio: 0 },
      { semaine: "2026-11-16", valides: 4, ratio: 1 },
    ]);
    expect(weekBars([{ semaine: "2026-11-02", valides: 0 }])).toEqual([
      { semaine: "2026-11-02", valides: 0, ratio: 0 },
    ]);
  });

  it("membre : objectif de sa fiche, sinon sa dernière cible ; avancement et dossiers sous 48 h", () => {
    const member = {
      member_id: MEMBER,
      objectif: 10,
      valides: 9,
      dossiers_mesurables: 0,
      dossiers_48h: 0,
    };
    expect(memberProgress(member, [])).toEqual({
      objectif: 10,
      percent: 90,
      status: "proche",
      rate48h: null,
    });
    const targets = [
      target("valides_cumul", "2026-12-01", 4, MEMBER),
      target("valides_cumul", "2026-12-15", 6, MEMBER),
      target("valides_cumul", "2026-12-15", 50),
    ];
    expect(memberProgress({ ...member, objectif: null, valides: 2 }, targets)).toEqual({
      objectif: 6,
      percent: 33,
      status: "loin",
      rate48h: null,
    });
    expect(
      memberProgress({ ...member, objectif: null, dossiers_mesurables: 8, dossiers_48h: 6 }, []),
    ).toEqual({ objectif: null, percent: null, status: null, rate48h: 75 });
  });
});

describe("valeur de chaque indicateur", () => {
  const figures: Pick<LaunchFigures, "totals" | "channels" | "quality" | "activity"> = {
    totals: {
      inscrits: 40,
      dossiers_envoyes: 30,
      valides: 20,
      fiches_completes: 10,
      en_essai: 8,
      abonnes: 2,
    },
    channels: [
      { canal: "flyer", inscrits: 10, valides: 6, valides_semaine: 1 },
      { canal: "direct", inscrits: 30, valides: 14, valides_semaine: 2 },
    ],
    quality: {
      dossiers_decides: 25,
      dossiers_48h: 20,
      en_attente: 4,
      en_attente_48h: 1,
      fiches_completes: 10,
      valides: 20,
      app_installee: 5,
      premier_devis_perso: 3,
    },
    activity: {
      demandes_semaine: 12,
      demandes_semaine_precedente: 9,
      artisans_actifs: 20,
      artisans_4_demandes: 6,
      demandes_par_artisan_mediane: 2.5,
      demandes_72h: 30,
      demandes_repondues_72h: 27,
      artisans_devis_envoye: 15,
      essais: 8,
      essais_termines: 4,
      abonnes_apres_essai: 2,
      // Un abonné payé sans essai : hors de « abonnés après l'essai ».
      abonnes: 3,
    },
  };

  it("validés au statut actuel, comme le chiffre héros", () => {
    const values = launchIndicatorValues({
      ...figures,
      totals: { ...figures.totals, valides: 17 },
    });
    expect(values.valides_cumul).toBe(17);
  });

  it("une règle par indicateur, pourcentages entiers", () => {
    expect(launchIndicatorValues(figures, 7)).toEqual({
      valides_cumul: 20,
      inscrits_cumul: 40,
      valides_semaine: 3,
      cases_sous_seuil: 7,
      dossiers_48h_pct: 80,
      fiches_completes_pct: 50,
      app_installee_pct: 25,
      premier_devis_perso_pct: 15,
      demandes_semaine: 12,
      demandes_par_artisan: 2.5,
      reponse_72h_pct: 90,
      devis_envoye_pct: 75,
      abonnes_pct: 50,
    });
  });

  it("sans couverture ni dénominateur : null", () => {
    const values = launchIndicatorValues({
      ...figures,
      quality: { ...figures.quality, dossiers_decides: 0, valides: 0 },
      activity: { ...figures.activity, demandes_72h: 0, artisans_actifs: 0, essais_termines: 0 },
    });
    expect(values).toMatchObject({
      cases_sous_seuil: null,
      dossiers_48h_pct: null,
      fiches_completes_pct: null,
      app_installee_pct: null,
      premier_devis_perso_pct: null,
      reponse_72h_pct: null,
      devis_envoye_pct: null,
      abonnes_pct: null,
    });
  });
});
