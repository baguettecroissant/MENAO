"use client";

import { MESSAGE_MAX_LENGTH } from "@menao/core";
import { Flag, FileText, Paperclip, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Fragment,
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { markConversationRead, reportMessage, sendMessage } from "@/lib/messages/actions";
import { ATTACHMENT_ACCEPT, uploadMessageAttachment } from "@/lib/messages/attachments";
import { createClient } from "@/lib/supabase/client";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.messages;

export type ConversationMessage = {
  id: string;
  mine: boolean;
  kind: "texte" | "photo" | "fichier";
  body: string | null;
  /** URL signée de la pièce jointe (photo ou document PDF). */
  url: string | null;
  hidden: boolean;
  read: boolean;
  /** « Aujourd'hui », « Hier » ou la date, à l'heure de Paris. */
  day: string;
  time: string;
};

/**
 * Conversation d'un chantier (F-40) : messages du plus ancien au plus récent, mis à jour en temps
 * réel tant que l'écran est ouvert (Supabase Realtime), marqués lus à l'affichage. Envoi de texte
 * (Entrée pour envoyer, Maj + Entrée pour aller à la ligne), de photos et de documents PDF.
 */
export function Conversation({
  chantierId,
  otherName,
  messages,
  closed,
  example = false,
}: {
  chantierId: string;
  otherName: string;
  messages: ConversationMessage[];
  closed: boolean;
  /** Exemple (ADR 0184) : ni temps réel, ni lecture enregistrée ; saisie et signalement inactifs. */
  example?: boolean;
}) {
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id ?? null;
  const lastReadMine = [...messages].reverse().find((m) => m.mine && m.read)?.id ?? null;

  // Temps réel : seulement tant que la conversation est affichée (F-40).
  useEffect(() => {
    if (example) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${chantierId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chantier_id=eq.${chantierId}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chantierId, router, example]);

  useEffect(() => {
    if (!example) void markConversationRead(chantierId);
    endRef.current?.scrollIntoView({ block: "end" });
  }, [chantierId, lastId, example]);

  return (
    <div className="flex flex-col">
      {messages.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">
          {t.noMessages(otherName)}
        </p>
      ) : (
        <ol
          aria-label={t.conversation(otherName)}
          className="flex flex-col gap-3 px-4 py-5 sm:px-6"
        >
          {messages.map((m, i) => (
            <Fragment key={m.id}>
              {(i === 0 || messages[i - 1]?.day !== m.day) && (
                <li className="self-center rounded-pill bg-background px-3 py-1 text-xs text-muted-foreground">
                  {m.day}
                </li>
              )}
              <li
                className={`flex max-w-[85%] flex-col gap-1 ${
                  m.mine ? "items-end self-end" : "items-start self-start"
                }`}
              >
                <Bubble message={m} />
                <span className="text-[0.6875rem] text-muted-foreground">
                  {m.time}
                  {m.id === lastReadMine && ` · ${t.read}`}
                </span>
                {!m.mine && !m.hidden && !example && <ReportMessage messageId={m.id} />}
              </li>
            </Fragment>
          ))}
        </ol>
      )}
      <div ref={endRef} />
      {closed ? (
        <p className="border-t border-border px-4 py-4 text-sm text-muted-foreground sm:px-6">
          {t.closed}
        </p>
      ) : example ? (
        <div className="flex flex-col gap-2 pt-3">
          <p className="text-center text-xs text-example-strong">{fr.pro.examples.locked}</p>
          <div inert className="opacity-60">
            <Composer chantierId={chantierId} />
          </div>
        </div>
      ) : (
        <Composer chantierId={chantierId} />
      )}
    </div>
  );
}

function Bubble({ message: m }: { message: ConversationMessage }) {
  const tone = m.mine
    ? "bg-primary text-primary-foreground"
    : "border border-border bg-surface text-foreground";
  if (m.hidden) {
    return (
      <p className="rounded-card border border-dashed border-border-strong px-4 py-2.5 text-sm text-muted-foreground italic">
        {t.hidden}
      </p>
    );
  }
  if (m.kind === "photo" && m.url) {
    return (
      <a
        href={m.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-card border border-border focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- URL signée temporaire, sans optimisation Vercel (spec §4.4) */}
        <img src={m.url} alt={t.openPhoto} className="max-h-64 w-auto object-cover" />
      </a>
    );
  }
  if (m.kind === "fichier" && m.url) {
    return (
      <a
        href={m.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t.openFile}
        className={`inline-flex min-h-touch items-center gap-2 rounded-card px-4 py-2.5 text-sm font-medium underline-offset-2 hover:underline ${tone}`}
      >
        <FileText aria-hidden="true" className="size-4 shrink-0" />
        {t.file}
      </a>
    );
  }
  return (
    <p className={`rounded-card px-4 py-2.5 text-sm break-words whitespace-pre-line ${tone}`}>
      {m.body}
    </p>
  );
}

function Composer({ chantierId }: { chantierId: string }) {
  const [body, setBody] = useState("");
  const [state, formAction, pending] = useActionState(
    sendMessage.bind(null, chantierId),
    initialFormState,
  );
  const clear = useCallback(() => setBody(""), []);
  useActionSuccess(state, clear);
  const error = state.fieldErrors?.body?.[0] ?? state.error;

  return (
    <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-surface px-4 py-3 sm:px-6">
      {error && <FieldError id="message-error">{error}</FieldError>}
      <AttachmentStatus chantierId={chantierId}>
        {(attach) => (
          <form
            noValidate
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!body.trim() || pending) return;
              const formData = new FormData(event.currentTarget);
              startTransition(() => formAction(formData));
            }}
          >
            {attach}
            <label htmlFor="message-body" className="sr-only">
              {t.composerLabel}
            </label>
            <textarea
              id="message-body"
              name="body"
              rows={1}
              maxLength={MESSAGE_MAX_LENGTH}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={t.composerPlaceholder}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "message-error" : undefined}
              className={`${inputClasses} max-h-40 min-h-12 flex-1 resize-y py-3`}
            />
            <Button
              type="submit"
              block={false}
              disabled={pending || !body.trim()}
              className="size-12 shrink-0 !px-0"
            >
              <Send aria-hidden="true" className="size-5" />
              <span className="sr-only">{t.send}</span>
            </Button>
          </form>
        )}
      </AttachmentStatus>
    </div>
  );
}

/** Bouton « Joindre une photo ou un PDF » et état de l'envoi de la pièce jointe. */
function AttachmentStatus({
  chantierId,
  children,
}: {
  chantierId: string;
  children: (attach: ReactNode) => ReactNode;
}) {
  const router = useRouter();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(file: File) {
    setBusy(true);
    setError(null);
    const status = await uploadMessageAttachment(chantierId, file);
    setBusy(false);
    if (status === "ok") router.refresh();
    else setError(t.attachErrors[status as keyof typeof t.attachErrors] ?? t.attachErrors.failed);
  }

  const attach = (
    <label
      htmlFor={id}
      className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-pill border border-border-strong text-primary-strong hover:bg-background has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-primary/20"
    >
      <Paperclip aria-hidden="true" className="size-5" />
      <span className="sr-only">{t.attach}</span>
      <input
        id={id}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        disabled={busy}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void send(file);
        }}
      />
    </label>
  );
  return (
    <>
      {busy && (
        <p role="status" className="text-xs text-muted-foreground">
          {t.uploading}
        </p>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      {children(attach)}
    </>
  );
}

/** « Signaler ce message » : motif transmis à l'équipe MENAO (ticket « Message signalé »). */
function ReportMessage({ messageId }: { messageId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    reportMessage.bind(null, messageId),
    initialFormState,
  );
  const id = `report-${messageId}`;
  const error = state.fieldErrors?.reason?.[0];

  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-sm text-[0.6875rem] text-muted-foreground hover:text-foreground focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        <Flag aria-hidden="true" className="size-3" />
        {t.report}
      </button>
    );
  }
  return (
    <form
      action={formAction}
      noValidate
      aria-label={t.report}
      className="flex w-72 max-w-full flex-col gap-2 rounded-input bg-background p-3"
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <label htmlFor={id} className="text-sm font-medium">
        {t.reportLabel}
      </label>
      <textarea
        id={id}
        name="reason"
        rows={3}
        maxLength={1000}
        defaultValue={state.values?.reason}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className={`${inputClasses} min-h-20 py-2`}
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {t.reportHint}
      </p>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          block={false}
          size="sm"
          onClick={() => setOpen(false)}
        >
          {t.reportCancel}
        </Button>
        <Button type="submit" block={false} size="sm" disabled={pending}>
          {t.reportSubmit}
        </Button>
      </div>
    </form>
  );
}
