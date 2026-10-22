import {
  clientTodos,
  homePathForRole,
  isChantierFinished,
  roleFromAppMetadata,
  type ChantierStatus,
  type PaymentStatus,
} from "@menao/core";
import { FileText, HardHat, HeartHandshake, Search } from "lucide-react";
import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { AppDownloadModal } from "@/components/app-shell/app-download-modal";
import { ChantierCard, FinishedChantierCard } from "@/components/chantier/chantier-card";
import { ClientTodoList } from "@/components/chantier/client-todo-list";
import { DraftSearches } from "@/components/project/draft-searches";
import { PendingRequests } from "@/components/project/my-requests";
import { ButtonLink, Tag } from "@/components/ui";
import { env } from "@/env";
import { fr } from "@/i18n/fr";
import { avatarUrl, signedUrlMap } from "@/lib/chantier/storage";
import { qrSvg } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";

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

  const [
    { data: chantierRows },
    { data: requestRows },
    { data: draftRows },
    { data: cancelled },
    { data: reviews },
    { data: lifts },
  ] = await Promise.all([
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
    // « À faire maintenant » (ADR 0132) : avis déjà laissés et levées de réserves signalées.
    supabase.from("reviews").select("chantier_id").eq("particulier_id", data.claims.sub),
    supabase
      .from("receptions")
      .select("chantier_id")
      .not("lift_signaled_at", "is", null)
      .is("lifted_at", null),
  ]);
  const drafts = draftRows ?? [];
  const cancelledByClient = new Set((cancelled ?? []).map((r) => r.id));
  const chantiers = chantierRows ?? [];
  const requests = requestRows ?? [];
  const active = chantiers.filter((c) => !isChantierFinished(c.status as ChantierStatus));
  const finished = chantiers.filter((c) => isChantierFinished(c.status as ChantierStatus));
  const pending = requests.filter((r) => !r.chantier_id);
  const toSign = active.filter((c) => c.status === "devis_envoye" && c.quote_status === "envoye");
  // Mêmes règles que l'accueil de l'application (`clientTodos`, @menao/core).
  const reviewed = new Set((reviews ?? []).map((r) => r.chantier_id));
  const liftSignaled = new Set((lifts ?? []).map((r) => r.chantier_id));
  const todos = clientTodos(
    chantiers.map((c) => ({
      chantier_id: c.chantier_id,
      title: c.title,
      artisan_name: c.artisan_name,
      quote_total_ttc_cents: c.quote_total_ttc_cents,
      status: c.status as ChantierStatus,
      quoteId: c.quote_id,
      quoteStatus: c.quote_status,
      depositCents: c.deposit_cents,
      depositStatus: c.deposit_status as PaymentStatus | null,
      balanceCents: c.balance_cents,
      balanceStatus: c.balance_status as PaymentStatus | null,
      liftSignaled: liftSignaled.has(c.chantier_id),
      reviewed: reviewed.has(c.chantier_id),
    })),
  );

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
      <ClientTodoList todos={todos} hasActive={active.length > 0} />
      <section aria-labelledby="en-cours" className="flex flex-col gap-4">
        <h2 id="en-cours" className="text-lg font-medium">
          {t.inProgress}
        </h2>
        {active.length === 0 ? (
          <EmptyState illustration="chantiers" className="py-8">
            {t.noActive}
          </EmptyState>
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
            <EmptyState illustration="demandes" title={fr.myRequests.empty} className="py-14">
              {fr.myRequests.emptyHint}
            </EmptyState>
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
        {/* « Invitez votre artisan de confiance » (ADR 0162). */}
        <section
          aria-labelledby="inviter"
          className="flex flex-col gap-3 rounded-card border border-primary-soft bg-primary-softer p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-card">
              <HeartHandshake aria-hidden="true" className="size-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h2 id="inviter" className="font-medium">
                {fr.inviteArtisan.title}
              </h2>
              <p className="text-sm text-muted-foreground">{fr.inviteArtisan.cardText}</p>
            </div>
          </div>
          <ButtonLink
            href="/mon-espace/inviter-un-artisan"
            variant="secondary"
            size="md"
            className="shrink-0 self-start sm:self-center"
          >
            {fr.inviteArtisan.cardAction}
          </ButtonLink>
        </section>
      </div>
    </main>
  );
}
