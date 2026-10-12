import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, Pagination, SearchForm, listHref } from "@/components/admin/list-controls";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { AUDIT_FILTERS, auditCounts, listAudit, parseAuditFilter } from "@/lib/admin/audit";
import { parsePage } from "@/lib/admin/follow-up";
import { requireAdmin } from "@/lib/admin/guard";
import { formatDayTime } from "@/lib/format";

const t = fr.admin.journal;
const f = fr.admin.followUp;
const PATH = "/admin/journal";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

const LINKS: Record<string, (id: string | null) => string | null> = {
  artisan: (id) => (id ? `/admin/artisans/${id}` : null),
  ticket: (id) => (id ? `/admin/tickets/${id}` : null),
  chantier: (id) => (id ? `/admin/chantiers/${id}` : null),
  personne: (id) => (id ? `/admin/personnes/${id}` : null),
  listes: () => "/admin/referentiels",
};

const value = (data: unknown, key: string) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const v = (data as Record<string, unknown>)[key];
  return typeof v === "string" && v.trim() ? v : null;
};

/** Précision lisible d'une entrée : liste et code, type de document, décision, motif ou message. */
function detail(row: { action: string; target_type: string; data: unknown }): string | null {
  const d = row.data;
  if (row.action.startsWith("referentiel.")) {
    const sens = value(d, "sens");
    return [
      t.kinds[row.target_type] ?? row.target_type,
      value(d, "code"),
      value(d, "avant") && t.details.before(value(d, "avant") ?? ""),
      sens === "haut" ? t.details.up : sens === "bas" ? t.details.down : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  const docType = value(d, "type");
  const decision = value(d, "decision");
  const motif = value(d, "motif");
  const message = value(d, "message");
  return (
    [
      row.action.startsWith("document.") && docType
        ? (fr.pro.onboarding.documents.types[
            docType as keyof typeof fr.pro.onboarding.documents.types
          ] ?? docType)
        : null,
      decision
        ? (fr.admin.tickets.dispute.outcomes[
            decision as keyof typeof fr.admin.tickets.dispute.outcomes
          ] ?? decision)
        : null,
      motif && t.details.motif(motif),
      message && t.details.message(message),
    ]
      .filter(Boolean)
      .join(" · ") || null
  );
}

/**
 * Journal d'audit (spec §13, ADR 0052) : les actions de l'équipe et les actions automatiques, de la
 * plus récente à la plus ancienne, reliées à la fiche concernée.
 */
export default async function AuditLogPage({ searchParams }: PageProps<"/admin/journal">) {
  const params = await searchParams;
  const filter = parseAuditFilter(params.file);
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : null;
  const page = parsePage(params.page);
  const { supabase } = await requireAdmin();
  const [{ rows, total }, counts] = await Promise.all([
    listAudit(supabase, { filter, query, page }),
    auditCounts(supabase, query),
  ]);
  const href = (next: { file?: string; page?: number }) =>
    listHref(PATH, {
      file: (next.file ?? filter) === "tous" ? null : (next.file ?? filter),
      q: query,
      page: next.page ?? 1,
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <SearchForm
        action={PATH}
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        query={query}
        keep={{ file: filter === "tous" ? null : filter }}
      />
      <FilterChips
        label={t.filtersLabel}
        items={AUDIT_FILTERS.map((key) => ({
          key,
          href: href({ file: key }),
          label: t.filters[key] ?? key,
          count: counts[key],
          active: key === filter,
        }))}
      />
      <Card className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground" role="status">
          {f.results(total)}
        </p>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">{f.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.when}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.action}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.target}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t.columns.actor}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const link = LINKS[row.lien_type]?.(row.lien_id) ?? null;
                  const note = detail(row);
                  return (
                    <tr key={row.log_id} className="border-t border-border align-top">
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                        {formatDayTime(row.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-medium">{t.actions[row.action] ?? row.action}</span>
                        {note && (
                          <span className="block max-w-md text-xs break-words text-muted-foreground">
                            {note}
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {link ? (
                          <Link
                            href={link as Route}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            {row.cible ?? t.open}
                          </Link>
                        ) : (
                          (row.cible ?? f.none)
                        )}
                      </td>
                      <td className="py-3">
                        {row.automatique ? t.automatic : (row.acteur ?? t.unknownActor)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} hrefFor={(p) => href({ page: p })} />
      </Card>
    </div>
  );
}
