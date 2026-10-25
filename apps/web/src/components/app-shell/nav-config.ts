import {
  Activity,
  Award,
  CalendarClock,
  ClipboardCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  Gift,
  Handshake,
  HardHat,
  IdCard,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListTree,
  Map as MapIcon,
  MessageCircle,
  MessagesSquare,
  ReceiptText,
  Repeat,
  ScrollText,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { fr } from "@/i18n/fr";

// « exemples » : aperçu de l'espace pro rempli d'exemples (ADR 0184).
export type Space = "client" | "pro" | "admin" | "exemples";
export type BadgeKey =
  "actions" | "messages" | "requests" | "quotes" | "reviews" | "dossiers" | "controles" | "tickets";
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
};
export type NavSection = { label?: string; items: readonly NavItem[] };

/** Menu replié ou déplié, mémorisé dans un cookie pour un premier affichage sans saut. */
export const MENU_COOKIE = "menao_menu";

export const SPACE_HOME: Record<Space, string> = {
  client: "/mon-espace",
  pro: "/pro/tableau-de-bord",
  admin: "/admin",
  exemples: "/pro/decouvrir/tableau-de-bord",
};

/** Messages, accessibles depuis la barre du haut sur mobile (ADR 0043). */
export const SPACE_MESSAGES: Partial<Record<Space, string>> = {
  client: "/mon-espace/messages",
  pro: "/pro/messages",
};

// Même organisation que l'application (ADR 0130, 0131) : l'activité, puis le profil ; le compte
// et l'aide dans le menu de la photo.
const PRO_NAV: readonly NavSection[] = [
  {
    label: fr.appShell.sections.activity,
    items: [
      { href: "/pro/tableau-de-bord", label: fr.pro.space.dashboard, icon: LayoutGrid },
      { href: "/pro/demandes", label: fr.pro.space.requests, icon: Inbox, badge: "requests" },
      { href: "/pro/chantiers", label: fr.pro.space.chantiers, icon: HardHat },
      { href: "/pro/devis", label: fr.pro.space.quotes, icon: FileText, badge: "quotes" },
      {
        href: "/pro/messages",
        label: fr.pro.space.messages,
        icon: MessageCircle,
        badge: "messages",
      },
      { href: "/pro/agenda", label: fr.pro.space.agenda, icon: CalendarDays },
      { href: "/pro/factures", label: fr.pro.invoices.title, icon: ReceiptText },
      // Achats et leurs pièces, rattachés aux chantiers (F-62, ADR 0186).
      { href: "/pro/depenses", label: fr.pro.expenses.title, icon: ShoppingCart },
    ],
  },
  {
    label: fr.appShell.sections.profile,
    items: [
      // « Mon profil » regroupe entreprise, métiers, zone, documents et paiements (ADR 0131).
      {
        href: "/pro/mon-profil",
        label: fr.pro.space.myProfile,
        icon: UserRound,
        also: ["/pro/onboarding"],
      },
      { href: "/pro/profil", label: fr.pro.space.publicProfile, icon: IdCard },
      { href: "/pro/avis", label: fr.pro.space.reviews, icon: Star, badge: "reviews" },
      { href: "/pro/grade", label: fr.pro.space.grade, icon: Award },
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
      also: undefined,
    })),
  })),
  // Back-office par pôle (ADR 0133) : pilotage, vérification des artisans, support, activité de la
  // plateforme, argent (lecture seule), réglages.
  admin: [
    {
      label: fr.appShell.sections.tools,
      items: [
        { href: "/admin", label: fr.admin.nav.overview, icon: LayoutDashboard, exact: true },
        // Toute l'activité, page par page (ADR 0146).
        { href: "/admin/activite", label: fr.admin.nav.activity, icon: Activity },
        // Carte des artisans et de la demande, entonnoir des recherches (ADR 0181).
        { href: "/admin/marche", label: fr.admin.nav.market, icon: MapIcon },
      ],
    },
    {
      label: fr.appShell.sections.verification,
      items: [
        {
          href: "/admin/artisans",
          label: fr.admin.nav.artisans,
          icon: ShieldCheck,
          badge: "dossiers",
        },
        { href: "/admin/surveillance", label: fr.admin.nav.watch, icon: CalendarClock },
        // Contrôle aléatoire de 5 % des dossiers chaque mois (ADR 0121).
        {
          href: "/admin/controles",
          label: fr.admin.nav.spotChecks,
          icon: ClipboardCheck,
          badge: "controles",
        },
      ],
    },
    {
      label: fr.appShell.sections.support,
      items: [
        {
          href: "/admin/tickets",
          label: fr.admin.nav.tickets,
          icon: MessagesSquare,
          badge: "tickets",
          support: true,
        },
        { href: "/admin/personnes", label: fr.admin.nav.people, icon: Users },
      ],
    },
    {
      label: fr.appShell.sections.activity,
      items: [
        { href: "/admin/demandes", label: fr.admin.nav.requests, icon: Send },
        { href: "/admin/chantiers", label: fr.admin.nav.chantiers, icon: HardHat },
      ],
    },
    {
      // Lecture seule (ADR 0051) : MENAO n'encaisse que l'abonnement des artisans.
      label: fr.appShell.sections.money,
      items: [
        { href: "/admin/paiements", label: fr.admin.nav.payments, icon: Wallet },
        { href: "/admin/abonnements", label: fr.admin.nav.subscriptions, icon: Repeat },
        // Programme Partenaires (F-59, ADR 0136).
        { href: "/admin/partenaires", label: fr.admin.nav.partners, icon: Handshake },
        // Parrainages entre artisans (F-60, ADR 0143).
        { href: "/admin/parrainages", label: fr.admin.nav.referrals, icon: Gift },
      ],
    },
    {
      // Listes de référence, journal d'audit et suivi de l'IA (ADR 0052).
      label: fr.appShell.sections.settings,
      items: [
        { href: "/admin/referentiels", label: fr.admin.nav.references, icon: ListTree },
        { href: "/admin/journal", label: fr.admin.nav.journal, icon: ScrollText },
        { href: "/admin/ia", label: fr.admin.nav.ai, icon: Sparkles },
      ],
    },
  ],
};

/** Liens du menu du compte (en plus de la déconnexion). */
export const ACCOUNT_LINKS: Record<Space, readonly { href: string; label: string }[]> = {
  client: [
    { href: "/compte", label: fr.account.title },
    { href: "/notifications", label: fr.clientApp.notifications },
    { href: "/echanges", label: fr.exchanges.title },
    { href: "/contact", label: fr.appShell.help },
  ],
  pro: [
    { href: "/pro/mon-profil", label: fr.pro.space.myProfile },
    { href: "/pro/profil", label: fr.pro.space.publicProfile },
    { href: "/compte", label: fr.pro.hub.rows.identity },
    { href: "/notifications", label: fr.clientApp.notifications },
    { href: "/echanges", label: fr.exchanges.title },
    { href: "/contact", label: fr.appShell.help },
  ],
  admin: [],
  exemples: [
    { href: "/compte", label: fr.pro.hub.rows.identity },
    { href: "/contact", label: fr.appShell.help },
  ],
};

const startsWith = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

export function isActive(item: NavItem, pathname: string): boolean {
  if (item.exact ? pathname === item.href : startsWith(pathname, item.href)) return true;
  return item.also?.some((href) => startsWith(pathname, href)) ?? false;
}

/** Rubriques d'un espace pour un rôle : le support ne voit que les siennes (ADR 0049). */
export function navFor(space: Space, role?: string | null): readonly NavSection[] {
  if (space !== "admin" || role !== "support") return NAV[space];
  return NAV[space]
    .map((section) => ({ ...section, items: section.items.filter((item) => item.support) }))
    .filter((section) => section.items.length > 0);
}

/** Rubrique de la page affichée, pour la barre du haut. */
export function activeItem(space: Space, pathname: string): NavItem | null {
  for (const section of NAV[space]) {
    for (const item of section.items) if (isActive(item, pathname)) return item;
  }
  return null;
}
