import { Bell } from "lucide-react-native";
import { ComingSoon } from "@/components/coming-soon";
import { fr } from "@/i18n/fr";

export default function Notifications() {
  return (
    <ComingSoon icon={Bell} title={fr.tabs.notifications} text={fr.soon.notifications} siteLink />
  );
}
