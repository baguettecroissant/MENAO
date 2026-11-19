import type { Metadata } from "next";
import { z } from "zod";
import { MeetingChooser } from "@/components/recruitment/meeting-chooser";
import { Alert } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { openMeetings } from "@/lib/site/recruitment";
import { createPublicClient } from "@/lib/supabase/public";

const t = fr.pages.recruitment;

export const metadata: Metadata = {
  title: `${t.reunionTitle} — MENAO`,
  robots: { index: false, follow: false },
};

/**
 * Réunion d'information d'un candidat conseiller (F-183, ADR 0380), ouverte depuis les e-mails
 * avec le jeton de sa candidature : voir sa réservation, changer de créneau, ou être rappelé.
 */
export default async function RecruitmentMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t: token = "" } = await searchParams;
  const supabase = createPublicClient();
  const valid = z.uuid().safeParse(token).success;
  const [{ data, error }, meetings] = valid
    ? await Promise.all([
        supabase.rpc("recruitment_candidate", { p_token: token }),
        openMeetings(supabase),
      ])
    : [{ data: null, error: true }, []];
  const candidate = !error ? data?.[0] : undefined;

  return (
    <main className="bg-background px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-xl rounded-[1.375rem] border border-border bg-surface p-6 shadow-card sm:p-9">
        {candidate ? (
          <MeetingChooser
            token={token}
            firstName={candidate.first_name}
            email={candidate.email}
            meetings={meetings}
            booked={
              candidate.meeting_starts_at
                ? {
                    startsAt: candidate.meeting_starts_at,
                    durationMinutes: candidate.meeting_duration,
                  }
                : null
            }
          />
        ) : (
          <Alert tone="info">{t.invalidLink}</Alert>
        )}
      </div>
    </main>
  );
}
