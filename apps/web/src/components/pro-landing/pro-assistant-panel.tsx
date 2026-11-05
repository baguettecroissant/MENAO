"use client";

import {
  PRO_ASSISTANT_MAX_QUESTIONS,
  PRO_ASSISTANT_QUESTION_MAX_LENGTH,
  type ProAssistantMessage,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ArrowLeft } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import {
  AssistantDialog,
  Bubble,
  Chips,
  Composer,
  Typing,
} from "@/components/assistant/assistant-ui";
import { VoiceCall } from "@/components/assistant/voice-call";
import {
  Alert,
  Button,
  ButtonLink,
  CheckboxField,
  Field,
  TextLink,
  focusRing,
} from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { requestProCallback } from "@/lib/site/actions";
import { createClient } from "@/lib/supabase/client";

const t = fr.pro.assistant;
const f = t.callbackForm;
// Réponses immédiates : celles de la FAQ de la page Pro.
const faq = fr.pro.landing.faq;

type Message = ProAssistantMessage & { suggestHuman?: boolean; suggestions?: readonly string[] };

const quickLabels: readonly string[] = t.quick.map((item) => item.label);

/**
 * Conversation et demande de rappel (ADR 0218). L'historique reste dans la page. Plein écran sur
 * téléphone, fenêtre en bas à droite sur grand écran ; questions de relance sous la dernière
 * réponse.
 */
export function ProAssistantPanel({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<"chat" | "callback">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [stopped, setStopped] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const asked = messages.filter((m) => m.role === "user").length;
  const limitReached = stopped || asked >= PRO_ASSISTANT_MAX_QUESTIONS;
  const askedLabels = new Set(messages.filter((m) => m.role === "user").map((m) => m.text));

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
      suggestions?: string[];
    }>("pro-assistant", { method: "POST", body: { question: clean, history } });
    setPending(false);
    if (!error && data?.status === "ok" && data.answer) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer ?? "",
          suggestHuman: data.suggestHuman ?? false,
          suggestions: data.suggestions ?? [],
        },
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

  function quick(label: string) {
    const item = t.quick.find((q) => q.label === label);
    const answer = item ? faq[item.faq]?.a : undefined;
    if (!item || !answer || pending || limitReached) return;
    // Après une réponse immédiate : les autres questions fréquentes pas encore posées.
    const remaining = quickLabels.filter((l) => l !== label && !askedLabels.has(l));
    setMessages((current) => [
      ...current,
      { role: "user", text: label },
      { role: "assistant", text: answer, suggestions: remaining.slice(0, 3) },
    ]);
  }

  function pick(text: string) {
    if (quickLabels.includes(text)) quick(text);
    else void ask(text);
  }

  const last = messages[messages.length - 1];

  return (
    <AssistantDialog
      id="pro-assistant"
      title={t.title}
      subtitle={t.subtitle}
      closeLabel={t.close}
      onClose={onClose}
    >
      {view === "callback" ? (
        <CallbackForm onBack={() => setView("chat")} />
      ) : (
        <>
          <div
            ref={listRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
          >
            <Bubble role="assistant" speaker={t.title}>
              {t.greeting}
            </Bubble>
            {messages.length === 0 && <Chips items={quickLabels} onPick={pick} />}
            {messages.map((message, index) => (
              <div key={index} className="animate-menao-fade-up flex flex-col gap-2">
                <Bubble role={message.role} speaker={message.role === "user" ? t.you : t.title}>
                  {message.text}
                </Bubble>
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
                {message === last &&
                  !pending &&
                  !limitReached &&
                  message.suggestions &&
                  message.suggestions.length > 0 && (
                    <Chips
                      label={t.suggestionsLabel}
                      items={message.suggestions.filter((s) => !askedLabels.has(s))}
                      onPick={pick}
                    />
                  )}
              </div>
            ))}
            {pending && <Typing label={t.thinking} />}
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <VoiceCall />
            {!limitReached && (
              <Composer
                id="pro-assistant-question"
                value={question}
                onChange={setQuestion}
                onSubmit={() => void ask(question)}
                pending={pending}
                maxLength={PRO_ASSISTANT_QUESTION_MAX_LENGTH}
                placeholder={t.placeholder}
                label={t.inputLabel}
                sendLabel={t.send}
              />
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
    </AssistantDialog>
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
