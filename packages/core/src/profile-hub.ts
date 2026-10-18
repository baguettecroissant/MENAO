/**
 * États des rubriques de « Mon profil » de l'artisan (ADR 0129, 0131), communs au site et à
 * l'application : le menu sert aussi de bilan de santé. Codes seulement ; chaque application
 * les traduit en textes (« À jour », « 1 à renouveler »…).
 */
import { documentsToRenew } from "./expiry";
import { availability } from "./matching";
import { documentState, requiredDocumentTypes, type ArtisanOnboardingSnapshot } from "./onboarding";
import { PROFILE_GOOD_PRESENTATION_LENGTH } from "./profile";

export type ProfileHubTone = "success" | "warning" | "danger" | "neutral";

export type ProfileHubRow =
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

export type ProfileHubStatus = { tone: ProfileHubTone } & (
  | {
      code:
        | "upToDate"
        | "toComplete"
        | "verifiedCompany"
        | "toVerify"
        | "toDefine"
        | "paused"
        | "available"
        | "inReview"
        | "signed"
        | "toSign"
        | "active"
        | "toActivate";
    }
  | {
      code: "photos" | "toAnswer" | "reviews" | "level" | "communes" | "toRenew" | "refused";
      n: number;
    }
  | { code: "radius"; km: number }
  | { code: "trades"; n: number; rge: boolean }
  | { code: "from"; date: string }
);

export type ProfileHubFacts = {
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

export function profileHubStatuses(
  f: ProfileHubFacts,
  now: Date = new Date(),
): Record<ProfileHubRow, ProfileHubStatus | null> {
  const s = f.snapshot;
  return {
    photo:
      s.hasAvatar && s.presentationLength >= PROFILE_GOOD_PRESENTATION_LENGTH
        ? { code: "upToDate", tone: "success" }
        : { code: "toComplete", tone: "warning" },
    portfolio: {
      code: "photos",
      n: f.photoCount,
      tone: f.photoCount === 0 ? "warning" : "neutral",
    },
    reviews:
      f.reviewsToAnswer > 0
        ? { code: "toAnswer", n: f.reviewsToAnswer, tone: "danger" }
        : { code: "reviews", n: f.reviewCount, tone: "neutral" },
    grade: f.level !== null ? { code: "level", n: f.level, tone: "neutral" } : null,
    company:
      s.siretVerified && s.sireneActive
        ? { code: "verifiedCompany", tone: "success" }
        : { code: "toVerify", tone: "warning" },
    trades:
      s.tradeCount === 0
        ? { code: "toComplete", tone: "warning" }
        : { code: "trades", n: s.tradeCount, rge: f.hasRge, tone: "neutral" },
    zone: zoneStatus(s),
    availability: availabilityStatus(f),
    documents: documentsStatus(f, now),
    charter: s.charterAccepted
      ? { code: "signed", tone: "success" }
      : { code: "toSign", tone: "warning" },
    payments: s.connectChargesEnabled
      ? { code: "active", tone: "success" }
      : { code: "toActivate", tone: "warning" },
  };
}

function zoneStatus(s: ArtisanOnboardingSnapshot): ProfileHubStatus {
  if (s.zoneMode === "rayon" && s.hasBaseLocation && s.radiusKm) {
    return { code: "radius", km: s.radiusKm, tone: "neutral" };
  }
  if (s.zoneMode === "communes" && s.communeCount > 0) {
    return { code: "communes", n: s.communeCount, tone: "neutral" };
  }
  return { code: "toDefine", tone: "warning" };
}

function availabilityStatus(f: ProfileHubFacts): ProfileHubStatus {
  const a = availability({ paused: f.paused, availableFrom: f.availableFrom }, f.today);
  if (a.kind === "paused") return { code: "paused", tone: "warning" };
  if (a.kind === "from") return { code: "from", date: a.date, tone: "neutral" };
  return { code: "available", tone: "success" };
}

/**
 * Documents : à renouveler bientôt d'abord (relances J-30, J-15, J-7), puis refusés, en
 * vérification ; sinon « À jour ». Tant que le dossier n'est pas validé, les règles de l'envoi
 * s'appliquent aussi (Kbis de moins de 3 mois, document manquant) ; une fois validé, seules les
 * échéances surveillées comptent.
 */
function documentsStatus(f: ProfileHubFacts, now: Date): ProfileHubStatus {
  const renew = documentsToRenew(f.documents, now).length;
  if (renew > 0) return { code: "toRenew", n: renew, tone: "warning" };
  const states = requiredDocumentTypes(f.snapshot).map((type) =>
    documentState(type, f.snapshot.documents[type], now),
  );
  const refused = states.filter((st) => st === "refuse").length;
  if (refused > 0) return { code: "refused", n: refused, tone: "danger" };
  if (!f.validated && states.some((st) => st === "missing" || st === "a_refaire")) {
    return { code: "toComplete", tone: "warning" };
  }
  if (f.documents.some((d) => d.status === "en_attente"))
    return { code: "inReview", tone: "neutral" };
  return { code: "upToDate", tone: "success" };
}
