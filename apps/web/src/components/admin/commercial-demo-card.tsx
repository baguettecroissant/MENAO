"use client";

import { Copy, Eye, RefreshCw, Send, X } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, Button, Card, CardTitle, buttonClasses, inputClasses } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { rotateCommercialDemo, setCommercialDemo } from "@/lib/admin/commercial-actions";
import { initialFormState } from "@/lib/auth/form";

const t = fr.commercialDemo.admin;

/**
 * Lien de démo de l'espace commercial (maquette du lot 57, ADR 0344), en tête de l'onglet
 * Commerciaux : copier, ouvrir, envoyer, changer (l'ancien tombe) ou désactiver.
 */
export function CommercialDemoCard({ url, enabled }: { url: string; enabled: boolean }) {
  const [rotated, rotate, rotating] = useActionState(rotateCommercialDemo, initialFormState);
  const [toggled, toggle, toggling] = useActionState(setCommercialDemo, initialFormState);
  const [copied, setCopied] = useState(false);
  const state = rotated.error || rotated.success ? rotated : toggled;
  const secondary = buttonClasses({ variant: "secondary", block: false });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <CardTitle title={t.title} />
      <p className="text-sm text-label">{t.lead}</p>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.success && <Alert tone="success">{state.success}</Alert>}
      {!enabled && <Alert tone="info">{t.disabled}</Alert>}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <input
          readOnly
          aria-label={t.label}
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClasses} min-w-0 flex-1`}
        />
        <Button type="button" block={false} onClick={copy} disabled={!enabled}>
          <Copy aria-hidden="true" className="size-4" />
          {copied ? t.copied : t.copy}
        </Button>
        {enabled && (
          <a href={url} target="_blank" rel="noreferrer" className={secondary}>
            <Eye aria-hidden="true" className="size-4" />
            {t.open}
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {enabled && (
          <a
            href={`https://wa.me/?text=${encodeURIComponent(t.whatsappText(url))}`}
            target="_blank"
            rel="noreferrer"
            className={secondary}
          >
            <Send aria-hidden="true" className="size-4" />
            {t.whatsapp}
          </a>
        )}
        <form
          action={rotate}
          onSubmit={(e) => {
            if (!window.confirm(t.rotateConfirm)) e.preventDefault();
          }}
        >
          <Button type="submit" variant="secondary" block={false} disabled={rotating}>
            <RefreshCw aria-hidden="true" className="size-4" />
            {t.rotate}
          </Button>
        </form>
        <form action={toggle}>
          <input type="hidden" name="enabled" value={enabled ? "false" : "true"} />
          <Button type="submit" variant="secondary" block={false} disabled={toggling}>
            {enabled && <X aria-hidden="true" className="size-4" />}
            {enabled ? t.disable : t.enable}
          </Button>
        </form>
      </div>
      <p className="rounded-input bg-background px-3.5 py-3 text-[0.8125rem] text-label">
        {t.note}
      </p>
    </Card>
  );
}
