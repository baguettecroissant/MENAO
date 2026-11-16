import { buildInsurerRequest, insurerMailto, type InsuranceDocument } from "@menao/core";
import * as Linking from "expo-linking";
import { useLocalSearchParams } from "expo-router";
import { Send, Share2 } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Share, StyleSheet, Text } from "react-native";
import { PageHead, PrivacyNote } from "@/components/pro/dossier-kit";
import { FicheButton, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { SwitchCard, ToolField } from "@/components/pro/tools-kit";
import { withTeamPermission } from "@/components/team-gate";
import { fr } from "@/i18n/fr";
import { loadInsurerContext } from "@/lib/insurer-request";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proHelp.insurer;
const { colors, font } = theme;

/**
 * Message prêt pour l'assureur (lot 60, maquette « AideAssureur », ADR 0348), comme sur le site :
 * décennale au modèle officiel et RC Pro, entreprise, SIRET et métiers. L'artisan l'envoie depuis
 * sa messagerie ou le partage : MENAO n'envoie rien à sa place.
 */
function InsurerScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const from: InsuranceDocument = params.type === "rc_pro" ? "rc_pro" : "decennale";
  const [context] = useFocusData(loadInsurerContext);
  const [to, setTo] = useState("");
  const [withBoth, setWithBoth] = useState(true);
  // Objet et texte modifiés par l'artisan ; le choix « aussi la RC Pro » repart du message préparé.
  const [edited, setEdited] = useState<{ subject?: string; body?: string }>({});
  const [noMail, setNoMail] = useState(false);
  const prepared = useMemo(
    () =>
      context
        ? buildInsurerRequest({
            ...context,
            documents: withBoth ? ["decennale", "rc_pro"] : [from],
          })
        : null,
    [context, withBoth, from],
  );
  const subject = edited.subject ?? prepared?.subject ?? "";
  const body = edited.body ?? prepared?.body ?? "";

  if (context === undefined) return <FicheSkeleton />;

  function toggle(next: boolean) {
    setWithBoth(next);
    setEdited({});
  }

  async function send() {
    const url = insurerMailto(to, subject, body);
    try {
      await Linking.openURL(url);
      setNoMail(false);
    } catch {
      setNoMail(true);
    }
  }

  return (
    <FicheScreen
      keyboard
      footer={
        context ? (
          <>
            {noMail ? <Notice tone="info">{t.noMail}</Notice> : null}
            <FicheButton label={t.send} icon={Send} tall onPress={() => void send()} />
            <FicheButton
              label={t.share}
              icon={Share2}
              variant="secondary"
              onPress={() => void Share.share({ title: subject, message: `${subject}\n\n${body}` })}
            />
          </>
        ) : undefined
      }
    >
      <PageHead title={t.title} lead={t.lead} />
      {context === null ? (
        <Notice tone="error">{t.error}</Notice>
      ) : (
        <>
          <ToolField
            label={t.to}
            placeholder={t.toPlaceholder}
            value={to}
            onChangeText={setTo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <ToolField
            label={t.subject}
            value={subject}
            onChangeText={(value) => setEdited((e) => ({ ...e, subject: value }))}
          />
          <ToolField
            label={t.message}
            value={body}
            onChangeText={(value) => setEdited((e) => ({ ...e, body: value }))}
            multiline
          />
          <SwitchCard
            label={t.withRcPro}
            hint={t.withRcProHint}
            value={withBoth}
            onChange={toggle}
          />
          <PrivacyNote text={t.privacy} />
          <Text style={styles.after}>{t.after}</Text>
        </>
      )}
    </FicheScreen>
  );
}

const styles = StyleSheet.create({
  after: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors["muted-foreground"],
    textAlign: "center",
  },
});

// Réservé selon la place dans l'entreprise, comme les documents (ADR 0241).
export default withTeamPermission("dossier", InsurerScreen);
