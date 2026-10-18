import { Redirect } from "expo-router";

/** Ancien onglet « Devis » : les devis sont dans l'onglet Chantiers (ADR 0130). */
export default function DevisTab() {
  return <Redirect href={{ pathname: "/pro/chantiers", params: { vue: "devis" } }} />;
}
