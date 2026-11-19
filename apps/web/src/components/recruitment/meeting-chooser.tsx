"use client";

import { googleCalendarUrl } from "@menao/core";
import { CalendarDays, Check, Repeat } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert, Button, ButtonLink, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { formatTime } from "@/lib/format";
import type { MeetingSlot } from "@/lib/site/recruitment";
import {
  bookRecruitmentMeeting,
  refreshOpenMeetings,
  requestRecruitmentCallback,
} from "@/lib/site/recruitment-actions";

const t = fr.pages.recruitment.meeting;
type Booked = { startsAt: string; durationMinutes: number };

// « jeudi 26 novembre », à l'heure de Paris (la réunion est toujours dans les semaines à venir).
const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});
const dayInline = (iso: string) => dayFormat.format(new Date(iso));
const dayTitle = (iso: string) => {
  const d = dayInline(iso);
  return d.charAt(0).toUpperCase() + d.slice(1);
};

const endTime = (m: Booked) =>
  formatTime(new Date(new Date(m.startsAt).getTime() + m.durationMinutes * 60_000).toISOString());

/**
 * Réservation de la réunion d'information (F-183, ADR 0380), juste après la candidature ou depuis
 * le lien des e-mails : choix du créneau, confirmation, changement, ou demande de rappel.
 */
export function MeetingChooser({
  token,
  firstName,
  email,
  meetings: initialMeetings,
  booked: initialBooked = null,
  justApplied = false,
}: {
  token: string;
  firstName: string;
  email: string;
  meetings: MeetingSlot[];
  booked?: Booked | null;
  justApplied?: boolean;
}) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [booked, setBooked] = useState<Booked | null>(initialBooked);
  const [selected, setSelected] = useState<string | null>(initialMeetings[0]?.id ?? null);
  const [called, setCalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const book = () =>
    selected &&
    startTransition(async () => {
      const result = await bookRecruitmentMeeting(token, selected);
      if (result.error || !result.startsAt) {
        setError(result.error ?? fr.errors.generic);
        setMeetings(await refreshOpenMeetings());
        return;
      }
      setError(null);
      setBooked({ startsAt: result.startsAt, durationMinutes: result.durationMinutes ?? 30 });
    });
  const change = () =>
    startTransition(async () => {
      const fresh = await refreshOpenMeetings();
      setMeetings(fresh);
      setSelected(fresh[0]?.id ?? null);
      setBooked(null);
    });
  const callback = () =>
    startTransition(async () => {
      const result = await requestRecruitmentCallback(token);
      if (result.error) setError(result.error);
      else setCalled(true);
    });

  if (called) return <Alert tone="success">{t.callbackDone}</Alert>;

  if (booked) {
    const calendar = googleCalendarUrl({
      start: new Date(booked.startsAt),
      durationMinutes: booked.durationMinutes,
      summary: t.calendarTitle,
      description: t.calendarDetails,
    });
    return (
      <div className="flex flex-col gap-4">
        <span className="flex size-13 items-center justify-center rounded-2xl bg-success-soft text-success">
          <CalendarDays aria-hidden="true" className="size-6" />
        </span>
        <h3 className="font-display text-[1.625rem] leading-tight font-bold tracking-tight">
          {t.booked(dayInline(booked.startsAt), formatTime(booked.startsAt))}
        </h3>
        <p className="leading-relaxed text-label">{t.bookedText(email)}</p>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <ButtonLink
            href={calendar as Route}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            {t.addToCalendar}
          </ButtonLink>
          <Button
            type="button"
            variant="secondary"
            block={false}
            onClick={change}
            disabled={pending}
          >
            <Repeat aria-hidden="true" className="size-4" />
            {t.change}
          </Button>
        </div>
        <p className="rounded-2xl bg-background p-4 text-sm leading-relaxed text-label">
          <b>{t.demoTitle}</b>, {t.demoText}{" "}
          <Link
            href="/pro"
            className="font-semibold text-primary-strong underline-offset-4 hover:underline"
          >
            {t.demoLink}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {justApplied && (
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-success-soft px-3 py-1.5 text-sm font-bold text-success">
          <Check aria-hidden="true" className="size-4 stroke-[2.6]" />
          {t.sent}
        </span>
      )}
      <h3 className="font-display text-[1.75rem] leading-[1.1] font-bold tracking-tight sm:text-[2rem]">
        {justApplied ? t.title(firstName) : t.changeTitle(firstName)}
      </h3>
      <p className="leading-relaxed text-label">{t.lead}</p>
      {error && <Alert tone="error">{error}</Alert>}
      {meetings.length === 0 ? (
        <>
          <Alert tone="info">{t.none}</Alert>
          <Button
            type="button"
            block={false}
            onClick={callback}
            disabled={pending}
            className="self-start"
          >
            {t.callback}
          </Button>
        </>
      ) : (
        <>
          <fieldset className="flex flex-col gap-2.5">
            <legend className="sr-only">{t.pick}</legend>
            {meetings.map((m) => {
              const slot = t.slot(
                dayTitle(m.startsAt),
                formatTime(m.startsAt),
                endTime({ startsAt: m.startsAt, durationMinutes: m.durationMinutes }),
              );
              return (
                <label
                  key={m.id}
                  className={`flex cursor-pointer items-center gap-3.5 rounded-2xl border bg-surface px-4 py-3.5 transition-colors has-[:checked]:border-2 has-[:checked]:border-primary has-[:checked]:bg-primary-soft ${focusRing}`}
                >
                  <input
                    type="radio"
                    name="reunion"
                    value={m.id}
                    checked={selected === m.id}
                    onChange={() => setSelected(m.id)}
                    className="size-5 accent-primary"
                  />
                  <span className="flex flex-1 flex-col gap-0.5">
                    <b>{slot.day}</b>
                    <span className="text-sm text-label">{slot.hours}</span>
                  </span>
                  <span className="text-[0.8125rem] text-muted-foreground">
                    {t.remaining(m.remaining)}
                  </span>
                </label>
              );
            })}
          </fieldset>
          <Button type="button" onClick={book} disabled={pending || !selected}>
            <Check aria-hidden="true" className="size-4" />
            {t.book(dayInline((meetings.find((m) => m.id === selected) ?? meetings[0]!).startsAt))}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t.noneFits}{" "}
            <button
              type="button"
              onClick={callback}
              disabled={pending}
              className={`font-semibold text-primary-strong underline-offset-4 hover:underline ${focusRing}`}
            >
              {t.callback}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
