import { fr } from "@/i18n/fr";

const t = fr.analytics.events;

/**
 * Clics suivis dans Umami (F-189, ADR 0388), d'après la destination du lien ou du formulaire : un
 * bouton ajouté plus tard est suivi sans rien changer. Aucune donnée personnelle : le nom de
 * l'action, la page publique d'où vient le clic et le texte du bouton.
 */
const RULES: readonly { test: (path: string) => boolean; event: string }[] = [
  { test: (p) => p === "/recherche" || p.startsWith("/recherche?"), event: t.requestQuote },
  { test: (p) => p.startsWith("/pro/inscription"), event: t.proSignup },
  { test: (p) => p.startsWith("/pro/formules"), event: t.proPlans },
  {
    test: (p) => p === "/pro" || p.startsWith("/pro?") || p.startsWith("/pro#"),
    event: t.proSpace,
  },
  { test: (p) => p.startsWith("/devenir-conseiller"), event: t.recruitment },
  { test: (p) => p.startsWith("/mon-espace") || p.startsWith("/connexion"), event: t.signIn },
  { test: (p) => p.startsWith("/inscription"), event: t.signUp },
];

/** Nom de l'événement pour une adresse de destination (relative au site) ; null si non suivie. */
export function clickEventFor(href: string, siteOrigin: string): string | null {
  let url: URL;
  try {
    url = new URL(href, siteOrigin);
  } catch {
    return null;
  }
  if (url.protocol === "tel:") return t.phone;
  if (url.protocol === "mailto:") return t.email;
  if (/(^|\.)apps\.apple\.com$|(^|\.)play\.google\.com$/.test(url.hostname)) return t.app;
  if (url.origin !== siteOrigin) return null;
  const path = `${url.pathname}${url.search ? "?" : ""}`;
  return RULES.find((rule) => rule.test(path))?.event ?? null;
}
