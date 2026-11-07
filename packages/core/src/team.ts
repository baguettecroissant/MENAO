/**
 * Comptes d'équipe (F-89, ADR 0240) : le patron (titulaire de la fiche artisan) invite ses
 * salariés, chefs d'équipe ou ouvriers, dans la limite des comptes de sa formule (patron compris :
 * 1 en Base, 3 en Premium, 10 en Entreprise, `plans.limites.comptes`). Formule réduite : les
 * derniers invités sont suspendus (jamais supprimés) jusqu'au choix du patron.
 */

export const TEAM_ROLES = ["chef", "ouvrier"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

/** Place dans l'entreprise : le patron ou un membre de son équipe. */
export type TeamPosition = "patron" | TeamRole;

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === "string" && (TEAM_ROLES as readonly string[]).includes(value);
}

/**
 * État d'un membre : actif, invitation pas encore utilisée, suspendu faute de place (retour
 * automatique dès qu'une place se libère) ou suspendu par le patron.
 */
export type TeamMemberState = "actif" | "en_attente" | "suspendu_places" | "suspendu_patron";

export function teamMemberState(member: {
  pending: boolean;
  suspension: "places" | "patron" | null;
}): TeamMemberState {
  if (member.suspension === "places") return "suspendu_places";
  if (member.suspension === "patron") return "suspendu_patron";
  return member.pending ? "en_attente" : "actif";
}

/** Places encore libres (jamais négatif). */
export function teamSeatsLeft(team: { seats: number; used: number }): number {
  return Math.max(0, team.seats - team.used);
}

/** Comptes d'équipe inclus dans la formule : plus d'une place (Premium et Entreprise). */
export function teamIncluded(team: { seats: number }): boolean {
  return team.seats > 1;
}

/** Contexte de l'espace pro (`my_team_context`) : fiche, place, accès suspendu, entreprise. */
export type TeamContext = {
  /** Fiche de l'entreprise ; null pour un membre suspendu. */
  artisanId: string | null;
  position: TeamPosition;
  suspended: boolean;
  company: string | null;
};

const obj = (raw: unknown): Record<string, unknown> =>
  raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
const str = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const int = (value: unknown, min: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.floor(value)) : min;

/** Null : ni patron ni membre (compte sans fiche artisan). */
export function parseTeamContext(raw: unknown): TeamContext | null {
  const r = obj(raw);
  const position = r.role === "patron" || isTeamRole(r.role) ? (r.role as TeamPosition) : null;
  if (!position) return null;
  const suspended = position !== "patron" && r.suspendu === true;
  const artisanId = suspended ? null : str(r.artisan_id);
  if (!suspended && !artisanId) return null;
  return { artisanId, position, suspended, company: str(r.entreprise) };
}

export type TeamMember = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: TeamRole;
  since: string | null;
  state: TeamMemberState;
};

/** « Mon équipe » du patron (`my_team`) : places de la formule, comptes utilisés, membres. */
export type Team = {
  company: string | null;
  plan: string | null;
  seats: number;
  used: number;
  members: TeamMember[];
};

export function parseTeam(raw: unknown): Team | null {
  const r = obj(raw);
  if (typeof r.places !== "number") return null;
  const members = (Array.isArray(r.membres) ? r.membres : []).flatMap((row): TeamMember[] => {
    const m = obj(row);
    const userId = str(m.user_id);
    if (!userId || !isTeamRole(m.role)) return [];
    const suspension = m.suspension === "places" || m.suspension === "patron" ? m.suspension : null;
    return [
      {
        userId,
        firstName: str(m.prenom),
        lastName: str(m.nom),
        email: str(m.email),
        role: m.role,
        since: str(m.depuis),
        state: teamMemberState({ pending: m.en_attente === true, suspension }),
      },
    ];
  });
  return {
    company: str(r.entreprise),
    plan: str(r.formule),
    seats: int(r.places, 1),
    used: int(r.utilisees, 1),
    members,
  };
}

/** Nom affiché d'un membre : prénom et nom, sinon l'adresse e-mail. */
export function teamMemberName(member: Pick<TeamMember, "firstName" | "lastName" | "email">) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email || "";
}

/**
 * Droits de chaque place (ADR 0241), mêmes règles que la base : le patron peut tout ; le chef
 * d'équipe encadre (tous les chantiers, demandes, argent, agenda, secrétaire) sans les réglages du
 * patron ; l'ouvrier ne travaille que sur les chantiers qui lui sont attribués (journal, photos,
 * messages, rendez-vous), sans aucun montant.
 */
export const TEAM_PERMISSIONS = [
  /** Tous les chantiers de l'entreprise (sinon ceux qui lui sont attribués). */
  "allChantiers",
  /** Devis, factures, paiements, relances, dépenses, suivi de l'argent. */
  "money",
  /** Demandes reçues : accepter, refuser, proposer des créneaux. */
  "requests",
  /** Planning, rendez-vous, démarrage, fin, réception, annulation d'un chantier. */
  "chantierDecisions",
  /** Choisir qui travaille sur un chantier. */
  "assignChantiers",
  /** Créneaux bloqués, absences, horaires, disponibilité, lien d'abonnement à l'agenda. */
  "agenda",
  /** Secrétaire : réglages et messages pris. */
  "secretary",
  /** Abonnement, paiements en ligne (Stripe), recharges de la secrétaire. */
  "subscription",
  /** Export pour le comptable. */
  "accounting",
  /** Ma vitrine : fiche, métiers, zone, réalisations, certifications, réponses aux avis. */
  "storefront",
  /** Dossier et documents de l'entreprise. */
  "dossier",
  /** Mon équipe : invitations, rôles, suspensions. */
  "team",
  /** Parrainage, cadeau de bienvenue, récompenses. */
  "referral",
] as const;
export type TeamPermission = (typeof TEAM_PERMISSIONS)[number];

const CHEF_PERMISSIONS: ReadonlySet<TeamPermission> = new Set<TeamPermission>([
  "allChantiers",
  "money",
  "requests",
  "chantierDecisions",
  "assignChantiers",
  "agenda",
  "secretary",
]);

/** Ce que peut faire une place ; rien sans place (compte sans fiche ou membre suspendu). */
export function teamCan(
  position: TeamPosition | null | undefined,
  permission: TeamPermission,
): boolean {
  if (position === "patron") return true;
  if (position === "chef") return CHEF_PERMISSIONS.has(permission);
  return false;
}

/** Membre de l'équipe pour un chantier (`chantier_team`, ADR 0241) : attribué ou non. */
export type ChantierTeamMember = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: TeamRole;
  assigned: boolean;
};

export function parseChantierTeam(raw: unknown): ChantierTeamMember[] {
  return (Array.isArray(raw) ? raw : []).flatMap((row): ChantierTeamMember[] => {
    const m = obj(row);
    const userId = str(m.user_id);
    if (!userId || !isTeamRole(m.role)) return [];
    return [
      {
        userId,
        firstName: str(m.prenom),
        lastName: str(m.nom),
        role: m.role,
        assigned: m.affecte === true,
      },
    ];
  });
}

/** Ce que la place permet sur la fiche d'un chantier (ADR 0241), pour le site et l'application. */
export type ChantierRights = {
  /** Devis, acompte, échéancier, factures, solde. */
  money: boolean;
  /** Rendez-vous, démarrage, fin, réception, annulation, expertise, note du client. */
  decisions: boolean;
  /** Réponse aux avis et signalement d'un avis (vitrine). */
  replyReviews: boolean;
  /** Choisir qui travaille sur le chantier. */
  assign: boolean;
};

export function chantierRights(position: TeamPosition | null | undefined): ChantierRights {
  return {
    money: teamCan(position, "money"),
    decisions: teamCan(position, "chantierDecisions"),
    replyReviews: teamCan(position, "storefront"),
    assign: teamCan(position, "assignChantiers"),
  };
}
