/**
 * Chiffres du lancement en direct (F-66, lot 2, ADR 0209) : cibles (série hebdomadaire, échéance
 * ou cible permanente), écart à la cible de la semaine, graduations et tracé de la courbe des
 * validés, entonnoir, canaux d'arrivée, avancement des membres, couverture métier × commune,
 * pourcentages et état d'un chiffre face à sa cible. Les chiffres sont calculés en base
 * (`admin_launch_figures`, `admin_launch_coverage`) ; aucune cible réelle ici : elles sont
 * importées en base depuis le fichier gardé hors du dépôt public. Dates AAAA-MM-JJ, semaines du
 * lundi au dimanche, « aujourd'hui » à l'heure de Paris. Mêmes listes et bornes qu'en base.
 */
import { mondayOf } from "./agenda";
import type { LaunchMemberKind } from "./launch-plan";
import { parisToday } from "./project";

/** Indicateurs d'une cible (contrôle `launch_targets.indicateur` en base), dans le même ordre. */
export const LAUNCH_INDICATORS = [
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
] as const;
export type LaunchIndicator = (typeof LAUNCH_INDICATORS)[number];

/** Sens de lecture d'un chiffre face à sa cible. */
export type TargetSense = "higher" | "lower";

/**
 * Indicateurs mesurés semaine par semaine : leur cible est celle de la semaine du jour, sinon la
 * cible permanente (« 40 demandes par semaine »), jamais une échéance d'une autre semaine.
 */
export const WEEKLY_INDICATORS = [
  "valides_semaine",
  "demandes_semaine",
] as const satisfies readonly LaunchIndicator[];

/** Plus haut vaut mieux, sauf pour les cases de la couverture encore sous le seuil. */
export function indicatorSense(indicateur: LaunchIndicator): TargetSense {
  return indicateur === "cases_sous_seuil" ? "lower" : "higher";
}

/** Canaux d'un code de suivi /p/<code> (enum `public.acquisition_channel`). */
export const ACQUISITION_CHANNELS = [
  "terrain",
  "meta",
  "google",
  "flyer",
  "salon",
  "presse",
  "radio",
  "autre",
] as const;
export type AcquisitionChannel = (typeof ACQUISITION_CHANNELS)[number];

/**
 * Canaux d'arrivée d'une inscription, dans l'ordre d'affichage : code d'un commercial ou d'un
 * partenaire, code de suivi (son canal), parrainage, invitation, sinon arrivée directe.
 */
export const LAUNCH_CHANNELS = [
  "commercial",
  "partenaire",
  ...ACQUISITION_CHANNELS,
  "parrainage",
  "invitation",
  "direct",
] as const;
export type LaunchChannel = (typeof LAUNCH_CHANNELS)[number];

/** Bornes (contrôles de `acquisition_codes`, `launch_settings`, `launch_targets` et de l'import). */
export const LAUNCH_FIGURES_LIMITS = {
  /** Libellé d'un code de suivi (« Flyers du salon »). */
  codeLabelMaxLength: 80,
  /** Valeur d'une cible, de 0 à 1 000 000. */
  targetValueMax: 1_000_000,
  /** Cibles d'un fichier d'import au plus. */
  maxTargets: 2000,
  /** Artisans validés par case métier × commune pour qu'elle soit couverte. */
  coverageThresholdMin: 1,
  coverageThresholdMax: 20,
  coverageThresholdDefault: 3,
  /** Jauge de « Mon profil » (pour cent) à partir de laquelle une fiche est complète. */
  profileThresholdMin: 50,
  profileThresholdMax: 100,
  profileThresholdDefault: 100,
} as const;

// ---------------------------------------------------------------------------
// Réponses de la base (formes JSON de `admin_launch_figures` et `admin_launch_coverage`)
// ---------------------------------------------------------------------------

/** Cible importée : `member_id` null pour l'équipe, `jour` null pour une cible permanente. */
export type LaunchTarget = {
  indicateur: LaunchIndicator;
  member_id: string | null;
  jour: string | null;
  valeur: number;
};

export type LaunchSettings = {
  debut_recrutement: string | null;
  fin_recrutement: string | null;
  seuil_couverture: number;
  seuil_fiche_complete: number;
};

export type LaunchTotals = {
  inscrits: number;
  dossiers_envoyes: number;
  valides: number;
  fiches_completes: number;
  en_essai: number;
  abonnes: number;
};

/** Semaine de la courbe : `semaine` est son lundi ; validés à leur première validation. */
export type LaunchWeek = {
  semaine: string;
  inscrits: number;
  valides: number;
  inscrits_cumul: number;
  valides_cumul: number;
};

export type LaunchChannelRow = {
  canal: LaunchChannel;
  inscrits: number;
  valides: number;
  valides_semaine: number;
};

export type LaunchMemberFigures = {
  member_id: string;
  nom: string;
  kind: LaunchMemberKind;
  objectif: number | null;
  inscrits: number;
  valides: number;
  valides_semaine: number;
  weeks: Array<{ semaine: string; valides: number }>;
  /** Toutes les décisions de dossier prises par son compte relié. */
  dossiers_traites: number;
  /** Celles dont le délai se mesure (dossier pas renvoyé depuis) : dénominateur du « sous 48 h ». */
  dossiers_mesurables: number;
  dossiers_48h: number;
};

export type LaunchQuality = {
  dossiers_decides: number;
  dossiers_48h: number;
  en_attente: number;
  en_attente_48h: number;
  fiches_completes: number;
  valides: number;
  app_installee: number;
  premier_devis_perso: number;
};

export type LaunchActivity = {
  demandes_semaine: number;
  demandes_semaine_precedente: number;
  artisans_actifs: number;
  artisans_4_demandes: number;
  demandes_par_artisan_mediane: number;
  demandes_72h: number;
  demandes_repondues_72h: number;
  artisans_devis_envoye: number;
  essais: number;
  essais_termines: number;
  /** Abonnés dont l'essai est terminé : numérateur de « abonnés après l'essai ». */
  abonnes_apres_essai: number;
  abonnes: number;
};

/** Réponse de `admin_launch_figures`. */
export type LaunchFigures = {
  today: string;
  settings: LaunchSettings;
  targets: LaunchTarget[];
  totals: LaunchTotals;
  weeks: LaunchWeek[];
  channels: LaunchChannelRow[];
  members: LaunchMemberFigures[];
  quality: LaunchQuality;
  activity: LaunchActivity;
};

/** Réponse de `admin_launch_coverage` : cases à 0 absentes de `cells`. */
export type LaunchCoverage = {
  seuil: number;
  communes: Array<{ code_insee: string; nom: string }>;
  trades: Array<{ code: string; label: string }>;
  cells: Array<{ trade: string; code_insee: string; n: number }>;
};

/** Ce qu'il faut d'une cible pour la retrouver (indicateur lu comme simple texte). */
type TargetLike = {
  indicateur: string;
  member_id: string | null;
  jour: string | null;
  valeur: number;
};

const ownTargets = (
  targets: readonly TargetLike[],
  indicateur: LaunchIndicator,
  memberId: string | null,
) => targets.filter((t) => t.indicateur === indicateur && t.member_id === memberId);

// ---------------------------------------------------------------------------
// Cibles
// ---------------------------------------------------------------------------

/**
 * Cible d'un indicateur, pour l'équipe (par défaut) ou un membre (jamais celles de l'équipe pour
 * un membre). Avec un jour : la cible datée de ce jour (série hebdomadaire) ou la prochaine, sinon
 * la dernière (échéance passée) ; sans jour : la dernière cible datée (objectif final). Aucune
 * cible datée : la cible permanente ; aucune cible : null.
 */
export function targetFor(
  targets: readonly TargetLike[],
  indicateur: LaunchIndicator,
  opts: { memberId?: string | null; jour?: string } = {},
): number | null {
  const own = ownTargets(targets, indicateur, opts.memberId ?? null);
  const dated = own
    .filter((t): t is TargetLike & { jour: string } => t.jour !== null)
    .sort((a, b) => a.jour.localeCompare(b.jour));
  const { jour } = opts;
  const next = jour === undefined ? undefined : dated.find((t) => t.jour >= jour);
  const chosen = next ?? dated[dated.length - 1] ?? own.find((t) => t.jour === null);
  return chosen?.valeur ?? null;
}

/**
 * Cible d'une semaine (lundi `semaine`) : cible datée de ce lundi ou d'un autre jour de la même
 * semaine (la plus tardive), jamais celle d'une autre semaine ni la cible permanente ; sinon null.
 */
export function weekTarget(
  targets: readonly TargetLike[],
  indicateur: LaunchIndicator,
  semaine: string,
  memberId: string | null = null,
): number | null {
  const inWeek = ownTargets(targets, indicateur, memberId)
    .filter(
      (t): t is TargetLike & { jour: string } => t.jour !== null && mondayOf(t.jour) === semaine,
    )
    .sort((a, b) => a.jour.localeCompare(b.jour));
  return inWeek[inWeek.length - 1]?.valeur ?? null;
}

/**
 * Cible affichée à côté d'un indicateur, pour l'équipe (par défaut) ou un membre : indicateur
 * hebdomadaire (WEEKLY_INDICATORS), cible de la semaine du jour, sinon sa cible permanente ;
 * autre indicateur, cible du jour, prochaine échéance, dernière échéance ou cible permanente
 * (`targetFor`). Aucune : null.
 */
export function indicatorTarget(
  targets: readonly TargetLike[],
  indicateur: LaunchIndicator,
  today: string,
  memberId: string | null = null,
): number | null {
  if ((WEEKLY_INDICATORS as readonly LaunchIndicator[]).includes(indicateur)) {
    return (
      weekTarget(targets, indicateur, mondayOf(today), memberId) ??
      ownTargets(targets, indicateur, memberId).find((t) => t.jour === null)?.valeur ??
      null
    );
  }
  return targetFor(targets, indicateur, { memberId, jour: today });
}

/**
 * Écart des validés (cumul) à la cible de la semaine : semaine du jour, ou la dernière semaine
 * passée de la série (recrutement terminé). Positif : d'avance ; négatif : de retard. Série pas
 * encore commencée ou aucune cible cette semaine-là (jamais l'objectif final) : null.
 */
export function currentWeekGap(
  weeks: readonly Pick<LaunchWeek, "semaine" | "valides_cumul">[],
  targets: readonly TargetLike[],
  today: string = parisToday(),
): { semaine: string; realise: number; cible: number; ecart: number } | null {
  const monday = mondayOf(today);
  const past = weeks
    .filter((w) => w.semaine <= monday)
    .sort((a, b) => a.semaine.localeCompare(b.semaine));
  const week = past[past.length - 1];
  if (!week) return null;
  const cible = weekTarget(targets, "valides_cumul", week.semaine);
  if (cible === null) return null;
  return {
    semaine: week.semaine,
    realise: week.valides_cumul,
    cible,
    ecart: week.valides_cumul - cible,
  };
}

/**
 * Artisans validés de l'équipe (chiffre héros), une seule règle : statut actuel « validé »
 * (`totals.valides`, comme `launchIndicatorValues`), pour le chiffre, la part de l'objectif
 * d'équipe (dernière cible datée de valides_cumul, sinon permanente) et l'écart à la cible de la
 * semaine (même semaine et même cible que `currentWeekGap`, la courbe gardant les premières
 * validations). Validés de la semaine : premières validations de la semaine, avec leur cible.
 */
export function teamProgress(
  figures: Pick<LaunchFigures, "today" | "totals" | "weeks" | "targets" | "channels">,
): {
  valides: number;
  objectif: number | null;
  percent: number | null;
  status: TargetState | null;
  gap: { semaine: string; cible: number; ecart: number } | null;
  thisWeek: number;
  weekGoal: number | null;
} {
  const { today, targets } = figures;
  const valides = figures.totals.valides;
  const objectif = targetFor(targets, "valides_cumul");
  const week = currentWeekGap(figures.weeks, targets, today);
  return {
    valides,
    objectif,
    percent: objectif === null ? null : percentOf(valides, objectif),
    status: targetStatus(valides, objectif),
    gap:
      week === null
        ? null
        : { semaine: week.semaine, cible: week.cible, ecart: valides - week.cible },
    thisWeek: figures.channels.reduce((sum, c) => sum + c.valides_semaine, 0),
    weekGoal: indicatorTarget(targets, "valides_semaine", today),
  };
}

// ---------------------------------------------------------------------------
// Graphiques (graduations, courbe, barres)
// ---------------------------------------------------------------------------

/**
 * Graduations rondes d'un axe d'effectifs : 0 puis un pas entier de 1, 2 ou 5 × 10ⁿ, jusqu'au
 * premier multiple du pas qui atteint `max` ; `count` graduations au-dessus de 0 au plus
 * (5 par défaut). Rien à graduer (0, négatif) : [0].
 */
export function niceTicks(max: number, count = 5): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0];
  const intervals = Math.max(1, Math.floor(count));
  let step = 1;
  search: for (let magnitude = 1; magnitude < 1e15; magnitude *= 10) {
    for (const factor of [1, 2, 5]) {
      if (Math.ceil(max / (factor * magnitude)) <= intervals) {
        step = factor * magnitude;
        break search;
      }
    }
  }
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/** Point du tracé SVG (origine en haut à gauche). */
export type CurvePoint = { semaine: string; x: number; y: number; value: number };

const tenth = (value: number) => Math.round(value * 10) / 10;

/**
 * Tracé de la courbe des validés dans un cadre `width` × `height` (marges et légendes à la charge
 * de l'écran) : une colonne par semaine, réparties sur toute la largeur (au milieu s'il n'y en a
 * qu'une) ; réalisé (cumul) jusqu'à la semaine du jour seulement, la base recopiant le cumul sur
 * les semaines à venir ; cible de l'équipe aux semaines qui en ont une (`weekTarget`) ; échelle
 * de 0 au haut des graduations (de 0 à 1 sans aucun chiffre). Coordonnées arrondies au dixième.
 */
export function curveGeometry(
  weeks: readonly Pick<LaunchWeek, "semaine" | "valides_cumul">[],
  targets: readonly TargetLike[],
  { width, height, today = parisToday() }: { width: number; height: number; today?: string },
): {
  columns: Array<{ semaine: string; x: number; current: boolean }>;
  realise: CurvePoint[];
  cible: CurvePoint[];
  ticks: Array<{ value: number; y: number }>;
  max: number;
} {
  const monday = mondayOf(today);
  const sorted = [...weeks].sort((a, b) => a.semaine.localeCompare(b.semaine));
  const xOf = (i: number) =>
    sorted.length === 1 ? width / 2 : (i * width) / Math.max(1, sorted.length - 1);
  const actual = sorted.flatMap((w, i) =>
    w.semaine <= monday ? [{ semaine: w.semaine, i, value: w.valides_cumul }] : [],
  );
  const goal = sorted.flatMap((w, i) => {
    const value = weekTarget(targets, "valides_cumul", w.semaine);
    return value === null ? [] : [{ semaine: w.semaine, i, value }];
  });
  const ticks = niceTicks(Math.max(1, ...actual.map((p) => p.value), ...goal.map((p) => p.value)));
  const max = ticks[ticks.length - 1] ?? 1;
  const yOf = (value: number) => tenth(height - (value / max) * height);
  const point = (p: { semaine: string; i: number; value: number }): CurvePoint => ({
    semaine: p.semaine,
    x: tenth(xOf(p.i)),
    y: yOf(p.value),
    value: p.value,
  });
  return {
    columns: sorted.map((w, i) => ({
      semaine: w.semaine,
      x: tenth(xOf(i)),
      current: w.semaine === monday,
    })),
    realise: actual.map(point),
    cible: goal.map(point),
    ticks: ticks.map((value) => ({ value, y: yOf(value) })),
    max,
  };
}

/**
 * Colonnes étiquetées sous l'axe d'une courbe de `columns` colonnes, `maxLabels` étiquettes au plus
 * (4 sur téléphone, 9 à partir de la tablette) : une colonne sur `pas` depuis la première, et la
 * dernière (collée au bord droit) ; une étiquette intermédiaire à moins d'un pas plein de la
 * dernière est retirée, sinon elles se chevauchent.
 */
export function axisLabelColumns(columns: number, maxLabels: number): number[] {
  if (columns <= 0) return [];
  const step = Math.max(1, Math.ceil(columns / Math.max(1, maxLabels)));
  const last = columns - 1;
  const shown: number[] = [];
  for (let i = 0; i < last; i += step) {
    if (last - i >= step) shown.push(i);
  }
  shown.push(last);
  return shown;
}

/** Étapes de l'entonnoir, dans l'ordre (clés de `totals`). */
export const FUNNEL_STEPS = [
  "inscrits",
  "dossiers_envoyes",
  "valides",
  "fiches_completes",
  "en_essai",
  "abonnes",
] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

/**
 * Entonnoir : chaque étape, son taux de passage depuis l'étape précédente (pour cent, null pour la
 * première ou après une étape vide ; non plafonné, les étapes n'étant pas toutes des sous-ensembles
 * de la précédente : un abonné peut payer sans essai) et sa part de la plus grande étape (0 à 1,
 * largeur de la barre). Toutes les étapes sont des cumuls (essais commencés, en cours ou terminés).
 */
export function funnelSteps(
  totals: LaunchTotals,
): Array<{ step: FunnelStep; value: number; rateFromPrevious: number | null; ratio: number }> {
  const largest = Math.max(0, ...FUNNEL_STEPS.map((step) => totals[step]));
  return FUNNEL_STEPS.map((step, i) => {
    const previous = FUNNEL_STEPS[i - 1];
    return {
      step,
      value: totals[step],
      rateFromPrevious: previous === undefined ? null : percentOf(totals[step], totals[previous]),
      ratio: largest > 0 ? totals[step] / largest : 0,
    };
  });
}

/**
 * Canaux d'arrivée du plus fourni au moins fourni (à égalité : ordre de LAUNCH_CHANNELS), avec la
 * part des inscriptions (pour cent) et la largeur de la barre (0 à 1, relative au premier).
 */
export function channelBreakdown<T extends LaunchChannelRow>(
  channels: readonly T[],
): { total: number; rows: Array<T & { part: number; ratio: number }> } {
  const total = channels.reduce((sum, c) => sum + c.inscrits, 0);
  const largest = Math.max(0, ...channels.map((c) => c.inscrits));
  const rank = (canal: LaunchChannel) => LAUNCH_CHANNELS.indexOf(canal);
  return {
    total,
    rows: [...channels]
      .sort((a, b) => b.inscrits - a.inscrits || rank(a.canal) - rank(b.canal))
      .map((c) => ({
        ...c,
        part: percentOf(c.inscrits, total) ?? 0,
        ratio: largest > 0 ? c.inscrits / largest : 0,
      })),
  };
}

/** Mini-barres des semaines d'un membre : hauteur relative à sa meilleure semaine (0 à 1). */
export function weekBars<T extends { semaine: string; valides: number }>(
  weeks: readonly T[],
): Array<T & { ratio: number }> {
  const largest = Math.max(0, ...weeks.map((w) => w.valides));
  return weeks.map((w) => ({ ...w, ratio: largest > 0 ? w.valides / largest : 0 }));
}

// ---------------------------------------------------------------------------
// Pourcentages, état face à la cible, membres et indicateurs
// ---------------------------------------------------------------------------

/** Part en pour cent, entier arrondi ; null sans total. */
export function percentOf(part: number, whole: number): number | null {
  if (!(whole > 0)) return null;
  return Math.round((part * 100) / whole);
}

export type TargetState = "atteint" | "proche" | "loin";

/**
 * État d'un chiffre face à sa cible : atteinte ; proche (au moins 90 % de la cible quand plus haut
 * vaut mieux, au plus 110 % quand plus bas vaut mieux) ; sinon loin. Chiffre ou cible inconnus :
 * null. Comparaison en entiers (× 10) pour éviter les arrondis (27 sur 30 est « proche »).
 */
export function targetStatus(
  value: number | null,
  target: number | null,
  sense: TargetSense = "higher",
): TargetState | null {
  if (value === null || target === null) return null;
  if (sense === "higher") {
    if (value >= target) return "atteint";
    return value * 10 >= target * 9 ? "proche" : "loin";
  }
  if (value <= target) return "atteint";
  return value * 10 <= target * 11 ? "proche" : "loin";
}

/**
 * Avancement d'un membre : objectif de sa fiche (`launch_members.objectif_valides`), sinon sa
 * dernière cible de validés ; part atteinte et état ; part de ses décisions mesurables prises
 * sous 48 h (membre qui valide les dossiers). Sans objectif ou sans décision mesurable : null.
 */
export function memberProgress(
  member: Pick<
    LaunchMemberFigures,
    "member_id" | "objectif" | "valides" | "dossiers_mesurables" | "dossiers_48h"
  >,
  targets: readonly TargetLike[],
): {
  objectif: number | null;
  percent: number | null;
  status: TargetState | null;
  rate48h: number | null;
} {
  const objectif =
    member.objectif ?? targetFor(targets, "valides_cumul", { memberId: member.member_id });
  return {
    objectif,
    percent: objectif === null ? null : percentOf(member.valides, objectif),
    status: targetStatus(member.valides, objectif),
    rate48h: percentOf(member.dossiers_48h, member.dossiers_mesurables),
  };
}

/**
 * Chiffre réalisé de chaque indicateur, une seule règle chacun (pour cent entiers) :
 * validés au statut actuel (comme le chiffre héros, `teamProgress`) et inscrits (fiches créées) ;
 * validés de la semaine = premières validations de la
 * semaine (tous canaux) ; cases sous le seuil = `coverageGrid(...).under` (null sans couverture) ;
 * dossiers décidés sous 48 h ; fiches complètes, application installée et premier devis à ses
 * clients parmi les validés ; médiane des demandes par artisan ; demandes répondues sous 72 h ;
 * artisans actifs avec un devis envoyé ; abonnés après l'essai parmi les essais terminés (un abonné
 * payé sans essai n'entre pas dans le calcul).
 */
export function launchIndicatorValues(
  figures: Pick<LaunchFigures, "totals" | "channels" | "quality" | "activity">,
  coverageUnder: number | null = null,
): Record<LaunchIndicator, number | null> {
  const { totals, channels, quality, activity } = figures;
  return {
    valides_cumul: totals.valides,
    inscrits_cumul: totals.inscrits,
    valides_semaine: channels.reduce((sum, c) => sum + c.valides_semaine, 0),
    cases_sous_seuil: coverageUnder,
    dossiers_48h_pct: percentOf(quality.dossiers_48h, quality.dossiers_decides),
    fiches_completes_pct: percentOf(quality.fiches_completes, quality.valides),
    app_installee_pct: percentOf(quality.app_installee, quality.valides),
    premier_devis_perso_pct: percentOf(quality.premier_devis_perso, quality.valides),
    demandes_semaine: activity.demandes_semaine,
    demandes_par_artisan: activity.demandes_par_artisan_mediane,
    reponse_72h_pct: percentOf(activity.demandes_repondues_72h, activity.demandes_72h),
    devis_envoye_pct: percentOf(activity.artisans_devis_envoye, activity.artisans_actifs),
    abonnes_pct: percentOf(activity.abonnes_apres_essai, activity.essais_termines),
  };
}

// ---------------------------------------------------------------------------
// Couverture métier × commune
// ---------------------------------------------------------------------------

export type CoverageLevel = "vide" | "faible" | "ok";

/**
 * Grille de couverture : une ligne par métier (ordre de la base), une case par commune pilote
 * (ordre de la base), cases à 0 comprises ; vide (0), faible (sous le seuil) ou couverte (seuil
 * atteint). `under` : cases sous le seuil (vides comprises), sur `total` cases. Cases d'un métier
 * ou d'une commune hors des listes ignorées.
 */
export function coverageGrid(coverage: LaunchCoverage): {
  rows: Array<{
    trade: string;
    label: string;
    cells: Array<{ code_insee: string; n: number; level: CoverageLevel }>;
  }>;
  under: number;
  total: number;
} {
  const seuil = Math.max(1, coverage.seuil);
  const counts = new Map(coverage.cells.map((c) => [`${c.trade}|${c.code_insee}`, c.n]));
  let under = 0;
  const rows = coverage.trades.map((trade) => ({
    trade: trade.code,
    label: trade.label,
    cells: coverage.communes.map((commune) => {
      const n = counts.get(`${trade.code}|${commune.code_insee}`) ?? 0;
      const level: CoverageLevel = n <= 0 ? "vide" : n < seuil ? "faible" : "ok";
      if (level !== "ok") under += 1;
      return { code_insee: commune.code_insee, n, level };
    }),
  }));
  return { rows, under, total: coverage.trades.length * coverage.communes.length };
}
