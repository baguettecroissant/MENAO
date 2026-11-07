import { RequestsScreen } from "@/components/pro/requests-screen";
import { withTeamPermission } from "@/components/team-gate";

/** Onglet « Demandes » de l'artisan (F-16, F-17, ADR 0130) : à traiter sous 72 heures. */
function DemandesTab() {
  return <RequestsScreen tab />;
}

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("requests", DemandesTab);
