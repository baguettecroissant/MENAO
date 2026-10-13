import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SignInForm } from "@/components/sign-in-form";
import { SignUpForm } from "@/components/sign-up-form";
import { fr } from "@/i18n/fr";
import { signInForRequest, signUpForRequest } from "@/lib/requests";
import { Body, Chip, Notice, Title } from "@/ui";
import { theme } from "@/ui/theme";

const r = fr.request;

/**
 * Dernière étape avant l'envoi, sans compte (F-08) : créer son espace ou se connecter. Le projet
 * de la session anonyme est rattaché au compte. Après l'inscription, le lien de confirmation
 * arrive par e-mail ; on se connecte ensuite ici pour envoyer la demande.
 */
export function AccountStep({
  projectId,
  artisanIds,
}: {
  projectId: string;
  artisanIds: string[];
}) {
  const [tab, setTab] = useState<"signUp" | "signIn">("signUp");
  const [emailSent, setEmailSent] = useState(false);

  return (
    <>
      <Title>{r.accountTitle}</Title>
      <Body muted>{r.accountIntro}</Body>
      <View style={styles.tabs}>
        <Chip label={r.signUpTab} selected={tab === "signUp"} onPress={() => setTab("signUp")} />
        <Chip label={r.signInTab} selected={tab === "signIn"} onPress={() => setTab("signIn")} />
      </View>
      {emailSent && <Notice tone="success">{r.checkEmail}</Notice>}
      {tab === "signUp" ? (
        <SignUpForm
          submitLabel={r.signUpSubmit}
          onSubmit={async (input) => {
            const error = await signUpForRequest(projectId, artisanIds, input);
            if (!error) {
              setEmailSent(true);
              setTab("signIn");
            }
            return error;
          }}
        />
      ) : (
        <SignInForm
          submitLabel={r.signInSubmit}
          onSubmit={(input) => signInForRequest(projectId, input)}
        />
      )}
      <Text style={styles.free}>{r.free}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing(2) },
  free: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    textAlign: "center",
    color: theme.colors["muted-foreground"],
  },
});
