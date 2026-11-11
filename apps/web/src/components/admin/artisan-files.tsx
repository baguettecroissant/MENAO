import type { Route } from "next";
import Link from "next/link";
import { MoneyFigures } from "@/components/pro/money-figures";
import { fr } from "@/i18n/fr";
import { ARTISAN_FILE_STATUSES, type ArtisanFileStatus } from "@/lib/admin/artisan-files";

const t = fr.admin.list;

/**
 * En-tête des Dossiers artisans (ADR 0283) : titre, phrase, chiffres, puis les onglets soulignés
 * « Inscriptions en cours » (ancienne page « Inscriptions bloquées », ADR 0219) et un par statut.
 */
export function ArtisanFilesHeader({
  current,
  byStatus,
  stalled,
}: {
  current: ArtisanFileStatus | "inscriptions";
  byStatus: Map<ArtisanFileStatus, number>;
  stalled: number;
}) {
  const tabs = [
    {
      key: "inscriptions",
      href: "/admin/artisans/inscriptions",
      label: fr.admin.stalled.title,
      count: stalled,
    },
    ...ARTISAN_FILE_STATUSES.map((s) => ({
      key: s,
      href: `/admin/artisans?statut=${s}`,
      label: fr.admin.statuses[s],
      count: byStatus.get(s) ?? 0,
    })),
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[2rem] leading-[1.05] sm:text-[2.5rem]">{t.title}</h1>
        <p className="text-[0.9375rem] text-label sm:text-base">{t.intro}</p>
      </div>
      <MoneyFigures
        label={t.figuresLabel}
        dense
        cells={[
          {
            label: fr.admin.stalled.title,
            short: fr.admin.stalled.title.toLowerCase(),
            value: String(stalled),
            hint: t.stalledHint,
          },
          {
            label: fr.admin.statuses.en_verification,
            short: fr.admin.statuses.en_verification.toLowerCase(),
            value: String(byStatus.get("en_verification") ?? 0),
            hint: t.pendingHint,
          },
          {
            label: fr.admin.statuses.valide,
            short: fr.admin.statuses.valide.toLowerCase(),
            value: String(byStatus.get("valide") ?? 0),
            hint: t.validHint,
          },
          {
            label: fr.admin.statuses.suspendu,
            value: String(byStatus.get("suspendu") ?? 0),
            hint: t.suspendedHint,
            desktopOnly: true,
          },
        ]}
      />
      <nav
        aria-label={t.filters}
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href as Route}
            aria-current={tab.key === current ? "page" : undefined}
            aria-label={t.tab(tab.label, tab.count)}
            className="-mb-px flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 border-transparent px-2 text-[0.9375rem] font-medium whitespace-nowrap text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
          >
            {tab.label}
            {tab.count > 0 && (
              <span aria-hidden="true" className="tabular-nums">
                · {tab.count}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
