import { Redirect, useLocalSearchParams } from "expo-router";
import { ArtisanChantiersScreen } from "@/components/pro/chantiers-screen";

/**
 * Onglet « Chantiers » de l'artisan (F-18, ADR 0130). Les devis sont dans l'onglet Argent
 * (ADR 0188) : l'ancien lien `?vue=devis` y mène.
 */
export default function ChantiersTab() {
  const { vue } = useLocalSearchParams<{ vue?: string }>();
  if (vue === "devis")
    return <Redirect href={{ pathname: "/pro/argent", params: { vue: "devis" } }} />;
  return <ArtisanChantiersScreen />;
}
