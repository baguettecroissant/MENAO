import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { CancelMeetingButton, MeetingCreateForm } from "@/components/admin/candidate-forms";
import { Button, Card, CardTitle, StatusBadge, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { markAttendance } from "@/lib/admin/recruitment-actions";
import { formatDayTime } from "@/lib/format";

const t = fr.admin.candidates;
const m = t.meetings;

export const metadata: Metadata = { title: `${m.title} — ${fr.admin.title}` };

type Attendee = {
  id: string;
  first_name: string;
  last_name: string;
  stage: string;
  attendance: string | null;
};
type Meeting = {
  id: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  meet_url: string;
  active: boolean;
  candidates: Attendee[];
};

function AttendanceButtons({ candidate }: { candidate: Attendee }) {
  return (
    <form action={markAttendance} className="flex gap-1.5">
      <input type="hidden" name="candidate" value={candidate.id} />
      {(["present", "absent"] as const).map((value) => (
        <Button
          key={value}
          type="submit"
          name="attendance"
          value={value}
          size="sm"
          block={false}
          variant={candidate.attendance === value ? "dark" : "secondary"}
          aria-pressed={candidate.attendance === value}
        >
          {value === "present" ? m.present : m.absent}
        </Button>
      ))}
    </form>
  );
}

function MeetingCard({ meeting, past }: { meeting: Meeting; past: boolean }) {
  const booked = meeting.candidates.filter((c) => c.stage !== "non_retenu");
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <b className="text-lg">{formatDayTime(meeting.starts_at)}</b>
          <span className="text-sm text-muted-foreground">
            {m.durationOption(meeting.duration_minutes)} ·{" "}
            {m.seats(booked.length, meeting.capacity)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!meeting.active && <StatusBadge tone="neutral">{m.cancelled}</StatusBadge>}
          {meeting.active && !past && (
            <>
              <TextLink
                href={meeting.meet_url as Route}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm"
              >
                {m.open}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </TextLink>
              <CancelMeetingButton meetingId={meeting.id} />
            </>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{m.attendees}</span>
        {booked.length === 0 ? (
          <span className="pt-1 text-sm text-muted-foreground">{m.noAttendee}</span>
        ) : (
          booked.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t border-border py-2"
            >
              <Link
                href={`/admin/candidats/${c.id}` as Route}
                className="text-sm font-semibold underline-offset-2 hover:underline"
              >
                {c.first_name} {c.last_name}
              </Link>
              {meeting.active && <AttendanceButtons candidate={c} />}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

/**
 * Réunions d'information des candidats conseillers (F-183, lot 77, ADR 0380) : créneaux proposés
 * après la candidature, avec leur lien de visio ; inscrits, présents et absents ; annulation qui
 * prévient les inscrits. Réservé aux admins.
 */
export default async function AdminRecruitmentMeetingsPage() {
  const { supabase } = await requireAdmin();
  const now = new Date().toISOString();
  const select =
    "id, starts_at, duration_minutes, capacity, meet_url, active, candidates:commercial_candidates(id, first_name, last_name, stage, attendance)";
  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from("recruitment_meetings")
      .select(select)
      .gte("starts_at", now)
      .order("starts_at")
      .limit(30),
    supabase
      .from("recruitment_meetings")
      .select(select)
      .lt("starts_at", now)
      .order("starts_at", { ascending: false })
      .limit(10),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <TextLink
        href={"/admin/candidats" as Route}
        className="inline-flex items-center gap-1 self-start text-sm"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {m.back}
      </TextLink>
      <div className="flex flex-col gap-2">
        <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
          {m.title}
        </h1>
        <p className="max-w-3xl text-muted-foreground">{m.intro}</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">{m.upcoming}</h2>
          {(upcoming ?? []).length === 0 ? (
            <p className="text-muted-foreground">{m.noneUpcoming}</p>
          ) : (
            (upcoming as Meeting[]).map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} past={false} />
            ))
          )}
          <h2 className="mt-4 text-lg font-medium">{m.past}</h2>
          {(past ?? []).length === 0 ? (
            <p className="text-muted-foreground">{m.nonePast}</p>
          ) : (
            (past as Meeting[]).map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} past />
            ))
          )}
        </div>
        <Card className="flex flex-col gap-4">
          <CardTitle title={m.newTitle} />
          <MeetingCreateForm />
        </Card>
      </div>
    </div>
  );
}
