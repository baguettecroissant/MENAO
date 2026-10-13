import { Bell } from "lucide-react-native";
import { GuestInvite } from "@/components/guest-invite";
import { NotificationCenter } from "@/components/notification-center";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

/** Notifications, ouvertes depuis la cloche de l'accueil. */
export default function Notifications() {
  const { signedIn } = useSession();
  if (!signedIn) {
    return <GuestInvite icon={Bell} {...fr.guest.notifications} header={<TopBar />} />;
  }
  return <NotificationCenter />;
}
