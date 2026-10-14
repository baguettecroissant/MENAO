"use client";

import { MESSAGE_MAX_LENGTH } from "@menao/core";
import { ChevronRight, Send } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { startTransition, useActionState, useCallback, useState } from "react";
import { ArtisanPhoto } from "@/components/project/artisan-photo";
import { Button, Card, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { formatTimeAgo } from "@/lib/format";
import { sendMessage } from "@/lib/messages/actions";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.messages;

/**
 * « Messagerie avec … » en tête du suivi côté artisan (maquette « Vue d'un chantier ») :
 * interlocuteur et date du dernier message (lien vers la conversation), et envoi rapide d'un
 * message (F-40, mêmes règles que la conversation).
 */
export function ConversationCard({
  chantierId,
  name,
  lastAt,
  unread,
}: {
  chantierId: string;
  name: string;
  lastAt: string | null;
  unread: number;
}) {
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const [state, formAction, pending] = useActionState(
    sendMessage.bind(null, chantierId),
    initialFormState,
  );
  const done = useCallback(() => {
    setBody("");
    setSent(true);
  }, []);
  useActionSuccess(state, done);
  const error = state.fieldErrors?.body?.[0] ?? state.error;

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-base font-medium">{t.card.title(name)}</h2>
      <Link
        href={`/pro/messages/${chantierId}` as Route}
        aria-label={t.card.open(name)}
        className="flex items-center gap-3 rounded-input focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:outline-none"
      >
        <ArtisanPhoto
          url={null}
          name={name}
          className="size-10 shrink-0 rounded-full"
          initialsClassName="text-sm"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">
            {lastAt ? t.card.last(formatTimeAgo(lastAt)) : t.card.none}
          </span>
        </span>
        {unread > 0 && (
          <span className="rounded-pill bg-primary px-2 py-0.5 text-[0.6875rem] font-medium text-primary-foreground">
            {t.card.unread(unread)}
          </span>
        )}
        <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
      </Link>
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
        <label htmlFor="card-message" className="sr-only">
          {t.composerLabel}
        </label>
        <textarea
          id="card-message"
          name="body"
          rows={1}
          maxLength={MESSAGE_MAX_LENGTH}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setSent(false);
          }}
          placeholder={t.card.placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "card-message-error" : undefined}
          className={`${inputClasses} max-h-32 min-h-11 flex-1 resize-y bg-background py-2.5`}
        />
        <Button
          type="submit"
          block={false}
          disabled={pending || !body.trim()}
          className="size-11 shrink-0 !px-0"
        >
          <Send aria-hidden="true" className="size-4" />
          <span className="sr-only">{t.send}</span>
        </Button>
      </form>
      {error ? (
        <FieldError id="card-message-error">{error}</FieldError>
      ) : (
        sent && (
          <p role="status" className="text-sm text-success">
            {t.card.sent}
          </p>
        )
      )}
    </Card>
  );
}
