import type { Metadata, Route } from "next";
import Link from "next/link";
import { FilterChips, Pagination, SearchForm, listHref } from "@/components/admin/list-controls";
import { StaffInviteForm } from "@/components/admin/staff-invite-form";
import { ButtonLink, Card, CardTitle } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { parsePage } from "@/lib/admin/follow-up";
import { requireAdmin } from "@/lib/admin/guard";
import { PEOPLE_FILTERS, listPeople, parsePeopleFilter, peopleCounts } from "@/lib/admin/people";
import { formatDay, formatTimeAgo } from "@/lib/format";

const t = fr.admin.people;
const f = fr.admin.followUp;
const PATH = "/admin/personnes";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Personnes (F-52, ADR 0047) : tous les comptes, filtrés par rôle, avec recherche. Sous « Équipe
 * MENAO », invitation d'un admin ou d'un membre du support (F-67, ADR 0210).
 */
export default async function AdminPeoplePage({ searchParams }: PageProps<"/admin/personnes">) {
  const params = await searchParams;
  const filter = parsePeopleFilter(params.role);
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : null;
  const page = parsePage(params.page);
  const { supabase } = await requireAdmin();
  const [{ rows, total }, counts] = await Promise.all([
    listPeople(supabase, { filter, query, page }),
    peopleCounts(supabase, query),
  ]);
  const now = new Date();
  const href = (next: { role?: string; page?: number }) =>
    listHref(PATH, {
      role: (next.role ?? filter) === "tous" ? null : (next.role ?? filter),
      q: query,
      page: next.page ?? 1,
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
        </div>
        {filter !== "equipe" && (
          <ButtonLink
            href={`${PATH}?role=equipe#inviter` as Route}
            variant="outline"
            size="sm"
            className="shrink-0 self-start"
          >
            {t.invite.link}
          </ButtonLink>
        )}
      </div>
      {filter === "equipe" && (
        <Card id="inviter" className="flex scroll-mt-24 flex-col gap-4">
          <CardTitle title={t.invite.title} description={t.invite.lead} />
          <StaffInviteForm />
        </Card>
      )}
      <SearchForm
        action={PATH}
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        query={query}
        keep={{ role: filter === "tous" ? null : filter }}
      />
      <FilterChips
        label={t.filtersLabel}
        items={PEOPLE_FILTERS.map((key) => ({
          key,
          href: href({ role: key }),
          label: t.filters[key],
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
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.name}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.email}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.role}
                  </th>
                  <th scope="col" className="py-2 pr-4 font-normal">
                    {t.columns.created}
                  </th>
                  <th scope="col" className="py-2 font-normal">
                    {t.columns.lastSignIn}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const name = row.name ?? t.unnamed;
                  return (
                    <tr key={row.user_id} className="border-t border-border align-top">
                      <td className="py-3 pr-4">
                        <Link
                          href={`${PATH}/${row.user_id}` as Route}
                          aria-label={t.open(row.name ?? row.email)}
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 break-all">{row.email}</td>
                      <td className="py-3 pr-4">
                        {fr.roles[row.role as keyof typeof fr.roles] ?? row.role}
                      </td>
                      <td className="py-3 pr-4">{formatDay(row.created_at)}</td>
                      <td className="py-3">
                        {row.last_sign_in_at ? formatTimeAgo(row.last_sign_in_at, now) : t.never}
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
