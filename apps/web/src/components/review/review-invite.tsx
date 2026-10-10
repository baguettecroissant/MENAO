import type { Route } from "next";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.chantier.reviewInvite;

/** « Noter … pour son chantier » (F-28, maquette « Vue d'un chantier », chantier clôturé). */
export function ReviewInvite({
  chantierId,
  artisanName,
}: {
  chantierId: string;
  artisanName: string;
}) {
  return (
    <section
      aria-labelledby="review-invite-title"
      className="relative flex flex-col gap-3 overflow-hidden rounded-card border border-border bg-surface p-5 shadow-card"
    >
      <span
        aria-hidden="true"
        className="absolute -top-8 -right-8 size-20 rounded-full border-[10px] border-primary-soft"
      />
      <h2 id="review-invite-title" className="pr-10 font-medium">
        {t.title(artisanName)}
      </h2>
      <p className="text-sm text-muted-foreground">{t.text(artisanName)}</p>
      <ButtonLink href={`/mon-espace/chantiers/${chantierId}/avis` as Route} size="lg" block>
        {t.cta(artisanName)}
      </ButtonLink>
    </section>
  );
}
