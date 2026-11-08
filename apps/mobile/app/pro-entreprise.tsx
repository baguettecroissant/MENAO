import { frenchVatNumber } from "@menao/core";
import { router, type Href } from "expo-router";
import { ChevronRight, ImagePlus, MapPin, Wrench, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { PageHead } from "@/components/pro/dossier-kit";
import {
  CardHeading,
  FicheButton,
  FicheCard,
  FicheRow,
  FicheScreen,
  FicheSkeleton,
} from "@/components/pro/fiche-kit";
import { IconSquare, ToolField } from "@/components/pro/tools-kit";
import { ChoiceGroup } from "@/components/pro-signup/signup-parts";
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
import { Notice, Tappable, toast } from "@/ui";
import { theme } from "@/ui/theme";
import { withTeamPermission } from "@/components/team-gate";

const t = fr.proCompany;
const { colors, font, radius, spacing } = theme;

type Message = { tone: "error" | "success" | "info"; text: string } | null;

/**
 * « Mon entreprise » (ADR 0125), comme l'étape « Entreprise » du site : SIRET (modifiable tant
 * que le dossier est en brouillon) et sa vérification auprès de l'INSEE, nom commercial, TVA,
 * logo des documents, puis accès aux métiers et à la zone d'intervention. Refonte « Nette »
 * (lot 9) : grand titre, cartes, « Enregistrer » (nom commercial et TVA) collé en bas.
 */
function CompanyScreen() {
  const [company, reload] = useFocusData(loadCompany);
  if (company === undefined) return <FicheSkeleton />;
  if (company === null) {
    return (
      <FicheScreen onRefresh={reload}>
        <PageHead title={t.title} lead={t.lead} />
        <Notice tone="error">{t.loadError}</Notice>
      </FicheScreen>
    );
  }
  return <CompanyContent company={company} onChange={reload} />;
}

type CompanyForm = {
  /** Vérification INSEE à laquelle se rapporte la saisie : une nouvelle repart de la fiche. */
  key: string;
  nomCommercial: string;
  raisonSociale: string;
  tva: boolean | null;
  errors: FieldErrors;
  message: Message;
};

const formKey = (company: Company) => `${company.checkedAt ?? ""}|${String(company.active)}`;

const initialForm = (company: Company): CompanyForm => ({
  key: formKey(company),
  nomCommercial: company.nomCommercial ?? "",
  raisonSociale: company.raisonSociale ?? "",
  tva: company.assujettiTva,
  errors: {},
  message: null,
});

function CompanyContent({
  company,
  onChange,
}: {
  company: Company;
  onChange: () => Promise<void>;
}) {
  // Saisie du nom commercial et de la TVA, reprise de la fiche à chaque nouvelle vérification.
  const key = formKey(company);
  const [stored, setStored] = useState(() => initialForm(company));
  const form = stored.key === key ? stored : initialForm(company);
  const [busy, setBusy] = useState(false);
  const editable = Boolean(company.checkedAt && company.active);

  function patch(next: Partial<CompanyForm>) {
    setStored((prev) => ({ ...(prev.key === key ? prev : initialForm(company)), ...next }));
  }

  async function save() {
    setBusy(true);
    patch({ message: null });
    const result = await saveCompany({
      nomCommercial: form.nomCommercial,
      raisonSociale: form.raisonSociale,
      assujettiTva: form.tva,
      partial: company.partial,
    });
    setBusy(false);
    patch({
      errors: result.ok ? {} : (result.fields ?? {}),
      ...(!result.ok && result.error ? { message: { tone: "error", text: result.error } } : {}),
    });
    if (result.ok) {
      toast.success(t.saved);
      await onChange();
    }
  }

  return (
    <FicheScreen
      onRefresh={onChange}
      footer={
        editable ? (
          <FicheButton label={t.save} tall onPress={() => void save()} loading={busy} />
        ) : undefined
      }
    >
      <PageHead title={t.title} lead={t.lead} />
      <SiretCard company={company} onChange={onChange} />
      {editable ? <CompanyCard company={company} form={form} onPatch={patch} /> : null}
      <LogoCard logoUrl={company.logoUrl} onChange={onChange} />
      <View style={styles.links}>
        <LinkRow icon={Wrench} title={t.trades} hint={t.tradesHint} href="/pro-metiers" />
        <LinkRow icon={MapPin} title={t.zone} hint={t.zoneHint} href="/pro-zone" border />
      </View>
    </FicheScreen>
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
      toast.success(t.saved);
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
    <FicheCard padding={4.5} gap={3}>
      <CardHeading title={t.siret} size={17} />
      {editable ? (
        <ToolField
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
      {!editable ? <Text style={styles.text}>{t.siretLocked}</Text> : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <Text style={styles.text}>
        {company.checkedAt ? t.verifiedOn(formatLongDate(company.checkedAt)) : t.notVerified}
      </Text>
      {company.checkedAt && company.active === false ? (
        <Notice tone="error">{t.status.inactive}</Notice>
      ) : null}
      {(company.checkedAt && !company.partial && company.raisonSociale) || company.address ? (
        <View>
          {company.checkedAt && !company.partial && company.raisonSociale ? (
            <FicheRow label={t.raisonSociale} value={company.raisonSociale} />
          ) : null}
          {company.address ? <FicheRow label={t.address} value={company.address} /> : null}
        </View>
      ) : null}
      {company.apeEligible === false ? <Text style={styles.text}>{t.apeWarning}</Text> : null}
      {editable ? (
        <FicheButton
          label={t.siretSave}
          variant="secondary"
          onPress={() => void save()}
          loading={busy === "save"}
        />
      ) : null}
      {editable || !company.checkedAt ? (
        <FicheButton
          label={company.checkedAt ? t.reverify : t.verify}
          variant={company.checkedAt ? "secondary" : "primary"}
          onPress={() => void verify()}
          loading={busy === "verify"}
        />
      ) : null}
    </FicheCard>
  );
}

function CompanyCard({
  company,
  form,
  onPatch,
}: {
  company: Company;
  form: CompanyForm;
  onPatch: (next: Partial<CompanyForm>) => void;
}) {
  const { errors } = form;
  return (
    <FicheCard padding={4.5} gap={3.5}>
      {company.partial ? (
        <>
          <Text style={styles.text}>{t.partialDiffusion}</Text>
          <ToolField
            label={t.raisonSociale}
            value={form.raisonSociale}
            onChangeText={(raisonSociale) => onPatch({ raisonSociale })}
            error={errors.raisonSociale}
          />
        </>
      ) : null}
      <ToolField
        label={t.nomCommercial}
        value={form.nomCommercial}
        onChangeText={(nomCommercial) => onPatch({ nomCommercial })}
        hint={t.nomCommercialHint}
        error={errors.nomCommercial}
      />
      <ChoiceGroup<boolean>
        legend={t.tva}
        value={form.tva}
        options={[
          { value: true, label: t.tvaYes },
          { value: false, label: t.tvaNo },
        ]}
        onChange={(tva) => onPatch({ tva })}
      />
      {errors.assujettiTva ? <Notice tone="error">{errors.assujettiTva}</Notice> : null}
      {form.tva && company.siren ? (
        <Text style={styles.text}>{t.tvaNumber(frenchVatNumber(company.siren))}</Text>
      ) : null}
      {form.message ? <Notice tone={form.message.tone}>{form.message.text}</Notice> : null}
    </FicheCard>
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
    toast.success(t.logoDone);
    await onChange();
  }

  async function remove() {
    setMessage(null);
    setBusy("remove");
    const ok = await removeLogo();
    setBusy(null);
    if (ok) toast.success(t.logoRemoved);
    else setMessage({ tone: "error", text: fr.errors.generic });
    await onChange();
  }

  return (
    <FicheCard padding={4.5} gap={3}>
      <CardHeading title={t.logoTitle} size={17} />
      <Text style={styles.text}>{t.logoIntro}</Text>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" alt={t.logoAlt} />
      ) : null}
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
      <FicheButton
        label={logoUrl ? t.logoChange : t.logoSend}
        icon={ImagePlus}
        variant="secondary"
        onPress={() => void send()}
        loading={busy === "send"}
      />
      {logoUrl ? (
        <FicheButton
          label={t.logoRemove}
          variant="secondary"
          onPress={() => void remove()}
          loading={busy === "remove"}
        />
      ) : null}
    </FicheCard>
  );
}

function LinkRow({
  icon,
  title,
  hint,
  href,
  border = false,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  href: Href;
  border?: boolean;
}) {
  return (
    <Tappable
      role="link"
      aria-label={title}
      onPress={() => router.push(href)}
      style={[styles.row, border && styles.rowBorder]}
    >
      <IconSquare icon={icon} tone="neutral" />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <ChevronRight size={18} color={colors["muted-foreground"]} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  value: { fontFamily: font.semibold, fontSize: 16, color: colors.foreground },
  text: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.label },
  logo: {
    width: "100%",
    height: 96,
    borderRadius: radius.input,
    backgroundColor: colors["primary-softer"],
  },
  links: {
    overflow: "hidden",
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingVertical: spacing(3),
    paddingHorizontal: 14,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, color: colors.foreground },
  rowHint: {
    fontFamily: font.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors["muted-foreground"],
  },
});

// Réservé selon la place dans l'entreprise (ADR 0241).
export default withTeamPermission("storefront", CompanyScreen);
