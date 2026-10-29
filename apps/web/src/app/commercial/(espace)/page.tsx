import { partnerLinks } from "@menao/core";
import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { CodeCard } from "@/components/commercial/code-card";
import { EmptyState } from "@/components/empty-state";
import { ListPanel, ListRow, type ListTone } from "@/components/list-kit";
import { Alert, ButtonLink } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDay } from "@/lib/format";
import { qrSvg } from "@/lib/qr";

const t = fr.commercialSpace;

export const metadata: Metadata = { title: t.metaTitle, robots: { index: false } };

const TONES: Record<string, ListTone> = {
  brouillon: "neutral",
  en_verification: "primary",
  valide: "success",
  refuse: "danger",
  suspendu: "warning",
  radie: "danger",
};

/**
 * Accueil de l'espace commercial (F-65, ADR 0205) : son code, son lien et son QR code
 * d'inscription, puis les artisans inscrits avec ce code (nom de l'entreprise et étape seulement).
 */
export default async function CommercialHomePage() {
  const space = await getCommercialSpace();
  const { commercial, active } = space;
  const { data: signups } = active
    ? await space.supabase.rpc("my_commercial_signups")
    : { data: [] };
  const link = commercial ? partnerLinks(env.NEXT_PUBLIC_SITE_URL, commercial.code).pros : null;

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            {t.greeting(space.account.firstName)}
          </h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>

        {!commercial ? (
          <Alert tone="info">{t.missing}</Alert>
        ) : !active ? (
          <Alert tone="error">{t.suspended}</Alert>
        ) : (
          link && <CodeCard code={commercial.code} link={link} qr={qrSvg(link)} />
        )}

        {active && (
          <section aria-labelledby="inscriptions" className="flex flex-col gap-3">
            <h2 id="inscriptions" className="text-lg font-medium">
              {t.signups.title}
            </h2>
            {signups?.length ? (
              <ListPanel label={t.signups.listLabel}>
                {signups.map((s, i) => (
                  <ListRow
                    key={`${s.signed_up_at}-${i}`}
                    title={s.raison_sociale || t.signups.unnamed}
                    detail={t.signups.since(formatDay(s.signed_up_at))}
                    status={{
                      text: t.signups.status[s.status] ?? s.status,
                      tone: TONES[s.status] ?? "neutral",
                    }}
                  />
                ))}
              </ListPanel>
            ) : (
              <EmptyState illustration="documents">{t.signups.empty}</EmptyState>
            )}
          </section>
        )}

        <ButtonLink href="/commercial/guide" variant="outline" className="self-start">
          <BookOpen aria-hidden="true" className="size-4" />
          {t.guide.open}
        </ButtonLink>
      </div>
    </main>
  );
}
