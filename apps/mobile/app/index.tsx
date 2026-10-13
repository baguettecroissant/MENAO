import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";

/** Aiguillage selon le rôle : connexion, espace particulier, espace artisan ou équipe MENAO. */
export default function Index() {
  const { space } = useSession();
  switch (space) {
    case "particulier":
      return <Redirect href="/chantiers" />;
    case "artisan":
      return <Redirect href="/pro" />;
    case "equipe":
      return <Redirect href="/equipe" />;
    default:
      return <Redirect href="/connexion" />;
  }
}
