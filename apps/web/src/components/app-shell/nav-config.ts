import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileText,
  HardHat,
  IdCard,
  Inbox,
  LayoutGrid,
  MessageCircle,
  MessagesSquare,
  ReceiptText,
  Settings,
  ShieldCheck,
  Star,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { fr } from "@/i18n/fr";

export type Space = "client" | "pro" | "admin";
export type BadgeKey =
  "actions" | "messages" | "requests" | "quotes" | "reviews" | "dossiers" | "tickets";
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
};
export type NavSection = { label?: string; items: readonly NavItem[] };

/** Menu replié ou déplié, mémorisé dans un cookie pour un premier affichage sans saut. */
export const MENU_COOKIE = "menao_menu";

export const SPACE_HOME: Record<Space, string> = {
  client: "/mon-espace",
  pro: "/pro/tableau-de-bord",
  admin: "/admin/artisans",
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
  pro: [
    {
      label: fr.appShell.sections.activity,
      items: [
        { href: "/pro/tableau-de-bord", label: fr.pro.space.dashboard, icon: LayoutGrid },
        { href: "/pro/agenda", label: fr.pro.space.agenda, icon: CalendarDays },
        { href: "/pro/demandes", label: fr.pro.space.requests, icon: Inbox, badge: "requests" },
        { href: "/pro/chantiers", label: fr.pro.space.chantiers, icon: HardHat },
        { href: "/pro/devis", label: fr.pro.space.quotes, icon: FileText, badge: "quotes" },
        {
          href: "/pro/messages",
          label: fr.pro.space.messages,
          icon: MessageCircle,
          badge: "messages",
        },
        { href: "/pro/factures", label: fr.pro.invoices.title, icon: ReceiptText },
        { href: "/pro/avis", label: fr.pro.space.reviews, icon: Star, badge: "reviews" },
      ],
    },
    {
      label: fr.appShell.sections.account,
      items: [
        { href: "/pro/onboarding", label: fr.pro.space.file, icon: UserRound },
        { href: "/pro/profil", label: fr.pro.space.publicProfile, icon: IdCard },
        { href: "/compte", label: fr.account.proNav, icon: Settings },
      ],
    },
  ],
  admin: [
    {
      label: fr.appShell.sections.tools,
      items: [
        {
          href: "/admin/artisans",
          label: fr.admin.nav.artisans,
          icon: ShieldCheck,
          badge: "dossiers",
        },
        { href: "/admin/surveillance", label: fr.admin.nav.watch, icon: CalendarClock },
        {
          href: "/admin/tickets",
          label: fr.admin.nav.tickets,
          icon: MessagesSquare,
          badge: "tickets",
        },
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
    { href: "/compte", label: fr.account.title },
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

/** Rubrique de la page affichée, pour la barre du haut. */
export function activeItem(space: Space, pathname: string): NavItem | null {
  for (const section of NAV[space]) {
    for (const item of section.items) if (isActive(item, pathname)) return item;
  }
  return null;
}
