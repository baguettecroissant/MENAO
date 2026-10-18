import { AccountScreen } from "@/components/account-screen";
import { GuestAccount } from "@/components/guest-account";
import { ProfileHubScreen } from "@/components/pro/profile-hub";
import { useSession } from "@/lib/session";

/**
 * Photo de l'en-tête des onglets (maquettes) : « Mon profil » pour l'artisan (ADR 0129), « Mon
 * compte » pour le particulier ; sans compte connecté, l'invitation à se connecter.
 */
export default function Compte() {
  const { signedIn, role } = useSession();
  if (!signedIn) return <GuestAccount />;
  if (role === "artisan" || role === "artisan_en_attente") return <ProfileHubScreen />;
  return <AccountScreen />;
}
