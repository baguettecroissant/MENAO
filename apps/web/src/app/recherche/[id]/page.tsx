import { AI_CONFIDENCE_THRESHOLD, parisToday } from "@menao/core";
import { ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { CriteriaReview, type Criteria } from "./criteria-review";

const t = fr.search.review;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const metadata: Metadata = { title: t.title, robots: { index: false } };

export default async function ProjectReviewPage({
  params,
  searchParams,
}: PageProps<"/recherche/[id]">) {
  const { id } = await params;
  const { photos: photosParam } = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, description, analyzed_at, ai_confidence, trade_code, lieu_type, room_codes, work_type_codes, surface, ville_code_insee, ville_nom, code_postal, adresse, date_mode, date_souhaitee",
    )
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const [trades, workTypes, rooms, photos] = await Promise.all([
    supabase.from("trades").select("code, label").eq("active", true).order("sort_order"),
    supabase
      .from("work_types")
      .select("code, label, trade_code")
      .eq("active", true)
      .order("sort_order"),
    supabase.from("rooms").select("code, label").eq("active", true).order("sort_order"),
    supabase
      .from("project_photos")
      .select("id, storage_path")
      .eq("project_id", id)
      .order("sort_order")
      .order("created_at"),
  ]);
  const photoRows = photos.data ?? [];
  const { data: signed } = photoRows.length
    ? await supabase.storage.from("project-photos").createSignedUrls(
        photoRows.map((p) => p.storage_path),
        3600,
      )
    : { data: [] };

  const initial: Criteria = {
    tradeCode: project.trade_code,
    lieuType: project.lieu_type,
    roomCodes: project.room_codes,
    workTypeCodes: project.work_type_codes,
    surface: project.surface,
    ville: project.ville_code_insee
      ? {
          code: project.ville_code_insee,
          nom: project.ville_nom ?? project.ville_code_insee,
          codePostal: project.code_postal,
          lon: null,
          lat: null,
        }
      : null,
    // Adresse déjà géocodée : les coordonnées restent en base tant qu'elle ne change pas.
    adresse:
      project.adresse && project.ville_code_insee
        ? { label: project.adresse, citycode: project.ville_code_insee, lon: null, lat: null }
        : null,
    dateMode: project.date_mode,
    dateSouhaitee: project.date_souhaitee,
  };

  const lowConfidence =
    project.ai_confidence !== null && project.ai_confidence < AI_CONFIDENCE_THRESHOLD;

  return (
    <main className="bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/recherche"
          className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {t.back}
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2.5 text-2xl font-medium tracking-tight sm:text-[1.75rem]">
            <Sparkles aria-hidden="true" className="size-6 shrink-0 text-primary" />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {project.analyzed_at ? t.intro : t.noAnalysis}
          </p>
        </div>
        {lowConfidence && <Alert tone="info">{t.lowConfidence}</Alert>}
        {photosParam === "erreur" && <Alert tone="error">{fr.search.errors.photos}</Alert>}
        <details className="group rounded-card border border-border bg-surface px-5 py-4 shadow-card">
          <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
            <span className="inline-flex items-center gap-2">
              <ChevronRight
                aria-hidden="true"
                className="size-4 text-primary transition-transform group-open:rotate-90"
              />
              {t.yourText}
            </span>
          </summary>
          <p className="mt-3 text-sm whitespace-pre-line text-muted-foreground">
            {project.description}
          </p>
        </details>
        <CriteriaReview
          projectId={project.id}
          initial={initial}
          trades={trades.data ?? []}
          workTypes={(workTypes.data ?? []).map((w) => ({
            code: w.code,
            label: w.label,
            trade: w.trade_code,
          }))}
          rooms={rooms.data ?? []}
          photos={photoRows.map((p, i) => ({ id: p.id, url: signed?.[i]?.signedUrl ?? null }))}
          today={parisToday()}
        />
      </div>
    </main>
  );
}
