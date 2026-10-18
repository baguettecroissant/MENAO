import {
  PROFILE_GOOD_PRESENTATION_LENGTH,
  availability,
  documentState,
  documentsToRenew,
  requiredDocumentTypes,
  type ArtisanOnboardingSnapshot,
} from "@menao/core";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "./dates";

/**
 * État affiché à droite de chaque ligne de « Mon profil » (ADR 0129) : le menu sert aussi de bilan
 * de santé (« À jour », « 1 à renouveler », « 2 à répondre »…). Aucun accès réseau : calculé à
 * partir du dossier et de la fiche déjà chargés.
 */
export type HubTone = "success" | "warning" | "danger" | "neutral";
export type HubStatus = { text: string; tone: HubTone } | null;

export type HubRow =
  | "photo"
  | "portfolio"
  | "reviews"
  | "grade"
  | "company"
  | "trades"
  | "zone"
  | "availability"
  | "documents"
  | "charter"
  | "payments";

export type HubFacts = {
  snapshot: ArtisanOnboardingSnapshot;
  /** Dossier déjà validé (ou suspendu) : seules les échéances comptent pour les documents. */
  validated: boolean;
  /** Documents déposés (hors « remplacé »), pour les échéances. */
  documents: readonly { type: string; status: string; date_fin: string | null }[];
  photoCount: number;
  reviewsToAnswer: number;
  reviewCount: number;
  level: number | null;
  hasRge: boolean;
  paused: boolean;
  availableFrom: string | null;
  /** Date du jour à Paris (AAAA-MM-JJ). */
  today: string;
};

const v = fr.proHub.values;

export function hubStatuses(f: HubFacts, now: Date = new Date()): Record<HubRow, HubStatus> {
  const s = f.snapshot;
  return {
    photo:
      s.hasAvatar && s.presentationLength >= PROFILE_GOOD_PRESENTATION_LENGTH
        ? { text: v.upToDate, tone: "success" }
        : { text: v.toComplete, tone: "warning" },
    portfolio: { text: v.photos(f.photoCount), tone: f.photoCount === 0 ? "warning" : "neutral" },
    reviews:
      f.reviewsToAnswer > 0
        ? { text: v.toAnswer(f.reviewsToAnswer), tone: "danger" }
        : { text: v.reviews(f.reviewCount), tone: "neutral" },
    grade: f.level !== null ? { text: v.level(f.level), tone: "neutral" } : null,
    company:
      s.siretVerified && s.sireneActive
        ? { text: v.verifiedCompany, tone: "success" }
        : { text: v.toVerify, tone: "warning" },
    trades:
      s.tradeCount === 0
        ? { text: v.toComplete, tone: "warning" }
        : { text: v.trades(s.tradeCount, f.hasRge), tone: "neutral" },
    zone: zoneStatus(s),
    availability: availabilityStatus(f),
    documents: documentsStatus(f, now),
    charter: s.charterAccepted
      ? { text: v.signed, tone: "success" }
      : { text: v.toSign, tone: "warning" },
    payments: s.connectChargesEnabled
      ? { text: v.active, tone: "success" }
      : { text: v.toActivate, tone: "warning" },
  };
}

function zoneStatus(s: ArtisanOnboardingSnapshot): HubStatus {
  if (s.zoneMode === "rayon" && s.hasBaseLocation && s.radiusKm) {
    return { text: v.radius(s.radiusKm), tone: "neutral" };
  }
  if (s.zoneMode === "communes" && s.communeCount > 0) {
    return { text: v.communes(s.communeCount), tone: "neutral" };
  }
  return { text: v.toDefine, tone: "warning" };
}

function availabilityStatus(f: HubFacts): HubStatus {
  const a = availability({ paused: f.paused, availableFrom: f.availableFrom }, f.today);
  if (a.kind === "paused") return { text: v.paused, tone: "warning" };
  if (a.kind === "from") return { text: v.from(formatLongDate(a.date)), tone: "neutral" };
  return { text: v.available, tone: "success" };
}

/**
 * Documents : à renouveler bientôt d'abord (relances J-30, J-15, J-7), puis refusés, en
 * vérification ; sinon « À jour ». Tant que le dossier n'est pas validé, les règles de l'envoi
 * s'appliquent aussi (Kbis de moins de 3 mois, document manquant) ; une fois validé, seules les
 * échéances surveillées comptent.
 */
function documentsStatus(f: HubFacts, now: Date): HubStatus {
  const renew = documentsToRenew(f.documents, now).length;
  if (renew > 0) return { text: v.toRenew(renew), tone: "warning" };
  const states = requiredDocumentTypes(f.snapshot).map((type) =>
    documentState(type, f.snapshot.documents[type], now),
  );
  const refused = states.filter((st) => st === "refuse").length;
  if (refused > 0) return { text: v.refused(refused), tone: "danger" };
  if (!f.validated && states.some((st) => st === "missing" || st === "a_refaire")) {
    return { text: v.toComplete, tone: "warning" };
  }
  if (f.documents.some((d) => d.status === "en_attente")) {
    return { text: v.inReview, tone: "neutral" };
  }
  return { text: v.upToDate, tone: "success" };
}
