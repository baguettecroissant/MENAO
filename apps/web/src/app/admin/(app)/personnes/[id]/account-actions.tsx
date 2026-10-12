"use client";

import { useActionState } from "react";
import { Alert, Button, FieldError, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { reactivateAccount, sendPasswordReset, suspendAccount } from "@/lib/admin/account-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.admin.accountActions;

/**
 * Actions de l'équipe sur un compte (F-52, ADR 0048) : lien de réinitialisation du mot de passe,
 * export RGPD, suspension de l'accès (motif transmis) ou rétablissement.
 */
export function AccountActions({
  userId,
  isArtisan,
  suspended,
}: {
  userId: string;
  isArtisan: boolean;
  suspended: boolean;
}) {
  const [resetState, reset, resetting] = useActionState(sendPasswordReset, initialFormState);
  const [suspendState, suspend, suspending] = useActionState(suspendAccount, initialFormState);
  const [reactivateState, reactivate, reactivating] = useActionState(
    reactivateAccount,
    initialFormState,
  );
  // Après l'action, la page est relue : le message suit le nouvel état du compte.
  const accessSuccess = suspended ? suspendState.success : reactivateState.success;
  const accessError = suspended ? reactivateState.error : suspendState.error;
  const reasonError = suspendState.fieldErrors?.reason?.[0];

  return (
    <div className="flex flex-col gap-5">
      <form action={reset} className="flex flex-col gap-2">
        <input type="hidden" name="userId" value={userId} />
        {resetState.success && <Alert tone="success">{resetState.success}</Alert>}
        {resetState.error && <Alert tone="error">{resetState.error}</Alert>}
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          block={false}
          disabled={resetting}
          className="self-start"
        >
          {t.reset}
        </Button>
        <p className="text-xs text-muted-foreground">{t.resetHint}</p>
      </form>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <a
          href={`/admin/personnes/${userId}/donnees`}
          download
          className="self-start text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          {t.export}
        </a>
        <p className="text-xs text-muted-foreground">{t.exportHint}</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        {accessSuccess && <Alert tone="success">{accessSuccess}</Alert>}
        {accessError && <Alert tone="error">{accessError}</Alert>}
        {suspended ? (
          <form action={reactivate}>
            <input type="hidden" name="userId" value={userId} />
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              block={false}
              disabled={reactivating}
            >
              {t.reactivate}
            </Button>
          </form>
        ) : (
          <form action={suspend} noValidate className="flex flex-col gap-2">
            <input type="hidden" name="userId" value={userId} />
            <label htmlFor="account-reason" className="text-sm font-medium">
              {t.reasonLabel}
            </label>
            <textarea
              id="account-reason"
              name="reason"
              rows={3}
              maxLength={1000}
              defaultValue={suspendState.values?.reason}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={`account-reason-hint${reasonError ? " account-reason-error" : ""}`}
              className={`${inputClasses} min-h-20 py-2`}
            />
            <p id="account-reason-hint" className="text-xs text-muted-foreground">
              {t.reasonHint}
              {isArtisan && ` ${t.artisanHint}`}
            </p>
            {reasonError && <FieldError id="account-reason-error">{reasonError}</FieldError>}
            <Button
              type="submit"
              variant="danger"
              size="sm"
              block={false}
              disabled={suspending}
              className="self-start"
            >
              {t.suspend}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
