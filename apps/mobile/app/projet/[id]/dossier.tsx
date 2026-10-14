import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { z } from "zod";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { sendProjectToMenao } from "@/lib/project";
import { useSession } from "@/lib/session";
import { Body, Button, Notice, Screen, TextField, Title } from "@/ui";

const t = fr.dossier;

/**
 * « Envoyer mon dossier à MENAO » (F-09, F-56), depuis la dernière carte des résultats, comme sur
 * le site : message facultatif ; l'adresse e-mail est demandée tant qu'aucun compte n'est connecté
 * (recherche anonyme, ADR 0012), pour que l'équipe puisse répondre.
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
      <Screen header={<TopBar />} footer={<Button label={t.back} onPress={() => router.back()} />}>
        <Title>{t.title}</Title>
        <Notice tone="success">{t.sent}</Notice>
      </Screen>
    );
  }
  return (
    <Screen
      header={<TopBar />}
      footer={<Button label={t.submit} onPress={submit} loading={pending} />}
    >
      <Title>{t.title}</Title>
      <Body muted>{t.intro}</Body>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <TextField
        label={t.message}
        value={message}
        onChangeText={setMessage}
        maxLength={2000}
        multiline
      />
      {signedIn ? null : (
        <TextField
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
    </Screen>
  );
}
