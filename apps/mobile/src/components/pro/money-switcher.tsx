import { PillTabs } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";

export const MONEY_VIEWS = ["devis", "factures", "depenses", "suivi"] as const;
export type MoneyView = (typeof MONEY_VIEWS)[number];

/**
 * Onglets « Devis », « Factures », « Dépenses » (et « Suivi ») en tête de l'onglet Argent
 * (ADR 0188) : pilules pleine largeur, l'onglet actif en bleu nuit (refonte « Nette », lot 2).
 */
export function MoneySwitcher({
  value,
  onChange,
  overview = false,
}: {
  value: MoneyView;
  onChange: (value: MoneyView) => void;
  /** Onglet « Suivi » : agent comptable avancé (Premium et Entreprise, ADR 0237). */
  overview?: boolean;
}) {
  const options: { value: MoneyView; label: string }[] = [
    { value: "devis", label: fr.tabs.quotes },
    { value: "factures", label: fr.tabs.invoices },
    { value: "depenses", label: fr.tabs.expenses },
    ...(overview ? [{ value: "suivi" as const, label: fr.tabs.overview }] : []),
  ];
  return <PillTabs label={fr.tabs.money} options={options} value={value} onChange={onChange} />;
}
