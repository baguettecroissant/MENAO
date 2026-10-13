import { CLIENT_CANCEL_REASONS, type ClientCancelReason } from "@menao/core";
import { router } from "expo-router";
import { useState } from "react";
import { RadioGroup } from "@/components/radio-group";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";

const t = fr.clientCancel;
const REASONS = CLIENT_CANCEL_REASONS.map((value) => ({ value, label: t.reasons[value] }));

/**
 * Annulation par le client (F-11, F-12), comme sur le site : motif de la liste et mot facultatif
 * pour l'artisan, puis retour à l'écran précédent, rechargé.
 */
export function CancelForm({
  title,
  intro,
  submit,
  onSubmit,
}: {
  title: string;
  intro: string;
  submit: string;
  /** Message d'erreur, ou null si l'annulation est enregistrée. */
  onSubmit: (reason: ClientCancelReason, comment: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState<ClientCancelReason | null>(null);
  const [comment, setComment] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function send() {
    if (!reason) return;
    setFailure(null);
    setPending(true);
    const error = await onSubmit(reason, comment);
    setPending(false);
    if (error) return setFailure(error);
    router.back();
  }

  return (
    <Screen header={<TopBar />}>
      <Title>{title}</Title>
      <Body muted>{intro}</Body>
      <RadioGroup legend={t.reasonsLegend} options={REASONS} value={reason} onChange={setReason} />
      <TextField
        label={t.comment}
        value={comment}
        onChangeText={setComment}
        maxLength={500}
        multiline
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <Button label={submit} onPress={send} loading={pending} disabled={!reason} />
    </Screen>
  );
}
