import {
  FORMES_JURIDIQUES,
  isValidSiret,
  normalizeSiret,
  signupBaseFromCompany,
  type ArtisanSignupCompany,
  type ArtisanSignupDraft,
} from "@menao/core";
import { messages } from "@menao/validation";
import { ArrowLeftRight, Building2, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FicheButton, FicheTag } from "@/components/pro/fiche-kit";
import { IconSquare, ToolField } from "@/components/pro/tools-kit";
import { fr } from "@/i18n/fr";
import { searchCompanies, type CompanySuggestion } from "@/lib/artisan-signup";
import { LinkText, Notice } from "@/ui";
import { theme } from "@/ui/theme";
import { ChoiceGroup, Muted, SearchField, StepTitle } from "./signup-parts";

const t = fr.proSignup.company;
const { colors, font, radius, spacing } = theme;

type Search =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "done"; query: string; results: CompanySuggestion[] }
  | { status: "error"; query: string };

const formatSiret = (siret: string) =>
  siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, "$1 $2 $3 $4");
const legalForm = (code: string | null) => (code ? (FORMES_JURIDIQUES[code] ?? null) : null);
const managerName = (m: { firstName: string; lastName: string }) => `${m.firstName} ${m.lastName}`;

/** Initiales de l'entreprise (« Plomberie des Oliviers » → « PO »), comme l'aperçu de la fiche. */
function initials(name: string | null): string {
  return (
    (name ?? "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

function toDraftCompany(c: CompanySuggestion): ArtisanSignupCompany {
  const { siren: _siren, active: _active, ...company } = c;
  return company;
}

const manualCompany = (siret: string): ArtisanSignupCompany => ({
  siret,
  name: null,
  legalFormCode: null,
  apeCode: null,
  creationYear: null,
  address: null,
  postcode: null,
  city: null,
  citycode: null,
  lon: null,
  lat: null,
  managers: [],
});

/** Étape « entreprise » : Annuaire des entreprises, ou SIRET saisi à la main (ADR 0110). */
export function CompanyStep({
  draft,
  update,
  taken = false,
}: {
  draft: ArtisanSignupDraft;
  update: (patch: Partial<ArtisanSignupDraft>) => void;
  /** Entreprise déjà inscrite (ADR 0175) : l'écran bloque la suite. */
  taken?: boolean;
}) {
  const company = draft.company;
  return (
    <>
      <StepTitle title={t.title} lead={t.lead} />
      {taken ? (
        <View style={styles.taken}>
          <Notice tone="error">{`${t.taken.title}. ${t.taken.text}`}</Notice>
          <LinkText label={t.taken.signIn} onPress={() => router.push("/connexion")} />
          <LinkText label={t.taken.contact} onPress={() => router.push("/aide")} />
        </View>
      ) : null}
      {company ? (
        <CompanyCard company={company} draft={draft} update={update} />
      ) : (
        <CompanyFinder
          onPick={(c) => {
            const picked = toDraftCompany(c);
            update({
              company: picked,
              isDirigeant: null,
              base: signupBaseFromCompany(picked) ?? draft.base,
            });
          }}
          onManual={(siret) => update({ company: manualCompany(siret), isDirigeant: null })}
        />
      )}
    </>
  );
}

function CompanyFinder({
  onPick,
  onManual,
}: {
  onPick: (company: CompanySuggestion) => void;
  onManual: (siret: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ status: "idle" });
  const [manual, setManual] = useState(false);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSearch({ status: "loading", query: q });
      searchCompanies(q, controller.signal)
        .then((results) => setSearch({ status: "done", query: q, results }))
        .catch(() => {
          if (!controller.signal.aborted) setSearch({ status: "error", query: q });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  if (manual) return <ManualSiret onSubmit={onManual} onCancel={() => setManual(false)} />;

  // Résultats de la saisie en cours seulement.
  const current = search.status !== "idle" && search.query === q ? search : null;
  return (
    <View style={styles.finder}>
      <SearchField label={t.search} value={query} onChangeText={setQuery} hint={t.searchHint} />
      {current?.status === "loading" ? <Muted>{t.searching}</Muted> : null}
      {current?.status === "error" ? <Notice tone="info">{t.unavailable}</Notice> : null}
      {current?.status === "done" && current.results.length === 0 ? (
        <Muted>{t.noResult}</Muted>
      ) : null}
      {current?.status === "done"
        ? current.results.map((c) => (
            <Pressable
              key={c.siret}
              role="button"
              aria-label={c.name}
              aria-disabled={!c.active}
              disabled={!c.active}
              onPress={() => onPick(c)}
              style={({ pressed }) => [
                styles.result,
                !c.active && styles.resultClosed,
                pressed && styles.pressed,
              ]}
            >
              <IconSquare icon={Building2} tone="neutral" />
              <View style={styles.resultText}>
                <Text style={styles.resultName}>{c.name}</Text>
                <Text style={styles.resultMeta}>
                  {[
                    legalForm(c.legalFormCode),
                    c.city && `${c.city}${c.postcode ? ` (${c.postcode})` : ""}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                <Text style={styles.resultSiret}>
                  {t.siret} {formatSiret(c.siret)}
                </Text>
              </View>
              {c.active ? (
                <ChevronRight size={18} color={colors["muted-foreground"]} />
              ) : (
                <FicheTag text={t.closed} tone="danger" />
              )}
            </Pressable>
          ))
        : null}
      <LinkText label={t.notListed} onPress={() => setManual(true)} />
    </View>
  );
}

function ManualSiret({
  onSubmit,
  onCancel,
}: {
  onSubmit: (siret: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <View style={styles.finder}>
      <ToolField
        label={t.manualLabel}
        value={value}
        onChangeText={setValue}
        keyboardType="number-pad"
        hint={t.manualHint}
        error={error}
      />
      <FicheButton
        label={t.manualSubmit}
        variant="secondary"
        onPress={() => {
          const siret = normalizeSiret(value);
          if (!isValidSiret(siret)) return setError(messages.siretInvalid);
          onSubmit(siret);
        }}
      />
      <LinkText label={t.backToSearch} onPress={onCancel} />
    </View>
  );
}

function CompanyCard({
  company,
  draft,
  update,
}: {
  company: ArtisanSignupCompany;
  draft: ArtisanSignupDraft;
  update: (patch: Partial<ArtisanSignupDraft>) => void;
}) {
  const single = company.managers.length === 1 ? company.managers[0] : undefined;
  const form = legalForm(company.legalFormCode);
  const reset = () => update({ company: null, isDirigeant: null });
  const rows: [string, string | null][] = [
    [t.siret, formatSiret(company.siret)],
    [t.seat, company.address],
    [t.activity, company.apeCode],
    [t.manager, company.managers.length ? company.managers.map(managerName).join(", ") : null],
  ];
  return (
    <>
      {/* Entreprise trouvée : carte bordée de bleu nuit (maquette « InscriptionEntrepriseNette »). */}
      <View style={styles.company}>
        <View style={styles.cardHead}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(company.name)}</Text>
          </View>
          <View style={styles.cardTitle}>
            <Text style={styles.cardName}>{company.name ?? t.manualName}</Text>
            {form || company.creationYear ? (
              <Text style={styles.resultMeta}>
                {[form, company.creationYear && t.createdIn(company.creationYear)]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
          </View>
          {company.name ? <FicheTag text={t.active} tone="success" dot /> : null}
        </View>
        {/* Changer d'entreprise, en haut de la carte, là où se pose le regard. */}
        <FicheButton label={t.change} variant="secondary" icon={ArrowLeftRight} onPress={reset} />
        <View style={styles.details}>
          {rows
            .filter((row): row is [string, string] => row[1] !== null)
            .map(([label, value]) => (
              <View key={label} style={styles.detail}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={styles.detailValue}>{value}</Text>
              </View>
            ))}
        </View>
      </View>
      <ChoiceGroup<boolean>
        legend={single ? t.isManager(managerName(single)) : t.isManagerGeneric}
        value={draft.isDirigeant}
        options={[
          { value: true, label: single ? t.yesMe : t.yes },
          { value: false, label: t.no },
        ]}
        onChange={(isDirigeant) => update({ isDirigeant })}
      />
      {draft.isDirigeant === false ? (
        <>
          <Notice tone="info">{t.notManagerNote}</Notice>
          {/* « Non » choisi parce que l'entreprise n'est pas la bonne : on se rattrape ici. */}
          <View style={styles.wrongCompany}>
            <Muted>{t.wrongCompany}</Muted>
            <LinkText label={t.change} onPress={reset} />
          </View>
        </>
      ) : null}
      <ChoiceGroup<boolean>
        legend={t.vatQuestion}
        hint={t.vatHint}
        value={draft.assujettiTva}
        options={[
          { value: true, label: t.yes },
          { value: false, label: t.no },
        ]}
        onChange={(assujettiTva) => update({ assujettiTva })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  finder: { gap: spacing(3) },
  result: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resultClosed: { opacity: 0.6 },
  pressed: { opacity: 0.85 },
  resultText: { flex: 1, gap: 2 },
  resultName: { fontFamily: font.bold, fontSize: 16, color: colors.foreground },
  resultMeta: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  resultSiret: { fontFamily: font.regular, fontSize: 13, color: colors["muted-foreground"] },
  company: {
    gap: spacing(3.5),
    padding: spacing(4.5),
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.foreground,
    backgroundColor: colors.surface,
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing(3) },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.foreground,
  },
  avatarText: { fontFamily: font.bold, fontSize: 16, color: colors["primary-foreground"] },
  wrongCompany: { gap: spacing(1) },
  taken: { gap: spacing(2) },
  cardTitle: { flex: 1, gap: 2 },
  cardName: {
    fontFamily: font.display,
    fontSize: 18,
    letterSpacing: -0.36,
    color: colors.foreground,
  },
  details: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing(2.5), columnGap: spacing(4) },
  detail: { flexBasis: "45%", flexGrow: 1, gap: 2 },
  detailLabel: { fontFamily: font.regular, fontSize: 14, color: colors["muted-foreground"] },
  detailValue: { fontFamily: font.semibold, fontSize: 14, color: colors.foreground },
});
