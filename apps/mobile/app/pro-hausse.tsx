import { withPlanRight } from "@/components/pro/plan-gate";
import { RaiseScreen } from "@/components/pro/raise-prices";
import { withTeamPermission } from "@/components/team-gate";
import { fr } from "@/i18n/fr";

// Réservé au patron et au chef d'équipe, comme la bibliothèque (ADR 0241), et aux formules
// Premium et Entreprise (ADR 0363).
export default withTeamPermission(
  "money",
  withPlanRight("priceUpdates", fr.proPlan.locked.raise, RaiseScreen),
);
