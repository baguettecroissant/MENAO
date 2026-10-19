import { SPOT_CHECK_RATE, parisToday, spotCheckPeriod, spotCheckTarget } from "@menao/core";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { Pagination } from "@/components/admin/list-controls";
import { Alert, Button, Card, StatusBadge } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { drawSpotChecks } from "@/lib/admin/actions";
import { PAGE_SIZE, parsePage } from "@/lib/admin/follow-up";
import { requireAdmin } from "@/lib/admin/guard";
import { SpotCheckForm } from "./spot-check-form";

const t = fr.admin.spotChecks;
const monthFormat = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export const metadata: Metadata = { title: `${t.title} — MENAO`, robots: { index: false } };

type Row = {
  id: string;
  period: string;
  drawn_at: string;
  result: string | null;
  note: string | null;
  insurer_called: boolean;
  checked_at: string | null;
  checked_by: string | null;
  artisans: { id: string; raison_sociale: string | null; nom_commercial: string | null } | null;
};

/**
 * Contrôles aléatoires (ADR 0121) : chaque mois, 5 % des artisans validés sont tirés au sort et
 * leur dossier est revérifié ; résultat noté ici, inscrit au journal.
 */
export default async function SpotChecksPage({
  searchParams,
}: {
  searchParams: Promise<{ tirage?: string; page?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { tirage, page: rawPage } = await searchParams;
  const page = parsePage(rawPage);
  const period = spotCheckPeriod(parisToday());
  const select =
    "id, period, drawn_at, result, note, insurer_called, checked_at, checked_by, artisans(id, raison_sociale, nom_commercial)";

  const [current, previous, { count: validated }] = await Promise.all([
    supabase.from("artisan_spot_checks").select(select).eq("period", period).order("drawn_at"),
    // Contrôles des mois précédents : 50 par page (ADR 0146).
    supabase
      .from("artisan_spot_checks")
      .select(select, { count: "exact" })
      .lt("period", period)
      .order("period", { ascending: false })
      .order("drawn_at")
      .order("id")
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("artisans").select("id", { count: "exact", head: true }).eq("status", "valide"),
  ]);
  const rows = (current.data ?? []) as Row[];
  const older = (previous.data ?? []) as Row[];

  // Auteurs des résultats.
  const checkerIds = [
    ...new Set([...rows, ...older].map((r) => r.checked_by).filter((v): v is string => !!v)),
  ];
  const { data: checkers } = checkerIds.length
    ? await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", checkerIds)
    : { data: [] };
  const names = new Map(
    (checkers ?? []).map((c) => [
      c.user_id,
      [c.first_name, c.last_name].filter(Boolean).join(" ") || null,
    ]),
  );
  const nameOf = (r: Row) =>
    r.artisans?.nom_commercial ?? r.artisans?.raison_sociale ?? r.artisans?.id ?? "—";
  const done = rows.filter((r) => r.result !== null).length;
  const drawnCount = tirage === undefined || tirage === "erreur" ? null : Number(tirage);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground">{t.intro(SPOT_CHECK_RATE * 100)}</p>
      </div>

      <Card>
        <section aria-labelledby="mois" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="mois" className="text-lg font-medium">
                {t.month(monthFormat.format(new Date(`${period}T00:00:00Z`)))}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.target(done, rows.length, spotCheckTarget(validated ?? 0))}
              </p>
            </div>
            <form action={drawSpotChecks}>
              <Button type="submit" variant="secondary" className="sm:w-auto sm:px-4">
                {t.draw}
              </Button>
            </form>
          </div>
          {tirage === "erreur" && <Alert tone="error">{fr.errors.generic}</Alert>}
          {drawnCount !== null && !Number.isNaN(drawnCount) && (
            <Alert tone="success">{t.drawn(drawnCount)}</Alert>
          )}
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {t.checklist.map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
          {rows.length === 0 ? (
            <p className="text-muted-foreground">{t.empty}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {rows.map((r) => (
                <li
                  key={r.id}
                  id={`controle-${r.id}`}
                  aria-label={nameOf(r)}
                  className="flex flex-col gap-3 rounded-button border border-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {r.artisans ? (
                      <Link
                        href={`/admin/artisans/${r.artisans.id}` as Route}
                        aria-label={t.open(nameOf(r))}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {nameOf(r)}
                      </Link>
                    ) : (
                      <span className="font-medium">{nameOf(r)}</span>
                    )}
                    <ResultBadge result={r.result} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t.drawnOn(dateTime.format(new Date(r.drawn_at)))}
                  </p>
                  {r.result === null ? (
                    <SpotCheckForm spotCheckId={r.id} />
                  ) : (
                    <Outcome
                      row={r}
                      checker={r.checked_by ? (names.get(r.checked_by) ?? null) : null}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Card>

      <Card>
        <section aria-labelledby="precedents" className="flex flex-col gap-3">
          <h2 id="precedents" className="text-lg font-medium">
            {t.previous}
          </h2>
          {older.length === 0 ? (
            <p className="text-muted-foreground">{t.noPrevious}</p>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {older.map((r) => (
                <li key={r.id} className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">
                      {monthFormat.format(new Date(`${r.period}T00:00:00Z`))}
                    </span>
                    {r.artisans ? (
                      <Link
                        href={`/admin/artisans/${r.artisans.id}` as Route}
                        className="font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {nameOf(r)}
                      </Link>
                    ) : (
                      <span className="font-medium">{nameOf(r)}</span>
                    )}
                    <ResultBadge result={r.result} />
                  </span>
                  {r.result !== null && (
                    <Outcome
                      row={r}
                      checker={r.checked_by ? (names.get(r.checked_by) ?? null) : null}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            total={previous.count ?? 0}
            hrefFor={(p) => `/admin/controles${p > 1 ? `?page=${p}` : ""}#precedents` as Route}
          />
        </section>
      </Card>
    </div>
  );
}

function ResultBadge({ result }: { result: string | null }) {
  if (result === null) return <StatusBadge tone="warning">{t.pending}</StatusBadge>;
  return (
    <StatusBadge tone={result === "conforme" ? "success" : "danger"}>
      {t.results[result] ?? result}
    </StatusBadge>
  );
}

function Outcome({ row, checker }: { row: Row; checker: string | null }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      {row.checked_at && (
        <p className="text-xs text-muted-foreground">
          {t.checkedBy(dateTime.format(new Date(row.checked_at)), checker)}
          {row.insurer_called ? ` · ${t.insurerCalled}` : ""}
        </p>
      )}
      {row.note && <p>{row.note}</p>}
    </div>
  );
}
