import { fr } from "@/i18n/fr";

/** Logo de l'entreprise en tête d'un document en HTML, comme dans le PDF (ADR 0038). */
export function DocumentLogo({ url, name }: { url: string | null | undefined; name: string }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4)
    <img
      src={url}
      alt={fr.documentLogo.alt(name)}
      className="mb-2 h-auto max-h-12 w-auto max-w-36 object-contain object-left"
    />
  );
}
