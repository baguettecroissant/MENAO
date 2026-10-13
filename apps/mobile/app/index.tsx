import { Redirect } from "expo-router";
import { useSession } from "@/lib/session";

/** Aiguillage au lancement : l'accueil pour tous, sans compte ; l'espace pro ou l'équipe sinon. */
export default function Index() {
  const { space } = useSession();
  switch (space) {
    case "artisan":
      return <Redirect href="/pro" />;
    case "equipe":
      return <Redirect href="/equipe" />;
    default:
      return <Redirect href="/accueil" />;
  }
}
