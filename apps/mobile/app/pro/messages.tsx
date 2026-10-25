import { Redirect } from "expo-router";

/** Ancien onglet « Messages » : les messages s'ouvrent depuis la bulle de l'en-tête (ADR 0188). */
export default function ProMessagesTab() {
  return <Redirect href="/pro-messages" />;
}
