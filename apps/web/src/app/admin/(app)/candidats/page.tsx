import {
  RECRUITMENT_FILTERS,
  RECRUITMENT_SOURCES,
  recruitmentFilter,
  type RecruitmentFilter,
  type RecruitmentStage,
} from "@menao/core";
import { CalendarDays, ChevronRight, ExternalLink } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { AdminSectionHeader } from "@/components/admin/admin-tabs";
import { CopyLinkButton } from "@/components/admin/candidate-forms";
import { FilterChips, listHref } from "@/components/admin/list-controls";
import { ButtonLink, Card, StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { purgeDeletedCandidateCvs } from "@/lib/admin/candidate-cv";
import { requireAdmin } from "@/lib/admin/guard";
import { formatDayMonthShort, formatTime } from "@/lib/format";

const t = fr.admin.candidates;
const o = fr.pages.recruitment.options;
const PATH = "/admin/candidats";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const TONES: Record<RecruitmentStage, "primary" | "warning" | "success" | "neutral"> = {
  nouveau: "primary",
  a_appeler: "warning",
  reunion_prevue: "primary",
  entretien: "primary",
  retenu: "success",
  non_retenu: "neutral",
};
const FILTER_KEYS = Object.keys(RECRUITMENT_FILTERS) as RecruitmentFilter[];

type Row = {
  id: string;
  first_name: string;
  last_name: string;
  sector: string;
  created_at: string;
  source: string;
  legal_status: string;
  sees_artisans: boolean;
  experience: string;
  availability: string;
  stage: RecruitmentStage;
  attendance: string | null;
  callback_requested: boolean;
  test_score: number | null;
  meeting: { starts_at: string } | null;
};

function progress(row: Row): string {
  const p = t.progress;
  if (row.test_score !== null) return p.test(row.test_score);
  if (row.meeting && row.attendance === "present")
    return p.present(formatDayMonthShort(row.meeting.starts_at));
  if (row.meeting && row.attendance === "absent")
    return p.absent(formatDayMonthShort(row.meeting.starts_at));
  if (row.meeting && row.stage === "reunion_prevue")
    return p.meeting(formatDayMonthShort(row.meeting.starts_at));
  if (row.callback_requested) return p.callback;
  return p.none;
}

/**
 * Candidats conseillers (F-183, lot 77, ADR 0380) : prochaine réunion d'information, provenance
 * des candidats sur 30 jours, liste filtrée par étape. Réservé aux admins.
 */
export default async function AdminCandidatesPage({ searchParams }: PageProps<"/admin/candidats">) {
  const params = await searchParams;
  const filter = recruitmentFilter(typeof params.etape === "string" ? params.etape : null);
  const { supabase } = await requireAdmin();
  // CV des candidatures supprimées (2 ans) : effacés du stockage (ADR 0382).
  await purgeDeletedCandidateCvs(supabase);
  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  const [{ data: rows }, { data: stages }, { data: recent }, { data: meetings }] =
    await Promise.all([
      supabase
        .from("commercial_candidates")
        .select(
          "id, first_name, last_name, sector, created_at, source, legal_status, sees_artisans, experience, availability, stage, attendance, callback_requested, test_score, meeting:recruitment_meetings(starts_at)",
        )
        .in("stage", [...RECRUITMENT_FILTERS[filter]])
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("commercial_candidates").select("stage"),
      supabase.from("commercial_candidates").select("source").gte("created_at", since),
      supabase
        .from("recruitment_meetings")
        .select("id, starts_at, capacity, meet_url, candidates:commercial_candidates(stage)")
        .eq("active", true)
        .gt("starts_at", now.toISOString())
        .order("starts_at")
        .limit(1),
    ]);
  const list = (rows ?? []) as Row[];
  const counts = Object.fromEntries(
    FILTER_KEYS.map((key) => [
      key,
      (stages ?? []).filter((s) =>
        (RECRUITMENT_FILTERS[key] as readonly string[]).includes(s.stage),
      ).length,
    ]),
  ) as Record<RecruitmentFilter, number>;
  const sources = RECRUITMENT_SOURCES.map((s) => ({
    key: s,
    count: (recent ?? []).filter((r) => r.source === s).length,
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxSource = Math.max(1, ...sources.map((s) => s.count));
  const next = meetings?.[0];
  const booked = next?.candidates.filter((c) => c.stage === "reunion_prevue").length ?? 0;
  const c = t.columns;

  return (
    <div className="flex flex-col gap-6">
      <AdminSectionHeader
        set="contributors"
        current="candidates"
        intro={fr.admin.tabs.contributors.intro}
        lead={
          <p>
            {t.intro}{" "}
            <TextLink
              href={"/devenir-conseiller" as Route}
              target="_blank"
              className="inline-flex items-center gap-1"
            >
              {t.publicLink}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </TextLink>
          </p>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <Card className="flex flex-wrap items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
            <CalendarDays aria-hidden="true" className="size-5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">{t.nextMeeting}</span>
            {next ? (
              <>
                <b className="text-lg whitespace-nowrap">
                  {formatDayMonthShort(next.starts_at)}, {formatTime(next.starts_at)}
                </b>
                <span className="text-sm text-label">{t.meetingSeats(booked, next.capacity)}</span>
              </>
            ) : (
              <b className="text-lg">{t.noMeeting}</b>
            )}
          </span>
          <span className="flex flex-col gap-2">
            {next && <CopyLinkButton url={next.meet_url} />}
            <ButtonLink href={"/admin/candidats/reunions" as Route} variant="secondary" size="sm">
              {t.manageMeetings}
            </ButtonLink>
          </span>
        </Card>
        <Card className="flex flex-col gap-2.5">
          <span className="text-sm text-muted-foreground">{t.sourcesTitle}</span>
          {sources.length === 0 ? (
            <span className="text-sm text-muted-foreground">{t.sourcesEmpty}</span>
          ) : (
            sources.map((s) => (
              <div key={s.key} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0">{o.source[s.key]}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-background">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((s.count / maxSource) * 100)}%` }}
                  />
                </span>
                <b className="w-6 text-right">{s.count}</b>
              </div>
            ))
          )}
        </Card>
      </div>
      <FilterChips
        label={t.filtersLabel}
        items={FILTER_KEYS.map((key) => ({
          key,
          href: listHref(PATH, { etape: key === "tous" ? null : key }),
          label: t.filters[key],
          count: counts[key],
          active: key === filter,
        }))}
      />
      <Card className="flex flex-col gap-4">
        {list.length === 0 ? (
          <p className="text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full min-w-[56rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  {[c.candidate, c.received, c.source, c.profile, c.progress, c.stage].map((h) => (
                    <th key={h} scope="col" className="py-2 pr-4 font-normal">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="sr-only">
                    {t.detail.application}
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="py-3 pr-4">
                      <Link
                        href={`${PATH}/${row.id}` as Route}
                        className="font-semibold text-foreground underline-offset-2 hover:underline"
                      >
                        {row.first_name} {row.last_name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{row.sector}</span>
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {formatDayMonthShort(row.created_at)}
                    </td>
                    <td className="py-3 pr-4 font-semibold">
                      {o.source[row.source as keyof typeof o.source] ?? row.source}
                    </td>
                    <td className="py-3 pr-4 text-label">
                      {[
                        row.sees_artisans
                          ? t.seesArtisans
                          : o.legalStatus[row.legal_status as keyof typeof o.legalStatus],
                        o.experience[row.experience as keyof typeof o.experience],
                        o.availability[
                          row.availability as keyof typeof o.availability
                        ].toLowerCase(),
                      ].join(" · ")}
                    </td>
                    <td className="py-3 pr-4 text-label">{progress(row)}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge tone={TONES[row.stage]}>{t.stages[row.stage]}</StatusBadge>
                    </td>
                    <td className="py-3">
                      <Link
                        href={`${PATH}/${row.id}` as Route}
                        aria-label={`${row.first_name} ${row.last_name}`}
                      >
                        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-sm text-muted-foreground">{t.note}</p>
    </div>
  );
}
