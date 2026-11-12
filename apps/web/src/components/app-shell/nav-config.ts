import {
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  Cpu,
  CalendarDays,
  ClipboardList,
  Eye,
  FileText,
  Handshake,
  HardHat,
  Headset,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListTree,
  Map as MapIcon,
  MessageCircle,
  QrCode,
  Repeat,
  Rocket,
  ScrollText,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Target,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { teamCan, type TeamPermission, type TeamPosition } from "@menao/core";
import { fr } from "@/i18n/fr";

// « exemples » : aperçu de l'espace pro rempli d'exemples (ADR 0184). « commercial » : commerciaux
// de terrain (ADR 0205).
export type Space = "client" | "pro" | "admin" | "exemples" | "commercial";
export type BadgeKey =
  | "actions"
  | "messages"
  | "requests"
  | "quotes"
  | "reviews"
  | "dossiers"
  | "conformite"
  | "tickets"
  | "secretary";
export type Badges = Partial<Record<BadgeKey, number>>;

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Compteur d'éléments à traiter affiché à côté du libellé. */
  badge?: BadgeKey;
  /** Rubrique active seulement sur son adresse exacte (et sur `also`). */
  exact?: boolean;
  /** Autres débuts d'adresse rattachés à la rubrique (fiches d'un chantier, d'un devis…). */
  also?: readonly string[];
  /** Back-office : rubrique ouverte au rôle support (ADR 0049) ; les autres sont réservées aux admins. */
  support?: boolean;
  /** Espace pro : rubrique réservée aux places qui ont ce droit (ADR 0241). */
  team?: TeamPermission;
};
export type NavSection = { label?: string; items: readonly NavItem[] };

/** Menu replié ou déplié, mémorisé dans un cookie pour un premier affichage sans saut. */
export const MENU_COOKIE = "menao_menu";

export const SPACE_HOME: Record<Space, string> = {
  client: "/mon-espace",
  pro: "/pro/tableau-de-bord",
  admin: "/admin",
  exemples: "/pro/decouvrir/tableau-de-bord",
  commercial: "/commercial",
};

/** Messages, accessibles depuis la barre du haut sur mobile (ADR 0043). */
export const SPACE_MESSAGES: Partial<Record<Space, string>> = {
  client: "/mon-espace/messages",
  pro: "/pro/messages",
};

// Menu regroupé (ADR 0188) : huit rubriques depuis la Secrétaire (ADR 0244). « Argent » réunit devis,
// factures et dépenses ; « Ma vitrine », fiche, avis et grade (onglets en haut de ces pages).
// « Mon profil » (entreprise, documents, paiements) en dessous.
const PRO_NAV: readonly NavSection[] = [
  {
    items: [
      { href: "/pro/tableau-de-bord", label: fr.pro.space.home, icon: LayoutGrid },
      {
        href: "/pro/demandes",
        label: fr.pro.space.requests,
        icon: Inbox,
        badge: "requests",
        team: "requests",
      },
      { href: "/pro/chantiers", label: fr.pro.space.chantiers, icon: HardHat },
      { href: "/pro/agenda", label: fr.pro.space.agenda, icon: CalendarDays },
      {
        href: "/pro/messages",
        label: fr.pro.space.messages,
        icon: MessageCircle,
        badge: "messages",
      },
      // Secrétaire dédiée (ADR 0244) : rubrique propre, pastille des appels à traiter.
      {
        href: "/pro/secretaire",
        label: fr.pro.space.secretary,
        icon: Headset,
        badge: "secretary",
        team: "secretary",
      },
      {
        href: "/pro/devis",
        label: fr.pro.space.money,
        icon: Wallet,
        badge: "quotes",
        also: ["/pro/factures", "/pro/depenses", "/pro/comptable"],
        team: "money",
      },
      {
        href: "/pro/profil",
        label: fr.pro.space.storefront,
        icon: Store,
        badge: "reviews",
        also: ["/pro/avis", "/pro/grade"],
        team: "storefront",
      },
    ],
  },
  {
    label: fr.appShell.sections.proAccount,
    items: [
      // « Mon profil » regroupe entreprise, métiers, zone, documents et paiements (ADR 0131).
      {
        href: "/pro/mon-profil",
        label: fr.pro.space.myProfile,
        icon: UserRound,
        also: ["/pro/onboarding"],
      },
    ],
  },
];

/**
 * Rubriques de chaque espace (ADR 0035), dans l'ordre d'usage. Les notifications passent par la
 * cloche de la barre du haut et par le menu du compte.
 */
export const NAV: Record<Space, readonly NavSection[]> = {
  client: [
    {
      items: [
        {
          href: "/mon-espace",
          label: fr.clientApp.chantiers,
          icon: ClipboardList,
          badge: "actions",
          exact: true,
          also: [
            "/mon-espace/chantiers",
            "/mon-espace/devis",
            "/mon-espace/nouvelle-demande",
            "/recherche",
          ],
        },
        {
          href: "/mon-espace/messages",
          label: fr.clientApp.messagesLink,
          icon: MessageCircle,
          badge: "messages",
        },
        { href: "/mon-espace/documents", label: fr.clientApp.documents, icon: FileText },
      ],
    },
  ],
  pro: PRO_NAV,
  // Exemples (ADR 0184) : les mêmes rubriques que l'espace pro, sous /pro/decouvrir.
  exemples: PRO_NAV.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      href: item.href.replace(/^\/pro\//, "/pro/decouvrir/"),
      also: item.also?.map((href) => href.replace(/^\/pro\//, "/pro/decouvrir/")),
    })),
  })),
  // Back-office rangé en six sections (ADR 0283, après l'ADR 0133) : un nom par chose, le nom du
  // menu est le titre de la page ; les rubriques à plusieurs pages ont des onglets
  // (components/admin/admin-tabs.tsx). La boîte de réception est la seule rubrique du support.
  admin: [
    {
      items: [
        {
          href: "/admin",
          label: fr.admin.nav.overview,
          icon: LayoutDashboard,
          exact: true,
          // Onglet « Toute l'activité » (ADR 0146).
          also: ["/admin/activite"],
        },
        {
          href: "/admin/tickets",
          label: fr.admin.nav.tickets,
          icon: Inbox,
          badge: "tickets",
          support: true,
        },
      ],
    },
    {
      label: fr.appShell.sections.artisans,
      items: [
        // Onglets par statut, dont « Inscriptions en cours » (ADR 0219).
        {
          href: "/admin/artisans",
          label: fr.admin.nav.artisans,
          icon: ShieldCheck,
          badge: "dossiers",
        },
        // Renouvellements, échéances et contrôles aléatoires du mois (ADR 0121).
        {
          href: "/admin/conformite",
          label: fr.admin.nav.compliance,
          icon: CalendarClock,
          badge: "conformite",
        },
        // Objectif de demandes par artisan (ADR 0282).
        { href: "/admin/objectifs", label: fr.admin.nav.leads, icon: Target },
      ],
    },
    {
      label: fr.appShell.sections.clients,
      items: [
        { href: "/admin/demandes", label: fr.admin.nav.requests, icon: Send },
        { href: "/admin/chantiers", label: fr.admin.nav.chantiers, icon: HardHat },
        { href: "/admin/personnes", label: fr.admin.nav.people, icon: Users },
      ],
    },
    {
      label: fr.appShell.sections.growth,
      items: [
        // Équipe de lancement et planning de chacun (F-66, ADR 0208).
        { href: "/admin/lancement", label: fr.admin.nav.launch, icon: Rocket },
        // Carte des artisans et de la demande, entonnoir des recherches (ADR 0181).
        { href: "/admin/marche", label: fr.admin.nav.market, icon: MapIcon },
        // Commerciaux (ADR 0205), Partenaires (ADR 0136) et Parrainages (ADR 0143), en onglets.
        {
          href: "/admin/commerciaux",
          label: fr.admin.nav.contributors,
          icon: Handshake,
          also: ["/admin/partenaires", "/admin/parrainages"],
        },
      ],
    },
    {
      // Lecture seule (ADR 0051) : MENAO n'encaisse que l'abonnement des artisans.
      label: fr.appShell.sections.money,
      items: [
        { href: "/admin/paiements", label: fr.admin.nav.payments, icon: Wallet },
        { href: "/admin/abonnements", label: fr.admin.nav.subscriptions, icon: Repeat },
      ],
    },
    {
      // Listes de référence, journal d'audit et suivi technique (ADR 0052).
      label: fr.appShell.sections.system,
      items: [
        // Réglages de la plateforme et équipe MENAO, en onglets (ADR 0284).
        { href: "/admin/reglages", label: fr.admin.nav.settings, icon: SlidersHorizontal },
        { href: "/admin/referentiels", label: fr.admin.nav.references, icon: ListTree },
        { href: "/admin/journal", label: fr.admin.nav.journal, icon: ScrollText },
        // IA et notifications Stripe et DocuSeal, en onglets.
        { href: "/admin/technique", label: fr.admin.nav.technical, icon: Cpu },
      ],
    },
  ],
  // Commerciaux de terrain (ADR 0205) : leur code et leurs inscrits, leur journée, leur planning
  // de lancement (ADR 0208) et leurs prospects (ADR 0206), leurs résultats et leurs primes
  // (ADR 0207), puis le guide terrain.
  commercial: [
    {
      items: [
        { href: "/commercial", label: fr.commercialSpace.nav.home, icon: QrCode, exact: true },
        { href: "/commercial/journee", label: fr.commercialProspects.nav.day, icon: CalendarCheck },
        // Planning de lancement (F-66, ADR 0208).
        { href: "/commercial/planning", label: fr.commercialLaunch.nav, icon: CalendarCheck },
        {
          href: "/commercial/prospects",
          label: fr.commercialProspects.nav.prospects,
          icon: Building2,
        },
        { href: "/commercial/resultats", label: fr.commercialResults.nav, icon: TrendingUp },
        { href: "/commercial/guide", label: fr.commercialSpace.nav.guide, icon: BookOpen },
        // Démo chez l'artisan : l'espace pro rempli d'exemples (ADR 0184).
        { href: "/pro/decouvrir/tableau-de-bord", label: fr.commercialSpace.nav.demo, icon: Eye },
      ],
    },
  ],
};

/** Liens du menu du compte (en plus de la déconnexion). */
export const ACCOUNT_LINKS: Record<
  Space,
  readonly { href: string; label: string; team?: TeamPermission }[]
> = {
  client: [
    { href: "/compte", label: fr.account.title },
    { href: "/notifications", label: fr.clientApp.notifications },
    { href: "/echanges", label: fr.exchanges.title },
    { href: "/contact", label: fr.appShell.help },
  ],
  pro: [
    { href: "/pro/mon-profil", label: fr.pro.space.myProfile },
    { href: "/pro/profil", label: fr.pro.space.publicProfile, team: "storefront" },
    { href: "/compte", label: fr.pro.hub.rows.identity },
    { href: "/notifications", label: fr.clientApp.notifications },
    { href: "/echanges", label: fr.exchanges.title },
    { href: "/pro/aide", label: fr.appShell.help },
  ],
  admin: [],
  commercial: [
    { href: "/compte", label: fr.account.title },
    { href: "/contact", label: fr.appShell.help },
  ],
  exemples: [
    { href: "/compte", label: fr.pro.hub.rows.identity },
    { href: "/contact", label: fr.appShell.help },
  ],
};

/** Liens du menu du compte ; dans l'espace pro, selon la place dans l'entreprise (ADR 0241). */
export function accountLinksFor(space: Space, teamPosition?: TeamPosition | null) {
  return ACCOUNT_LINKS[space].filter(
    (link) => !link.team || !teamPosition || teamCan(teamPosition, link.team),
  );
}

const startsWith = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact ? pathname === item.href : startsWith(pathname, item.href)) return true;
  return item.also?.some((href) => startsWith(pathname, href)) ?? false;
}

/**
 * Rubriques d'un espace pour un rôle : le support ne voit que les siennes (ADR 0049) ; dans
 * l'espace pro, chaque place de l'équipe voit celles de ses droits (ADR 0241).
 */
export function navFor(
  space: Space,
  role?: string | null,
  teamPosition?: TeamPosition | null,
): readonly NavSection[] {
  const keep =
    space === "admin" && role === "support"
      ? (item: NavItem) => item.support === true
      : space === "pro" && teamPosition
        ? (item: NavItem) => !item.team || teamCan(teamPosition, item.team)
        : null;
  if (!keep) return NAV[space];
  return NAV[space]
    .map((section) => ({ ...section, items: section.items.filter(keep) }))
    .filter((section) => section.items.length > 0);
}

/** Rubrique de la page affichée, pour la barre du haut. */
export function activeItem(space: Space, pathname: string): NavItem | null {
  for (const section of NAV[space]) {
    for (const item of section.items) if (isActive(item, pathname)) return item;
  }
  return null;
}
