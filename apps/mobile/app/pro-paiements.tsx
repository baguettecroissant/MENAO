import { completeConnectPrefill, parisToday, type ConnectDetails } from "@menao/core";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { ConnectPrepare } from "@/components/pro/connect-prepare";
import { PageHead } from "@/components/pro/dossier-kit";
import { FicheCard, FicheScreen, FicheSkeleton } from "@/components/pro/fiche-kit";
import { MoneyPanel } from "@/components/pro/money-panel";
import { PaymentsPanel } from "@/components/pro/payments-panel";
import { StripeOnboarding } from "@/components/pro/stripe-onboarding";
import { fr } from "@/i18n/fr";
import { openHostedPage } from "@/lib/hosted";
import {
  createConnect,
  createConnectTokens,
  loadPayments,
  refreshConnect,
  startConnect,
} from "@/lib/payments";
import { useFocusData } from "@/lib/use-focus-data";
import { Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proPayments;

/**
 * Compte de paiement Stripe (ADR 0124), comme l'étape « Paiements » du site, ouvert dès l'envoi du
 * dossier (ADR 0215) : compléments saisis dans MENAO puis formulaire Stripe dans l'application
 * (premier passage), compléter ce que Stripe attend encore (avec la date limite), patienter pendant
 * sa vérification, ou compte actif, avec « Votre argent » (solde et virements, ADR 0152). L'état est
 * relu à la sortie du formulaire. En secours, le site de Stripe dans la fenêtre sécurisée.
 * Paiements directs sur le compte de l'artisan, sans commission MENAO (CLAUDE.md règle 12).
 * Refonte « Nette » (lot 9) : grand titre et cartes ; ni formule ni prix dans l'application
 * (règle 10).
 */
function PaymentsScreen() {
  const [data, reload] = useFocusData(loadPayments);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [embedded, setEmbedded] = useState(false);

  /** Premier passage : jetons des compléments, création du compte, puis formulaire Stripe. */
  async function start(details: ConnectDetails | null) {
    setMessage(null);
    setBusy(true);
    const prefill = data?.prefill ?? null;
    const tokens = prefill
      ? await createConnectTokens(
          prefill.publishableKey,
          completeConnectPrefill(prefill, details ?? {}),
        )
      : {};
    const failed = await createConnect(tokens, details?.website ?? null);
    if (failed) {
      setBusy(false);
      setMessage(failed.error);
      return;
    }
    setEmbedded(true);
  }

  function openStripe() {
    setMessage(null);
    setBusy(true);
    setEmbedded(true);
  }

  const closeStripe = useCallback(async () => {
    setEmbedded(false);
    await refreshConnect();
    await reload();
    setBusy(false);
  }, [reload]);

  /** Formulaire intégré impossible : le site de Stripe, avec retour dans l'application. */
  const fallback = useCallback(
    async (error: string | null) => {
      setEmbedded(false);
      const opened = await startConnect();
      if ("error" in opened) {
        setBusy(false);
        setMessage(error ?? opened.error);
        return;
      }
      const result = await openHostedPage(opened.url);
      if (result === "connect_expire") setMessage(t.linkExpired);
      await refreshConnect();
      await reload();
      setBusy(false);
    },
    [reload],
  );

  async function check() {
    setBusy(true);
    await refreshConnect();
    await reload();
    setBusy(false);
  }

  if (data === undefined) return <FicheSkeleton />;
  return (
    <>
      <FicheScreen onRefresh={reload}>
        <PageHead title={t.title} />
        {message ? <Notice tone="error">{message}</Notice> : null}
        {data === null ? (
          <Notice tone="error">{t.loadError}</Notice>
        ) : !data.open ? (
          <FicheCard padding={4.5}>
            <Text style={styles.body}>{t.notValidated}</Text>
          </FicheCard>
        ) : (
          <>
            <PaymentsPanel
              data={data}
              busy={busy}
              onStripe={openStripe}
              onCheck={check}
              prepare={
                <ConnectPrepare
                  prefill={data.prefill}
                  today={parisToday()}
                  busy={busy}
                  onContinue={(details) => void start(details)}
                />
              }
            />
            {data.money ? <MoneyPanel data={data.money} /> : null}
          </>
        )}
      </FicheScreen>
      {/* Plein écran, au-dessus de l'écran Paiements. */}
      {embedded ? (
        <StripeOnboarding onExit={() => void closeStripe()} onUnavailable={fallback} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: theme.font.regular,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.foreground,
  },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("subscription", PaymentsScreen);
