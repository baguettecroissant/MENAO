import { Redirect } from "expo-router";
import { withTeamPermission } from "@/components/team-gate";

/** Ancien onglet « Devis » : les devis sont dans l'onglet Argent (ADR 0188). */
function DevisTab() {
  return <Redirect href={{ pathname: "/pro/argent", params: { vue: "devis" } }} />;
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("money", DevisTab);
