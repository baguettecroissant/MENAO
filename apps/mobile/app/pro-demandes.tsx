import { Redirect } from "expo-router";

/** Ancienne adresse des demandes : elles sont désormais un onglet (ADR 0130). */
export default function ProDemandes() {
  return <Redirect href="/pro/demandes" />;
}
