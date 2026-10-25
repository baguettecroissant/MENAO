import { exampleInbox } from "@menao/core";
import type { Metadata } from "next";
import { fr } from "@/i18n/fr";
import { artisanActivity, requireProSpace, spaceExamples } from "@/lib/artisan/space";
import { EXAMPLES_BASE } from "@/lib/artisan/examples";
import { EmptyState } from "@/components/empty-state";
import { SpaceExamplesNotice } from "@/components/pro/examples";
import { InboxList } from "@/components/pro/inbox-list";

const t = fr.pro.onboarding.requests;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * Demandes reçues (F-16, F-17), maquette « Dashboard – Dernières demandes de devis ». Tant que
 * l'artisan n'a rien reçu : demandes d'exemple (ADR 0184).
 */
export default async function ArtisanRequestsPage() {
  const { supabase } = await requireProSpace();
  const [{ inbox: rows }, examples] = await Promise.all([artisanActivity(), spaceExamples()]);
  const now = new Date();
  const paths = rows.map((r) => r.photo_path).filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length
    ? await supabase.storage.from("project-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const photo = (path: string | null) =>
    path ? (signed?.find((s) => s.path === path)?.signedUrl ?? null) : null;

  return (
    <main className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        {examples ? (
          <>
            <SpaceExamplesNotice />
            <InboxList
              rows={exampleInbox(now).map((r) => ({ ...r, thumbUrl: null }))}
              now={now}
              base={EXAMPLES_BASE}
              example
            />
          </>
        ) : (
          <>
            {rows.length === 0 && <EmptyState illustration="demandes">{t.empty}</EmptyState>}
            <InboxList
              rows={rows.map((r) => ({ ...r, thumbUrl: photo(r.photo_path) }))}
              now={now}
            />
          </>
        )}
      </div>
    </main>
  );
}
