import { Redirect } from "expo-router";

/** Ancien onglet « Devis » : les devis sont dans l'onglet Argent (ADR 0188). */
export default function DevisTab() {
  return <Redirect href={{ pathname: "/pro/argent", params: { vue: "devis" } }} />;
}
