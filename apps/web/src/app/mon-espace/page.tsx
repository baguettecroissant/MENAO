import {
  homePathForRole,
  isChantierFinished,
  roleFromAppMetadata,
  type ChantierStatus,
} from "@menao/core";
import { FileText, HardHat, Search } from "lucide-react";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { AppDownloadModal } from "@/components/app-shell/app-download-modal";
import { ChantierCard, FinishedChantierCard } from "@/components/chantier/chantier-card";
import { DraftSearches } from "@/components/project/draft-searches";
import { PendingRequests } from "@/components/project/my-requests";
import { ButtonLink, Tag } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { avatarUrl, signedUrlMap } from "@/lib/chantier/storage";
import { qrSvg } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";

const t = fr.myChantiers;

export const metadata: Metadata = { title: `${t.title} — MENAO` };

/**
 * « Mes chantiers » (F-12, maquettes « Mes chantiers ») : chantiers en cours avec leur avancement,
 * demandes encore sans chantier, chantiers terminés.
 */
export default async function MySpacePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  // Une session anonyme (recherche en cours, ADR 0012) ne donne pas accès à l'espace client.
  if (!data || data.claims.is_anonymous) redirect("/connexion?next=/mon-espace");

  const role = roleFromAppMetadata(data.claims.app_metadata);
  const home = homePathForRole(role);
  if (home !== "/mon-espace") redirect(home as Route);

  const [{ data: chantierRows }, { data: requestRows }, { data: draftRows }, { data: cancelled }] =
    await Promise.all([
      supabase.rpc("particulier_chantiers"),
      supabase.rpc("particulier_requests"),
      // Recherches commencées sans demande envoyée (ADR 0040).
      supabase
        .from("projects")
        .select("id, status, summary, description, ville_nom, created_at, trades(label)")
        .in("status", ["brouillon", "criteres_valides"])
        .order("created_at", { ascending: false })
        .limit(10),
      // Demandes annulées par le client lui-même (motif renseigné).
      supabase.from("requests").select("id").not("cancellation_reason", "is", null),
    ]);
  const drafts = draftRows ?? [];
  const cancelledByClient = new Set((cancelled ?? []).map((r) => r.id));
  const chantiers = chantierRows ?? [];
  const requests = requestRows ?? [];
  const active = chantiers.filter((c) => !isChantierFinished(c.status as ChantierStatus));
  const finished = chantiers.filter((c) => isChantierFinished(c.status as ChantierStatus));
  const pending = requests.filter((r) => !r.chantier_id);
  const toSign = active.filter((c) => c.status === "devis_envoye" && c.quote_status === "envoye");

  // Photos : première photo du projet de chaque chantier et de chaque demande en attente.
  const pendingProjects = [...new Set(pending.map((r) => r.project_id))];
  const { data: projectPhotos } = pendingProjects.length
    ? await supabase
        .from("project_photos")
        .select("project_id, storage_path")
        .in("project_id", pendingProjects)
        .order("sort_order")
    : { data: [] };
  const firstPhoto = new Map<string, string>();
  for (const p of projectPhotos ?? [])
    if (!firstPhoto.has(p.project_id)) firstPhoto.set(p.project_id, p.storage_path);
  const signed = await signedUrlMap(supabase, "project-photos", [
    ...chantiers.map((c) => c.photo_path),
    ...firstPhoto.values(),
  ]);
  const projectPhotoUrls = new Map(
    [...firstPhoto].flatMap(([project, path]) => {
      const url = signed.get(path);
      return url ? [[project, url] as const] : [];
    }),
  );
  const avatars = new Map(
    [...chantiers, ...requests].flatMap((row) => {
      const url = avatarUrl(supabase, row.artisan_avatar_path);
      return url ? [[row.artisan_id, url] as const] : [];
    }),
  );
  const photoOf = (path: string | null) => (path ? (signed.get(path) ?? null) : null);
  const now = new Date();

  const inProgress = (
    <>
      <section aria-labelledby="en-cours" className="flex flex-col gap-4">
        <h2 id="en-cours" className="text-lg font-medium">
          {t.inProgress}
        </h2>
        {active.length === 0 ? (
          <p className="rounded-card border border-dashed border-border-strong bg-surface px-6 py-8 text-center text-sm text-muted-foreground">
            {t.noActive}
          </p>
        ) : (
          <ul className="flex flex-col gap-5">
            {active.map((c) => (
              <li key={c.chantier_id}>
                <ChantierCard
                  c={c}
                  photoUrl={photoOf(c.photo_path)}
                  avatarUrl={avatars.get(c.artisan_id) ?? null}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
      {pending.length > 0 && (
        <section aria-labelledby="demandes" className="flex flex-col gap-4">
          <h2 id="demandes" className="text-lg font-medium">
            {t.pending}
          </h2>
          <PendingRequests
            rows={requests}
            photoUrls={projectPhotoUrls}
            avatarUrls={avatars}
            now={now}
            cancelledByClient={cancelledByClient}
          />
        </section>
      )}
      {drafts.length > 0 && <DraftSearches drafts={drafts} />}
    </>
  );
  const done = (
    <section aria-labelledby="termines" className="flex flex-col gap-4">
      <h2 id="termines" className="text-lg font-medium">
        {t.finished}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {finished.map((c) => (
          <li key={c.chantier_id}>
            <FinishedChantierCard c={c} photoUrl={photoOf(c.photo_path)} />
          </li>
        ))}
      </ul>
    </section>
  );

  // Maquette « Mes chantiers - Modale » : seulement une fois l'application publiée.
  const appStore = env.NEXT_PUBLIC_APP_STORE_URL ?? null;
  const playStore = env.NEXT_PUBLIC_PLAY_STORE_URL ?? null;
  return (
    <main className="bg-background">
      {(appStore || playStore) && (
        <AppDownloadModal
          qr={qrSvg(`${env.NEXT_PUBLIC_SITE_URL}/application`)}
          appStoreUrl={appStore}
          playStoreUrl={playStore}
        />
      )}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.subtitle}</p>
            {(active.length > 0 || toSign.length > 0) && (
              <ul className="flex flex-wrap gap-2 pt-1">
                <li>
                  <Tag>
                    <HardHat aria-hidden="true" className="size-3.5" />
                    {t.countActive(active.length)}
                  </Tag>
                </li>
                {toSign.length > 0 && (
                  <li>
                    <Tag>
                      <FileText aria-hidden="true" className="size-3.5" />
                      {t.countToSign(toSign.length)}
                    </Tag>
                  </li>
                )}
              </ul>
            )}
          </div>
          <ButtonLink href="/mon-espace/nouvelle-demande" size="md">
            {t.start}
            <Search aria-hidden="true" className="size-4" />
          </ButtonLink>
        </div>
        {chantiers.length === 0 && requests.length === 0 ? (
          <>
            <section className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong bg-surface px-6 py-14 text-center">
              <p className="text-lg font-medium">{fr.myRequests.empty}</p>
              <p className="max-w-md text-sm text-muted-foreground">{fr.myRequests.emptyHint}</p>
            </section>
            {drafts.length > 0 && <DraftSearches drafts={drafts} />}
          </>
        ) : (
          // Une seule page, sur ordinateur comme sur téléphone et dans l'application (maquette
          // « Mes chantiers - Mobile ») : en cours, demandes, recherches, puis terminés s'il y en a.
          <>
            {inProgress}
            {finished.length > 0 && done}
          </>
        )}
      </div>
    </main>
  );
}
