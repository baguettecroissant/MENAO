import { ClipboardList } from "lucide-react-native";
import { GuestInvite } from "@/components/guest-invite";
import { MyChantiersScreen } from "@/components/my-chantiers";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

export default function Chantiers() {
  const { signedIn } = useSession();
  if (!signedIn) return <GuestInvite icon={ClipboardList} {...fr.guest.chantiers} />;
  return <MyChantiersScreen />;
}
