import { Redirect, Stack } from "expo-router";
import { useSession } from "@/lib/session";

/** Écrans sans session : une personne connectée est renvoyée vers son espace. */
export default function AuthLayout() {
  const { space } = useSession();
  if (space !== "connexion") return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
