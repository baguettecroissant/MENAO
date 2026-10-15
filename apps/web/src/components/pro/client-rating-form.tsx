"use client";

import { CLIENT_RATING_COMMENT_LIMITS, CLIENT_RATING_CRITERIA, reviewBand } from "@menao/core";
import { Check, UserRound } from "lucide-react";
import { startTransition, useActionState, useState } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { rateClient } from "@/lib/artisan/client-rating-actions";
import { useFieldErrors } from "@/lib/use-field-errors";

const t = fr.pro.clientRating;
const tr = fr.review;

/**
 * Notation du client par l'artisan (F-23, ADR 0106) : trois curseurs de 0 à 100 % et un
 * commentaire, comme l'avis du client. Jamais montrée au client.
 */
export function ClientRatingForm({
  chantierId,
  clientName,
  visibleToNetwork,
}: {
  chantierId: string;
  clientName: string;
  /** Moyenne visible des artisans qui reçoivent une demande du client (paramètre de l'équipe). */
  visibleToNetwork: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    rateClient.bind(null, chantierId),
    initialFormState,
  );
  const [comment, setComment] = useState("");
  const { errorOf, markEdited } = useFieldErrors(state);
  const commentError = errorOf("comment");
  const length = comment.trim().length;

  if (state.success) return <Alert tone="success">{state.success}</Alert>;

  return (
    <form
      noValidate
      aria-labelledby="client-rating-title"
      className="flex flex-col gap-4 rounded-card border border-primary bg-surface p-5 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft">
          <UserRound aria-hidden="true" className="size-5 text-primary-strong" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="client-rating-title" className="font-medium text-primary-strong">
            {t.title(clientName)}
          </h2>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <div className="flex flex-col divide-y divide-border">
        {CLIENT_RATING_CRITERIA.map((criterion) => (
          <RatingSlider
            key={criterion}
            name={criterion}
            label={t.criteria[criterion]}
            bands={t.bands[criterion]}
            error={errorOf(criterion)}
            onEdit={() => markEdited(criterion)}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="client-rating-comment" className="text-sm font-medium">
          {t.commentTitle}
        </label>
        <p className="text-sm text-muted-foreground">{t.commentHelp}</p>
        <textarea
          id="client-rating-comment"
          name="comment"
          rows={4}
          maxLength={CLIENT_RATING_COMMENT_LIMITS.max}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            markEdited("comment");
          }}
          placeholder={t.commentPlaceholder}
          aria-invalid={commentError ? true : undefined}
          aria-describedby={`client-rating-count${commentError ? " client-rating-comment-error" : ""}`}
          className={`${inputClasses} min-h-28 py-3`}
        />
        <p
          id="client-rating-count"
          className={`flex items-center justify-end gap-1 text-xs ${
            length >= CLIENT_RATING_COMMENT_LIMITS.min ? "text-success" : "text-muted-foreground"
          }`}
        >
          {tr.commentCount(length)}
          {length >= CLIENT_RATING_COMMENT_LIMITS.min && (
            <Check aria-hidden="true" className="size-3.5" />
          )}
        </p>
        {commentError && <FieldError id="client-rating-comment-error">{commentError}</FieldError>}
      </div>
      <Button type="submit" disabled={pending}>
        {t.submit}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t.privacy} {visibleToNetwork ? t.privacyNetwork : t.privacyTeam}
      </p>
    </form>
  );
}

function RatingSlider({
  name,
  label,
  bands,
  error,
  onEdit,
}: {
  name: string;
  label: string;
  bands: readonly string[];
  error?: string;
  onEdit: () => void;
}) {
  const [value, setValue] = useState<number | null>(null);
  const change = (next: number) => {
    setValue(next);
    onEdit();
  };
  const id = `client-rating-${name}`;
  const caption = value === null ? tr.dragToRate : bands[reviewBand(value)];
  return (
    <div className="flex flex-col gap-2 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span aria-hidden="true" className="text-sm text-muted-foreground tabular-nums">
          {value === null ? tr.unset : tr.percent(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        name={value === null ? undefined : name}
        value={value ?? 50}
        onChange={(e) => change(Number(e.target.value))}
        onClick={(e) => change(Number(e.currentTarget.value))}
        aria-valuetext={value === null ? tr.dragToRate : `${tr.percent(value)}, ${caption}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-2 w-full cursor-pointer accent-primary"
      />
      <p
        aria-hidden="true"
        className={`text-center text-xs ${value === null ? "text-muted-foreground" : "font-medium text-primary-strong"}`}
      >
        {caption}
      </p>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}
