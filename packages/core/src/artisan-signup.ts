/**
 * Inscription artisan en un seul parcours (ADR 0110) : métiers, entreprise, zone, puis compte.
 * Les trois premières étapes sont gardées dans le navigateur (brouillon), et envoyées en une fois
 * à la création du compte.
 */

import { isTerritoryCode } from "./zone-territories";

export const ARTISAN_SIGNUP_PATH = "/pro/inscription";
/** Retour de Google ou Apple pour un artisan : finalisation du compte (ADR 0110). */
export const ARTISAN_SIGNUP_FINALIZE_PATH = "/pro/finaliser";
/** « Votre profil est créé » : aperçu de la fiche et suite de l'inscription. */
export const ARTISAN_WELCOME_PATH = "/pro/bienvenue";
/** Clé du brouillon dans le stockage local du navigateur. */
export const ARTISAN_SIGNUP_DRAFT_KEY = "menao.inscription-pro.v1";

export const ARTISAN_SIGNUP_STEPS = ["metiers", "entreprise", "zone", "compte"] as const;
export type ArtisanSignupStep = (typeof ARTISAN_SIGNUP_STEPS)[number];

/** Zone choisie à l'inscription : les listes de communes se règlent ensuite (ADR 0213). */
export const SIGNUP_ZONE_MODES = ["rayon", "departements", "regions", "france"] as const;
export type SignupZoneMode = (typeof SIGNUP_ZONE_MODES)[number];

/** Rayons d'intervention proposés (zone en rayon, F-14). */
export const ZONE_RADIUS_OPTIONS_KM = [10, 20, 30, 50, 75, 100] as const;
export const SIGNUP_DEFAULT_RADIUS_KM = 20;

export type ArtisanSignupManager = { firstName: string; lastName: string; role: string | null };

/** Entreprise retrouvée dans l'Annuaire des entreprises, ou SIRET saisi à la main. */
export type ArtisanSignupCompany = {
  siret: string;
  name: string | null;
  legalFormCode: string | null;
  apeCode: string | null;
  creationYear: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  citycode: string | null;
  lon: number | null;
  lat: number | null;
  managers: ArtisanSignupManager[];
};

export type ArtisanSignupBase = { label: string; citycode: string; lon: number; lat: number };

export type ArtisanSignupDraft = {
  tradeCodes: string[];
  company: ArtisanSignupCompany | null;
  isDirigeant: boolean | null;
  assujettiTva: boolean | null;
  base: ArtisanSignupBase | null;
  zoneMode: SignupZoneMode;
  radiusKm: number;
  /** Départements ou régions choisis (ADR 0213), selon `zoneMode`. */
  territories: string[];
};

export function emptySignupDraft(): ArtisanSignupDraft {
  return {
    tradeCodes: [],
    company: null,
    isDirigeant: null,
    assujettiTva: null,
    base: null,
    zoneMode: "rayon",
    radiusKm: SIGNUP_DEFAULT_RADIUS_KM,
    territories: [],
  };
}

export function signupStepDone(step: ArtisanSignupStep, draft: ArtisanSignupDraft): boolean {
  switch (step) {
    case "metiers":
      return draft.tradeCodes.length > 0;
    case "entreprise":
      return draft.company !== null && draft.isDirigeant !== null && draft.assujettiTva !== null;
    case "zone":
      if (draft.base === null) return false;
      if (draft.zoneMode === "rayon") {
        return (ZONE_RADIUS_OPTIONS_KM as readonly number[]).includes(draft.radiusKm);
      }
      return draft.zoneMode === "france" || draft.territories.length > 0;
    case "compte":
      return false;
  }
}

/** Zone du brouillon, sous la forme lue par `signupZoneSchema` (@menao/validation). */
export function signupZoneInput(draft: ArtisanSignupDraft) {
  if (draft.base === null) return null;
  const base = {
    mode: draft.zoneMode,
    baseLabel: draft.base.label,
    baseCitycode: draft.base.citycode,
    lon: draft.base.lon,
    lat: draft.base.lat,
  };
  if (draft.zoneMode === "rayon") return { ...base, radiusKm: draft.radiusKm };
  return draft.zoneMode === "france" ? base : { ...base, territories: draft.territories };
}

export function firstOpenSignupStep(draft: ArtisanSignupDraft): ArtisanSignupStep {
  return ARTISAN_SIGNUP_STEPS.find((step) => !signupStepDone(step, draft)) ?? "compte";
}

/** Adresse de départ de la zone : le siège, s'il est localisé. */
export function signupBaseFromCompany(company: ArtisanSignupCompany): ArtisanSignupBase | null {
  if (company.citycode === null || company.lon === null || company.lat === null) return null;
  const label =
    company.address ??
    [company.city, company.postcode && `(${company.postcode})`].filter(Boolean).join(" ");
  if (!label) return null;
  return { label, citycode: company.citycode, lon: company.lon, lat: company.lat };
}

export function isArtisanFinalizePath(target: string): boolean {
  return (
    target === ARTISAN_SIGNUP_FINALIZE_PATH || target.startsWith(`${ARTISAN_SIGNUP_FINALIZE_PATH}?`)
  );
}

// Relecture défensive du brouillon : il vient du navigateur, chaque champ est revérifié.
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 300): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

function parseCompany(v: unknown): ArtisanSignupCompany | null {
  if (!isObj(v)) return null;
  const siret = str(v.siret);
  if (!siret || !/^\d{14}$/.test(siret)) return null;
  const managers = Array.isArray(v.managers)
    ? v.managers.flatMap((m) => {
        if (!isObj(m)) return [];
        const firstName = str(m.firstName, 100);
        const lastName = str(m.lastName, 100);
        return firstName && lastName ? [{ firstName, lastName, role: str(m.role, 100) }] : [];
      })
    : [];
  return {
    siret,
    name: str(v.name, 200),
    legalFormCode: str(v.legalFormCode, 10),
    apeCode: str(v.apeCode, 10),
    creationYear: str(v.creationYear, 4),
    address: str(v.address),
    postcode: str(v.postcode, 10),
    city: str(v.city, 100),
    citycode: str(v.citycode, 5),
    lon: num(v.lon),
    lat: num(v.lat),
    managers,
  };
}

function parseBase(v: unknown): ArtisanSignupBase | null {
  if (!isObj(v)) return null;
  const label = str(v.label);
  const citycode = str(v.citycode, 5);
  const lon = num(v.lon);
  const lat = num(v.lat);
  return label && citycode && lon !== null && lat !== null ? { label, citycode, lon, lat } : null;
}

export function parseSignupDraft(value: unknown): ArtisanSignupDraft {
  const draft = emptySignupDraft();
  if (!isObj(value)) return draft;
  const radius = num(value.radiusKm);
  const zoneMode = SIGNUP_ZONE_MODES.find((mode) => mode === value.zoneMode) ?? draft.zoneMode;
  return {
    tradeCodes: Array.isArray(value.tradeCodes)
      ? [
          ...new Set(
            value.tradeCodes.filter(
              (c): c is string => typeof c === "string" && /^[a-z0-9-]{1,60}$/.test(c),
            ),
          ),
        ]
      : [],
    company: parseCompany(value.company),
    isDirigeant: bool(value.isDirigeant),
    assujettiTva: bool(value.assujettiTva),
    base: parseBase(value.base),
    radiusKm:
      radius !== null && (ZONE_RADIUS_OPTIONS_KM as readonly number[]).includes(radius)
        ? radius
        : draft.radiusKm,
    zoneMode,
    territories:
      (zoneMode === "departements" || zoneMode === "regions") && Array.isArray(value.territories)
        ? [
            ...new Set(
              value.territories.filter(
                (c): c is string => typeof c === "string" && isTerritoryCode(zoneMode, c),
              ),
            ),
          ]
        : [],
  };
}
