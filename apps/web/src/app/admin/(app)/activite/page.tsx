import { ACTIVITY_CATEGORIES, activityKinds, parseActivityCategory } from "@menao/core";
import type { Metadata } from "next";
import { FilterChips, PagerLinks, listHref } from "@/components/admin/list-controls";
import { ActivityFeed } from "@/components/admin/overview";
import { Card } from "@/components/ui";
import { fr } from "@/i18n/fr";
import { parsePage } from "@/lib/admin/follow-up";
import { requireAdmin } from "@/lib/admin/guard";
import { ACTIVITY_MAX_PAGES, getActivityPage } from "@/lib/admin/overview";

const t = fr.admin.activityLog;
const PATH = "/admin/activite";

export const metadata: Metadata = { title: `${t.title} — ${fr.admin.title}` };

/**
 * Toute l'activité de la plateforme (ADR 0146), du plus récent au plus ancien : 50 événements par
 * page, filtre par catégorie. La vue d'ensemble n'en montre que les 10 derniers.
 */
export default async function AdminActivityPage({ searchParams }: PageProps<"/admin/activite">) {
  const params = await searchParams;
  const category = parseActivityCategory(params.categorie);
  const page = Math.min(parsePage(params.page), ACTIVITY_MAX_PAGES);
  const { supabase } = await requireAdmin();
  const { items, hasNext } = await getActivityPage(supabase, {
    page,
    kinds: activityKinds(category),
  });
  const href = (next: { categorie?: string; page?: number }) => {
    const c = next.categorie ?? category;
    return listHref(PATH, { categorie: c === "tout" ? null : c, page: next.page ?? 1 });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </div>
      <FilterChips
        label={t.filtersLabel}
        items={ACTIVITY_CATEGORIES.map((key) => ({
          key,
          href: href({ categorie: key }),
          label: t.categories[key],
          active: key === category,
        }))}
      />
      <Card className="flex flex-col gap-4">
        <ActivityFeed items={items} now={new Date()} />
        <PagerLinks
          page={page}
          hasNext={hasNext && page < ACTIVITY_MAX_PAGES}
          hrefFor={(p) => href({ page: p })}
        />
        {page === ACTIVITY_MAX_PAGES && <p className="text-xs text-muted-foreground">{t.limit}</p>}
      </Card>
    </div>
  );
}
