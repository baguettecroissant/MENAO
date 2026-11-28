"use client";

import { COMMERCIAL_PUSH_TYPES, type CommercialPushType } from "@menao/core";
import { Bell, BellOff, CircleCheck, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Alert, Button } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { setPushPreference } from "@/lib/commercial/alert-actions";
import {
  currentSubscription,
  disablePush,
  enablePush,
  pushSupport,
  type PushSupport,
} from "@/lib/commercial/push-client";

const t = fr.commercialField.moments.push;

/**
 * Activer les notifications sur ce téléphone et choisir ce que l'on reçoit (ADR 0396). L'e-mail
 * et la cloche restent toujours actifs.
 */
export function PushSettings({ prefs }: { prefs: Record<CommercialPushType, boolean> }) {
  const router = useRouter();
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [values, setValues] = useState(prefs);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const s = pushSupport();
    let alive = true;
    currentSubscription()
      .then((sub) => {
        if (!alive) return;
        setSupport(s);
        setActive(Boolean(sub) && Notification.permission === "granted");
      })
      .catch(() => alive && setSupport(s));
    return () => {
      alive = false;
    };
  }, []);

  function enable() {
    setMessage(null);
    startTransition(async () => {
      const result = await enablePush();
      if (result === "ok") {
        setActive(true);
        router.refresh();
      } else {
        setMessage(
          result === "denied" ? t.denied : result === "unsupported" ? t.unsupported : t.unavailable,
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-card bg-foreground p-5 text-surface">
        <h2 className="flex items-center gap-2.5 text-base font-semibold">
          {active ? (
            <CircleCheck aria-hidden="true" className="size-5" />
          ) : (
            <Bell aria-hidden="true" className="size-5" />
          )}
          {active ? t.enabled : t.card}
        </h2>
        {support === "unsupported" ? (
          <p className="text-sm opacity-85">{t.unsupported}</p>
        ) : support === "denied" ? (
          <p className="text-sm opacity-85">{t.denied}</p>
        ) : active ? (
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await disablePush();
                setActive(false);
                router.refresh();
              })
            }
          >
            <BellOff aria-hidden="true" className="size-4" />
            {t.disable}
          </Button>
        ) : (
          <>
            <p className="text-sm opacity-85">{t.cardText}</p>
            <Button
              type="button"
              variant="secondary"
              data-demo-block="save"
              disabled={pending || support === null}
              onClick={enable}
            >
              {pending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {pending ? t.enabling : t.enable}
            </Button>
          </>
        )}
      </section>
      {message && <Alert tone="info">{message}</Alert>}
      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <h2 className="px-4 pt-3.5 pb-1.5 text-[1.0625rem] font-semibold">{t.choose}</h2>
        <ul>
          {COMMERCIAL_PUSH_TYPES.map((type) => {
            const [label, hint] = t.types[type] ?? [type, ""];
            const on = values[type];
            return (
              <li key={type} className="flex items-center gap-3 border-t border-border px-4 py-3">
                <span className="flex flex-1 flex-col">
                  <span className="text-[0.9375rem] font-semibold">{label}</span>
                  <span className="text-[0.8125rem] text-muted-foreground">{hint}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={label}
                  data-demo-block="save"
                  onClick={() => {
                    const next = !on;
                    setValues({ ...values, [type]: next });
                    void setPushPreference(type, next);
                  }}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-success" : "bg-border-strong"}`}
                >
                  <span
                    className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${on ? "left-[1.375rem]" : "left-0.5"}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <p className="text-sm text-muted-foreground">{t.iphone}</p>
    </div>
  );
}
