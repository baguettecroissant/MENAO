import Script from "next/script";
import { UMAMI_SCRIPT_URL, UMAMI_WEBSITE_ID, analyticsEnabled } from "@/lib/site/analytics";

/**
 * Pages publiques dont l'adresse contient un jeton personnel : jamais envoyées à Umami.
 * Les paramètres d'adresse (codes, liens privés) sont aussi retirés (`data-exclude-search`).
 */
const PRIVATE_PATHS = /^\/(demande-preparee|espace-partenaire)(\/|$)/;

const BEFORE_SEND = `window.menaoUmamiBeforeSend=function(type,payload){return payload&&typeof payload.url==="string"&&${PRIVATE_PATHS.toString()}.test(payload.url)?false:payload;};`;

/**
 * Mesure d'audience Umami (F-189, ADR 0388), dans les mises en page du site public : visites et
 * pages vues, sans cookie ; le choix « ne pas suivre » du navigateur est respecté.
 */
export function SiteAnalytics() {
  if (!analyticsEnabled || !UMAMI_WEBSITE_ID) return null;
  return (
    <>
      <Script id="umami-before-send" strategy="afterInteractive">
        {BEFORE_SEND}
      </Script>
      <Script
        src={UMAMI_SCRIPT_URL}
        data-website-id={UMAMI_WEBSITE_ID}
        data-domains="menao.fr,www.menao.fr"
        data-do-not-track="true"
        data-exclude-search="true"
        data-exclude-hash="true"
        data-before-send="menaoUmamiBeforeSend"
        strategy="afterInteractive"
      />
    </>
  );
}
