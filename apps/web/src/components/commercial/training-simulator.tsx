"use client";

import {
  TRAINING_CRITERIA,
  TRAINING_CRITERION_MAX,
  TRAINING_MAX_TURNS,
  TRAINING_MESSAGE_MAX_LENGTH,
  TRAINING_MIN_TURNS_FOR_REVIEW,
  TRAINING_PERSONAS,
  trainingTurnCount,
  type TrainingMessage,
  type TrainingOutcome,
  type TrainingPersona,
  type TrainingReview,
} from "@menao/core";
import { ArrowLeft, ClipboardCheck, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bubble, Composer, Typing } from "@/components/assistant/assistant-ui";
import { Alert, Button, Card, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { invokeFunction } from "@/lib/project/client";
import { createClient } from "@/lib/supabase/client";

const t = fr.commercialTraining;

type TrainResult =
  | { status: "ok"; reply: string; ended: boolean; outcome: TrainingOutcome }
  | { status: "ok"; review: TrainingReview }
  | { status: string };

async function invokeTraining(body: Record<string, unknown>) {
  const result = await invokeFunction<TrainResult & { status: string }>(
    createClient(),
    "commercial-copilot",
    body,
  );
  return {
    result,
    error:
      result.status === "ok"
        ? null
        : (t.errors[result.status as keyof typeof t.errors] ?? t.errors.unavailable),
  };
}

/**
 * Simulateur d'entraînement (F-74, ADR 0224) : le commercial choisit un artisan fictif, lui parle
 * par écrit (12 messages au plus), puis le coach note l'échange sur 20 avec 3 conseils. L'échange
 * reste dans la page ; seule la note est gardée.
 */
export function TrainingSimulator() {
  const [persona, setPersona] = useState<TrainingPersona | null>(null);
  const [session, setSession] = useState(0);

  if (!persona) {
    return (
      <section aria-labelledby="training-choose" className="flex flex-col gap-3">
        <h2 id="training-choose" className="text-base font-medium">
          {t.choose}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {TRAINING_PERSONAS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPersona(p)}
              className={`flex flex-col gap-1 rounded-card border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-primary/50 ${focusRing}`}
            >
              <span className="font-medium">{t.personas[p]?.label}</span>
              <span className="text-sm text-muted-foreground">{t.personas[p]?.description}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <Session
      key={session}
      persona={persona}
      onRestart={() => setSession((s) => s + 1)}
      onChange={() => setPersona(null)}
    />
  );
}

function Session({
  persona,
  onRestart,
  onChange,
}: {
  persona: TrainingPersona;
  onRestart: () => void;
  onChange: () => void;
}) {
  const router = useRouter();
  const opener = t.personas[persona]?.opener ?? "";
  const [messages, setMessages] = useState<TrainingMessage[]>([{ role: "artisan", text: opener }]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<TrainingOutcome | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState<TrainingReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const turns = trainingTurnCount(messages);
  const atLimit = turns >= TRAINING_MAX_TURNS;
  const canSend = !outcome && !atLimit && !review && !reviewing;
  const canReview = turns >= TRAINING_MIN_TURNS_FOR_REVIEW && !review && !reviewing && !pending;

  async function send() {
    const text = input.trim();
    if (!text || pending || !canSend) return;
    const history = messages;
    setMessages([...history, { role: "commercial", text }]);
    setInput("");
    setPending(true);
    setError(null);
    const { result, error: failure } = await invokeTraining({
      action: "train",
      persona,
      history,
      message: text,
    });
    setPending(false);
    if (failure || !("reply" in result)) {
      // Message non parti : il revient dans le champ pour être renvoyé.
      setMessages(history);
      setInput(text);
      return setError(failure ?? t.errors.unavailable);
    }
    setMessages((current) => [...current, { role: "artisan", text: result.reply }]);
    if (result.ended) setOutcome(result.outcome);
  }

  async function finish() {
    setReviewing(true);
    setError(null);
    const { result, error: failure } = await invokeTraining({
      action: "coach",
      persona,
      history: messages,
    });
    setReviewing(false);
    if (failure || !("review" in result)) return setError(failure ?? t.errors.unavailable);
    setReview(result.review);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-col">
            <span className="font-medium">{t.personas[persona]?.label}</span>
            <span className="text-xs text-muted-foreground">
              {t.turns(turns, TRAINING_MAX_TURNS)}
            </span>
          </div>
          <button
            type="button"
            onClick={onChange}
            className={`inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground ${focusRing}`}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            {t.change}
          </button>
        </div>
        <div
          ref={listRef}
          aria-live="polite"
          className="flex max-h-[55vh] min-h-48 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pb-1"
        >
          {messages.map((m, i) => (
            <div key={i} className="animate-menao-fade-up flex flex-col">
              <Bubble
                role={m.role === "commercial" ? "user" : "assistant"}
                speaker={m.role === "commercial" ? t.you : t.artisan}
              >
                {m.text}
              </Bubble>
            </div>
          ))}
          {pending && <Typing label={t.thinking} />}
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 pt-3 pb-4">
          {outcome && <p className="text-sm font-medium text-primary-strong">{t.ended[outcome]}</p>}
          {atLimit && !outcome && <p className="text-sm text-muted-foreground">{t.limit}</p>}
          {canSend && (
            <Composer
              id="training-message"
              value={input}
              onChange={setInput}
              onSubmit={() => void send()}
              pending={pending}
              maxLength={TRAINING_MESSAGE_MAX_LENGTH}
              placeholder={t.placeholder}
              label={t.inputLabel}
              sendLabel={t.send}
            />
          )}
          {!review && (
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant={outcome || atLimit ? "primary" : "secondary"}
                onClick={finish}
                disabled={!canReview}
                className="sm:w-auto sm:self-start sm:px-6"
              >
                <ClipboardCheck aria-hidden="true" className="size-4" />
                {t.finish}
              </Button>
              {turns < TRAINING_MIN_TURNS_FOR_REVIEW && (
                <p className="text-xs text-muted-foreground">
                  {t.finishHint(TRAINING_MIN_TURNS_FOR_REVIEW)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {reviewing && <Typing label={t.coachPending} />}
      {review && <ReviewCard review={review} onRestart={onRestart} onChange={onChange} />}
    </div>
  );
}

function ReviewCard({
  review,
  onRestart,
  onChange,
}: {
  review: TrainingReview;
  onRestart: () => void;
  onChange: () => void;
}) {
  return (
    <Card className="animate-menao-fade-up flex flex-col gap-5">
      <div className="flex items-baseline gap-3">
        <span className="text-sm text-muted-foreground">{t.scoreLabel}</span>
        <span className="text-4xl font-medium tracking-tight tabular-nums">
          {t.score(review.total)}
        </span>
      </div>
      <dl className="flex flex-col gap-2.5">
        {TRAINING_CRITERIA.map((c) => (
          <div key={c} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
            <dt>{t.criteria[c]}</dt>
            <dd className="flex gap-1" aria-hidden="true">
              {Array.from({ length: TRAINING_CRITERION_MAX }, (_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-pill ${i < review.scores[c] ? "bg-primary" : "bg-border"}`}
                />
              ))}
            </dd>
            <dd className="text-xs text-muted-foreground tabular-nums">
              {t.criterionScore(review.scores[c])}
            </dd>
          </div>
        ))}
      </dl>
      {review.breaches.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-danger">{t.breaches}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {review.breaches.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      )}
      {review.strengths.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t.strengths}</h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            {review.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">{t.tips}</h3>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed">
          {review.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ol>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button type="button" block={false} onClick={onRestart}>
          <RotateCcw aria-hidden="true" className="size-4" />
          {t.again}
        </Button>
        <Button type="button" variant="secondary" block={false} onClick={onChange}>
          {t.change}
        </Button>
      </div>
    </Card>
  );
}
