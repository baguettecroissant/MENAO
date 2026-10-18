import { frenchVatNumber } from "@menao/core";
import { router, type Href } from "expo-router";
import { ChevronRight, ImagePlus, MapPin, Wrench, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ChoiceGroup } from "@/components/pro-signup/signup-parts";
import { TopBar } from "@/components/top-bar";
import { fr } from "@/i18n/fr";
import { formatLongDate } from "@/lib/dates";
import {
  loadCompany,
  removeLogo,
  saveCompany,
  saveSiret,
  verifySiret,
  type Company,
  type FieldErrors,
} from "@/lib/my-company";
import { choosePhotoSource, pickPhotos, uploadPhoto } from "@/lib/photos";
import { useFocusData } from "@/lib/use-focus-data";
import { Body, Button, Card, Notice, Screen, TextField, Title } from "@/ui";
import { theme } from "@/ui/theme";

const t = fr.proCompany;
const { colors, font, radius, spacing } = theme;

type Message = { tone: "error" | "success" | "info"; text: string } | null;

/**
 * « Mon entreprise » (ADR 0125), comme l'étape « Entreprise » du site : SIRET (modifiable tant
 * que le dossier est en brouillon) et sa vérification auprès de l'INSEE, nom commercial, TVA,
 * logo des documents, puis accès aux métiers et à la zone d'intervention.
 */
export default function CompanyScreen() {
  const [company, reload] = useFocusData(loadCompany);
  if (company === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return (
    <Screen header={<TopBar />}>
      <Title>{t.title}</Title>
      <Body muted>{t.lead}</Body>
      {company === null ? (
        <Notice tone="error">{t.loadError}</Notice>
      ) : (
        <>
          <SiretCard company={company} onChange={reload} />
          {company.checkedAt && company.active ? (
            <CompanyCard key={company.checkedAt} company={company} onSaved={reload} />
          ) : null}
          <LogoCard logoUrl={company.logoUrl} onChange={reload} />
          <View style={styles.links}>
            <LinkRow icon={Wrench} title={t.trades} hint={t.tradesHint} href="/pro-metiers" />
            <LinkRow icon={MapPin} title={t.zone} hint={t.zoneHint} href="/pro-zone" />
          </View>
        </>
      )}
    </Screen>
  );
}

function SiretCard({ company, onChange }: { company: Company; onChange: () => Promise<void> }) {
  const editable = company.status === "brouillon";
  const [siret, setSiret] = useState(company.siret ?? "");
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState<"save" | "verify" | null>(null);

  async function save() {
    setBusy("save");
    setMessage(null);
    const result = await saveSiret(siret);
    setBusy(null);
    setError(result.ok ? undefined : result.fields?.siret);
    if (!result.ok && result.error) setMessage({ tone: "error", text: result.error });
    if (result.ok) {
      setMessage({ tone: "success", text: t.saved });
      await onChange();
    }
  }

  async function verify() {
    setBusy("verify");
    setMessage(null);
    const status = await verifySiret();
    setBusy(null);
    setMessage({ tone: status === "ok" ? "success" : "error", text: t.status[status] });
    await onChange();
  }

  return (
    <Card>
      <Text style={styles.heading}>{t.siret}</Text>
      {editable ? (
        <TextField
          label={t.siret}
          value={siret}
          onChangeText={setSiret}
          keyboardType="number-pad"
          hint={t.siretHint}
          error={error}
        />
      ) : (
        <Text style={styles.value}>{company.siret ?? "—"}</Text>
      )}
      {!editable ? <Body muted>{t.siretLocked}</Body> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Body muted>
        {company.checkedAt ? t.verifiedOn(formatLongDate(company.checkedAt)) : t.notVerified}
      </Body>
      {company.checkedAt && company.active === false ? (
        <Notice tone="error">{t.status.inactive}</Notice>
      ) : null}
      {company.checkedAt && !company.partial && company.raisonSociale ? (
        <Info label={t.raisonSociale} value={company.raisonSociale} />
      ) : null}
      {company.address ? <Info label={t.address} value={company.address} /> : null}
      {company.apeEligible === false ? <Body muted>{t.apeWarning}</Body> : null}
      {editable ? (
        <Button label={t.siretSave} variant="secondary" onPress={save} loading={busy === "save"} />
      ) : null}
      {editable || !company.checkedAt ? (
        <Button
          label={company.checkedAt ? t.reverify : t.verify}
          onPress={verify}
          loading={busy === "verify"}
        />
      ) : null}
    </Card>
  );
}

function CompanyCard({ company, onSaved }: { company: Company; onSaved: () => Promise<void> }) {
  const [nomCommercial, setNomCommercial] = useState(company.nomCommercial ?? "");
  const [raisonSociale, setRaisonSociale] = useState(company.raisonSociale ?? "");
  const [tva, setTva] = useState<boolean | null>(company.assujettiTva);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);
    const result = await saveCompany({
      nomCommercial,
      raisonSociale,
      assujettiTva: tva,
      partial: company.partial,
    });
    setBusy(false);
    setErrors(result.ok ? {} : (result.fields ?? {}));
    if (!result.ok && result.error) setMessage({ tone: "error", text: result.error });
    if (result.ok) {
      setMessage({ tone: "success", text: t.saved });
      await onSaved();
    }
  }

  return (
    <Card>
      {company.partial ? (
        <>
          <Body muted>{t.partialDiffusion}</Body>
          <TextField
            label={t.raisonSociale}
            value={raisonSociale}
            onChangeText={setRaisonSociale}
            error={errors.raisonSociale}
          />
        </>
      ) : null}
      <TextField
        label={t.nomCommercial}
        value={nomCommercial}
        onChangeText={setNomCommercial}
        hint={t.nomCommercialHint}
        error={errors.nomCommercial}
      />
      <ChoiceGroup<boolean>
        legend={t.tva}
        value={tva}
        options={[
          { value: true, label: t.tvaYes },
          { value: false, label: t.tvaNo },
        ]}
        onChange={setTva}
      />
      {errors.assujettiTva ? <Notice tone="error">{errors.assujettiTva}</Notice> : null}
      {tva && company.siren ? (
        <Body muted>{t.tvaNumber(frenchVatNumber(company.siren))}</Body>
      ) : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Button label={t.save} onPress={save} loading={busy} />
    </Card>
  );
}

function LogoCard({
  logoUrl,
  onChange,
}: {
  logoUrl: string | null;
  onChange: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<"send" | "remove" | null>(null);
  const [message, setMessage] = useState<Message>(null);

  async function send() {
    setMessage(null);
    const source = await choosePhotoSource(t.logoTitle);
    if (!source) return;
    const picked = await pickPhotos(source, 1);
    if ("error" in picked) return setMessage({ tone: "error", text: picked.error });
    const photo = picked.photos[0];
    if (!photo) return;
    setBusy("send");
    const status = await uploadPhoto({ purpose: "logo" }, photo);
    setBusy(null);
    if (status !== "ok") {
      return setMessage({
        tone: "error",
        text: fr.search.upload[status] ?? fr.search.upload.unavailable,
      });
    }
    setMessage({ tone: "success", text: t.logoDone });
    await onChange();
  }

  async function remove() {
    setMessage(null);
    setBusy("remove");
    const ok = await removeLogo();
    setBusy(null);
    setMessage(
      ok ? { tone: "success", text: t.logoRemoved } : { tone: "error", text: fr.errors.generic },
    );
    await onChange();
  }

  return (
    <Card>
      <Text style={styles.heading}>{t.logoTitle}</Text>
      <Body muted>{t.logoIntro}</Body>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" alt={t.logoAlt} />
      ) : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Button
        label={logoUrl ? t.logoChange : t.logoSend}
        icon={ImagePlus}
        variant="secondary"
        onPress={send}
        loading={busy === "send"}
      />
      {logoUrl ? (
        <Button
          label={t.logoRemove}
          variant="secondary"
          onPress={remove}
          loading={busy === "remove"}
        />
      ) : null}
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function LinkRow({
  icon: Icon,
  title,
  hint,
  href,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  href: Href;
}) {
  return (
    <Pressable
      role="link"
      aria-label={title}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon size={20} color={colors["primary-strong"]} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <ChevronRight size={20} color={colors["muted-foreground"]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  heading: {
    fontFamily: font.bold,
    fontSize: 17,
    color: colors.foreground,
    marginBottom: spacing(1),
  },
  value: { fontFamily: font.medium, fontSize: 15, color: colors.foreground },
  info: { gap: 2 },
  infoLabel: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  logo: {
    width: "100%",
    height: 96,
    borderRadius: radius.input,
    backgroundColor: colors["primary-softer"],
  },
  links: { gap: spacing(2.5) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: colors["primary-soft"],
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.bold, fontSize: 15, color: colors.foreground },
  rowHint: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
});
