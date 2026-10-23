"use client";

import { useState, useTransition } from "react";
import { Alert, Button, Tag } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { recommendPartner } from "@/lib/artisan/request-actions";

const t = fr.pro.partners;

export type PartnerOption = {
  projectId: string;
  trade: string;
  sameProject: boolean;
  artisanId: string;
  name: string;
  recommended: boolean;
};

/**
 * « Recommander un partenaire » (ADR 0174) : partenaires du réseau de parrainage qui interviennent
 * chez ce client, à la place de l'artisan ou pour un autre métier du chantier. Le client est
 * prévenu et décide de les contacter.
 */
export function PartnerRecommendations({
  requestId,
  clientFirstName,
  options,
}: {
  requestId: string;
  clientFirstName: string;
  options: PartnerOption[];
}) {
  const [done, setDone] = useState<string[]>([]);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const key = (o: PartnerOption) => `${o.projectId}:${o.artisanId}`;

  const recommend = (o: PartnerOption) =>
    startTransition(async () => {
      const result = await recommendPartner(requestId, o.projectId, o.artisanId);
      if (!result.ok) return setMessage({ tone: "error", text: result.error });
      setDone((current) => [...current, key(o)]);
      setMessage({ tone: "success", text: t.sent(clientFirstName) });
    });

  const groups = [
    { title: t.instead, rows: options.filter((o) => o.sameProject) },
    { title: t.otherTrades, rows: options.filter((o) => !o.sameProject) },
  ].filter((g) => g.rows.length > 0);

  return (
    <section
      aria-labelledby="partenaires"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-1">
        <h2 id="partenaires" className="font-medium">
          {t.title}
        </h2>
        <p className="text-sm text-muted-foreground">{t.lead}</p>
      </div>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{group.title}</h3>
          <ul className="flex flex-col gap-2">
            {group.rows.map((o) => {
              const recommended = o.recommended || done.includes(key(o));
              return (
                <li
                  key={key(o)}
                  className="flex items-center justify-between gap-3 rounded-input bg-background px-3 py-2"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium">{o.name}</span>
                    <span className="text-sm text-muted-foreground">{o.trade}</span>
                  </span>
                  {recommended ? (
                    <Tag>{t.recommended}</Tag>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      block={false}
                      disabled={pending}
                      onClick={() => recommend(o)}
                      aria-label={t.recommendLabel(o.name)}
                    >
                      {t.recommend}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
