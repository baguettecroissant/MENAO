import { ClipboardList } from "lucide-react-native";
import { ComingSoon } from "@/components/coming-soon";
import { fr } from "@/i18n/fr";

export default function Chantiers() {
  return (
    <ComingSoon icon={ClipboardList} title={fr.tabs.chantiers} text={fr.soon.chantiers} siteLink />
  );
}
