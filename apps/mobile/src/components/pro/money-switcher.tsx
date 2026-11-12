import { PillTabs } from "@/components/pro/fiche-kit";
import { fr } from "@/i18n/fr";

export const MONEY_VIEWS = ["devis", "factures", "depenses", "bibliotheque", "suivi"] as const;
export type MoneyView = (typeof MONEY_VIEWS)[number];

/**
 * Onglets « Devis », « Factures », « Dépenses », « Bibliothèque » (et « Suivi ») en tête de
 * l'onglet Argent (ADR 0188) : pilules pleine largeur, l'onglet actif en bleu nuit (refonte
 * « Nette », lot 2).
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
    // Bibliothèque d'ouvrages (F-141, ADR 0293).
    { value: "bibliotheque", label: fr.tabs.library },
    ...(overview ? [{ value: "suivi" as const, label: fr.tabs.overview }] : []),
  ];
  return <PillTabs label={fr.tabs.money} options={options} value={value} onChange={onChange} />;
}
