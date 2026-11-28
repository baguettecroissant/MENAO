"use client";

import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import type { Route } from "next";
import { useState, useTransition } from "react";
import { Alert, Button, ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  checkQuizAnswer,
  submitQuiz,
  type QuizCheck,
  type QuizResult,
} from "@/lib/commercial/onboarding-actions";

const t = fr.commercialField.formation;

type Question = { question: string; choices: readonly string[] };

/**
 * Quiz d'un module de formation (ADR 0394) : une question à la fois, corrigée par le serveur avec
 * son explication, puis la note du quiz entier enregistrée (4 sur 5 pour réussir).
 */
export function QuizRunner({ module, questions }: { module: string; questions: Question[] }) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [check, setCheck] = useState<Extract<QuizCheck, { status: "ok" }> | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, startTransition] = useTransition();
  const question = questions[index];
  const last = index === questions.length - 1;

  function restart() {
    setIndex(0);
    setChoice(null);
    setAnswers([]);
    setCheck(null);
    setResult(null);
  }

  if (result?.status === "ok") {
    return (
      <div className="flex flex-col gap-4" role="status">
        <div
          className={`flex items-start gap-3 rounded-card p-5 ${result.passed ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
        >
          {result.passed ? (
            <CircleCheck aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          ) : (
            <CircleX aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
          )}
          <p className="text-base font-semibold">
            {result.passed ? t.passed(result.score) : t.failed(result.score)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!result.passed && (
            <Button type="button" block={false} onClick={restart}>
              {t.retry}
            </Button>
          )}
          <ButtonLink
            href={"/commercial/demarrer" as Route}
            variant={result.passed ? "primary" : "secondary"}
          >
            {t.backToStart}
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (!question) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5" aria-hidden="true">
        {questions.map((q, i) => (
          <span
            key={q.question}
            className={`h-1.5 flex-1 rounded-full ${i < index ? "bg-success" : i === index ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
        {t.question(index + 1, questions.length)}
      </p>
      <h2 className="text-lg leading-snug font-semibold sm:text-xl">{question.question}</h2>
      <div role="radiogroup" aria-label={t.choicesLabel} className="flex flex-col gap-2.5">
        {question.choices.map((label, i) => {
          const selected = choice === i;
          const right = check && check.answer === i;
          const wrong = check && selected && !check.correct;
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={check !== null}
              onClick={() => setChoice(i)}
              className={`flex min-h-14 items-start gap-3 rounded-input border-2 px-4 py-3 text-left text-[0.9375rem] leading-snug transition-colors ${
                right
                  ? "border-success bg-success-soft"
                  : wrong
                    ? "border-danger bg-danger-soft"
                    : selected
                      ? "border-primary bg-primary-softer"
                      : "border-border bg-surface hover:border-primary/40"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 size-5 shrink-0 rounded-full border-2 ${selected || right ? "border-current bg-current" : "border-border-strong"}`}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      {check && (
        <div
          role="status"
          className={`flex flex-col gap-1 rounded-input px-4 py-3 text-sm ${check.correct ? "bg-success-soft" : "bg-danger-soft"}`}
        >
          <span className={`font-semibold ${check.correct ? "text-success" : "text-danger"}`}>
            {check.correct ? t.right : t.wrong}
          </span>
          <span className="text-foreground">{check.explanation}</span>
        </div>
      )}
      {result?.status === "error" && <Alert tone="error">{t.unavailable}</Alert>}
      <div className="flex">
        {!check ? (
          <Button
            type="button"
            disabled={choice === null || pending}
            onClick={() =>
              startTransition(async () => {
                if (choice === null) return;
                const res = await checkQuizAnswer(module, index, choice);
                if (res.status === "ok") setCheck(res);
              })
            }
          >
            {pending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {t.check}
          </Button>
        ) : (
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              const next = [...answers, choice ?? -1];
              if (!last) {
                setAnswers(next);
                setIndex(index + 1);
                setChoice(null);
                setCheck(null);
                return;
              }
              startTransition(async () => {
                setAnswers(next);
                setResult(await submitQuiz(module, next));
              });
            }}
          >
            {pending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {last ? t.finish : t.next}
          </Button>
        )}
      </div>
    </div>
  );
}
