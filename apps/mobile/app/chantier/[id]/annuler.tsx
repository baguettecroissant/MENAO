import { useLocalSearchParams } from "expo-router";
import { CancelForm } from "@/components/cancel-form";
import { fr } from "@/i18n/fr";
import { cancelChantier } from "@/lib/chantiers";

const t = fr.clientCancel.chantier;

/** Annulation du chantier par le client (F-12), avant tout devis signé. Définitive. */
export default function CancelChantier() {
  const { id, artisan = "" } = useLocalSearchParams<{ id: string; artisan?: string }>();
  return (
    <CancelForm
      title={t.title}
      intro={t.intro(artisan)}
      submit={t.submit}
      onSubmit={(reason, comment) => cancelChantier(id, reason, comment)}
    />
  );
}
