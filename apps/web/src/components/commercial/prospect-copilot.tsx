"use client";

import {
  COPILOT_CHANNELS,
  COPILOT_MAX_OBJECTIONS,
  COPILOT_NEXT_LABEL_MAX_LENGTH,
  COPILOT_REPORT_MAX_LENGTH,
  COPILOT_REPORT_MIN_LENGTH,
  COPILOT_SUMMARY_MAX_LENGTH,
  PROSPECT_STATUSES,
  composeProspectMessage,
  demandWorthCiting,
  emailMessageUrl,
  smsMessageUrl,
  whatsAppMessageUrl,
  type CopilotChannel,
  type CopilotMessage,
  type CopilotReport,
  type StoredCopilotBrief,
} from "@menao/core";
import {
  Check,
  ClipboardList,
  Copy,
  LoaderCircle,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useActionState, useId, useState, type ReactNode } from "react";
import { DictationButton } from "@/components/project/dictation-button";
import {
  Alert,
  Button,
  Field,
  Hint,
  SelectField,
  buttonClasses,
  focusRing,
  inputClasses,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { saveProspectReport } from "@/lib/commercial/prospect-actions";
import { formatDay } from "@/lib/format";
import { invokeFunction } from "@/lib/project/client";
import { createClient } from "@/lib/supabase/client";

const c = fr.commercialCopilot;
const statusLabels = fr.commercialProspects.status;

type Tab = "brief" | "message" | "report";
const TABS: readonly Tab[] = ["brief", "message", "report"];

type CopilotResult =
  | { status: "ok"; brief: StoredCopilotBrief; createdAt: string }
  | { status: "ok"; message: CopilotMessage }
  | { status: "ok"; report: CopilotReport }
  | { status: string };

/** Appel de l'Edge Function avec la session du commercial ; message d'erreur prêt à afficher. */
async function invokeCopilot(body: Record<string, unknown>) {
  const result = await invokeFunction<CopilotResult & { status: string }>(
    createClient(),
    "commercial-copilot",
    body,
  );
  const error =
    result.status === "ok"
      ? null
      : (c.errors[result.status as keyof typeof c.errors] ?? c.errors.unavailable);
  return { result, error };
}

/**
 * Copilote du commercial (F-74, ADR 0223), sur la fiche d'un prospect qu'il suit : fiche de
 * préparation (gardée en base), message (SMS, WhatsApp, e-mail, script d'appel) ouvert sur son
 * téléphone pour qu'il l'envoie lui-même, compte rendu dicté puis relu avant d'entrer dans le
 * suivi.
 */
export function ProspectCopilot({
  prospectId,
  phone,
  link,
  brief,
  briefAt,
  tradeLabels,
}: {
  prospectId: string;
  phone: string | null;
  /** Lien d'inscription du commercial (son code). */
  link: string;
  brief: StoredCopilotBrief | null;
  briefAt: string | null;
  tradeLabels: Record<string, string>;
}) {
  const [tab, setTab] = useState<Tab>("brief");
  const baseId = useId();

  return (
    // Refonte « Nette » (lot 51, maquette ComProspectNette) : en-tête à icône, onglets soulignés.
    <section className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-input bg-primary-soft text-primary-strong">
          <Sparkles aria-hidden="true" className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <h2 className="text-[0.9375rem] font-bold">{c.title}</h2>
          <span className="text-[0.8125rem] text-muted-foreground">{c.subtitle}</span>
        </span>
      </div>
      <div
        role="tablist"
        aria-label={c.tabsLabel}
        className="flex gap-5 overflow-x-auto border-b border-border px-5"
      >
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`${baseId}-${key}-tab`}
            aria-selected={tab === key}
            aria-controls={`${baseId}-${key}-panel`}
            onClick={() => setTab(key)}
            className={`-mb-px flex min-h-11 shrink-0 items-center border-b-2 border-transparent text-sm whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground aria-selected:border-foreground aria-selected:font-semibold aria-selected:text-foreground ${focusRing}`}
          >
            {c.tabs[key]}
          </button>
        ))}
      </div>
      <div className="px-5 py-4">
        {TABS.map((key) => (
          <div
            key={key}
            role="tabpanel"
            id={`${baseId}-${key}-panel`}
            aria-labelledby={`${baseId}-${key}-tab`}
            hidden={tab !== key}
          >
            {key === "brief" && (
              <BriefPanel
                prospectId={prospectId}
                initial={brief}
                initialAt={briefAt}
                tradeLabels={tradeLabels}
              />
            )}
            {key === "message" && (
              <MessagePanel prospectId={prospectId} phone={phone} link={link} />
            )}
            {key === "report" && <ReportPanel prospectId={prospectId} phone={phone} link={link} />}
          </div>
        ))}
      </div>
    </section>
  );
}

function Pending({ label }: { label: string }) {
  return (
    <p aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
      {label}
    </p>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <h3 className="text-[0.8125rem] font-bold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------
// Fiche de préparation
// ------------------------------------------------------------------------------------------------

function BriefPanel({
  prospectId,
  initial,
  initialAt,
  tradeLabels,
}: {
  prospectId: string;
  initial: StoredCopilotBrief | null;
  initialAt: string | null;
  tradeLabels: Record<string, string>;
}) {
  const [brief, setBrief] = useState(initial);
  const [at, setAt] = useState(initialAt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setPending(true);
    setError(null);
    const { result, error: failure } = await invokeCopilot({ action: "brief", prospectId });
    setPending(false);
    if (failure || !("brief" in result)) return setError(failure ?? c.errors.unavailable);
    setBrief(result.brief);
    setAt(result.createdAt);
  }

  const demand = brief?.demand ?? null;
  const trades = demand?.metiers.map((m) => tradeLabels[m]?.toLowerCase() ?? m).join(", ") ?? "";

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert tone="error">{error}</Alert>}
      {!brief && !pending && <p className="text-sm text-muted-foreground">{c.brief.empty}</p>}
      {pending && <Pending label={c.brief.pending} />}
      {brief && !pending && (
        <div className="animate-menao-fade-up flex flex-col gap-4">
          {at && (
            <p className="text-xs text-muted-foreground">{c.brief.preparedOn(formatDay(at))}</p>
          )}
          <Section title={c.brief.portrait}>
            <p className="text-sm leading-relaxed">{brief.portrait}</p>
          </Section>
          {demandWorthCiting(demand) && (
            <Section title={c.brief.demandTitle}>
              <p className="text-sm leading-relaxed">
                {c.brief.demand(demand.recherches, trades, demand.rayonKm, demand.jours)}
              </p>
            </Section>
          )}
          <Section title={c.brief.arguments}>
            <ol className="flex flex-col gap-2.5">
              {brief.arguments.map((a, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-medium text-primary-strong"
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-medium">{a.title}</span> — {a.detail}
                  </span>
                </li>
              ))}
            </ol>
          </Section>
          <Section title={c.brief.objections}>
            <dl className="flex flex-col gap-3">
              {brief.objections.map((o, i) => (
                <div key={i} className="flex flex-col gap-0.5 text-sm leading-relaxed">
                  <dt className="font-medium">« {o.objection.replace(/^«\s*|\s*»$/g, "")} »</dt>
                  <dd className="text-muted-foreground">{o.answer}</dd>
                </div>
              ))}
            </dl>
          </Section>
          <Section title={c.brief.opening}>
            <p className="rounded-input bg-primary-softer px-4 py-3 text-sm leading-relaxed">
              {brief.openingQuestion}
            </p>
          </Section>
        </div>
      )}
      <Button
        type="button"
        variant={brief ? "secondary" : "primary"}
        onClick={generate}
        disabled={pending}
        className="sm:w-auto sm:self-start sm:px-6"
      >
        {brief ? (
          <RotateCcw aria-hidden="true" className="size-4" />
        ) : (
          <Sparkles aria-hidden="true" className="size-4" />
        )}
        {brief ? c.brief.regenerate : c.brief.generate}
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Message
// ------------------------------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie refusée par le navigateur : le texte reste sélectionnable.
    }
  }
  return (
    <Button type="button" variant="secondary" size="sm" block={false} onClick={copy}>
      {copied ? (
        <Check aria-hidden="true" className="size-4" />
      ) : (
        <Copy aria-hidden="true" className="size-4" />
      )}
      <span aria-live="polite">{copied ? c.message.copied : c.message.copy}</span>
    </Button>
  );
}

/** Boutons d'envoi : le message s'ouvre sur le téléphone du commercial, qui l'envoie lui-même. */
function SendActions({
  channel,
  phone,
  subject,
  text,
}: {
  channel: CopilotChannel;
  phone: string | null;
  subject: string | null;
  text: string;
}) {
  const link = buttonClasses({ size: "sm", block: false });
  return (
    <div className="flex flex-wrap gap-2">
      {channel === "whatsapp" && (
        <a
          href={whatsAppMessageUrl(phone, text)}
          target="_blank"
          rel="noopener noreferrer"
          className={link}
        >
          <MessageCircle aria-hidden="true" className="size-4" />
          {c.message.openWhatsApp}
        </a>
      )}
      {channel === "sms" && (
        <a href={smsMessageUrl(phone, text)} className={link}>
          <MessageSquare aria-hidden="true" className="size-4" />
          {c.message.openSms}
        </a>
      )}
      {channel === "email" && (
        <a href={emailMessageUrl(subject, text)} className={link}>
          <Mail aria-hidden="true" className="size-4" />
          {c.message.openEmail}
        </a>
      )}
      {channel === "appel" && phone && (
        <a href={`tel:${phone}`} className={link}>
          <Phone aria-hidden="true" className="size-4" />
          {c.message.call}
        </a>
      )}
      <CopyButton text={subject ? `${subject}\n\n${text}` : text} />
    </div>
  );
}

function MessagePanel({
  prospectId,
  phone,
  link,
}: {
  prospectId: string;
  phone: string | null;
  link: string;
}) {
  const [channel, setChannel] = useState<CopilotChannel>("whatsapp");
  const [draft, setDraft] = useState<{
    channel: CopilotChannel;
    subject: string;
    text: string;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  async function generate() {
    setPending(true);
    setError(null);
    const { result, error: failure } = await invokeCopilot({
      action: "message",
      prospectId,
      channel,
    });
    setPending(false);
    if (failure || !("message" in result)) return setError(failure ?? c.errors.unavailable);
    setDraft({
      channel,
      subject: result.message.subject ?? "",
      text: composeProspectMessage(channel, result.message.body, {
        link,
        optOut: c.message.optOut,
      }),
    });
  }

  const current = draft?.channel === channel ? draft : null;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">{c.message.channelLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {COPILOT_CHANNELS.map((ch) => (
            <label
              key={ch}
              className="inline-flex min-h-10 cursor-pointer items-center rounded-chip border border-border px-3.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-softer has-[:checked]:text-primary-strong has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20"
            >
              <input
                type="radio"
                name={`${id}-channel`}
                value={ch}
                checked={channel === ch}
                onChange={() => setChannel(ch)}
                className="sr-only"
              />
              {c.message.channels[ch]}
            </label>
          ))}
        </div>
      </fieldset>
      {error && <Alert tone="error">{error}</Alert>}
      {pending && <Pending label={c.message.pending} />}
      {current && !pending && (
        <div className="animate-menao-fade-up flex flex-col gap-3">
          {current.channel === "email" && (
            <Field
              label={c.message.subjectLabel}
              name="subject"
              id={`${id}-subject`}
              value={current.subject}
              onChange={(e) => setDraft({ ...current, subject: e.target.value })}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${id}-body`} className="text-sm font-medium">
              {current.channel === "appel" ? c.message.scriptLabel : c.message.bodyLabel}
            </label>
            <textarea
              id={`${id}-body`}
              rows={current.channel === "sms" ? 6 : 10}
              value={current.text}
              onChange={(e) => setDraft({ ...current, text: e.target.value })}
              className={`${inputClasses} py-3 leading-relaxed`}
            />
          </div>
          <SendActions
            channel={current.channel}
            phone={phone}
            subject={current.channel === "email" ? current.subject : null}
            text={current.text}
          />
          {current.channel !== "appel" && <Hint>{c.message.hint}</Hint>}
        </div>
      )}
      <Button
        type="button"
        variant={current ? "secondary" : "primary"}
        onClick={generate}
        disabled={pending}
        className="sm:w-auto sm:self-start sm:px-6"
      >
        {current ? (
          <RotateCcw aria-hidden="true" className="size-4" />
        ) : (
          <Sparkles aria-hidden="true" className="size-4" />
        )}
        {current ? c.message.regenerate : c.message.generate}
      </Button>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Compte rendu dicté
// ------------------------------------------------------------------------------------------------

function ReportPanel({
  prospectId,
  phone,
  link,
}: {
  prospectId: string;
  phone: string | null;
  link: string;
}) {
  const [transcript, setTranscript] = useState("");
  const [report, setReport] = useState<CopilotReport | null>(null);
  const [round, setRound] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  async function generate() {
    const text = transcript.trim();
    if (text.length < COPILOT_REPORT_MIN_LENGTH) return setError(c.report.tooShort);
    setPending(true);
    setError(null);
    const { result, error: failure } = await invokeCopilot({
      action: "report",
      prospectId,
      transcript: text,
    });
    setPending(false);
    if (failure || !("report" in result)) return setError(failure ?? c.errors.unavailable);
    setReport(result.report);
  }

  function restart() {
    setReport(null);
    setTranscript("");
    setError(null);
    setRound((r) => r + 1);
  }

  if (report) {
    return (
      <ReportForm
        key={round}
        prospectId={prospectId}
        report={report}
        phone={phone}
        link={link}
        onRestart={restart}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{c.report.intro}</p>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-end justify-between gap-3">
          <label htmlFor={`${id}-transcript`} className="text-sm font-medium">
            {c.report.transcriptLabel}
          </label>
          <DictationButton
            labels={c.report.dictation}
            onText={(text) => setTranscript((t) => (t.trim() ? `${t.trim()} ${text}` : text))}
            onError={setError}
          />
        </div>
        <textarea
          id={`${id}-transcript`}
          rows={5}
          maxLength={COPILOT_REPORT_MAX_LENGTH}
          value={transcript}
          placeholder={c.report.transcriptPlaceholder}
          onChange={(e) => setTranscript(e.target.value)}
          className={`${inputClasses} py-3 leading-relaxed`}
        />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {pending && <Pending label={c.report.pending} />}
      <Button
        type="button"
        onClick={generate}
        disabled={pending || !transcript.trim()}
        className="sm:w-auto sm:self-start sm:px-6"
      >
        <ClipboardList aria-hidden="true" className="size-4" />
        {c.report.generate}
      </Button>
    </div>
  );
}

function ReportForm({
  prospectId,
  report,
  phone,
  link,
  onRestart,
}: {
  prospectId: string;
  report: CopilotReport;
  phone: string | null;
  link: string;
  onRestart: () => void;
}) {
  const [state, action, pending] = useActionState(saveProspectReport, initialFormState);
  const [nextKind, setNextKind] = useState<string>(report.nextAction?.kind ?? "");
  const [followUp, setFollowUp] = useState(
    report.followUp
      ? composeProspectMessage("whatsapp", report.followUp, { link, optOut: "" })
      : "",
  );
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const id = useId();
  const next = report.nextAction;

  if (state.success) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success">{state.success}</Alert>
        {followUp && (
          <FollowUpBlock id={id} phone={phone} followUp={followUp} onChange={setFollowUp} />
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={onRestart}
          className="sm:w-auto sm:self-start sm:px-6"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          {c.report.restart}
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-menao-fade-up flex flex-col gap-4">
      {report.doNotContact && <Alert tone="info">{c.report.doNotContact}</Alert>}
      <form action={action} noValidate className="flex flex-col gap-4">
        <input type="hidden" name="id" value={prospectId} />
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-summary`} className="text-sm font-medium">
            {c.report.summaryLabel}
          </label>
          <textarea
            id={`${id}-summary`}
            name="summary"
            rows={4}
            maxLength={COPILOT_SUMMARY_MAX_LENGTH}
            defaultValue={v?.summary ?? report.summary}
            aria-invalid={errors.summary ? true : undefined}
            className={`${inputClasses} py-3 leading-relaxed`}
          />
          {errors.summary && <p className="text-xs text-danger">{errors.summary[0]}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label={c.report.interestLabel}
            name="interest"
            id={`${id}-interest`}
            defaultValue={v?.interest ?? report.interest}
          >
            {Object.entries(c.report.interests).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label={c.report.statusLabel}
            name="status"
            id={`${id}-status`}
            defaultValue={v?.status ?? report.status}
          >
            {PROSPECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s] ?? s}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-objections`} className="text-sm font-medium">
            {c.report.objectionsLabel}
          </label>
          <textarea
            id={`${id}-objections`}
            name="objections"
            rows={Math.max(2, Math.min(COPILOT_MAX_OBJECTIONS, report.objections.length))}
            defaultValue={v?.objections ?? report.objections.join("\n")}
            aria-describedby={`${id}-objections-hint`}
            aria-invalid={errors.objections ? true : undefined}
            className={`${inputClasses} py-3 leading-relaxed`}
          />
          {errors.objections && <p className="text-xs text-danger">{errors.objections[0]}</p>}
          <Hint id={`${id}-objections-hint`}>{c.report.objectionsHint}</Hint>
        </div>
        <SelectField
          label={c.report.nextKindLabel}
          name="nextKind"
          id={`${id}-next-kind`}
          value={nextKind}
          onChange={(e) => setNextKind(e.target.value)}
        >
          <option value="">{c.report.noNext}</option>
          {Object.entries(c.report.nextKinds).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        {nextKind && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={c.report.nextAtLabel}
              name="nextActionAt"
              id={`${id}-next-at`}
              type="datetime-local"
              defaultValue={v?.nextActionAt ?? (next ? `${next.date}T${next.time}` : "")}
              errors={errors.nextActionAt}
            />
            <Field
              label={c.report.nextLabelLabel}
              name="nextActionLabel"
              id={`${id}-next-label`}
              maxLength={COPILOT_NEXT_LABEL_MAX_LENGTH}
              defaultValue={v?.nextActionLabel ?? next?.label ?? ""}
              errors={errors.nextActionLabel}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending} className="sm:w-auto sm:px-6">
            <Check aria-hidden="true" className="size-4" />
            {c.report.save}
          </Button>
          <Button
            type="button"
            variant="ghost"
            block={false}
            onClick={onRestart}
            disabled={pending}
          >
            {c.report.restart}
          </Button>
        </div>
      </form>
      {followUp && (
        <FollowUpBlock id={id} phone={phone} followUp={followUp} onChange={setFollowUp} />
      )}
    </div>
  );
}

function FollowUpBlock({
  id,
  phone,
  followUp,
  onChange,
}: {
  id: string;
  phone: string | null;
  followUp: string;
  onChange: (text: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <label htmlFor={`${id}-follow-up`} className="text-sm font-medium">
        {c.report.followUpLabel}
      </label>
      <textarea
        id={`${id}-follow-up`}
        rows={5}
        value={followUp}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClasses} py-3 leading-relaxed`}
      />
      <div className="flex flex-wrap gap-2">
        <SendActions channel="whatsapp" phone={phone} subject={null} text={followUp} />
        <a
          href={smsMessageUrl(phone, followUp)}
          className={buttonClasses({ size: "sm", block: false, variant: "secondary" })}
        >
          <MessageSquare aria-hidden="true" className="size-4" />
          {c.message.openSms}
        </a>
      </div>
    </div>
  );
}
