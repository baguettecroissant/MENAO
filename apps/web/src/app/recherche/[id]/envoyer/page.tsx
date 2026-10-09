import { roleFromAppMetadata } from "@menao/core";
import { artisanSelectionSchema } from "@menao/validation";
import { ArrowLeft } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjectSummaryCard } from "@/components/project/project-summary-card";
import { SelectedArtisansCard } from "@/components/project/selected-artisans-card";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { matchArtisans, publicUrl } from "@/lib/project/artisans";
import { joinNames } from "@/lib/project/names";
import { getProjectSummary } from "@/lib/project/summary";
import { createClient } from "@/lib/supabase/server";
import { AccountStep } from "./account-step";
import { RequestForm } from "./request-form";

const t = fr.search.request;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: fr.search.profile.request, robots: { index: false } };

/** Envoi de la demande (F-11), précédé si besoin de la création du compte (F-08). */
export default async function SendRequestPage({
  params,
  searchParams,
}: PageProps<"/recherche/[id]/envoyer">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const requested = ([] as string[]).concat(sp.artisan ?? []);
  const selection = artisanSelectionSchema.safeParse(requested);
  if (!selection.success) redirect(`/recherche/${id}/artisans` as Route);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect("/");
  const anonymous = Boolean(auth.claims.is_anonymous);

  // Retour du lien de confirmation : le projet de la session anonyme passe au compte.
  let transferFailed = false;
  if (typeof sp.transfert === "string" && !anonymous) {
    const { error } = await supabase.rpc("claim_project", { p_token: sp.transfert });
    transferFailed = Boolean(error);
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, status, summary, description, ville_nom, trade_code")
    .eq("id", id)
    .maybeSingle();
  if (!project) {
    if (transferFailed) {
      return (
        <main className="mx-auto w-full max-w-xl px-4 py-16">
          <Alert tone="error">{t.transferError}</Alert>
        </main>
      );
    }
    notFound();
  }
  if (project.status === "brouillon") redirect(`/recherche/${id}` as Route);

  const [matches, { data: sent }] = await Promise.all([
    matchArtisans(supabase, id, 20),
    supabase.from("requests").select("artisan_id").eq("project_id", id),
  ]);
  const already = new Set((sent ?? []).map((r) => r.artisan_id));
  const chosen = (matches ?? []).filter(
    (m) => selection.data.includes(m.artisan_id) && !already.has(m.artisan_id),
  );
  if (chosen.length === 0) redirect(`/recherche/${id}/artisans` as Route);
  const context = { projectId: id, artisanIds: chosen.map((a) => a.artisan_id) };
  const names = joinNames(chosen.map((a) => a.display_name));

  let form;
  if (anonymous) {
    form = <AccountStep context={context} />;
  } else if (roleFromAppMetadata(auth.claims.app_metadata) !== "particulier") {
    form = <Alert tone="error">{t.notParticulier}</Alert>;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("phone")
      .eq("user_id", auth.claims.sub)
      .maybeSingle();
    form = (
      <RequestForm
        context={context}
        names={names}
        email={auth.claims.email ?? ""}
        phone={profile?.phone ?? null}
      />
    );
  }

  const summary = await getProjectSummary(supabase, id);
  const r = fr.search.results;

  return (
    <main className="bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[17.5rem_1fr]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <SelectedArtisansCard
            editHref={`/recherche/${id}/artisans`}
            artisans={chosen.map((a) => ({
              id: a.artisan_id,
              name: a.display_name,
              photoUrl: a.avatar_path ? publicUrl(supabase, "avatars", a.avatar_path) : null,
              trade: summary?.trade
                ? `${summary.trade}${a.experience_years !== null ? ` · ${r.experience(a.experience_years)}` : ""}`
                : null,
              zone:
                a.zone_mode === "rayon" && a.zone_radius_km
                  ? r.zoneRadius(a.zone_radius_km, a.zone_city)
                  : r.zoneCommunes(a.zone_communes),
              availableNow: a.available_now,
            }))}
          />
          {summary && <ProjectSummaryCard summary={summary} />}
        </aside>
        <div className="flex min-w-0 flex-col gap-6">
          <Link
            href={`/recherche/${id}/artisans` as Route}
            className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t.back}
          </Link>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium tracking-tight sm:text-[1.75rem]">
              {anonymous ? t.accountTitle : t.title(names)}
            </h1>
            <p className="text-sm text-muted-foreground">{anonymous ? t.accountIntro : t.intro}</p>
          </div>
          {form}
        </div>
      </div>
    </main>
  );
}
