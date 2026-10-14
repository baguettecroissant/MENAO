import { Search } from "lucide-react";
import { ButtonLink, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { LostIllustration } from "./illustrations";

const t = fr.notFound;

/** Page introuvable (404) aux couleurs MENAO, en français : illustration et liens utiles. */
export function NotFoundView() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-background px-4 py-16 text-center">
      <LostIllustration className="w-60 sm:w-72" />
      <p className="text-sm font-medium tracking-[0.12em] text-primary uppercase">{t.code}</p>
      <h1 className="max-w-xl text-2xl font-medium tracking-tight sm:text-[2rem]">{t.title}</h1>
      <p className="max-w-lg text-muted-foreground">{t.text}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/" size="lg">
          {t.home}
        </ButtonLink>
        <ButtonLink href="/recherche" size="lg" variant="outline">
          {t.search}
          <Search aria-hidden="true" className="size-4" />
        </ButtonLink>
      </div>
      <TextLink href="/contact" className="text-sm">
        {t.help}
      </TextLink>
    </main>
  );
}
