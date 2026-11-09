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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {t.greeting(space.account.firstName)}
          </h1>
          <p className="max-w-3xl text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
        </div>

        {/* Refonte « Nette » (ADR 0260) : le code à gauche, les inscriptions à droite. */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
          <div className="flex min-w-0 flex-col gap-6">
            {!commercial ? (
              <Alert tone="info">{t.missing}</Alert>
            ) : !active ? (
              <Alert tone="error">{t.suspended}</Alert>
            ) : (
              link && <CodeCard code={commercial.code} link={link} qr={qrSvg(link)} />
            )}
          </div>
          <div className="flex flex-col gap-4">
            {active && (
              <section aria-labelledby="inscriptions" className="flex flex-col gap-3">
                <h2 id="inscriptions" className="text-lg">
                  {t.signups.title}
                </h2>
                {signups?.length ? (
                  <ListPanel label={t.signups.listLabel}>
                    {signups.map((s, i) => (
                      <ListRow
                        key={`${s.signed_up_at}-${i}`}
                        title={s.raison_sociale || t.signups.unnamed}
                        detail={[
                          t.signups.since(formatDay(s.signed_up_at)),
                          s.manque.length > 0
                            ? t.signups.missing(
                                s.manque
                                  .map((step) => fr.admin.stalled.steps[step] ?? step)
                                  .join(", "),
                              )
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
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
        </div>
      </div>
    </main>
  );
}
