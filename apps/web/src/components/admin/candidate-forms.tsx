"use client";

import {
  INTERVIEW_CRITERIA,
  RECRUITMENT_MEETING_DEFAULTS,
  RECRUITMENT_MEETING_DURATIONS,
  RECRUITMENT_STAGES,
  type InterviewGrid,
} from "@menao/core";
import { Copy } from "lucide-react";
import { useActionState, useState } from "react";
import {
  Alert,
  Button,
  Field,
  FieldError,
  SelectField,
  focusRing,
  inputClasses,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState, type FormState } from "@/lib/auth/form";
import {
  cancelMeeting,
  createMeeting,
  declineCandidate,
  saveInterviewGrid,
  sendCandidateDemo,
  setCandidateStage,
} from "@/lib/admin/recruitment-actions";

const t = fr.admin.candidates;
const d = t.detail;

/** Grille d'entretien : six critères notés de 1 à 5, et les notes (ADR 0380). */
export function InterviewGridForm({
  candidateId,
  grid,
  notes,
}: {
  candidateId: string;
  grid: InterviewGrid;
  notes: string | null;
}) {
  const [state, action, pending] = useActionState(saveInterviewGrid, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="candidate" value={candidateId} />
      {INTERVIEW_CRITERIA.map((criterion) => (
        <fieldset
          key={criterion}
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-2.5"
        >
          <legend className="sr-only">{d.criteria[criterion]}</legend>
          <span aria-hidden="true" className="text-[0.9375rem] font-semibold">
            {d.criteria[criterion]}
          </span>
          <span className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n}>
                <input
                  type="radio"
                  name={criterion}
                  value={n}
                  defaultChecked={grid[criterion] === n}
                  aria-label={d.note(d.criteria[criterion], n)}
                  className="peer sr-only"
                />
                <span className="flex size-9 cursor-pointer items-center justify-center rounded-[0.625rem] border border-border-strong text-sm font-bold text-label peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
                  {n}
                </span>
              </label>
            ))}
          </span>
        </fieldset>
      ))}
      <label className="mt-2 flex flex-col gap-1.5">
        <span className="text-sm font-semibold">{d.notes}</span>
        <textarea
          name="notes"
          rows={4}
          maxLength={4000}
          defaultValue={notes ?? ""}
          className={`${inputClasses} min-h-24 resize-y py-3`}
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" block={false} disabled={pending}>
          {d.saveGrid}
        </Button>
        {state.success && <span className="text-sm text-success">{state.success}</span>}
        {state.error && <FieldError>{state.error}</FieldError>}
      </div>
    </form>
  );
}

/** Étape du candidat, choisie à la main (« Non retenu » passe par le bouton dédié). */
export function CandidateStageForm({ candidateId, stage }: { candidateId: string; stage: string }) {
  const [state, action, pending] = useActionState(setCandidateStage, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="candidate" value={candidateId} />
      <SelectField label={d.stage} name="stage" defaultValue={stage}>
        {RECRUITMENT_STAGES.filter((s) => s !== "non_retenu" || stage === "non_retenu").map((s) => (
          <option key={s} value={s} disabled={s === "non_retenu"}>
            {t.stages[s]}
          </option>
        ))}
      </SelectField>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {d.saveStage}
      </Button>
      {state.success && <span className="text-sm text-success">{state.success}</span>}
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

function ActionButton({
  action: serverAction,
  candidateId,
  label,
  confirm,
  variant = "secondary",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  candidateId: string;
  label: string;
  confirm?: string;
  variant?: "secondary" | "danger-text";
}) {
  const [state, action, pending] = useActionState(serverAction, initialFormState);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className="flex flex-col gap-1"
    >
      <input type="hidden" name="candidate" value={candidateId} />
      <Button type="submit" variant={variant} size="sm" disabled={pending}>
        {label}
      </Button>
      {state.success && <span className="text-sm text-success">{state.success}</span>}
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

export function SendDemoButton({ candidateId }: { candidateId: string }) {
  return <ActionButton action={sendCandidateDemo} candidateId={candidateId} label={d.sendDemo} />;
}

export function DeclineButton({ candidateId }: { candidateId: string }) {
  return (
    <ActionButton
      action={declineCandidate}
      candidateId={candidateId}
      label={d.decline}
      confirm={d.declineConfirm}
      variant="danger-text"
    />
  );
}

/** Nouvelle réunion d'information (date et heure de Paris, durée, places, lien de visio). */
export function MeetingCreateForm() {
  const [state, action, pending] = useActionState(createMeeting, initialFormState);
  const m = t.meetings;
  const errors = state.fieldErrors ?? {};
  const v = state.success ? undefined : state.values;
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          key={`date-${state.success ?? ""}`}
          label={m.date}
          name="date"
          type="date"
          required
          defaultValue={v?.date}
          errors={errors.date}
        />
        <Field
          key={`time-${state.success ?? ""}`}
          label={m.time}
          name="time"
          type="time"
          step={300}
          required
          defaultValue={v?.time ?? "18:00"}
        />
        <SelectField label={m.duration} name="duration" defaultValue={v?.duration ?? "30"}>
          {RECRUITMENT_MEETING_DURATIONS.map((n) => (
            <option key={n} value={n}>
              {m.durationOption(n)}
            </option>
          ))}
        </SelectField>
        <Field
          label={m.capacity}
          name="capacity"
          type="number"
          min={1}
          max={50}
          defaultValue={v?.capacity ?? String(RECRUITMENT_MEETING_DEFAULTS.capacity)}
        />
      </div>
      <Field
        key={`url-${state.success ?? ""}`}
        label={m.url}
        name="url"
        type="url"
        inputMode="url"
        placeholder="https://meet.google.com/…"
        hint={m.urlHint}
        required
        defaultValue={v?.url}
        errors={errors.url}
      />
      <Button type="submit" block={false} disabled={pending} className="self-start">
        {m.create}
      </Button>
    </form>
  );
}

export function CancelMeetingButton({ meetingId }: { meetingId: string }) {
  const [state, action, pending] = useActionState(cancelMeeting, initialFormState);
  if (state.success) return <span className="text-sm text-muted-foreground">{state.success}</span>;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(t.meetings.cancelConfirm)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <input type="hidden" name="meeting" value={meetingId} />
      <Button type="submit" variant="danger-text" size="sm" block={false} disabled={pending}>
        {t.meetings.cancel}
      </Button>
      {state.error && <FieldError>{state.error}</FieldError>}
    </form>
  );
}

/** Copie du lien de visio de la prochaine réunion. */
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(url).then(() => setCopied(true));
      }}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border border-border-strong px-4 text-sm font-semibold ${focusRing}`}
    >
      <Copy aria-hidden="true" className="size-4" />
      <span aria-live="polite">{copied ? t.copied : t.copyLink}</span>
    </button>
  );
}
