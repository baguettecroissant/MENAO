"use client";

import {
  PRO_ASSISTANT_MAX_QUESTIONS,
  PRO_ASSISTANT_QUESTION_MAX_LENGTH,
  type ClientDraft,
  type ProAssistantMessage,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ClipboardCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AssistantDialog,
  Bubble,
  Chips,
  Composer,
  Typing,
} from "@/components/assistant/assistant-ui";
import { VoiceCall } from "@/components/assistant/voice-call";
import { Button, TextLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";

const t = fr.search.assistant;

type Message = ProAssistantMessage & {
  suggestHuman?: boolean;
  suggestions?: readonly string[];
  draft?: ClientDraft | null;
};

/**
 * Conversation de l'assistant des particuliers (ADR 0220) : questions sur MENAO, aide à décrire
 * un symptôme, puis demande préparée à reprendre dans le champ de saisie. L'historique reste dans
 * la page ; jusqu'à 6 messages, comme l'assistant des pages Pro.
 */
export function ClientAssistantPanel({
  trades,
  onClose,
  onUseDraft,
}: {
  trades: { code: string; label: string }[];
  onClose: () => void;
  onUseDraft: (draft: ClientDraft) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [stopped, setStopped] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  const sent = messages.filter((m) => m.role === "user");
  const limitReached = stopped || sent.length >= PRO_ASSISTANT_MAX_QUESTIONS;
  const sentTexts = new Set(sent.map((m) => m.text));
  const tradeLabel = (code: string | null) => trades.find((tr) => tr.code === code)?.label ?? null;

  async function send(value: string) {
    const clean = value.trim();
    if (!clean || pending || limitReached) return;
    const history = messages.map(({ role, text: content }) => ({ role, text: content }));
    setMessages((current) => [...current, { role: "user", text: clean }]);
    setText("");
    setPending(true);
    const { data, error } = await createClient().functions.invoke<{
      status: string;
      answer?: string;
      suggestHuman?: boolean;
      suggestions?: string[];
      draft?: ClientDraft | null;
    }>("client-assistant", { method: "POST", body: { question: clean, history } });
    setPending(false);
    if (!error && data?.status === "ok" && data.answer) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer ?? "",
          suggestHuman: data.suggestHuman ?? false,
          suggestions: data.suggestions ?? [],
          draft: data.draft ?? null,
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

  const last = messages[messages.length - 1];

  return (
    <AssistantDialog
      id="client-assistant"
      title={t.title}
      subtitle={t.subtitle}
      closeLabel={t.close}
      onClose={onClose}
    >
      <div
        ref={listRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        <Bubble role="assistant" speaker={t.title}>
          {t.greeting}
        </Bubble>
        {messages.length === 0 && <Chips items={t.quick} onPick={(item) => void send(item)} />}
        {messages.map((message, index) => (
          <div key={index} className="animate-menao-fade-up flex flex-col gap-2">
            <Bubble role={message.role} speaker={message.role === "user" ? t.you : t.title}>
              {message.text}
            </Bubble>
            {message.draft && (
              <div className="flex flex-col gap-3 rounded-card border border-primary/25 bg-primary-soft p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-primary-strong">
                  <ClipboardCheck aria-hidden="true" className="size-4" />
                  {t.draft.title}
                </p>
                <p className="text-[0.9375rem]">{message.draft.description}</p>
                {tradeLabel(message.draft.trade) && (
                  <p className="text-xs text-muted-foreground">
                    {t.draft.trade(tradeLabel(message.draft.trade) ?? "")}
                  </p>
                )}
                <Button
                  size="sm"
                  block={false}
                  className="self-start"
                  onClick={() => message.draft && onUseDraft(message.draft)}
                >
                  {t.draft.use}
                </Button>
                <p className="text-xs text-muted-foreground">{t.draft.hint}</p>
              </div>
            )}
            {message.suggestHuman && (
              <TextLink href="/contact" className="self-start text-sm">
                {t.write}
              </TextLink>
            )}
            {message === last &&
              !pending &&
              !limitReached &&
              message.suggestions &&
              message.suggestions.length > 0 && (
                <Chips
                  label={t.suggestionsLabel}
                  items={message.suggestions.filter((s) => !sentTexts.has(s))}
                  onPick={(item) => void send(item)}
                />
              )}
          </div>
        ))}
        {pending && <Typing label={t.thinking} />}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <VoiceCall assistant="client" />
        {!limitReached && (
          <Composer
            id="client-assistant-message"
            value={text}
            onChange={setText}
            onSubmit={() => void send(text)}
            pending={pending}
            maxLength={PRO_ASSISTANT_QUESTION_MAX_LENGTH}
            placeholder={t.placeholder}
            label={t.inputLabel}
            sendLabel={t.send}
          />
        )}
        <TextLink href="/contact" className="self-start text-sm">
          {t.write}
        </TextLink>
      </div>
    </AssistantDialog>
  );
}
