import { useState } from "react";
import { MoneyPanel } from "@/components/pro/money-panel";
import { PaymentsPanel } from "@/components/pro/payments-panel";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { openHostedPage } from "@/lib/hosted";
import { loadPayments, refreshConnect, startConnect } from "@/lib/payments";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Card, Notice, Screen, ScreenSkeleton, Title } from "@/ui";

const t = fr.proPayments;

/**
 * Compte de paiement Stripe (ADR 0124), comme l'étape « Paiements » du site : démarrer, compléter
 * ce que Stripe attend encore (avec la date limite), patienter pendant sa vérification, ou compte
 * actif, avec « Votre argent » (solde et virements, ADR 0152). Stripe s'ouvre dans la fenêtre
 * sécurisée du téléphone, puis l'état est relu au retour.
 * Paiements directs sur le compte de l'artisan, sans commission MENAO (CLAUDE.md règle 12).
 */
export default function PaymentsScreen() {
  const [data, reload] = useFocusData(loadPayments);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openStripe() {
    setMessage(null);
    setBusy(true);
    const opened = await startConnect(data?.status === "a_demarrer");
    if ("error" in opened) {
      setBusy(false);
      setMessage(opened.error);
      return;
    }
    const result = await openHostedPage(opened.url);
    if (result === "connect_expire") setMessage(t.linkExpired);
    await refreshConnect();
    await reload();
    setBusy(false);
  }

  async function check() {
    setBusy(true);
    await refreshConnect();
    await reload();
    setBusy(false);
  }

  if (data === undefined) return <ScreenSkeleton header={<TopBar />} />;
  return (
    <Screen onRefresh={reload} header={<TopBar />}>
      <Title>{t.title}</Title>
      {message ? <Notice tone="error">{message}</Notice> : null}
      {data === null ? (
        <Notice tone="error">{t.loadError}</Notice>
      ) : !data.validated ? (
        <Card>
          <Body>{t.notValidated}</Body>
        </Card>
      ) : (
        <>
          <PaymentsPanel data={data} busy={busy} onStripe={openStripe} onCheck={check} />
          {data.money ? <MoneyPanel data={data.money} /> : null}
        </>
      )}
    </Screen>
  );
}
