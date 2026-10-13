import { MessageCircle } from "lucide-react-native";
import { ComingSoon } from "@/components/coming-soon";
import { fr } from "@/i18n/fr";

export default function Messages() {
  return (
    <ComingSoon icon={MessageCircle} title={fr.tabs.messages} text={fr.soon.messages} siteLink />
  );
}
