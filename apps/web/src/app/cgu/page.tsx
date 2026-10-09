import { PageShell } from "@/components/ui";
import { fr } from "@/i18n/fr";

// TODO(legal) : publier la version validée par l'avocat avant le pilote.
export default function Page() {
  return (
    <PageShell title={fr.legal.terms}>
      <h2 className="mb-2 font-semibold">{fr.legal.draftTitle}</h2>
      <p>{fr.legal.draftBody}</p>
    </PageShell>
  );
}
