"use client";

import {
  REVIEW_COMMENT_LIMITS,
  REVIEW_CRITERIA,
  VALUE_FOR_MONEY,
  reviewBand,
  type ReviewCriterion,
} from "@menao/core";
import {
  AlarmClock,
  Check,
  Clock,
  Frown,
  Hourglass,
  MessageCircle,
  Rocket,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { startTransition, useActionState, useState, type ReactNode } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState, type FormState } from "@/lib/auth/form";
import { submitReview } from "@/lib/reviews/actions";

const t = fr.review;
const NONE: ReadonlySet<string> = new Set();

/** Pictogramme de chaque tranche (« Inacceptable » … « Irréprochable »), comme la maquette. */
const BAND_ICONS: Record<ReviewCriterion, readonly LucideIcon[]> = {
  quality: [X, Frown, ThumbsUp, Sparkles, Trophy],
  delays: [X, Hourglass, AlarmClock, Clock, Rocket],
  communication: [X, ThumbsDown, MessageCircle, Zap, Trophy],
};

/**
 * Avis du client (F-28, maquette « Comment s'est passée votre expérience ? ») : trois curseurs de
 * 0 à 100 %, rapport qualité/prix, commentaire de 50 caractères au moins. Le formulaire n'est pas
 * réinitialisé après une erreur : les curseurs gardent leur position.
 */
export function ReviewForm({
  chantierId,
  artisanName,
  artisanCard,
}: {
  chantierId: string;
  artisanName: string;
  /** Carte « Votre artisan ». */
  artisanCard: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(
    submitReview.bind(null, chantierId),
    initialFormState,
  );
  const [comment, setComment] = useState("");
  // Champs modifiés depuis le dernier envoi : leur erreur n'est plus affichée.
  const [edited, setEdited] = useState<{ after: FormState; fields: ReadonlySet<string> }>({
    after: state,
    fields: NONE,
  });
  const editedFields = edited.after === state ? edited.fields : NONE;
  const markEdited = (field: string) => {
    if (!editedFields.has(field))
      setEdited({ after: state, fields: new Set([...editedFields, field]) });
  };
  const errorOf = (field: string) =>
    editedFields.has(field) ? undefined : state.fieldErrors?.[field]?.[0];
  const commentError = errorOf("comment");
  const valueError = errorOf("value_for_money");
  const length = comment.trim().length;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <section className="flex flex-col divide-y divide-border rounded-card border border-border bg-surface px-5 shadow-card">
        <div className="py-5">{artisanCard}</div>
        {REVIEW_CRITERIA.map((criterion) => (
          <CriterionSlider
            key={criterion}
            criterion={criterion}
            error={errorOf(criterion)}
            onEdit={() => markEdited(criterion)}
          />
        ))}
        <fieldset
          className="flex flex-col gap-2 py-5"
          aria-describedby={valueError ? "value-error" : undefined}
        >
          <legend className="pb-3 text-sm font-medium">{t.valueTitle}</legend>
          {VALUE_FOR_MONEY.map((value) => (
            <label key={value} className="relative">
              <input
                type="radio"
                name="value_for_money"
                value={value}
                onChange={() => markEdited("value_for_money")}
                className="peer sr-only"
              />
              <span className="flex min-h-12 cursor-pointer items-center justify-center rounded-input border border-border bg-surface px-4 text-center text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary-strong peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20 hover:bg-background">
                {t.values[value]}
              </span>
            </label>
          ))}
          {valueError && <FieldError id="value-error">{valueError}</FieldError>}
        </fieldset>
      </section>

      <section
        aria-labelledby="comment-title"
        className="flex flex-col gap-3 rounded-card border border-primary bg-surface p-5 shadow-card"
      >
        <h2 id="comment-title" className="font-medium text-primary-strong">
          {t.commentTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{t.commentHelp}</p>
        <label htmlFor="review-comment" className="sr-only">
          {t.commentLabel}
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={5}
          maxLength={REVIEW_COMMENT_LIMITS.max}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            markEdited("comment");
          }}
          placeholder={t.commentPlaceholder(artisanName)}
          aria-invalid={commentError ? true : undefined}
          aria-describedby={`comment-count${commentError ? " comment-error" : ""}`}
          className={`${inputClasses} min-h-32 py-3`}
        />
        <p
          id="comment-count"
          className={`flex items-center justify-end gap-1 text-xs ${
            length >= REVIEW_COMMENT_LIMITS.min ? "text-success" : "text-muted-foreground"
          }`}
        >
          {t.commentCount(length)}
          {length >= REVIEW_COMMENT_LIMITS.min && <Check aria-hidden="true" className="size-3.5" />}
        </p>
        {commentError && <FieldError id="comment-error">{commentError}</FieldError>}
      </section>

      <Button type="submit" size="lg" disabled={pending}>
        {t.submit}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t.visibility(artisanName)}</p>
    </form>
  );
}

/**
 * Curseur d'un critère : « -- % » et « Faites glisser pour noter » tant que le client ne
 * l'a pas touché (rien n'est envoyé : la note est obligatoire), puis le pourcentage et le libellé
 * de la tranche.
 */
function CriterionSlider({
  criterion,
  error,
  onEdit,
}: {
  criterion: ReviewCriterion;
  error?: string;
  onEdit: () => void;
}) {
  const [value, setValue] = useState<number | null>(null);
  const change = (next: number) => {
    setValue(next);
    onEdit();
  };
  const id = `review-${criterion}`;
  const band = value === null ? null : reviewBand(value);
  const Icon = band === null ? null : BAND_ICONS[criterion][band];
  const caption = band === null ? t.dragToRate : t.bands[criterion][band];
  return (
    <div className="flex flex-col gap-2 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {t.criteria[criterion]}
        </label>
        <span aria-hidden="true" className="text-sm text-muted-foreground tabular-nums">
          {value === null ? t.unset : t.percent(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        name={value === null ? undefined : criterion}
        value={value ?? 50}
        onChange={(e) => change(Number(e.target.value))}
        onClick={(e) => change(Number(e.currentTarget.value))}
        aria-valuetext={value === null ? t.dragToRate : `${t.percent(value)}, ${caption}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="h-2 w-full cursor-pointer accent-primary"
      />
      <p
        aria-hidden="true"
        className={`flex items-center justify-center gap-1.5 text-xs ${
          band === null
            ? "text-muted-foreground"
            : band === 0
              ? "text-danger"
              : "font-medium text-primary-strong"
        }`}
      >
        {Icon && <Icon className="size-3.5" />}
        {caption}
      </p>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}
