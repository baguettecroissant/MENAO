"use client";

import { ArrowRight, Mail } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Alert, Button, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import {
  resendArtisanEmailCode,
  verifyArtisanEmailCode,
  type ArtisanSignupState,
} from "@/lib/auth/artisan-signup-actions";
import { LinkButton, StepFooter, StepTitle } from "./signup-ui";

const t = fr.pro.signUp.code;

/** Étape « code » : le code à 6 chiffres reçu par e-mail confirme l'adresse sans quitter la page. */
export function CodeStep({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  const [code, setCode] = useState("");
  const [state, setState] = useState<ArtisanSignupState & { resent?: boolean }>({});
  const [pending, startTransition] = useTransition();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      // En cas de succès, l'action ouvre la session et redirige vers « Votre profil est créé » :
      // elle ne renvoie alors rien.
      const result = (await verifyArtisanEmailCode({ email, code })) as
        ArtisanSignupState | undefined;
      if (result) setState(result);
    });
  }

  function resend() {
    startTransition(async () => {
      const result = await resendArtisanEmailCode(email);
      setState(result.error ? result : { resent: true });
    });
  }

  return (
    <>
      <span className="flex size-14 items-center justify-center rounded-card bg-primary-soft text-primary-strong">
        <Mail aria-hidden="true" className="size-7" />
      </span>
      <StepTitle title={t.title} lead={t.lead(email)} />
      <form id="artisan-code" onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <label htmlFor="artisan-code-input" className="text-sm font-medium">
          {t.label}
        </label>
        <input
          id="artisan-code-input"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          aria-invalid={state.error ? true : undefined}
          className={`${inputClasses} min-h-16 bg-surface text-center text-3xl font-semibold tracking-[0.5em]`}
        />
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.resent && <Alert tone="success">{t.resent}</Alert>}
        <p className="text-sm text-muted-foreground">{t.linkToo}</p>
      </form>
      <div className="flex flex-wrap gap-x-6">
        <LinkButton onClick={resend}>{t.resend}</LinkButton>
        <LinkButton onClick={onChangeEmail}>{t.changeEmail}</LinkButton>
      </div>
      <StepFooter>
        <Button size="lg" type="submit" form="artisan-code" disabled={pending || code.length !== 6}>
          {t.submit}
          <ArrowRight aria-hidden="true" className="size-5" />
        </Button>
      </StepFooter>
    </>
  );
}
