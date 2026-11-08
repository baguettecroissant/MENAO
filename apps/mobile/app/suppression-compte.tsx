import { ACCOUNT_DELETION_MESSAGE_MAX_LENGTH, accountDeletionSchema } from "@menao/validation";
import { router } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { ActionScreen, ActionSubmit, SentCard } from "@/components/pro/action-kit";
import { FicheButton, FicheCard, FicheSkeleton } from "@/components/pro/fiche-kit";
import { CheckRow, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { loadDeletionRequest, requestAccountDeletion } from "@/lib/account";
import { formatDay } from "@/lib/format";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";

const t = fr.account.deletion;

/**
 * Suppression du compte depuis l'application (Apple 5.1.1 v), comme sur le site : demande
 * confirmée, remarque facultative ; l'équipe MENAO la traite sous un mois (RGPD), les documents
 * que la loi impose de garder (factures) étant conservés. Refonte « Nette » (lot 13) : grand
 * titre et explication, remarque et case de confirmation en carte, bouton rouge collé en bas.
 */
export default function AccountDeletionScreen() {
  const [pendingSince, reload] = useFocusData(loadDeletionRequest);
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [errors, setErrors] = useState<{ confirm?: string; message?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (pendingSince === undefined) return <FicheSkeleton />;

  async function submit() {
    const parsed = accountDeletionSchema.safeParse({ confirm, message });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({ confirm: fields.confirm?.[0], message: fields.message?.[0] });
      return;
    }
    setErrors({});
    setFailure(null);
    setSending(true);
    const createdAt = await requestAccountDeletion(parsed.data.message);
    setSending(false);
    if (!createdAt) return setFailure(t.error);
    setSent(true);
    await reload();
  }

  if (pendingSince) {
    return (
      <ActionScreen
        title={t.title}
        onRefresh={reload}
        footer={
          <FicheButton label={t.back} variant="secondary" tall onPress={() => router.back()} />
        }
      >
        {sent ? <SentCard text={t.sent} /> : null}
        <Notice tone="info">{t.pending(formatDay(pendingSince))}</Notice>
      </ActionScreen>
    );
  }
  return (
    <ActionScreen
      title={t.title}
      lead={t.intro}
      footer={<ActionSubmit label={t.submit} onPress={submit} loading={sending} danger />}
    >
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <FicheCard padding={4} gap={2.5}>
        <ToolField
          label={t.message}
          value={message}
          onChangeText={setMessage}
          maxLength={ACCOUNT_DELETION_MESSAGE_MAX_LENGTH}
          multiline
          error={errors.message}
        />
        <CheckRow
          label={t.confirm}
          checked={confirm}
          onChange={(value) => {
            setConfirm(value);
            setErrors({});
          }}
          error={errors.confirm}
        />
      </FicheCard>
    </ActionScreen>
  );
}
