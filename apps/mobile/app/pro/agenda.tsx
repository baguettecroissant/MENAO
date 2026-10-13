import { CalendarDays } from "lucide-react-native";
import { ComingSoon } from "@/components/coming-soon";
import { fr } from "@/i18n/fr";

export default function Agenda() {
  return <ComingSoon icon={CalendarDays} title={fr.tabs.agenda} text={fr.soon.agenda} />;
}
