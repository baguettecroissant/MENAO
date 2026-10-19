import {
  Award,
  CalendarClock,
  ClipboardCheck,
  CalendarDays,
  ClipboardList,
  FileText,
  Handshake,
  HardHat,
  IdCard,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListTree,
  MessageCircle,
  MessagesSquare,
  ReceiptText,
  Repeat,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { fr } from "@/i18n/fr";

export type Space = "client" | "pro" | "admin";
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
};

/** Messages, accessibles depuis la barre du haut sur mobile (ADR 0043). */
export const SPACE_MESSAGES: Partial<Record<Space, string>> = {
  client: "/mon-espace/messages",
  pro: "/pro/messages",
};

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
  // Même organisation que l'application (ADR 0130, 0131) : l'activité, puis le profil ; le compte
  // et l'aide dans le menu de la photo.
  pro: [
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
  ],
  // Back-office par pôle (ADR 0133) : pilotage, vérification des artisans, support, activité de la
  // plateforme, argent (lecture seule), réglages.
  admin: [
    {
      label: fr.appShell.sections.tools,
      items: [{ href: "/admin", label: fr.admin.nav.overview, icon: LayoutDashboard, exact: true }],
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
