"use client";

import type { Route } from "next";
import { useActionState, useCallback, useState } from "react";
import { Drawer } from "@/components/drawer";
import { StickyActions } from "@/components/pro/detail";
import { Alert, Button, ButtonLink } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { initialFormState } from "@/lib/auth/form";
import { confirmReservesLifted } from "@/lib/project/reception-actions";
import { useActionSuccess } from "@/lib/use-action-success";

const t = fr.chantier.reception;

/**
 * Fin de chantier côté client (maquettes « Chantier achevé ») : « Valider la réception du chantier »
 * (tiroir « Tout est conforme ? ») ou « Ajouter des réserves sur ce chantier ».
 */
export function ReceptionActions({
  chantierId,
  artisanName,
  balance,
}: {
  chantierId: string;
  artisanName: string;
  /** Solde restant à payer, mis en forme. */
  balance: string;
}) {
  const [open, setOpen] = useState<"conforme" | "reserves" | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const base = `/mon-espace/chantiers/${chantierId}/reception`;
  return (
    <>
      <StickyActions>
        <Button type="button" size="lg" onClick={() => setOpen("conforme")}>
          {t.validate}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen("reserves")}>
          <span className="text-primary-strong">{t.addReserves}</span>
        </Button>
      </StickyActions>
      <Drawer open={open === "conforme"} onClose={close} title={t.conformTitle} backLabel={t.close}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t.conformText(artisanName)}</p>
          <p className="rounded-input bg-primary-softer px-4 py-3 text-sm text-primary-strong">
            <span className="font-medium">{t.important}</span> {t.conformNext(balance)}
          </p>
          <ButtonLink href={base as Route} size="lg" block>
            {t.signPv}
          </ButtonLink>
          <Button type="button" variant="ghost" onClick={close}>
            {t.back}
          </Button>
        </div>
      </Drawer>
      <Drawer open={open === "reserves"} onClose={close} title={t.addReserves} backLabel={t.close}>
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium">{t.reservesQuestion}</p>
          <p className="text-sm text-muted-foreground">{t.reservesText(artisanName)}</p>
          <ButtonLink href={`${base}?reserves=1` as Route} size="lg" block>
            {t.addReservesSubmit}
          </ButtonLink>
          <Button type="button" variant="ghost" onClick={close}>
            {t.back}
          </Button>
        </div>
      </Drawer>
    </>
  );
}

/** F-26 « Confirmer la levée des réserves » (tiroir « Le chantier est-il parfait ? »). */
export function ConfirmLiftActions({
  chantierId,
  balance,
}: {
  chantierId: string;
  balance: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const [state, formAction, pending] = useActionState(
    confirmReservesLifted.bind(null, chantierId),
    initialFormState,
  );
  useActionSuccess(state, close);
  return (
    <>
      <StickyActions>
        <Button type="button" size="lg" onClick={() => setOpen(true)}>
          {t.confirmLift}
        </Button>
      </StickyActions>
      <Drawer open={open} onClose={close} title={t.perfectTitle} backLabel={t.close}>
        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <p className="text-sm text-muted-foreground">{t.perfectText(balance)}</p>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <Button type="submit" size="lg" disabled={pending}>
            {t.confirmLift}
          </Button>
          <Button type="button" variant="ghost" onClick={close}>
            {t.back}
          </Button>
        </form>
      </Drawer>
    </>
  );
}
