import { Inbox } from "lucide-react-native";
import { ComingSoon } from "@/components/coming-soon";
import { fr } from "@/i18n/fr";

export default function Demandes() {
  return <ComingSoon icon={Inbox} title={fr.tabs.requests} text={fr.soon.requests} />;
}
