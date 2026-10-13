import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { RadioGroup } from "@/components/radio-group";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { cancelRequest, type CancelReason } from "@/lib/chantiers";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";

const t = fr.clientCancel;
const REASONS = (Object.keys(t.reasons) as CancelReason[]).map((value) => ({
  value,
  label: t.reasons[value],
}));

/** Annulation d'une demande par le client (F-11) : motif, mot facultatif pour l'artisan. */
export default function CancelRequest() {
  const { id, artisan = "" } = useLocalSearchParams<{ id: string; artisan?: string }>();
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [comment, setComment] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!reason) return;
    setFailure(null);
    setPending(true);
    const error = await cancelRequest(id, reason, comment);
    setPending(false);
    if (error) return setFailure(error);
    router.back();
  }

  return (
    <Screen header={<TopBar />}>
      <Title>{t.title}</Title>
      <Body muted>{t.intro(artisan)}</Body>
      <RadioGroup legend={t.reasonsLegend} options={REASONS} value={reason} onChange={setReason} />
      <TextField
        label={t.comment}
        value={comment}
        onChangeText={setComment}
        maxLength={500}
        multiline
      />
      {failure && <Notice tone="error">{failure}</Notice>}
      <Button label={t.submit} onPress={submit} loading={pending} disabled={!reason} />
    </Screen>
  );
}
