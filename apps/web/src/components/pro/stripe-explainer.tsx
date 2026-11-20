"use client";

import {
  ArrowRight,
  Clock,
  CreditCard,
  Euro,
  ExternalLink,
  IdCard,
  Info,
  Landmark,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Drawer } from "@/components/drawer";
import { Button, focusRing } from "@/components/ui";
import { fr } from "@/i18n/fr";

const t = fr.pro.onboarding.connect.explainer;
const ICONS: Record<string, LucideIcon> = {
  bank: Landmark,
  card: CreditCard,
  shield: ShieldCheck,
  id: IdCard,
  phone: Smartphone,
  euro: Euro,
  clock: Clock,
};
const PRICING_URL = "https://stripe.com/fr/pricing";

/** Le mémo « Stripe en 1 minute », ouvert sur une question précise si besoin. */
function StripeMemo({
  open,
  onClose,
  focus,
}: {
  open: boolean;
  onClose: () => void;
  focus?: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!open || !focus) return;
    list.current?.querySelector(`[data-item="${focus}"]`)?.scrollIntoView({ block: "center" });
  }, [open, focus]);
  return (
    <Drawer open={open} onClose={onClose} title={t.title} backLabel={t.close} side>
      <p className="-mt-3 text-sm text-muted-foreground">{t.lead}</p>
      <ul ref={list} className="flex flex-col">
        {t.items.map((item, i) => {
          const Icon = ICONS[item.icon] ?? Info;
          return (
            <li
              key={item.id}
              data-item={item.id}
              className={`flex gap-3 py-3.5 ${i > 0 ? "border-t border-border" : ""} ${
                focus === item.id ? "rounded-xl bg-primary-softer px-2" : ""
              }`}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[0.6875rem] bg-primary-soft text-primary-strong">
                <Icon aria-hidden="true" className="size-[1.125rem]" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-bold">{item.q}</span>
                <span className="text-sm leading-relaxed text-label">{item.a}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-3">
        <a
          href={PRICING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-semibold text-primary-strong ${focusRing}`}
        >
          {t.pricing}
          <ExternalLink aria-hidden="true" className="size-3.5" />
        </a>
        <Button type="button" size="lg" onClick={onClose}>
          {t.done}
        </Button>
      </div>
    </Drawer>
  );
}

/**
 * « Stripe, c'est quoi ? » (F-185, ADR 0384, maquette du lot 80) : une image simple, puis le mémo
 * des 7 questions que se posent les artisans. Sans jargon (ni « Connect », ni « KYC »).
 */
export function StripeExplainerCard() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-3.5 rounded-card border-[1.5px] border-primary/30 bg-surface p-4 sm:p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[0.8125rem] bg-primary-soft text-primary-strong">
        <Info aria-hidden="true" className="size-[1.375rem]" />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="font-display text-[1.0625rem] font-bold tracking-tight">{t.cardTitle}</h3>
        <p className="text-sm leading-relaxed text-label">{t.cardText}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-bold text-primary-strong ${focusRing}`}
        >
          {t.open}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
      <StripeMemo open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/** Petit « i » ou lien discret qui ouvre le mémo, sur une question si `focus` est donné. */
export function StripeExplainerLink({
  focus,
  asIcon = false,
}: {
  focus?: string;
  asIcon?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {asIcon ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t.infoLabel}
          title={t.infoLabel}
          className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong ${focusRing}`}
        >
          <Info aria-hidden="true" className="size-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-semibold text-primary-strong ${focusRing}`}
        >
          <Info aria-hidden="true" className="size-4" />
          {t.link}
        </button>
      )}
      <StripeMemo open={open} onClose={() => setOpen(false)} focus={focus} />
    </>
  );
}
