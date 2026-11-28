import { preparedProgress, preparedSignupDaysLeft, preparedSignupState } from "@menao/core";
import { UserPlus } from "lucide-react";
import type { Metadata, Route } from "next";
import { AutoRefresh } from "@/components/commercial/field/auto-refresh";
import { PreparedActions } from "@/components/commercial/field/prepared-actions";
import { EmptyState } from "@/components/empty-state";
import { Alert, ButtonLink, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { preparedSignupLink } from "@/lib/commercial/prepared-signup-actions";
import { getCommercialSpace } from "@/lib/commercial/space";
import { formatDay } from "@/lib/format";

const t = fr.commercialField.signups;
const STEPS = 7;

function Progress({ done, active }: { done: number; active: boolean }) {
  return (
    <span className="flex gap-1" aria-label={t.progressLabel(done, STEPS)} role="img">
      {Array.from({ length: STEPS }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i < done ? "bg-success" : i === done && active ? "bg-primary" : "bg-border"}`}
        />
      ))}
    </span>
  );
}

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

/**
 * « Mes inscriptions » (F-195, lot 84, ADR 0395) : les inscriptions préparées et leur avancement
 * (lien envoyé, ouvert, puis les étapes du dossier), avec la relance qui va avec ; puis tous les
 * inscrits avec le code. Rechargée toutes les 30 secondes.
 */
export default async function CommercialSignupsPage() {
  const space = await getCommercialSpace("/commercial/inscriptions");
  const [{ data: prepared }, { data: all }] = space.active
    ? await Promise.all([
        space.supabase.rpc("commercial_prepared_signups"),
        space.supabase.rpc("my_commercial_signups"),
      ])
    : [{ data: null }, { data: null }];
  const steps = fr.admin.stalled.steps as Record<string, string>;
  const now = new Date();
  const rows = await Promise.all(
    (prepared ?? []).map(async (row) => ({
      row,
      state: preparedSignupState(
        {
          expiresAt: row.expires_at,
          openedAt: row.opened_at,
          convertedAt: row.converted_at,
        },
        now,
      ),
      link: await preparedSignupLink(row.key),
    })),
  );

  return (
    <main className="bg-background">
      <AutoRefresh />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-[2rem] leading-[1.05] font-medium tracking-tight sm:text-[2.5rem]">
              {t.title}
            </h1>
            <p className="text-[0.9375rem] text-label">{t.intro}</p>
          </div>
          <ButtonLink href={"/commercial/inscrire" as Route} className="self-start">
            <UserPlus aria-hidden="true" className="size-4" />
            {fr.commercialField.prepare.cta}
          </ButtonLink>
        </div>
        {!space.active ? (
          <Alert tone="error">{fr.commercialSpace.suspended}</Alert>
        ) : (
          <>
            <section aria-labelledby="preparees" className="flex flex-col gap-3">
              <h2 id="preparees" className="text-lg">
                {t.prepared}
              </h2>
              {rows.length === 0 ? (
                <EmptyState illustration="documents" className="py-6">
                  {t.preparedEmpty}
                </EmptyState>
              ) : (
                <ul className="overflow-hidden rounded-card border border-border bg-surface">
                  {rows.map(({ row, state, link }) => {
                    const done =
                      state === "inscrit"
                        ? preparedProgress(row.artisan_status, row.manque, STEPS)
                        : state === "ouvert"
                          ? 1
                          : 0;
                    const detail =
                      state === "envoye"
                        ? t.states.envoye(preparedSignupDaysLeft(row.expires_at, now))
                        : state === "ouvert"
                          ? t.states.ouvert
                          : state === "expire"
                            ? t.states.expire
                            : row.artisan_status === "en_verification"
                              ? t.sent
                              : row.manque.length
                                ? t.missing(row.manque.map((x) => steps[x] ?? x).join(", "))
                                : row.artisan_status === "valide"
                                  ? t.validated
                                  : t.states.inscrit;
                    return (
                      <li
                        key={row.id}
                        className="flex flex-col gap-2.5 border-t border-border px-4 py-3.5 first:border-t-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{row.company_name ?? row.siret}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDay(row.created_at)}
                          </span>
                        </div>
                        <Progress done={done} active={state !== "expire"} />
                        <p className="text-[0.8125rem] text-label">{detail}</p>
                        {state !== "inscrit" && (
                          <PreparedActions
                            id={row.id}
                            link={link}
                            phone={row.phone}
                            firstName={row.first_name}
                            advisor={space.account.firstName ?? ""}
                            expired={state === "expire"}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <section aria-labelledby="tous" className="flex flex-col gap-3">
              <div className="flex flex-col gap-0.5">
                <h2 id="tous" className="text-lg">
                  {t.all}
                </h2>
                <p className="text-sm text-muted-foreground">{t.allHint}</p>
              </div>
              {all?.length ? (
                <ul className="overflow-hidden rounded-card border border-border bg-surface">
                  {all.map((s, i) => (
                    <li
                      key={`${s.signed_up_at}-${i}`}
                      className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm first:border-t-0"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="font-semibold">{s.raison_sociale ?? "—"}</span>
                        {s.manque.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {t.missing(s.manque.map((x) => steps[x] ?? x).join(", "))}
                          </span>
                        )}
                      </span>
                      <StatusBadge tone={s.status === "valide" ? "success" : "neutral"}>
                        {fr.commercialSpace.signups.status[s.status] ?? s.status}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState illustration="documents" className="py-6">
                  {fr.commercialSpace.signups.empty}
                </EmptyState>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
