import { AccountScreen } from "@/components/account-screen";
import { GuestAccount } from "@/components/guest-account";
import { useSession } from "@/lib/session";

/**
 * « Mon compte », ouvert depuis la photo de l'en-tête des onglets (maquettes), client comme
 * artisan ; sans compte connecté, l'invitation à se connecter.
 */
export default function Compte() {
  const { signedIn } = useSession();
  return signedIn ? <AccountScreen /> : <GuestAccount />;
}
