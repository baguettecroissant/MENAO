import { Files } from "lucide-react-native";
import { DocumentsScreen } from "@/components/documents-screen";
import { GuestInvite } from "@/components/guest-invite";
import { fr } from "@/i18n/fr";
import { useSession } from "@/lib/session";

/** Onglet « Documents » : documents des chantiers du compte, sinon invitation à se connecter. */
export default function Documents() {
  const { signedIn } = useSession();
  if (!signedIn) return <GuestInvite icon={Files} {...fr.guest.documents} />;
  return <DocumentsScreen />;
}
