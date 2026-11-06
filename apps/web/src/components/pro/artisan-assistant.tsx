"use client";

import {
  ARTISAN_ASSISTANT_MAX_QUESTIONS,
  ARTISAN_ASSISTANT_QUESTION_MAX_LENGTH,
  type ArtisanAssistantMessage,
  type AssistantScreen,
} from "@menao/core";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { ArrowRight, Mail, RotateCcw } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bubble, Chips, Composer, Typing } from "@/components/assistant/assistant-ui";
import { Card, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { createClient } from "@/lib/supabase/client";

const t = fr.pro.helpCenter;

/** Écrans proposés par l'assistant, sur le site (ADR 0236). */
const SCREEN_HREF: Record<AssistantScreen, string> = {
  accueil: "/pro/tableau-de-bord",
  demandes: "/pro/demandes",
  chantiers: "/pro/chantiers",
  agenda: "/pro/agenda",
  disponibilites: "/pro/agenda/disponibilites",
  messages: "/pro/messages",
  devis: "/pro/devis",
  factures: "/pro/factures",
  depenses: "/pro/depenses",
  comptable: "/pro/comptable",
  paiements: "/pro/onboarding/paiements",
  fiche: "/pro/profil",
  documents: "/pro/onboarding/documents",
  zone: "/pro/onboarding/zone",
  metiers: "/pro/onboarding/metiers",
  avis: "/pro/avis",
  grade: "/pro/grade",
  profil: "/pro/mon-profil",
  formule: "/pro/onboarding/formule",
};

type Message = ArtisanAssistantMessage & {
  suggestHuman?: boolean;
  suggestions?: readonly string[];
  screens?: readonly AssistantScreen[];
};

/**
 * Assistant de l'espace artisan (F-86, ADR 0236) : conversation dans la page « Aide et support ».
 * L'historique reste dans la page ; chaque réponse peut proposer un ou deux écrans à ouvrir.
 */
export function ArtisanAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [stopped, setStopped] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0)
      endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, pending]);

  const asked = messages.filter((m) => m.role === "user");
  const limitReached = stopped || asked.length >= ARTISAN_ASSISTANT_MAX_QUESTIONS;
  const askedTexts = new Set(asked.map((m) => m.text));
  const last = messages[messages.length - 1];

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
      screens?: AssistantScreen[];
    }>("artisan-assistant", { method: "POST", body: { question: clean, history } });
    setPending(false);
    if (!error && data?.status === "ok" && data.answer) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer ?? "",
          suggestHuman: data.suggestHuman ?? false,
          suggestions: (data.suggestions ?? []).filter((s) => !askedTexts.has(s)),
          screens: data.screens ?? [],
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

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{t.assistantTitle}</h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              setStopped(false);
            }}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-pill px-2 text-sm text-muted-foreground hover:text-foreground ${focusRing}`}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {t.restart}
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <Chips items={t.quick} onPick={(text) => void ask(text)} label={t.quickLabel} />
      ) : (
        <div aria-live="polite" className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Bubble role={m.role} speaker={m.role === "user" ? t.you : t.speaker}>
                {m.text}
              </Bubble>
              {m.role === "assistant" && (m.screens?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {m.screens?.map((screen) => (
                    <Link
                      key={screen}
                      href={SCREEN_HREF[screen] as Route}
                      className={`inline-flex min-h-10 items-center gap-1.5 rounded-input border border-primary px-3.5 text-sm font-medium text-primary-strong hover:bg-primary-softer ${focusRing}`}
                    >
                      {t.screens[screen] ?? screen}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  ))}
                </div>
              )}
              {m.role === "assistant" && m.suggestHuman && (
                <a
                  href={`mailto:${t.email}`}
                  className={`inline-flex min-h-10 items-center gap-1.5 self-start rounded-input px-1 text-sm font-medium text-primary-strong hover:underline ${focusRing}`}
                >
                  <Mail aria-hidden="true" className="size-4" />
                  {t.writeTeam}
                </a>
              )}
            </div>
          ))}
          {pending && <Typing label={t.typing} />}
          {!pending && last?.role === "assistant" && !limitReached && (
            <Chips
              items={last.suggestions ?? []}
              onPick={(text) => void ask(text)}
              label={t.suggestionsLabel}
            />
          )}
          <div ref={endRef} />
        </div>
      )}

      {!limitReached && (
        <Composer
          id="artisan-assistant-question"
          value={question}
          onChange={setQuestion}
          onSubmit={() => void ask(question)}
          pending={pending}
          maxLength={ARTISAN_ASSISTANT_QUESTION_MAX_LENGTH}
          placeholder={t.placeholder}
          label={t.label}
          sendLabel={t.send}
        />
      )}
    </Card>
  );
}
