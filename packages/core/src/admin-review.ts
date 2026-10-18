/**
 * « Ce qui reste à vérifier » en tête de la fiche d'un artisan dans le back-office (ADR 0133) :
 * documents en attente, manquants ou refusés, certifications à vérifier, SIRET, charte.
 */
import { documentIsValid, requiredDocumentTypes, type DocumentSnapshot } from "./onboarding";

export type AdminReviewInput = {
  documents: readonly {
    type: string;
    status: string;
    created_at: string;
    date_emission: string | null;
    date_fin: string | null;
  }[];
  decennaleExempt: boolean;
  /** Dossier déjà validé (ou suspendu) : les règles de l'envoi (Kbis récent…) ne s'appliquent plus. */
  validated: boolean;
  certifications: readonly { verified_at: string | null }[];
  siretVerified: boolean;
  sireneActive: boolean | null;
  charterSigned: boolean;
};

export type AdminReviewChecklist = {
  pendingDocuments: number;
  missingDocuments: number;
  refusedDocuments: number;
  pendingCertifications: number;
  siret: "ok" | "unchecked" | "inactive";
  charterSigned: boolean;
  /** Plus rien à vérifier : documents exigés valides, SIRET actif, charte signée. */
  ready: boolean;
};

export function adminReviewChecklist(
  a: AdminReviewInput,
  today: Date = new Date(),
): AdminReviewChecklist {
  let pendingDocuments = 0;
  let missingDocuments = 0;
  let refusedDocuments = 0;
  for (const type of requiredDocumentTypes(a)) {
    const rows = a.documents
      .filter((d) => d.type === type && d.status !== "remplace")
      .sort((x, y) => y.created_at.localeCompare(x.created_at));
    if (rows.some((d) => d.status === "en_attente")) {
      pendingDocuments += 1;
      continue;
    }
    const valid = rows.find((d) => d.status === "valide");
    const snapshot: DocumentSnapshot | undefined = valid
      ? { status: "valide", dateEmission: valid.date_emission, dateFin: valid.date_fin }
      : undefined;
    if (valid && (a.validated || documentIsValid(type, snapshot, today))) continue;
    if (rows[0]?.status === "refuse") refusedDocuments += 1;
    else if (!a.validated) missingDocuments += 1;
  }
  const siret = !a.siretVerified ? "unchecked" : a.sireneActive === false ? "inactive" : "ok";
  const pendingCertifications = a.certifications.filter((c) => c.verified_at === null).length;
  return {
    pendingDocuments,
    missingDocuments,
    refusedDocuments,
    pendingCertifications,
    siret,
    charterSigned: a.charterSigned,
    ready:
      pendingDocuments === 0 &&
      missingDocuments === 0 &&
      refusedDocuments === 0 &&
      siret === "ok" &&
      a.charterSigned,
  };
}
