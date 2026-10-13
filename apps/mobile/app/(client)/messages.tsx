import { MessageCircle } from "lucide-react-native";
import { GuestInvite } from "@/components/guest-invite";
import { MessagesScreen } from "@/components/messages/messages-screen";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

/** Onglet « Messages » : conversations du compte connecté, sinon invitation à se connecter. */
export default function Messages() {
  const { signedIn } = useSession();
  if (!signedIn) return <GuestInvite icon={MessageCircle} {...fr.guest.messages} />;
  return <MessagesScreen />;
}
