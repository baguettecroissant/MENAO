import { cancelChantierSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { cancelArtisanChantier } from "@/lib/pro-chantiers";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";

const t = fr.proAppointment;

/** F-18 « Annuler le chantier », comme sur le site : message facultatif pour le client. Définitif. */
export default function CancelArtisanChantierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = cancelChantierSchema.safeParse({ reason });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.reason?.[0]);
      return;
    }
    setError(undefined);
    setFailure(null);
    setPending(true);
    const failed = await cancelArtisanChantier(id, parsed.data.reason);
    setPending(false);
    if (failed) return setFailure(failed);
    router.back();
  }

  return (
    <Screen header={<TopBar />}>
      <Title>{t.cancelTitle}</Title>
      <Body muted>{t.cancelIntro}</Body>
      <TextField
        label={t.cancelReason}
        value={reason}
        onChangeText={(value) => {
          setReason(value);
          setError(undefined);
        }}
        maxLength={500}
        multiline
        error={error}
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={t.cancelConfirm} onPress={submit} loading={pending} />
    </Screen>
  );
}
