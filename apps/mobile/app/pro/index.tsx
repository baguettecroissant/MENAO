import { DashboardScreen } from "@/components/pro/dashboard-screen";
import { DossierScreen } from "@/components/pro/dossier-screen";
import { useExamplesActive } from "@/lib/examples";
import { useSession } from "@/lib/session";

/**
 * Tableau de bord artisan (F-16) ; tant que le dossier n'est pas validé, « Faire vérifier mon
 * entreprise » à la place (ADR 0113), sauf dans les exemples (ADR 0184).
 */
export default function Dashboard() {
  const { role } = useSession();
  const examples = useExamplesActive();
  return role === "artisan_en_attente" && !examples ? <DossierScreen /> : <DashboardScreen />;
}
