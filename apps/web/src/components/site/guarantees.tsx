import { LifeBuoy, ShieldCheck, Star, Wallet } from "lucide-react";
import { TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { SectionHeading } from "./section-heading";

const t = fr.site.guarantees;
const ICONS = [ShieldCheck, Wallet, Star, LifeBuoy];

/**
 * Les quatre garanties MENAO (contrôle des artisans, paiement direct, avis vérifiés, recours),
 * en bandeau sombre sur l'accueil, en grille claire sur les pages métier.
 */
export function GuaranteeSection({
  id,
  tone = "dark",
  more = true,
}: {
  id: string;
  tone?: "dark" | "light";
  more?: boolean;
}) {
  const dark = tone === "dark";
  const content = (
    <div className={`mx-auto flex max-w-6xl flex-col gap-12 ${dark ? "" : "px-4 sm:px-6"}`}>
      <SectionHeading
        id={id}
        eyebrow={t.eyebrow}
        title={t.title}
        subtitle={t.subtitle}
        tone={dark ? "inverse" : "default"}
      />
      <ul className="reveal-group grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.items.map((item, i) => {
          const Icon = ICONS[i] ?? ShieldCheck;
          return (
            <li
              key={item.title}
              className={`flex flex-col gap-3 rounded-card p-6 ${
                dark
                  ? "border border-white/10 bg-white/[0.06] backdrop-blur"
                  : "border border-border bg-surface shadow-card"
              }`}
            >
              <span
                className={`flex size-11 items-center justify-center rounded-xl ${
                  dark ? "bg-white/15 text-white" : "bg-primary-soft text-primary"
                }`}
              >
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="font-medium">{item.title}</h3>
              <p
                className={`text-sm leading-relaxed text-pretty ${dark ? "text-white/75" : "text-muted-foreground"}`}
              >
                {item.text}
              </p>
            </li>
          );
        })}
      </ul>
      {more && (
        <TextLink
          href="/garanties"
          className={`self-center text-sm ${dark ? "text-white underline decoration-white/40 hover:decoration-white" : ""}`}
        >
          {t.more}
        </TextLink>
      )}
    </div>
  );

  if (!dark) {
    return (
      <section aria-labelledby={id} className="py-16 sm:py-24">
        {content}
      </section>
    );
  }
  return (
    <section aria-labelledby={id} className="px-2 sm:px-4">
      <div className="mx-auto max-w-[1440px] rounded-hero bg-[linear-gradient(150deg,#0b1438_0%,#16236e_60%,#2a3fb8_100%)] px-6 py-16 text-white sm:px-12 sm:py-24">
        {content}
      </div>
    </section>
  );
}
