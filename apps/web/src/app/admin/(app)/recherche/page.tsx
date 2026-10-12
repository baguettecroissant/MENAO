import type { Metadata, Route } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/admin/list-controls";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { requireAdmin } from "@/lib/admin/guard";
import { searchEverything } from "@/lib/admin/people";

const t = fr.admin.search;
const PATH = "/admin/recherche";
const GROUPS = ["personne", "artisan", "chantier", "devis", "facture"] as const;

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

type Result = {
  kind: string;
  id: string;
  label: string;
  detail: string | null;
  tag: string | null;
};

/** Destination et étiquette lisible d'un résultat de la recherche globale (ADR 0047). */
function describe(r: Result): { href: string; tag: string | null } {
  switch (r.kind) {
    case "personne":
      return {
        href: `/admin/personnes/${r.id}`,
        tag: r.tag ? (fr.roles[r.tag as keyof typeof fr.roles] ?? r.tag) : null,
      };
    case "artisan":
      return {
        href: `/admin/artisans/${r.id}`,
        tag: r.tag ? (t.artisanStatus[r.tag] ?? r.tag) : null,
      };
    case "devis":
      return {
        href: `/admin/chantiers/${r.id}`,
        tag: r.tag ? (fr.admin.followUp.chantiers.quoteStatus[r.tag] ?? r.tag) : null,
      };
    case "facture":
      return {
        href: `/admin/chantiers/${r.id}`,
        tag: r.tag ? (fr.admin.followUp.chantiers.paymentKinds[r.tag] ?? r.tag) : null,
      };
    default:
      return {
        href: `/admin/chantiers/${r.id}`,
        tag: r.tag
          ? (fr.pro.chantiers.status[r.tag as keyof typeof fr.pro.chantiers.status] ?? r.tag)
          : null,
      };
  }
}

/**
 * Recherche globale du back-office (F-52, ADR 0047) : personnes, artisans (nom ou SIRET),
 * chantiers, devis et factures (numéro), chacun menant à sa fiche.
 */
export default async function AdminSearchPage({ searchParams }: PageProps<"/admin/recherche">) {
  const params = await searchParams;
  const query = typeof params.q === "string" && params.q.trim() ? params.q.trim() : null;
  const { supabase } = await requireAdmin();
  const results = query ? await searchEverything(supabase, query) : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <SearchForm action={PATH} label={t.refine} placeholder={t.placeholder} query={query} />
      {!query ? (
        <p className="text-sm text-muted-foreground">{t.prompt}</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t.empty(query)}
        </p>
      ) : (
        <div className="grid items-start gap-4 md:grid-cols-2">
          {GROUPS.map((group) => {
            const rows = results.filter((r) => r.kind === group);
            if (!rows.length) return null;
            return (
              <Card key={group}>
                <section aria-label={t.groups[group]} className="flex flex-col gap-3">
                  <h2 className="text-lg font-medium">{t.groups[group]}</h2>
                  <ul className="flex flex-col">
                    {rows.map((r) => {
                      const { href, tag } = describe(r);
                      return (
                        <li
                          key={`${r.kind}-${r.id}-${r.label}`}
                          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-t border-border py-2 text-sm first:border-t-0 first:pt-0"
                        >
                          <span className="flex min-w-0 flex-col">
                            <Link
                              href={href as Route}
                              className="font-medium text-primary underline-offset-2 hover:underline"
                            >
                              {r.label}
                            </Link>
                            {r.detail && (
                              <span className="truncate text-xs text-muted-foreground">
                                {r.detail}
                              </span>
                            )}
                          </span>
                          {tag && <span className="text-xs text-muted-foreground">{tag}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
