import { useLocalSearchParams } from "expo-router";
import { CancelForm } from "@/components/cancel-form";
import { fr } from "@/i18n/fr";
import { cancelRequest } from "@/lib/chantiers";

const t = fr.clientCancel;

/** Annulation d'une demande par le client (F-11) : l'artisan n'a plus à répondre. */
export default function CancelRequest() {
  const { id, artisan = "" } = useLocalSearchParams<{ id: string; artisan?: string }>();
  return (
    <CancelForm
      title={t.title}
      intro={t.intro(artisan)}
      submit={t.submit}
      onSubmit={(reason, comment) => cancelRequest(id, reason, comment)}
    />
  );
}
