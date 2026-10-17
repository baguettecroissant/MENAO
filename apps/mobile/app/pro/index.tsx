import { DashboardScreen } from "@/components/pro/dashboard-screen";
import { DossierScreen } from "@/components/pro/dossier-screen";
import { useSession } from "@/lib/session";

/**
 * Tableau de bord artisan (F-16) ; tant que le dossier n'est pas validé, « Faire vérifier mon
 * entreprise » à la place (ADR 0113).
 */
export default function Dashboard() {
  const { role } = useSession();
  return role === "artisan_en_attente" ? <DossierScreen /> : <DashboardScreen />;
}
