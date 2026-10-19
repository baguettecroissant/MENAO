import { ARTISAN_CANCEL_REASONS, type ArtisanCancelReason } from "@menao/core";
import { cancelChantierSchema } from "@menao/validation";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { RadioGroup } from "@/components/radio-group";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { cancelArtisanChantier } from "@/lib/pro-chantiers";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";

const t = fr.proAppointment;
const CAUSES = ARTISAN_CANCEL_REASONS.map((value) => ({ value, label: t.cancelCauses[value] }));

/**
 * F-18 « Annuler le chantier », comme sur le site : motif pour l'équipe (signalement, ADR 0145),
 * message facultatif pour le client. Définitif.
 */
export default function CancelArtisanChantierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cause, setCause] = useState<ArtisanCancelReason | null>(null);
  const [reason, setReason] = useState("");
  const [causeError, setCauseError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    const parsed = cancelChantierSchema.safeParse({ cause: cause ?? "", reason });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setCauseError(fields.cause?.[0]);
      setError(fields.reason?.[0]);
      return;
    }
    setCauseError(undefined);
    setError(undefined);
    setFailure(null);
    setPending(true);
    const failed = await cancelArtisanChantier(id, parsed.data.cause, parsed.data.reason);
    setPending(false);
    if (failed) return setFailure(failed);
    router.back();
  }

  return (
    <Screen header={<TopBar />}>
      <Title>{t.cancelTitle}</Title>
      <Body muted>{t.cancelIntro}</Body>
      <RadioGroup
        legend={t.cancelCauseLegend}
        options={CAUSES}
        value={cause}
        onChange={(value) => {
          setCause(value);
          setCauseError(undefined);
        }}
        error={causeError}
      />
      <Body muted>{t.cancelCauseHint}</Body>
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
