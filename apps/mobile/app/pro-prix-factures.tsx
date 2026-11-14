import { InvoicePricesScreen } from "@/components/pro/invoice-prices";
import { withTeamPermission } from "@/components/team-gate";

// Réservé au patron et au chef d'équipe, comme la bibliothèque (ADR 0241).
export default withTeamPermission("money", InvoicePricesScreen);
