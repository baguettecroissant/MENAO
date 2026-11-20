import {
  TRAINING_CRITERIA,
  TRAINING_CRITERION_MAX,
  interviewAverage,
  normalizeInterviewGrid,
  type RecruitmentStage,
} from "@menao/core";
import { ArrowLeft, ExternalLink, FileText, Mail, Phone } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  CandidateStageForm,
  DeclineButton,
  InterviewGridForm,
  SendDemoButton,
} from "@/components/admin/candidate-forms";
import { Button, ButtonLink, Card, CardTitle, StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { candidateCvUrl } from "@/lib/admin/candidate-cv";
import { requireAdmin } from "@/lib/admin/guard";
import { inviteCandidate } from "@/lib/admin/recruitment-actions";
import { formatDayMonthShort, formatDayTimeInline, formatPhone } from "@/lib/format";

const t = fr.admin.candidates;
const d = t.detail;
const o = fr.pages.recruitment.options;

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const TONES: Record<RecruitmentStage, "primary" | "warning" | "success" | "neutral"> = {
  nouveau: "primary",
  a_appeler: "warning",
  reunion_prevue: "primary",
  entretien: "primary",
  retenu: "success",
  non_retenu: "neutral",
};

// Compte rendu du coach (TrainingReview, ADR 0224) gardé sur la fiche par le test de vente.
const reviewSchema = z.object({
  scores: z.record(z.string(), z.number()).optional(),
  tips: z.array(z.string()).optional(),
});

/**
 * Fiche d'un candidat commercial (F-183, lots 77 et 79, ADR 0380 et 0382) : grille d'entretien, sa candidature (CV, LinkedIn),
 * test de vente, étape et actions (démo, invitation, réponse polie). Réservé aux admins.
 */
export default async function AdminCandidatePage({ params }: PageProps<"/admin/candidats/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireAdmin();
  const { data: c } = await supabase
    .from("commercial_candidates")
    .select("*, meeting:recruitment_meetings(starts_at)")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();
  // CV de la candidature (lot 79, ADR 0382) : lien temporaire de 10 minutes.
  const cvUrl = await candidateCvUrl(supabase, c.cv_path);
  const stage = c.stage as RecruitmentStage;
  const grid = normalizeInterviewGrid(c.interview_grid);
  const average = interviewAverage(grid);
  const review = reviewSchema.safeParse(c.test_review);
  const meetingDay = c.meeting ? formatDayMonthShort(c.meeting.starts_at) : null;
  const meetingLabel = !meetingDay
    ? c.callback_requested
      ? d.callbackAsked
      : d.meetingNone
    : c.attendance === "present"
      ? d.meetingPresent(meetingDay)
      : c.attendance === "absent"
        ? d.meetingAbsent(meetingDay)
        : d.meetingBooked(meetingDay);
  const rows: [string, string][] = [
    [d.rows.sector, c.sector],
    [d.rows.legalStatus, o.legalStatus[c.legal_status as keyof typeof o.legalStatus]],
    [d.rows.experience, o.experience[c.experience as keyof typeof o.experience]],
    [d.rows.availability, o.availability[c.availability as keyof typeof o.availability]],
    [d.rows.seesArtisans, c.sees_artisans ? d.yes : d.no],
    [d.rows.source, o.source[c.source as keyof typeof o.source]],
    [d.rows.meeting, meetingLabel],
  ];
  const closed = stage === "non_retenu";

  return (
    <div className="flex flex-col gap-6">
      <TextLink
        href={"/admin/candidats" as Route}
        className="inline-flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {d.back}
      </TextLink>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
            {c.first_name} {c.last_name}
          </h1>
          <p className="text-muted-foreground">
            {d.subtitle(
              c.sector,
              o.legalStatus[c.legal_status as keyof typeof o.legalStatus].toLowerCase(),
              o.experience[c.experience as keyof typeof o.experience].toLowerCase(),
            )}
          </p>
        </div>
        <StatusBadge tone={TONES[stage]}>{t.stages[stage]}</StatusBadge>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22.5rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="flex flex-col gap-2">
            <CardTitle
              title={d.grid}
              action={
                average !== null ? (
                  <b className="text-[0.9375rem]">{average.toLocaleString("fr-FR")} / 5</b>
                ) : undefined
              }
            />
            <InterviewGridForm candidateId={c.id} grid={grid} notes={c.interview_notes} />
            {c.interviewed_at && (
              <span className="text-xs text-muted-foreground">
                {d.lastInterview(formatDayTimeInline(c.interviewed_at))}
              </span>
            )}
          </Card>
          <Card className="flex flex-col gap-3">
            <CardTitle
              title={d.application}
              description={d.receivedOn(formatDayTimeInline(c.created_at))}
            />
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <a
                href={`mailto:${c.email}`}
                className="inline-flex items-center gap-1.5 font-semibold text-primary-strong"
              >
                <Mail aria-hidden="true" className="size-4" />
                {c.email}
              </a>
              <a
                href={`tel:${c.phone}`}
                className="inline-flex items-center gap-1.5 font-semibold text-primary-strong"
              >
                <Phone aria-hidden="true" className="size-4" />
                {formatPhone(c.phone)}
              </a>
              {cvUrl && (
                <a
                  href={cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-primary-strong"
                >
                  <FileText aria-hidden="true" className="size-4" />
                  {d.cv}
                </a>
              )}
              {c.linkedin_url && (
                <a
                  href={c.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold text-primary-strong"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                  {d.linkedin}
                </a>
              )}
            </div>
            <dl className="flex flex-col">
              {rows.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between gap-4 border-t border-border py-2.5 text-sm"
                >
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
            {c.motivation && (
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">{d.motivation}</span>
                <p className="rounded-xl bg-background p-3.5 text-sm leading-relaxed text-label">
                  {c.motivation}
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-3">
            <CardTitle
              title={d.test}
              action={
                <StatusBadge tone={c.test_score !== null ? "success" : "neutral"}>
                  {c.test_score !== null ? d.testDone : d.testNone}
                </StatusBadge>
              }
            />
            {c.test_score !== null && (
              <>
                <p className="flex items-baseline gap-1.5">
                  <span className="font-display text-[2.75rem] leading-none font-bold">
                    {c.test_score}
                  </span>
                  <span className="text-lg font-semibold text-muted-foreground">/ 20</span>
                  {c.tested_at && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDayMonthShort(c.tested_at)}
                    </span>
                  )}
                </p>
                {review.success && review.data.scores && (
                  <dl className="flex flex-col">
                    {TRAINING_CRITERIA.filter((k) => review.data.scores?.[k] !== undefined).map(
                      (k) => (
                        <div
                          key={k}
                          className="flex justify-between border-t border-border py-1.5 text-sm"
                        >
                          <dt>{fr.commercialTraining.criteria[k]}</dt>
                          <dd className="font-bold">
                            {review.data.scores?.[k]} / {TRAINING_CRITERION_MAX}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>
                )}
                {review.success && review.data.tips && review.data.tips.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">{d.testTips}</span>
                    <ul className="list-disc pl-5 text-sm leading-relaxed text-label">
                      {review.data.tips.map((tip) => (
                        <li key={tip}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {!closed && (
              <ButtonLink
                href={`/admin/candidats/${c.id}/test` as Route}
                variant="secondary"
                size="sm"
                block
              >
                {c.test_score !== null ? d.redoTest : d.runTest}
              </ButtonLink>
            )}
          </Card>
          <Card className="flex flex-col gap-3">
            <CardTitle title={d.actions} />
            {!closed && <CandidateStageForm candidateId={c.id} stage={stage} />}
            {!closed && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <SendDemoButton candidateId={c.id} />
                <form action={inviteCandidate}>
                  <input type="hidden" name="candidate" value={c.id} />
                  <Button type="submit" variant="dark" size="sm">
                    {d.invite}
                  </Button>
                </form>
                <DeclineButton candidateId={c.id} />
              </div>
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">{d.actionsHelp}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
