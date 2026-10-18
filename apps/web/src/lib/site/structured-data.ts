import { fr } from "@/i18n/fr";
import { absoluteUrl } from "./seo";

/**
 * Identité de MENAO pour Google et les assistants IA (ADR 0134) : organisation et site, reliés par
 * leurs identifiants (`@id`), repris par les autres données structurées des pages.
 */
export const ORGANIZATION_ID = absoluteUrl("/#organisation");
export const WEBSITE_ID = absoluteUrl("/#site");

export function organizationJsonLd() {
  const t = fr.structuredData;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: fr.meta.name,
        url: absoluteUrl("/"),
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/icons/icon-512.png"),
          width: 512,
          height: 512,
        },
        description: t.organizationDescription,
        areaServed: { "@type": "AdministrativeArea", name: t.area },
        knowsAbout: t.knowsAbout,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: fr.prelaunch.contact.email,
          availableLanguage: ["French"],
        },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        name: fr.meta.name,
        url: absoluteUrl("/"),
        inLanguage: "fr-FR",
        description: fr.meta.description,
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

/** Fil d'Ariane (schema.org `BreadcrumbList`), à placer dans le `@graph` d'une page. */
export function breadcrumbJsonLd(items: readonly { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
