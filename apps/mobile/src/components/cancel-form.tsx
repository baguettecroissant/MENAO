import { CLIENT_CANCEL_REASONS, type ClientCancelReason } from "@menao/core";
import { router } from "expo-router";
import { useState } from "react";
import { ActionScreen, ActionSubmit, DangerBanner, RadioCards } from "@/components/pro/action-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { Notice } from "@/ui";

const t = fr.clientCancel;
const REASONS = CLIENT_CANCEL_REASONS.map((value) => ({ value, label: t.reasons[value] }));

/**
 * Annulation par le client (F-11, F-12), comme sur le site : motif de la liste et mot facultatif
 * pour l'artisan, puis retour à l'écran précédent, rechargé. Écran d'action « Nette » (lot 11) :
 * motifs en cartes radio bleu nuit, bouton rouge collé en bas ; `definitive` : l'explication
 * sur le bandeau rouge clair des actions définitives (annulation du chantier).
 */
export function CancelForm({
  title,
  intro,
  submit,
  definitive = false,
  onSubmit,
}: {
  title: string;
  intro: string;
  submit: string;
  definitive?: boolean;
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
    <ActionScreen
      bar={t.bar}
      title={title}
      lead={definitive ? null : intro}
      footer={
        <ActionSubmit label={submit} onPress={send} loading={pending} disabled={!reason} danger />
      }
    >
      {definitive ? <DangerBanner text={intro} /> : null}
      <RadioCards legend={t.reasonsLegend} options={REASONS} value={reason} onChange={setReason} />
      <ToolField
        label={t.comment}
        value={comment}
        onChangeText={setComment}
        maxLength={500}
        multiline
      />
      {failure ? <Notice tone="error">{failure}</Notice> : null}
    </ActionScreen>
  );
}
