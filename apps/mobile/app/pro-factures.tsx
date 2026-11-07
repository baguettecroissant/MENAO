import { ArtisanInvoicesScreen } from "@/components/pro/invoices-screen";
import { withTeamPermission } from "@/components/team-gate";

/** Factures de l'artisan (F-35), ouvertes depuis « Mon profil » ; aussi dans l'onglet Argent. */
function ArtisanInvoicesRoute() {
  return <ArtisanInvoicesScreen />;
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("money", ArtisanInvoicesRoute);
