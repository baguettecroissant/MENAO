"use client";

import { insurerMailto } from "@menao/core";
import { Check, Copy, Lock, Send } from "lucide-react";
import { useState } from "react";
import { Button, Field, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.help.insurer;

type Message = { subject: string; body: string };

/**
 * Formulaire du message pour l'assureur : adresse, objet et texte modifiables, puis ouverture de la
 * messagerie de l'artisan (lien mailto) ou copie du texte. Rien ne part depuis MENAO.
 */
export function InsurerRequest({ both, alone }: { both: Message; alone: Message }) {
  const [to, setTo] = useState("");
  const [withBoth, setWithBoth] = useState(true);
  const [subject, setSubject] = useState(both.subject);
  const [body, setBody] = useState(both.body);
  const [copied, setCopied] = useState(false);

  function toggle(next: boolean) {
    setWithBoth(next);
    const message = next ? both : alone;
    setSubject(message.subject);
    setBody(message.body);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copie refusée par le navigateur : le texte reste sélectionnable dans le champ.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Field
        id="assureur-email"
        name="to"
        type="email"
        label={t.to}
        placeholder={t.toPlaceholder}
        autoComplete="off"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <Field
        id="assureur-objet"
        name="subject"
        label={t.subject}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="assureur-message"
          className="text-sm font-medium in-[.app-nette]:font-semibold"
        >
          {t.message}
        </label>
        <textarea
          id="assureur-message"
          rows={14}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={`${inputClasses} py-3 leading-relaxed`}
        />
      </div>
      <label className="flex min-h-touch cursor-pointer items-center justify-between gap-4 rounded-input border border-border bg-surface px-4 py-3">
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{t.withRcPro}</span>
          <span className="text-sm text-muted-foreground">{t.withRcProHint}</span>
        </span>
        <input
          type="checkbox"
          checked={withBoth}
          onChange={(e) => toggle(e.target.checked)}
          className="size-5 shrink-0 accent-success"
        />
      </label>
      <p className="flex gap-2.5 rounded-input bg-background p-3 text-sm text-label">
        <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        {t.privacy}
      </p>
      <a href={insurerMailto(to, subject, body)} className={buttonClasses({ variant: "primary" })}>
        <Send aria-hidden="true" className="size-4" />
        {t.send}
      </a>
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        {copied ? t.copied : t.copy}
      </Button>
      <p className="text-center text-sm text-muted-foreground">{t.after}</p>
    </div>
  );
}
