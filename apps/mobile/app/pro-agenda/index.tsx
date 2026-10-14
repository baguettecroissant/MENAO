import { useLocalSearchParams } from "expo-router";
import { AgendaScreen } from "@/components/pro/agenda-screen";

/**
 * Agenda de l'artisan (F-44), ouvert depuis le tableau de bord. `semaine` : un jour de la semaine à
 * afficher ; `bloque` : créneau tout juste bloqué (l'écran repart sur cette semaine).
 */
export default function Agenda() {
  const { semaine, bloque } = useLocalSearchParams<{ semaine?: string; bloque?: string }>();
  return <AgendaScreen key={semaine ?? ""} week={semaine ?? null} blocked={bloque === "1"} />;
}
