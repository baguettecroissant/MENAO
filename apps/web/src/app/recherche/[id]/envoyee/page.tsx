import { ArrowRight, CircleCheck, Phone } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectSummaryCard } from "@/components/project/project-summary-card";
import { SelectedArtisansCard } from "@/components/project/selected-artisans-card";
import { ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { publicUrl } from "@/lib/project/artisans";
import { getChantierProjects } from "@/lib/project/chantier";
import { joinNames } from "@/lib/project/names";
import { getProjectSummary } from "@/lib/project/summary";
import { createClient } from "@/lib/supabase/server";

const t = fr.search.request;

export const metadata: Metadata = { title: fr.myRequests.title, robots: { index: false } };

/** Confirmation de l'envoi (F-11), maquette « Votre demande est envoyée ». */
export default async function RequestSentPage({ params }: PageProps<"/recherche/[id]/envoyee">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data }, summary, { data: last }, chantier] = await Promise.all([
    supabase.rpc("particulier_requests"),
    getProjectSummary(supabase, id),
    supabase
      .from("requests")
      .select("callback_mode, callback_from, callback_to")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getChantierProjects(supabase, id),
  ]);
  const requests = (data ?? []).filter((r) => r.project_id === id && r.status === "envoyee");
  if (requests.length === 0) notFound();
  const hhmm = (v: string | null) => (v ?? "").slice(0, 5).replace(":", " h ");
  const names = joinNames(requests.map((r) => r.artisan_name));
  // Chantier à plusieurs métiers (ADR 0168) : les métiers pas encore contactés.
  const contacted = new Set((data ?? []).map((r) => r.project_id));
  const others = (chantier?.projects ?? []).filter((p) => p.id !== id && !contacted.has(p.id));
  const workOrder = (chantier?.projects ?? []).map((p) => p.trade).filter(Boolean);

  return (
    <main className="bg-background">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[17.5rem_1fr]">
        <aside className="flex flex-col gap-4">
          <SelectedArtisansCard
            artisans={requests.map((r) => ({
              id: r.artisan_id,
              name: r.artisan_name,
              photoUrl: r.artisan_avatar_path
                ? publicUrl(supabase, "avatars", r.artisan_avatar_path)
                : null,
              trade: r.trade_label,
            }))}
          />
          {summary && <ProjectSummaryCard summary={summary} editable={false} />}
        </aside>
        <div className="flex flex-col items-center gap-6">
          <section className="flex w-full flex-col items-center gap-4 rounded-card border border-border bg-surface px-6 py-10 text-center shadow-card">
            <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary ring-8 ring-primary-softer">
              <CircleCheck aria-hidden="true" className="size-8" />
            </span>
            <h1 className="text-2xl font-medium tracking-tight">{t.sentTitle(names)}</h1>
            <p className="max-w-lg text-sm text-muted-foreground">
              {t.sentText(names, requests.length > 1)}
            </p>
            <div className="mt-2 flex w-full max-w-lg flex-col items-center gap-1.5 rounded-input bg-primary-soft px-4 py-4 text-sm">
              <p className="inline-flex items-center gap-1.5 font-medium text-primary-strong">
                <Phone aria-hidden="true" className="size-4" />
                {t.reminder}
              </p>
              <p className="text-foreground/80">
                {last?.callback_mode === "plage"
                  ? t.sentCallbackRange(hhmm(last.callback_from), hhmm(last.callback_to))
                  : t.sentCallbackAsap}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{t.sentNext}</p>
          </section>
          {others.length > 0 && (
            <section
              aria-labelledby="autres-metiers"
              className="flex w-full flex-col gap-3 rounded-card border border-primary-soft bg-primary-softer p-5 sm:p-6"
            >
              <h2 id="autres-metiers" className="text-lg font-medium">
                {t.otherLots.title}
              </h2>
              <p className="text-sm text-muted-foreground">{t.otherLots.lead}</p>
              <ul className="flex flex-col gap-2">
                {others.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/recherche/${p.id}/artisans` as Route}
                      className="flex min-h-12 items-center justify-between gap-3 rounded-input border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-background"
                    >
                      {t.otherLots.choose(p.trade)}
                      <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary" />
                    </Link>
                  </li>
                ))}
              </ul>
              {workOrder.length > 1 && (
                <p className="text-xs text-muted-foreground">{t.workOrder(workOrder.join(", "))}</p>
              )}
            </section>
          )}
          <ButtonLink href="/mon-espace" size="lg">
            {t.follow}
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
