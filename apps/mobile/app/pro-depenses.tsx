import { ArtisanExpensesScreen } from "@/components/pro/expenses-screen";
import { withTeamPermission } from "@/components/team-gate";

/** Dépenses de l'artisan (F-62), ouvertes depuis « Mon profil » ; aussi dans l'onglet Argent. */
function ArtisanExpensesRoute() {
  return <ArtisanExpensesScreen />;
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("money", ArtisanExpensesRoute);
