import { PillTabs } from "@/components/admin/admin-tabs";
import { fr } from "@/i18n/fr";

const t = fr.pro.tenders;

/** Onglets de Demandes (ADR 0287) : demandes des particuliers, appels d'offres des architectes. */
export function RequestsTabs({ current }: { current: "demandes" | "appels" }) {
  return (
    <PillTabs
      label={t.tabsLabel}
      current={current}
      tabs={[
        { key: "demandes", href: "/pro/demandes", label: t.tabRequests },
        { key: "appels", href: "/pro/demandes/appels-offres", label: t.tabTenders },
      ]}
    />
  );
}
