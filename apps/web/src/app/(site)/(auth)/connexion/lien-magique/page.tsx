import { PageShell, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { MagicLinkForm } from "./magic-link-form";

export default function MagicLinkPage() {
  return (
    <PageShell title={fr.magicLink.title}>
      <p className="mb-4">{fr.magicLink.intro}</p>
      <MagicLinkForm />
      <p className="mt-6 text-center">
        <TextLink href="/connexion">{fr.magicLink.back}</TextLink>
      </p>
    </PageShell>
  );
}
