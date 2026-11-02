/**
 * Fiche de vérification au registre (ADR 0217) : rangée dans le dossier de l'artisan à la place du
 * Kbis quand MENAO a vérifié l'entreprise dans l'annuaire public des entreprises. Ce n'est ni un
 * extrait Kbis ni une attestation de l'INPI : la fiche récapitule ce que MENAO a lu, où et quand.
 * Testé à part du dessin. Les imports portent leur extension : ce paquet est aussi chargé par Deno.
 */
import { FORMES_JURIDIQUES } from "../../core/src/legal-forms.ts";
import { dateLong, winAnsi } from "./format.ts";

export type RegistryCheckPdfData = {
  siren: string;
  siret: string;
  companyName: string;
  legalFormCode: string | null;
  /** AAAA-MM-JJ. */
  creationDate: string | null;
  /** Dirigeant publié qui correspond à l'inscrit. */
  manager: { firstNames: string[]; lastName: string; role: string | null };
  /** Inscrit sur MENAO. */
  member: { firstName: string; lastName: string };
  /** Horodatage ISO de la vérification. */
  checkedAt: string;
};

export type RegistryCheckModel = {
  title: string;
  subtitle: string;
  rows: [label: string, value: string][];
  resultTitle: string;
  result: string[];
  sourcesTitle: string;
  sources: string[];
  notice: string;
  footer: string;
};

export const REGISTRY_TEXTS = {
  title: "FICHE DE VÉRIFICATION AU REGISTRE",
  subtitle: "Entreprise vérifiée par MENAO dans les registres publics",
  company: "Entreprise",
  siren: "SIREN",
  siret: "SIRET",
  legalForm: "Forme juridique",
  creation: "Date de création",
  status: "État",
  active: "Active",
  checked: "Vérification",
  resultTitle: "Résultat",
  resultActive: "Entreprise active au registre national des entreprises et au répertoire Sirene.",
  resultManager: (manager: string, role: string | null, member: string) =>
    `Dirigeant publié : ${manager}${role ? ` (${role})` : ""}. Inscrit sur MENAO : ${member}.`,
  sourcesTitle: "Sources",
  sources: [
    "API Recherche d'entreprises (annuaire-entreprises.data.gouv.fr), qui réunit le registre national des entreprises (INPI) et le répertoire Sirene (INSEE).",
  ],
  notice:
    "Cette fiche n'est ni un extrait Kbis ni une attestation d'immatriculation de l'INPI. Elle récapitule les informations publiques lues par MENAO à la date indiquée, pour la vérification du dossier de l'entreprise.",
  checkedAt: (when: string) => `Vérification du ${when}`,
} as const;

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toUpperCase());

export function registryCheckModel(data: RegistryCheckPdfData): RegistryCheckModel {
  const t = REGISTRY_TEXTS;
  const when = dateTime.format(new Date(data.checkedAt));
  const manager = `${data.manager.firstNames.map(titleCase).join(" ")} ${data.manager.lastName.toUpperCase()}`;
  const member = `${data.member.firstName} ${data.member.lastName.toUpperCase()}`;
  const legalForm = data.legalFormCode
    ? (FORMES_JURIDIQUES[data.legalFormCode] ?? `Catégorie ${data.legalFormCode}`)
    : null;
  const rows: [string, string][] = [
    [t.company, data.companyName],
    [t.siren, data.siren],
    [t.siret, data.siret],
    ...(legalForm ? [[t.legalForm, legalForm] as [string, string]] : []),
    ...(data.creationDate ? [[t.creation, dateLong(data.creationDate)] as [string, string]] : []),
    [t.status, t.active],
    [t.checked, when],
  ];
  return {
    title: winAnsi(t.title),
    subtitle: winAnsi(t.subtitle),
    rows: rows.map(([label, value]) => [winAnsi(label), winAnsi(value)]),
    resultTitle: winAnsi(t.resultTitle),
    result: [t.resultActive, t.resultManager(manager, data.manager.role, member)].map(winAnsi),
    sourcesTitle: winAnsi(t.sourcesTitle),
    sources: t.sources.map(winAnsi),
    notice: winAnsi(t.notice),
    footer: winAnsi(`MENAO · ${t.checkedAt(when)}`),
  };
}

/** Nom du fichier dans le stockage des documents : « kbis-registre-AAAAMMJJ-HHMMSS.pdf ». */
export function registryCheckFilename(checkedAt: string): string {
  const stamp = checkedAt.replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
  return `kbis-registre-${stamp}.pdf`;
}
