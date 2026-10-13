import { MessageCircle } from "lucide-react-native";
import { ComingSoon } from "@/components/coming-soon";
import { GuestInvite } from "@/components/guest-invite";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

export default function Messages() {
  const { signedIn } = useSession();
  if (!signedIn) return <GuestInvite icon={MessageCircle} {...fr.guest.messages} />;
  return (
    <ComingSoon icon={MessageCircle} title={fr.tabs.messages} text={fr.soon.messages} siteLink />
  );
}
