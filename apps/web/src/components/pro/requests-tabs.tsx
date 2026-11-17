import { PillTabs } from "@/components/admin/admin-tabs";
import { fr } from "@/i18n/fr";

const t = fr.pro.tenders;

/** Onglets de Demandes (ADR 0287) : demandes des particuliers, appels d'offres des architectes. */
export function RequestsTabs({
  current,
  base = "/pro",
}: {
  current: "demandes" | "appels";
  /** Espace pro, ou ses pages d'exemples (ADR 0365). */
  base?: string;
}) {
  return (
    <PillTabs
      label={t.tabsLabel}
      current={current}
      tabs={[
        { key: "demandes", href: `${base}/demandes`, label: t.tabRequests },
        { key: "appels", href: `${base}/demandes/appels-offres`, label: t.tabTenders },
      ]}
    />
  );
}
