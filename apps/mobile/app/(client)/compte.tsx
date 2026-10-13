import { AccountScreen } from "@/components/account-screen";
import { GuestAccount } from "@/components/guest-account";
import { useSession } from "@/lib/session";

export default function Compte() {
  const { signedIn } = useSession();
  return signedIn ? <AccountScreen /> : <GuestAccount />;
}
