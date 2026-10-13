import { ClipboardList } from "lucide-react-native";
import { ComingSoon } from "@/components/coming-soon";
import { GuestInvite } from "@/components/guest-invite";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

export default function Chantiers() {
  const { signedIn } = useSession();
  if (!signedIn) return <GuestInvite icon={ClipboardList} {...fr.guest.chantiers} />;
  return (
    <ComingSoon icon={ClipboardList} title={fr.tabs.chantiers} text={fr.soon.chantiers} siteLink />
  );
}
