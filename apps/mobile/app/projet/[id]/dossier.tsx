import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { ActionScreen, ActionSubmit, SentCard } from "@/components/pro/action-kit";
import { FicheCard } from "@/components/pro/fiche-kit";
import { ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { sendProjectToMenao } from "@/lib/project";
import { useSession } from "@/lib/session";
import { Notice } from "@/ui";

const t = fr.dossier;

/**
 * « Envoyer mon dossier à MENAO » (F-09, F-56), depuis la dernière carte des résultats, comme sur
 * le site : message facultatif ; l'adresse e-mail est demandée tant qu'aucun compte n'est connecté
 * (recherche anonyme, ADR 0012), pour que l'équipe puisse répondre. Écran « Nette » (lot 12) :
 * grand titre, champs en carte et bouton collé en bas.
 */
export default function DossierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { signedIn } = useSession();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!signedIn && !z.email().safeParse(email.trim()).success) {
      setEmailError(t.emailInvalid);
      return;
    }
    setEmailError(undefined);
    setFailure(null);
    setPending(true);
    const error = await sendProjectToMenao(id, message, signedIn ? "" : email);
    setPending(false);
    if (error) return setFailure(error);
    setSent(true);
  }

  if (sent) {
    return (
      <ActionScreen
        title={t.title}
        footer={<ActionSubmit label={t.back} onPress={() => router.back()} />}
      >
        <SentCard text={t.sent} />
      </ActionScreen>
    );
  }
  return (
    <ActionScreen
      title={t.title}
      lead={t.intro}
      footer={
        <>
          {failure ? <Notice tone="error">{failure}</Notice> : null}
          <ActionSubmit label={t.submit} onPress={submit} loading={pending} />
        </>
      }
    >
      <FicheCard padding={4.5} gap={4}>
        <ToolField
          label={t.message}
          value={message}
          onChangeText={setMessage}
          maxLength={2000}
          multiline
        />
        {signedIn ? null : (
          <ToolField
            label={t.email}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setEmailError(undefined);
            }}
            hint={t.emailHint}
            error={emailError}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        )}
      </FicheCard>
    </ActionScreen>
  );
}
