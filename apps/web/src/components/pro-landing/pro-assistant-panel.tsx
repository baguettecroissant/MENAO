"use client";

import {
  PRO_ASSISTANT_MAX_QUESTIONS,
  PRO_ASSISTANT_QUESTION_MAX_LENGTH,
  type ProAssistantMessage,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ArrowLeft, ArrowUp, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { LogoMark } from "@/components/brand/logo";
import {
  Alert,
  Button,
  ButtonLink,
  CheckboxField,
  Field,
  TextLink,
  focusRing,
  inputClasses,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { requestProCallback } from "@/lib/site/actions";
import { createClient } from "@/lib/supabase/client";

const t = fr.pro.assistant;
const f = t.callbackForm;
// Réponses immédiates : celles de la FAQ de la page Pro.
const faq = fr.pro.landing.faq;

type Message = ProAssistantMessage & { suggestHuman?: boolean };

/** Conversation et demande de rappel (ADR 0218). L'historique reste dans la page. */
export function ProAssistantPanel({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<"chat" | "callback">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [stopped, setStopped] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => closeRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const asked = messages.filter((m) => m.role === "user").length;
  const limitReached = stopped || asked >= PRO_ASSISTANT_MAX_QUESTIONS;

  async function ask(text: string) {
    const clean = text.trim();
    if (!clean || pending || limitReached) return;
    const history = messages.map(({ role, text: content }) => ({ role, text: content }));
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setQuestion("");
    setPending(true);
    const { data, error } = await createClient().functions.invoke<{
      status: string;
      answer?: string;
      suggestHuman?: boolean;
    }>("pro-assistant", { method: "POST", body: { question: clean, history } });
    setPending(false);
    if (!error && data?.status === "ok" && data.answer) {
      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.answer ?? "", suggestHuman: data.suggestHuman ?? false },
      ]);
      return;
    }
    const limited = error instanceof FunctionsHttpError && error.context.status === 429;
    if (limited) setStopped(true);
    setMessages((current) => [
      ...current,
      { role: "assistant", text: limited ? t.limit : t.unavailable, suggestHuman: true },
    ]);
  }

  function quick(index: number) {
    const item = t.quick[index];
    const answer = item ? faq[item.faq]?.a : undefined;
    if (!item || !answer || pending) return;
    setMessages((current) => [
      ...current,
      { role: "user", text: item.label },
      { role: "assistant", text: answer },
    ]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(question);
  }

  return (
    <section
      role="dialog"
      aria-labelledby="pro-assistant-title"
      className="fixed inset-x-2 bottom-2 z-50 flex max-h-[85dvh] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-raised sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[24rem] sm:max-h-[min(40rem,85dvh)]"
    >
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <LogoMark className="size-7" />
        <h2 id="pro-assistant-title" className="flex-1 font-medium">
          {t.title}
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className={`inline-flex size-10 items-center justify-center rounded-pill text-muted-foreground hover:bg-background ${focusRing}`}
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>

      {view === "callback" ? (
        <CallbackForm onBack={() => setView("chat")} />
      ) : (
        <>
          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            <p className="text-xs text-subtle-foreground">{t.aiNotice}</p>
            <Bubble role="assistant">{t.greeting}</Bubble>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {t.quick.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => quick(index)}
                    className={`min-h-10 rounded-pill border border-border bg-surface px-3.5 text-sm transition hover:border-primary/40 hover:text-primary-strong ${focusRing}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} className="flex flex-col gap-2">
                <Bubble role={message.role}>{message.text}</Bubble>
                {message.suggestHuman && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" block={false} onClick={() => setView("callback")}>
                      {t.callback}
                    </Button>
                    <ButtonLink href="/contact" size="sm" variant="secondary">
                      {t.write}
                    </ButtonLink>
                  </div>
                )}
              </div>
            ))}
            {pending && (
              <p role="status" className="text-sm text-muted-foreground">
                {t.thinking}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
            {!limitReached && (
              <form onSubmit={submit} className="flex items-end gap-2">
                <label htmlFor="pro-assistant-question" className="sr-only">
                  {t.inputLabel}
                </label>
                <input
                  id="pro-assistant-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  maxLength={PRO_ASSISTANT_QUESTION_MAX_LENGTH}
                  placeholder={t.placeholder}
                  autoComplete="off"
                  className={inputClasses}
                />
                <button
                  type="submit"
                  disabled={pending || !question.trim()}
                  aria-label={t.send}
                  className={`inline-flex size-12 shrink-0 items-center justify-center rounded-pill bg-primary text-white transition hover:bg-primary-strong disabled:opacity-50 ${focusRing}`}
                >
                  <ArrowUp aria-hidden="true" className="size-5" />
                </button>
              </form>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <ButtonLink href="/pro/inscription" size="sm">
                {t.signUp}
              </ButtonLink>
              <button
                type="button"
                onClick={() => setView("callback")}
                className={`rounded-sm font-medium text-primary-strong underline-offset-2 hover:underline ${focusRing}`}
              >
                {t.callback}
              </button>
              <TextLink href="/contact">{t.write}</TextLink>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Bubble({ role, children }: { role: Message["role"]; children: string }) {
  return role === "user" ? (
    <p className="max-w-[85%] self-end rounded-card rounded-br-md bg-primary px-3.5 py-2.5 text-[0.9375rem] whitespace-pre-line text-white">
      <span className="sr-only">{t.you} : </span>
      {children}
    </p>
  ) : (
    <p className="max-w-[90%] self-start rounded-card rounded-bl-md bg-background px-3.5 py-2.5 text-[0.9375rem] whitespace-pre-line">
      <span className="sr-only">{t.title} : </span>
      {children}
    </p>
  );
}

function CallbackForm({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(requestProCallback, initialFormState);
  const errors = state.fieldErrors ?? {};
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-medium text-primary-strong ${focusRing}`}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {f.back}
      </button>
      <div className="flex flex-col gap-1">
        <h3 className="font-medium">{f.title}</h3>
        {!state.success && <p className="text-sm text-muted-foreground">{f.intro}</p>}
      </div>
      {state.success ? (
        <Alert tone="success">{state.success}</Alert>
      ) : (
        <form action={action} className="flex flex-col gap-3" noValidate>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <Field
            label={f.firstName}
            name="first_name"
            id="callback-first-name"
            autoComplete="given-name"
            maxLength={60}
            required
            defaultValue={state.values?.first_name}
            errors={errors.first_name}
          />
          <Field
            label={f.phone}
            name="phone"
            id="callback-phone"
            type="tel"
            autoComplete="tel"
            required
            defaultValue={state.values?.phone}
            errors={errors.phone}
          />
          <Field
            label={f.email}
            name="email"
            id="callback-email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            errors={errors.email}
          />
          <Field
            label={f.trade}
            labelNote={f.optional}
            name="trade"
            id="callback-trade"
            maxLength={80}
            defaultValue={state.values?.trade}
            errors={errors.trade}
          />
          <Field
            label={f.city}
            labelNote={f.optional}
            name="city"
            id="callback-city"
            autoComplete="address-level2"
            maxLength={100}
            defaultValue={state.values?.city}
            errors={errors.city}
          />
          <CheckboxField name="consent" id="callback-consent" errors={errors.consent}>
            {f.consent}{" "}
            <TextLink href="/confidentialite" target="_blank">
              {f.privacy}
            </TextLink>
          </CheckboxField>
          <Button type="submit" disabled={pending}>
            {f.submit}
          </Button>
        </form>
      )}
    </div>
  );
}
