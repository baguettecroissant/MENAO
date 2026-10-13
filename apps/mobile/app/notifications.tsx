import { Bell } from "lucide-react-native";
import { ComingSoon } from "@/components/coming-soon";
import { GuestInvite } from "@/components/guest-invite";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

/** Notifications, ouvertes depuis la cloche de l'accueil. */
export default function Notifications() {
  const { signedIn } = useSession();
  if (!signedIn) {
    return <GuestInvite icon={Bell} {...fr.guest.notifications} header={<TopBar />} />;
  }
  return (
    <ComingSoon
      icon={Bell}
      title={fr.tabs.notifications}
      text={fr.soon.notifications}
      siteLink
      header={<TopBar />}
    />
  );
}
