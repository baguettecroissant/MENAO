import { PhoneCall } from "lucide-react";
import { fr } from "@/i18n/fr";
import { CALLBACK_HASH } from "./callback-hash";

/**
 * « Être rappelé » (ADR 0265) : simple lien vers l'ancre que l'assistant des pages Pro écoute
 * pour ouvrir son formulaire de rappel (ADR 0218). Lien natif (pas next/link) pour que le
 * changement d'ancre soit bien signalé au navigateur.
 */
/** Variante ronde (barre fixe des pages Pro sur téléphone). */
export function CallbackIconLink() {
  return (
    <a
      href={`#${CALLBACK_HASH}`}
      aria-label={fr.pro.landing.hero.callback}
      className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
    >
      <PhoneCall aria-hidden="true" className="size-5" />
    </a>
  );
}

export function CallbackLink({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <a
      href={`#${CALLBACK_HASH}`}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-button border px-7 text-base font-semibold whitespace-nowrap transition-colors focus-visible:ring-4 focus-visible:outline-none ${
        tone === "dark"
          ? "border-white/50 text-white hover:bg-white/10 focus-visible:ring-white/30"
          : "border-border-strong bg-surface text-foreground hover:bg-background focus-visible:ring-primary/20"
      } ${className}`}
    >
      <PhoneCall aria-hidden="true" className="size-4" />
      {fr.pro.landing.hero.callback}
    </a>
  );
}
